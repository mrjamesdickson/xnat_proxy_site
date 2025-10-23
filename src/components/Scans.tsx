import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useXnat } from '../contexts/XnatContext';
import {
  ArrowLeft,
  FileImage,
  Download,
  Eye,
  Activity,
  Clock,
  HardDrive,
  Image as ImageIcon,
  Filter,
  Search,
  FileText,
  Maximize2,
  Minimize2,
  X,
  Microscope
} from 'lucide-react';
import { ProcessingMenu } from './ProcessingMenu';
import { useState } from 'react';
import clsx from 'clsx';
import { ScanSnapshot } from './ScanSnapshot';
import type { XnatScan } from '../services/xnat-api';
// @ts-ignore - dcmjs doesn't have TypeScript definitions
import * as dcmjs from 'dcmjs';

export function Scans() {
  const { project, subject, experiment } = useParams<{
    project: string;
    subject: string;
    experiment: string;
  }>();
  
  console.log('🔍 Scans URL params:', { project, subject, experiment });
  console.log('🔍 Current URL:', window.location.pathname);
  
  const { client } = useXnat();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [dicomHeaderDialog, setDicomHeaderDialog] = useState<XnatScan | null>(null);
  const [isHeaderDialogMaximized, setIsHeaderDialogMaximized] = useState(false);
  const [rawDicomHeaders, setRawDicomHeaders] = useState<Record<string, any> | null>(null);
  const [loadingRawHeaders, setLoadingRawHeaders] = useState(false);
  const [rawHeadersError, setRawHeadersError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'metadata' | 'raw'>('metadata');

  const { data: subjectData } = useQuery({
    queryKey: ['subject', project, subject],
    queryFn: () => client?.getSubject(project!, subject!) || null,
    enabled: !!client && !!project && !!subject,
  });

  const { data: experimentData } = useQuery({
    queryKey: ['experiment', project, subject, experiment],
    queryFn: () => client?.getExperiment(project!, subject!, experiment!) || null,
    enabled: !!client && !!project && !!subject && !!experiment,
  });

  const { data: scans, isLoading, error } = useQuery({
    queryKey: ['scans', project, subject, experiment],
    queryFn: async () => {
      try {
        const result = await client?.getScans(project!, subject!, experiment!);
        return result || [];
      } catch (error) {
        console.error('Error fetching scans:', error);
        return []; // Return empty array instead of throwing
      }
    },
    enabled: !!client && !!project && !!subject && !!experiment,
    retry: 1, // Only retry once
  });

  const filteredScans = scans?.filter(scan => {
    const matchesSearch = scan.series_description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      scan.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      scan.type?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = !selectedType || scan.type?.toLowerCase() === selectedType.toLowerCase();
    
    return matchesSearch && matchesType;
  }) || [];

  const scanTypes = scans 
    ? [...new Set(scans.map((scan: any) => scan.type).filter((type: string) => Boolean(type)))]
    : [];

  const getQualityColor = (quality: string) => {
    switch (quality?.toLowerCase()) {
      case 'usable':
        return 'bg-green-100 text-green-800';
      case 'questionable':
        return 'bg-yellow-100 text-yellow-800';
      case 'unusable':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const loadRawDicomHeaders = async (scan: XnatScan) => {
    if (!client || !project || !subject || !experiment) return;

    setLoadingRawHeaders(true);
    setRawHeadersError(null);
    setRawDicomHeaders(null);

    try {
      console.log('Fetching DICOM headers for scan:', scan.id);
      console.log('Parameters:', { project, experiment, scanId: scan.id });

      // Log the curl command for DICOM dump service
      const baseUrl = client.getBaseUrl();
      const dumpUrl = `${baseUrl}/REST/services/dicomdump?src=/archive/projects/${project}/experiments/${experiment}/scans/${scan.id}&format=json`;
      console.log('\n=== CURL COMMAND ===');
      console.log(`curl -u "admin:admin" "${dumpUrl}"`);
      console.log('===================\n');

      // Use the DICOM dump service (faster, no need to download full file)
      const dicomDump = await client.getDicomDump(project, experiment, scan.id);
      console.log('DICOM dump received, entries:', dicomDump.length);

      if (!dicomDump || dicomDump.length === 0) {
        throw new Error('No DICOM data returned from dump service');
      }

      // Convert DICOM dump format to a more readable object
      const headers: Record<string, any> = {};
      dicomDump.forEach(entry => {
        const key = entry.desc || entry.tag1;
        const value = entry.value || 'N/A';
        // Include tag info for technical users
        const displayKey = entry.tag1 ? `${key} (${entry.tag1})` : key;
        headers[displayKey] = {
          value: value,
          vr: entry.vr,
          tag: entry.tag1
        };
      });

      console.log('DICOM headers parsed successfully, total tags:', Object.keys(headers).length);
      setRawDicomHeaders(headers);
    } catch (error: any) {
      console.error('Error loading raw DICOM headers:', error);
      setRawHeadersError(error.message || 'Failed to load DICOM headers from file');
    } finally {
      setLoadingRawHeaders(false);
    }
  };

  const handleOpenDicomDialog = (scan: XnatScan) => {
    setDicomHeaderDialog(scan);
    setRawDicomHeaders(null);
    setRawHeadersError(null);
    // Automatically load raw headers when opening
    loadRawDicomHeaders(scan);
  };

  // Don't show hard error for scans - they might just not exist
  // if (error) {
  //   return (
  //     <div className="text-center py-12">
  //       <div className="rounded-md bg-red-50 p-4">
  //         <div className="text-sm text-red-700">
  //           Failed to load scans. Please try again later.
  //         </div>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center space-x-2 text-sm text-gray-500">
        <Link to="/projects" className="hover:text-gray-700">Projects</Link>
        <span>/</span>
        <Link to={`/projects/${project}`} className="hover:text-gray-700">{project}</Link>
        <span>/</span>
        <Link to={`/subjects/${project}/${subject}`} className="hover:text-gray-700">
          {subjectData?.label || subject}
        </Link>
        <span>/</span>
        <Link
          to={`/experiments/${project}/${subject}/${experiment}`}
          className="hover:text-gray-700"
        >
          {experimentData?.label || experiment}
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Scans</span>
      </nav>

      {/* Back Button */}
      <div>
        <Link
          to={`/experiments/${project}/${subject}/${experiment}`}
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Experiment
        </Link>
      </div>

      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Scans
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {experimentData?.label || experiment} • {filteredScans.length} scans
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <ProcessingMenu
            project={project!}
            xsiType="xnat:imageScanData"
            contextParams={{
              session: `/archive/experiments/${experimentData?.id || experiment}`
            }}
            rootElement="xnat:imageScanData"
            label={experimentData?.label || experiment}
          />
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
            placeholder="Search scans..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Filter className="h-5 w-5 text-gray-400" />
          </div>
          <select
            className="block w-full rounded-md border-0 py-1.5 pl-10 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option value="">All Types</option>
            {scanTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error Warning */}
      {error && (
        <div className="rounded-md bg-yellow-50 p-4">
          <div className="text-sm text-yellow-700">
            <strong>Note:</strong> Could not load scans for this experiment. This might be normal if no scans have been uploaded yet.
          </div>
        </div>
      )}

      {/* Scans Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="flex items-center mb-4">
                <div className="h-10 w-10 bg-gray-200 rounded-lg mr-3" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                </div>
              </div>
              <div className="space-y-2 mb-4">
                <div className="h-3 bg-gray-200 rounded" />
                <div className="h-3 bg-gray-200 rounded w-3/4" />
              </div>
              <div className="flex justify-between">
                <div className="h-6 bg-gray-200 rounded w-16" />
                <div className="h-3 bg-gray-200 rounded w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredScans.length === 0 ? (
        <div className="text-center py-12">
          <FileImage className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {searchTerm || selectedType ? 'No scans found' : 'No scans'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || selectedType
              ? 'Try adjusting your search or filter criteria.'
              : 'No scans found for this experiment.'
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredScans.map((scan: any) => {
            // Use experiment ID (not label) for snapshot URL
            const experimentId = experimentData?.id || experiment;
            const snapshotUrl =
              client && project && subject && experimentId
                ? client.getScanThumbnailUrl(project, subject, experimentId, scan.id)
                : null;

            return (
              <div
                key={scan.id}
                className="relative group bg-white rounded-lg shadow hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <ScanSnapshot
                    snapshotUrl={snapshotUrl}
                    alt={`Snapshot of ${scan.series_description || `Scan ${scan.id}`}`}
                    containerClassName="w-full h-40 mb-4"
                    showLabel
                  />

                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <ImageIcon className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {scan.series_description || `Scan ${scan.id}`}
                        </h3>
                        <p className="text-xs text-gray-500">{scan.id}</p>
                      </div>
                    </div>

                    {scan.quality && (
                      <span className={clsx(
                        'inline-flex items-center rounded-full px-2 py-1 text-xs font-medium',
                        getQualityColor(scan.quality)
                      )}>
                        <Activity className="h-3 w-3 mr-1" />
                        {scan.quality}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 mb-4">
                    {scan.type && (
                      <div className="flex items-center text-sm text-gray-600">
                        <FileImage className="h-4 w-4 mr-2 text-gray-400" />
                        <span className="truncate">{scan.type}</span>
                      </div>
                    )}

                    {scan.frames && (
                      <div className="flex items-center text-sm text-gray-600">
                        <HardDrive className="h-4 w-4 mr-2 text-gray-400" />
                        <span>{scan.frames} frames</span>
                      </div>
                    )}

                    {scan.note && (
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Note:</span> {scan.note}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <button className="inline-flex items-center text-xs font-medium text-blue-600 hover:text-blue-500">
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </button>

                      <button
                        onClick={() => handleOpenDicomDialog(scan)}
                        className="inline-flex items-center text-xs font-medium text-purple-600 hover:text-purple-500"
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        Headers
                      </button>

                      <Link
                        to={`/experiments/${experimentId}/scans/${scan.id}/cornerstone`}
                        className="inline-flex items-center text-xs font-medium text-indigo-600 hover:text-indigo-500"
                      >
                        <Microscope className="h-3 w-3 mr-1" />
                        Cornerstone
                      </Link>

                      <button className="inline-flex items-center text-xs font-medium text-green-600 hover:text-green-500">
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </button>

                      <ProcessingMenu
                        project={project!}
                        xsiType="xnat:imageScanData"
                        contextParams={{
                          session: `/archive/experiments/${experimentId}`,
                          scan: `/archive/experiments/${experimentId}/scans/${scan.id}`
                        }}
                        rootElement="xnat:imageScanData"
                        label={scan.series_description || `Scan ${scan.id}`}
                      />
                    </div>

                    <div className="flex items-center text-xs text-gray-500">
                      <Clock className="h-3 w-3 mr-1" />
                      {scan.startTime || 'No time'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Summary Stats */}
      {filteredScans.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm ring-1 ring-gray-900/5">
          <h3 className="text-base font-semibold leading-6 text-gray-900 mb-4">
            Scan Summary
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-semibold text-gray-900">
                {filteredScans.length}
              </div>
              <div className="text-sm text-gray-500">Total Scans</div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-semibold text-gray-900">
                {new Set(filteredScans.map((s: any) => s.type)).size}
              </div>
              <div className="text-sm text-gray-500">Scan Types</div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-semibold text-gray-900">
                {filteredScans.filter((s: any) => s.quality === 'usable').length}
              </div>
              <div className="text-sm text-gray-500">Usable</div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-semibold text-gray-900">
                {filteredScans.reduce((total: number, s: any) => total + (parseInt(s.frames) || 0), 0)}
              </div>
              <div className="text-sm text-gray-500">Total Frames</div>
            </div>
          </div>
        </div>
      )}

      {/* DICOM Header Dialog */}
      {dicomHeaderDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`bg-white rounded-lg shadow-xl overflow-hidden transition-all ${
            isHeaderDialogMaximized ? 'w-full h-full max-w-none max-h-none' : 'max-w-4xl w-full max-h-[85vh]'
          }`}>
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">DICOM Header Information</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {dicomHeaderDialog.series_description || `Scan ${dicomHeaderDialog.id}`} • {dicomHeaderDialog.type}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsHeaderDialogMaximized(!isHeaderDialogMaximized)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                  title={isHeaderDialogMaximized ? 'Restore' : 'Maximize'}
                >
                  {isHeaderDialogMaximized ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => {
                    setDicomHeaderDialog(null);
                    setIsHeaderDialogMaximized(false);
                  }}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto" style={{ maxHeight: isHeaderDialogMaximized ? 'calc(100vh - 140px)' : 'calc(85vh - 140px)' }}>
              {/* Basic Scan Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 pb-4">
                <div>
                  <label className="text-xs font-medium text-gray-500">Scan ID</label>
                  <p className="text-sm text-gray-900">{dicomHeaderDialog.id}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Type</label>
                  <p className="text-sm text-gray-900">{dicomHeaderDialog.type || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Frames</label>
                  <p className="text-sm text-gray-900">{dicomHeaderDialog.frames || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Quality</label>
                  <p className="text-sm text-gray-900">{dicomHeaderDialog.quality || 'N/A'}</p>
                </div>
              </div>

              {/* Tabs */}
              <div className="border-b border-gray-200 px-6">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => setActiveTab('metadata')}
                    className={`${
                      activeTab === 'metadata'
                        ? 'border-purple-500 text-purple-600'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    } whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors`}
                  >
                    XNAT Metadata
                  </button>
                  <button
                    onClick={() => setActiveTab('raw')}
                    className={`${
                      activeTab === 'raw'
                        ? 'border-purple-500 text-purple-600'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    } whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors`}
                  >
                    Raw DICOM Headers
                    {loadingRawHeaders && <span className="ml-2 text-xs">(Loading...)</span>}
                  </button>
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'metadata' && (
                  <div className="bg-white rounded border border-gray-200 p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">XNAT Scan Metadata</h4>
                    <table className="w-full font-mono text-xs">
                      <tbody>
                        {Object.entries(dicomHeaderDialog)
                          .filter(([key]) => !['id', 'URI', 'xsiType'].includes(key))
                          .sort(([a], [b]) => a.localeCompare(b))
                          .map(([key, value]) => (
                            <tr key={key} className="border-b border-gray-100">
                              <td className="text-gray-600 font-semibold py-2 pr-4 whitespace-nowrap align-top">
                                {key}:
                              </td>
                              <td className="text-gray-900 py-2 break-words">
                                {value !== null && value !== undefined
                                  ? typeof value === 'object'
                                    ? JSON.stringify(value)
                                    : String(value)
                                  : 'N/A'}
                              </td>
                            </tr>
                          ))
                        }
                      </tbody>
                    </table>
                  </div>
                )}

                {activeTab === 'raw' && (
                  <div className="bg-white rounded border border-gray-200 p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Raw DICOM File Headers</h4>

                    {loadingRawHeaders && (
                      <div className="flex items-center justify-center py-8">
                        <div className="text-sm text-gray-500">Loading DICOM file...</div>
                      </div>
                    )}

                    {rawHeadersError && (
                      <div className="bg-red-50 border border-red-200 rounded p-3">
                        <p className="text-sm text-red-700">{rawHeadersError}</p>
                      </div>
                    )}

                    {rawDicomHeaders && !loadingRawHeaders && (
                      <table className="w-full font-mono text-xs">
                        <thead>
                          <tr className="border-b-2 border-gray-300">
                            <th className="text-left py-2 pr-4 text-gray-700 font-semibold">DICOM Tag</th>
                            <th className="text-left py-2 pr-4 text-gray-700 font-semibold">VR</th>
                            <th className="text-left py-2 text-gray-700 font-semibold">Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(rawDicomHeaders)
                            .sort(([a], [b]) => {
                              // Sort by tag number if available
                              const tagA = (rawDicomHeaders[a] as any).tag || a;
                              const tagB = (rawDicomHeaders[b] as any).tag || b;
                              return tagA.localeCompare(tagB);
                            })
                            .map(([key, valueObj]) => {
                              const data = valueObj as { value: string; vr: string; tag: string };
                              return (
                                <tr key={key} className="border-b border-gray-100 hover:bg-gray-50">
                                  <td className="text-gray-600 font-semibold py-2 pr-4 align-top">
                                    {key}
                                  </td>
                                  <td className="text-blue-600 py-2 pr-4 align-top">
                                    {data.vr}
                                  </td>
                                  <td className="text-gray-900 py-2 break-words">
                                    {data.value}
                                  </td>
                                </tr>
                              );
                            })
                          }
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setDicomHeaderDialog(null);
                  setIsHeaderDialogMaximized(false);
                }}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}