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
  Search
} from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';

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
        <Link to="/experiments" className="hover:text-gray-700">Experiments</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{project}</span>
        <span>/</span>
        <span className="text-gray-900 font-medium">{subject}</span>
        <span>/</span>
        <Link 
          to={`/experiments/${project}/${subject}/${experiment}`}
          className="hover:text-gray-700"
        >
          {experiment}
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
          {filteredScans.map((scan: any) => (
            <div
              key={scan.id}
              className="relative group bg-white rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <div className="p-6">
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
                    
                    <button className="inline-flex items-center text-xs font-medium text-green-600 hover:text-green-500">
                      <Download className="h-3 w-3 mr-1" />
                      Download
                    </button>
                  </div>
                  
                  <div className="flex items-center text-xs text-gray-500">
                    <Clock className="h-3 w-3 mr-1" />
                    {scan.startTime || 'No time'}
                  </div>
                </div>
              </div>
            </div>
          ))}
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
    </div>
  );
}