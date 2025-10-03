import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useXnat } from '../contexts/XnatContext';
import { Upload, Loader, CheckCircle, XCircle, AlertCircle, Shield, X } from 'lucide-react';
import { dicomAnonymizer, DEFAULT_ANONYMIZATION_SCRIPT } from '../services/dicom-anonymizer';

type ImportHandler = 'DICOM-zip' | 'SI';
type Destination = 'prearchive' | 'archive';

interface UploadProgress {
  stage: 'uploading' | 'archiving' | 'complete' | 'error';
  percent: number;
  message: string;
  error?: string;
}

export function CompressedUploader() {
  const { client } = useXnat();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedProject, setSelectedProject] = useState('');
  const [importHandler, setImportHandler] = useState<ImportHandler>('DICOM-zip');
  const [ignoreUnparsable, setIgnoreUnparsable] = useState(true);
  const [destination, setDestination] = useState<Destination>('prearchive');
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [anonymizationScript, setAnonymizationScript] = useState<string | null>(null);
  const [showScriptDialog, setShowScriptDialog] = useState(false);

  // Fetch available projects
  const { data: projects = [] } = useQuery({
    queryKey: ['projects-list'],
    queryFn: async () => {
      if (!client) return [];
      return await client.getProjects();
    },
  });

  // Fetch anonymization script when project changes or on mount
  useEffect(() => {
    const fetchAnonymizationScript = async () => {
      if (!client) {
        setAnonymizationScript(DEFAULT_ANONYMIZATION_SCRIPT);
        return;
      }

      try {
        let script;

        if (selectedProject) {
          // Get project-specific script
          script = await client.getAnonymizationScriptForProject(selectedProject);
          console.log('Loaded anonymization script for project', selectedProject, script ? '(from XNAT)' : '(from default)');
        } else {
          // No project selected - try to get XNAT default script
          script = await client.getDefaultAnonymizationScript();
          if (!script) {
            // Try site-wide script
            script = await client.getSiteAnonymizationScript();
          }
          console.log('Loaded XNAT default/site anonymization script', script ? '(from XNAT)' : '(using local default)');
        }

        // Use XNAT script if available, otherwise fall back to local default
        setAnonymizationScript(script || DEFAULT_ANONYMIZATION_SCRIPT);
      } catch (error) {
        console.error('Error loading anonymization script:', error);
        setAnonymizationScript(DEFAULT_ANONYMIZATION_SCRIPT);
      }
    };

    fetchAnonymizationScript();
  }, [client, selectedProject]);

  const validateForm = (): string | null => {
    if (!selectedFile) {
      return 'Please select an archive to upload.';
    }

    const fileName = selectedFile.name.toLowerCase();
    if (!(fileName.endsWith('.gz') || fileName.endsWith('.tgz') || fileName.endsWith('.zip'))) {
      return 'Please select a tar.gz, tgz, or zip archive to upload.';
    }

    if (!selectedProject) {
      return 'Please select a project.';
    }

    return null;
  };

  const anonymizeDicomFiles = async (dicomFiles: File[]): Promise<{ file: File; blob: Blob }[]> => {
    const anonymizedResults: { file: File; blob: Blob }[] = [];

    // Get the anonymization script for the selected project from XNAT
    let script = anonymizationScript || DEFAULT_ANONYMIZATION_SCRIPT;

    if (!anonymizationScript && client && selectedProject) {
      try {
        const xnatScript = await client.getAnonymizationScriptForProject(selectedProject);
        script = xnatScript || DEFAULT_ANONYMIZATION_SCRIPT;
      } catch (error) {
        console.warn('Failed to fetch XNAT script, using default:', error);
      }
    }

    for (let i = 0; i < dicomFiles.length; i++) {
      const file = dicomFiles[i];
      setProcessingMessage(`Anonymizing ${i + 1}/${dicomFiles.length}: ${file.name}...`);

      try {
        // Use dicomedit with XNAT script
        const anonymizedBlob = await dicomAnonymizer.anonymizeFile(
          file,
          { script },
          (msg) => {
            setProcessingMessage(`Anonymizing ${i + 1}/${dicomFiles.length}: ${msg}`);
          }
        );

        anonymizedResults.push({ file, blob: anonymizedBlob });
      } catch (error) {
        console.error(`Failed to anonymize ${file.name}:`, error);
        throw new Error(`Failed to anonymize ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return anonymizedResults;
  };

  const shouldSkipFile = (filename: string): boolean => {
    // Skip macOS metadata files
    if (filename.includes('__MACOSX/') || filename.includes('/._')) {
      return true;
    }
    // Skip dot files (hidden files)
    const basename = filename.split('/').pop() || '';
    if (basename.startsWith('._')) {
      return true;
    }
    return false;
  };

  const processZipFile = async (zipFile: File): Promise<File> => {
    setProcessingMessage('Loading zip file...');
    const JSZip = (await import('jszip')).default;

    // Get the anonymization script for the selected project from XNAT
    let script = anonymizationScript || DEFAULT_ANONYMIZATION_SCRIPT;

    if (!anonymizationScript && client && selectedProject) {
      try {
        const xnatScript = await client.getAnonymizationScriptForProject(selectedProject);
        script = xnatScript || DEFAULT_ANONYMIZATION_SCRIPT;
      } catch (error) {
        console.warn('Failed to fetch XNAT script, using default:', error);
      }
    }

    // Load the zip
    const zip = await JSZip.loadAsync(zipFile);

    // Create a new zip for anonymized files
    const newZip = new JSZip();
    const files = Object.keys(zip.files);
    let processedCount = 0;
    let dicomCount = 0;
    let skippedCount = 0;

    // Count DICOM files (excluding system files)
    for (const filename of files) {
      const file = zip.files[filename];
      if (!file.dir && !shouldSkipFile(filename) && filename.toLowerCase().endsWith('.dcm')) {
        dicomCount++;
      }
    }

    setProcessingMessage(`Found ${dicomCount} DICOM file${dicomCount !== 1 ? 's' : ''} in archive...`);

    // Process each file in the zip
    for (const filename of files) {
      const file = zip.files[filename];

      // Skip directories
      if (file.dir) {
        continue; // Don't recreate empty folders
      }

      // Skip system/metadata files
      if (shouldSkipFile(filename)) {
        skippedCount++;
        console.log(`Skipping system file: ${filename}`);
        continue;
      }

      // Check if it's a DICOM file
      if (filename.toLowerCase().endsWith('.dcm')) {
        processedCount++;
        setProcessingMessage(`Anonymizing ${processedCount}/${dicomCount}: ${filename}...`);

        try {
          // Extract the file
          const arrayBuffer = await file.async('arraybuffer');
          const dcmFile = new File([arrayBuffer], filename, { type: 'application/dicom' });

          // Anonymize using dicomedit with XNAT script
          const anonymizedBlob = await dicomAnonymizer.anonymizeFile(dcmFile, { script });

          // Add to new zip
          const anonymizedBuffer = await anonymizedBlob.arrayBuffer();

          console.log(`File ${filename}: input=${arrayBuffer.byteLength}, output=${anonymizedBuffer.byteLength}, ratio=${(anonymizedBuffer.byteLength / arrayBuffer.byteLength * 100).toFixed(1)}%`);

          // Verify the output is reasonable - DICOM files shouldn't shrink much
          const sizeRatio = anonymizedBuffer.byteLength / arrayBuffer.byteLength;
          if (sizeRatio < 0.8) {
            console.error(`Output file ${filename} is ${(sizeRatio * 100).toFixed(1)}% of input size - seems corrupted! Using original file.`);
            newZip.file(filename, arrayBuffer);
            skippedCount++;
          } else {
            newZip.file(filename, anonymizedBuffer);
          }
        } catch (error) {
          console.error(`Failed to anonymize ${filename}:`, error);
          // Skip files that fail to anonymize and continue
          console.warn(`Skipping file that failed to anonymize: ${filename}`);
          skippedCount++;
          continue;
        }
      } else {
        // Non-DICOM file - copy as-is
        const content = await file.async('arraybuffer');
        newZip.file(filename, content);
      }
    }

    if (skippedCount > 0) {
      console.log(`Skipped ${skippedCount} file(s) (system files or failed to process)`);
    }

    setProcessingMessage('Creating anonymized archive...');
    const anonymizedZipBlob = await newZip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    return new File([anonymizedZipBlob], `anonymized_${Date.now()}.zip`, { type: 'application/zip' });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);

    // Check if these are DICOM files (could be from folder selection)
    const dicomFiles = fileArray.filter(f => f.name.toLowerCase().endsWith('.dcm'));

    if (dicomFiles.length > 0 && dicomFiles.length === fileArray.length) {
      // All files are DICOM - anonymize then zip them up
      try {
        setIsProcessing(true);
        setProcessingMessage(`Processing ${dicomFiles.length} DICOM file${dicomFiles.length > 1 ? 's' : ''}...`);

        // Anonymize DICOM files
        const anonymizedFiles = await anonymizeDicomFiles(dicomFiles);

        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();

        // Add all anonymized DICOM files to the zip, preserving folder structure
        setProcessingMessage('Creating zip file...');
        for (const { file, blob } of anonymizedFiles) {
          try {
            const arrayBuffer = await blob.arrayBuffer();
            // Use webkitRelativePath if available (from folder selection), otherwise just the name
            const path = (file as any).webkitRelativePath || file.name;
            zip.file(path, arrayBuffer);
          } catch (readError) {
            console.error(`Error reading file ${file.name}:`, readError);
            throw new Error(`Failed to read file: ${file.name}`);
          }
        }

        // Generate the zip file
        setProcessingMessage('Finalizing zip file...');
        const zipBlob = await zip.generateAsync({
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 }
        });
        const zipFile = new File([zipBlob], `dicom_upload_${Date.now()}.zip`, { type: 'application/zip' });
        setSelectedFile(zipFile);
        setIsProcessing(false);
        setProcessingMessage('');
      } catch (error) {
        console.error('Error creating zip:', error);
        setIsProcessing(false);
        setProcessingMessage('');
        alert(`Failed to create zip file from DICOM files: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else if (fileArray.length === 1) {
      // Single file - use it directly if it's an archive, or zip if DICOM
      const file = fileArray[0];
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith('.gz') || fileName.endsWith('.tgz') || fileName.endsWith('.zip')) {
        setSelectedFile(file);
      } else if (fileName.endsWith('.dcm')) {
        // Single DICOM file - anonymize and zip it
        try {
          setIsProcessing(true);
          setProcessingMessage('Processing DICOM file...');

          // Anonymize the single DICOM file
          const anonymizedFiles = await anonymizeDicomFiles([file]);

          const JSZip = (await import('jszip')).default;
          const zip = new JSZip();
          const arrayBuffer = await anonymizedFiles[0].blob.arrayBuffer();
          zip.file(file.name, arrayBuffer);

          setProcessingMessage('Creating zip file...');
          const zipBlob = await zip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
          });
          const zipFile = new File([zipBlob], `dicom_upload_${Date.now()}.zip`, { type: 'application/zip' });
          setSelectedFile(zipFile);
          setIsProcessing(false);
          setProcessingMessage('');
        } catch (error) {
          console.error('Error creating zip:', error);
          setIsProcessing(false);
          setProcessingMessage('');
          alert(`Failed to create zip file from DICOM file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else {
        setSelectedFile(file);
      }
    } else {
      alert('Please select either a single archive file or DICOM files');
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const traverseFileTree = async (entry: any, path = ''): Promise<File[]> => {
    const files: File[] = [];

    if (entry.isFile) {
      return new Promise((resolve) => {
        entry.file((file: File) => {
          resolve([file]);
        });
      });
    } else if (entry.isDirectory) {
      const dirReader = entry.createReader();
      const entries: any[] = await new Promise((resolve) => {
        dirReader.readEntries((entries: any[]) => {
          resolve(entries);
        });
      });

      for (const childEntry of entries) {
        const childFiles = await traverseFileTree(childEntry, path + entry.name + '/');
        files.push(...childFiles);
      }
    }

    return files;
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    setIsProcessing(true);
    setProcessingMessage('Reading files...');

    // Try to get items first (supports folders)
    const items = e.dataTransfer.items;
    let allFiles: File[] = [];

    if (items && items.length > 0) {
      // Process items (which can include folders)
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
          const entry = item.webkitGetAsEntry?.();
          if (entry) {
            const files = await traverseFileTree(entry);
            allFiles.push(...files);
          } else {
            // Fallback to regular file
            const file = item.getAsFile();
            if (file) allFiles.push(file);
          }
        }
      }
    }

    // Fallback: check regular files API (Safari may put files here)
    if (allFiles.length === 0) {
      const files = Array.from(e.dataTransfer.files);
      allFiles = files;

      // Check if files have webkitRelativePath (indicates folder upload via Safari)
      const hasRelativePaths = files.some(f => (f as any).webkitRelativePath);
      if (hasRelativePaths) {
        // Files are from a folder - Safari handles this differently
        console.log('Safari folder upload detected');
      }
    }

    if (allFiles.length === 0) {
      setIsProcessing(false);
      setProcessingMessage('');
      alert('No files detected. In Safari, please use the file browser instead of drag-and-drop for folders.');
      return;
    }

    // Check if all files are DICOM files
    const dicomFiles = allFiles.filter(f => f.name.toLowerCase().endsWith('.dcm'));

    if (dicomFiles.length > 0 && dicomFiles.length === allFiles.length) {
      // All files are DICOM - anonymize then zip them up
      try {
        setProcessingMessage(`Processing ${dicomFiles.length} DICOM file${dicomFiles.length > 1 ? 's' : ''}...`);

        // Anonymize DICOM files
        const anonymizedFiles = await anonymizeDicomFiles(dicomFiles);

        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();

        // Add all anonymized DICOM files to the zip, preserving folder structure
        setProcessingMessage('Creating zip file...');
        for (const { file, blob } of anonymizedFiles) {
          try {
            const arrayBuffer = await blob.arrayBuffer();
            // Use webkitRelativePath if available, otherwise just the name
            const path = (file as any).webkitRelativePath || file.name;
            zip.file(path, arrayBuffer);
          } catch (readError) {
            console.error(`Error reading file ${file.name}:`, readError);
            throw new Error(`Failed to read file: ${file.name}`);
          }
        }

        // Generate the zip file
        setProcessingMessage('Finalizing zip file...');
        const zipBlob = await zip.generateAsync({
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 }
        });
        const zipFile = new File([zipBlob], `dicom_upload_${Date.now()}.zip`, { type: 'application/zip' });
        setSelectedFile(zipFile);
        setIsProcessing(false);
        setProcessingMessage('');
      } catch (error) {
        console.error('Error creating zip:', error);
        setIsProcessing(false);
        setProcessingMessage('');
        alert(`Failed to create zip file from DICOM files: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else if (allFiles.length === 1) {
      // Single file - check if it's a valid archive
      const file = allFiles[0];
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith('.zip')) {
        // Process zip file - extract, anonymize DICOMs, re-zip
        try {
          const anonymizedZip = await processZipFile(file);
          setSelectedFile(anonymizedZip);
          setIsProcessing(false);
          setProcessingMessage('');
        } catch (error) {
          console.error('Error processing zip:', error);
          setIsProcessing(false);
          setProcessingMessage('');
          alert(`Failed to process zip file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      } else if (fileName.endsWith('.gz') || fileName.endsWith('.tgz')) {
        // For tar.gz/tgz, we can't easily process, so upload as-is with a warning
        if (confirm('TAR.GZ/TGZ archives cannot be automatically anonymized. DICOM files inside will NOT be anonymized. Continue?')) {
          setSelectedFile(file);
          setIsProcessing(false);
          setProcessingMessage('');
        } else {
          setIsProcessing(false);
          setProcessingMessage('');
        }
      } else if (fileName.endsWith('.dcm')) {
        // Single DICOM file - anonymize and zip it
        try {
          setProcessingMessage('Processing DICOM file...');

          // Anonymize the single DICOM file
          const anonymizedFiles = await anonymizeDicomFiles([file]);

          const JSZip = (await import('jszip')).default;
          const zip = new JSZip();
          const arrayBuffer = await anonymizedFiles[0].blob.arrayBuffer();
          zip.file(file.name, arrayBuffer);

          setProcessingMessage('Creating zip file...');
          const zipBlob = await zip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
          });
          const zipFile = new File([zipBlob], `dicom_upload_${Date.now()}.zip`, { type: 'application/zip' });
          setSelectedFile(zipFile);
          setIsProcessing(false);
          setProcessingMessage('');
        } catch (error) {
          console.error('Error creating zip:', error);
          setIsProcessing(false);
          setProcessingMessage('');
          alert('Failed to create zip file from DICOM file');
        }
      } else {
        setIsProcessing(false);
        setProcessingMessage('');
        alert('Please drop a valid archive file (.zip, .tar.gz, or .tgz) or DICOM files (.dcm)');
      }
    } else if (dicomFiles.length > 0) {
      // Mixed files with some DICOM - anonymize and zip only the DICOM files
      try {
        setProcessingMessage(`Processing ${dicomFiles.length} DICOM file${dicomFiles.length > 1 ? 's' : ''}...`);

        // Anonymize DICOM files
        const anonymizedFiles = await anonymizeDicomFiles(dicomFiles);

        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();

        setProcessingMessage('Creating zip file...');
        for (const { file, blob } of anonymizedFiles) {
          try {
            const arrayBuffer = await blob.arrayBuffer();
            const path = (file as any).webkitRelativePath || file.name;
            zip.file(path, arrayBuffer);
          } catch (readError) {
            console.error(`Error reading file ${file.name}:`, readError);
            throw new Error(`Failed to read file: ${file.name}`);
          }
        }

        setProcessingMessage('Finalizing zip file...');
        const zipBlob = await zip.generateAsync({
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 }
        });
        const zipFile = new File([zipBlob], `dicom_upload_${Date.now()}.zip`, { type: 'application/zip' });
        setSelectedFile(zipFile);
        setIsProcessing(false);
        setProcessingMessage('');
      } catch (error) {
        console.error('Error creating zip:', error);
        setIsProcessing(false);
        setProcessingMessage('');
        alert(`Failed to create zip file from DICOM files: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      setIsProcessing(false);
      setProcessingMessage('');
      alert('Please drop either a single archive file or DICOM files (.dcm)');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const error = validateForm();
    if (error) {
      alert(error);
      return;
    }

    if (!client || !selectedFile) return;

    try {
      // Generate upload ID
      const uploadID = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const usrResPath = `/user/cache/resources/${uploadID}/files/${encodeURIComponent(selectedFile.name)}`;

      // Step 1: Upload file to user cache
      setUploadProgress({
        stage: 'uploading',
        percent: 0,
        message: 'Uploading file...'
      });

      await client.uploadFileToCache(usrResPath, selectedFile, (percent) => {
        setUploadProgress({
          stage: 'uploading',
          percent,
          message: `Uploading file... ${percent}%`
        });
      });

      // Step 2: Request import/archive
      setUploadProgress({
        stage: 'archiving',
        percent: 100,
        message: 'Requesting archival...'
      });

      const autoArchive = destination === 'archive';
      const quarantine = false;

      await client.importFromCache({
        src: usrResPath,
        project: selectedProject,
        importHandler: importHandler,
        ignoreUnparsable: ignoreUnparsable,
        autoArchive: autoArchive,
        quarantine: quarantine,
        httpSessionListener: uploadID
      });

      // Clean up - delete the uploaded file from cache
      try {
        await client.deleteCacheResource(usrResPath);
        console.log('Cleaned up uploaded file from cache');
      } catch (error) {
        console.warn('Failed to clean up cache file:', error);
        // Don't fail the upload if cleanup fails
      }

      setUploadProgress({
        stage: 'complete',
        percent: 100,
        message: `Upload successful! Data sent to ${destination}.`
      });

      // Reset form after success - wait longer to give user time to click link
      setTimeout(() => {
        setUploadProgress(null);
        setSelectedFile(null);
        setSelectedProject('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 60000); // 1 minute

    } catch (error) {
      console.error('Upload error:', error);
      setUploadProgress({
        stage: 'error',
        percent: 0,
        message: 'Upload failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const isUploading = !!(uploadProgress && (uploadProgress.stage === 'uploading' || uploadProgress.stage === 'archiving'));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">Compressed Uploader</h1>
            <p className="text-gray-600 mt-2">
              Upload zipped (.zip or .tar.gz or .tgz) DICOM or ECAT image files to a specified project.
            </p>
            <p className="text-gray-600 mt-1">
              Selecting 'Prearchive' will place your images into a temporary holding space,
              which allows you to review the details and match the data to the proper subject & session.
              If you are confident the metadata will map properly, you may directly 'Archive' the files.
            </p>
          </div>
          {selectedProject && (
            <button
              onClick={() => setShowScriptDialog(true)}
              className="ml-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 flex-shrink-0"
              title="View Anonymization Script"
            >
              <Shield className="w-4 h-4" />
              View Anon Script
            </button>
          )}
        </div>
      </div>

      {/* Upload Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Project Selection */}
          <div>
            <label htmlFor="project" className="block text-sm font-medium text-gray-700 mb-2">
              Project
            </label>
            <select
              id="project"
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              disabled={isUploading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            >
              <option value="">Select a project...</option>
              {projects.map((project, index) => (
                <option key={project.id || `project-${index}`} value={project.id}>
                  {project.name || project.id}
                </option>
              ))}
            </select>
          </div>

          {/* Ignore Unparsable Files */}
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={ignoreUnparsable}
                onChange={(e) => setIgnoreUnparsable(e.target.checked)}
                disabled={isUploading}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:bg-gray-100"
              />
              <span className="text-sm font-medium text-gray-700">
                Ignore unparsable files
              </span>
            </label>
          </div>

          {/* Destination */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Destination
            </label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="destination"
                  value="prearchive"
                  checked={destination === 'prearchive'}
                  onChange={(e) => setDestination(e.target.value as Destination)}
                  disabled={isUploading}
                  className="text-blue-600 focus:ring-blue-500 disabled:bg-gray-100"
                />
                <span className="text-sm text-gray-700">Prearchive</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="destination"
                  value="archive"
                  checked={destination === 'archive'}
                  onChange={(e) => setDestination(e.target.value as Destination)}
                  disabled={isUploading}
                  className="text-blue-600 focus:ring-blue-500 disabled:bg-gray-100"
                />
                <span className="text-sm text-gray-700">Archive</span>
              </label>
            </div>
          </div>

          {/* File Selection with Drag & Drop */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              File
            </label>

            {/* Drag & Drop Zone */}
            <div
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragging
                  ? 'border-blue-500 bg-blue-50'
                  : selectedFile
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-300 hover:border-gray-400 bg-gray-50'
              } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                id="image_archive"
                accept=".zip,.gz,.tgz,.dcm"
                onChange={handleFileChange}
                disabled={isUploading}
                multiple
                webkitdirectory=""
                directory=""
                className="hidden"
              />

              <Upload className={`mx-auto h-12 w-12 mb-3 ${
                isDragging ? 'text-blue-500' : selectedFile ? 'text-green-500' : 'text-gray-400'
              }`} />

              {selectedFile ? (
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    {selectedFile.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Click or drag to replace
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    {isDragging ? 'Drop files or folders here' : 'Drag & drop archive, folder, or DICOM files'}
                  </p>
                  <p className="text-xs text-gray-500">
                    Archives: .zip, .tar.gz, .tgz • DICOM: .dcm files or folders (auto-zipped)
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    or click to browse
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={isUploading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Begin Upload
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Processing Indicator */}
      {isProcessing && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-start gap-3">
            <Loader className="w-6 h-6 text-blue-600 animate-spin flex-shrink-0 mt-1" />
            <div className="flex-1">
              <p className="font-medium text-blue-700 whitespace-pre-wrap font-mono text-sm">{processingMessage}</p>
              <p className="text-sm text-gray-600 mt-1">Please wait while we prepare your files...</p>
            </div>
          </div>
        </div>
      )}

      {/* Progress Display */}
      {uploadProgress && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="space-y-4">
            {/* Status Icon and Message */}
            <div className="flex items-center gap-3">
              {uploadProgress.stage === 'uploading' && (
                <Loader className="w-6 h-6 text-blue-600 animate-spin" />
              )}
              {uploadProgress.stage === 'archiving' && (
                <Loader className="w-6 h-6 text-blue-600 animate-spin" />
              )}
              {uploadProgress.stage === 'complete' && (
                <CheckCircle className="w-6 h-6 text-green-600" />
              )}
              {uploadProgress.stage === 'error' && (
                <XCircle className="w-6 h-6 text-red-600" />
              )}
              <div className="flex-1">
                <p className={`font-medium ${
                  uploadProgress.stage === 'complete' ? 'text-green-700' :
                  uploadProgress.stage === 'error' ? 'text-red-700' :
                  'text-blue-700'
                }`}>
                  {uploadProgress.message}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            {(uploadProgress.stage === 'uploading' || uploadProgress.stage === 'archiving') && (
              <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                <div
                  className="bg-blue-600 h-6 rounded-full transition-all duration-300 flex items-center justify-center"
                  style={{ width: `${uploadProgress.percent}%` }}
                >
                  <span className="text-white text-sm font-medium">
                    {uploadProgress.percent}%
                  </span>
                </div>
              </div>
            )}

            {/* Error Details */}
            {uploadProgress.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Error Details:</p>
                    <p className="text-sm text-red-700 mt-1">{uploadProgress.error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Success Message */}
            {uploadProgress.stage === 'complete' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800 mb-3">
                  Your data has been uploaded successfully to the {destination}.
                </p>
                {destination === 'prearchive' && (
                  <Link
                    to="/prearchive"
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                  >
                    View Prearchive
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Anonymization Script Dialog */}
      {showScriptDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Shield className="w-6 h-6 text-indigo-600" />
                <h3 className="text-lg font-semibold text-gray-900">DICOM Anonymization Script</h3>
              </div>
              <button
                onClick={() => setShowScriptDialog(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Info Banner */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">Automatic Anonymization</p>
                    <p className="mt-1">
                      When you upload DICOM files (.dcm) directly, they are automatically anonymized using this script
                      before being zipped and uploaded to the server. {selectedProject ? 'The script is loaded from XNAT based on your project configuration.' : 'The script is loaded from XNAT\'s default/site-wide configuration.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Script Display */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  DicomEdit Anonymization Script
                  {selectedProject && (
                    <span className="ml-2 text-xs font-normal text-gray-500">
                      (Project: {selectedProject})
                    </span>
                  )}
                </label>
                {anonymizationScript ? (
                  <>
                    <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                      <pre className="text-green-400 font-mono text-sm leading-relaxed">
                        {anonymizationScript}
                      </pre>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {selectedProject
                        ? 'This script is loaded from XNAT for the selected project. It uses DicomEdit syntax to define which DICOM tags are anonymized or removed.'
                        : 'This is the XNAT default/site-wide anonymization script. Select a project to see project-specific settings.'}
                    </p>
                  </>
                ) : (
                  <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 text-center">
                    <Loader className="w-6 h-6 text-gray-400 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Loading anonymization script...</p>
                  </div>
                )}
              </div>

              {/* What Gets Anonymized */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2">What Gets Anonymized:</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-gray-700 mb-1">Patient Information</p>
                    <ul className="text-xs text-gray-600 space-y-0.5">
                      <li>• Birth Date (removed)</li>
                      <li>• Birth Time (removed)</li>
                      <li>• Other Patient IDs (removed)</li>
                      <li>• Address (removed)</li>
                      <li>• Phone Numbers (removed)</li>
                      <li>• Ethnic Group (removed)</li>
                    </ul>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-gray-700 mb-1">Institution Information</p>
                    <ul className="text-xs text-gray-600 space-y-0.5">
                      <li>• Institution Name (removed)</li>
                      <li>• Institution Address (removed)</li>
                      <li>• Department Name (removed)</li>
                      <li>• Operator Names (removed)</li>
                    </ul>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-gray-700 mb-1">Physician Information</p>
                    <ul className="text-xs text-gray-600 space-y-0.5">
                      <li>• Referring Physician (removed)</li>
                      <li>• Performing Physician (removed)</li>
                      <li>• Reading Physician (removed)</li>
                      <li>• Physician(s) of Record (removed)</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Note about archive processing */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-green-800">
                    <p className="font-medium">Automatic Processing:</p>
                    <ul className="mt-1 space-y-1 list-disc list-inside">
                      <li><strong>ZIP files:</strong> Automatically extracted, DICOM files anonymized, then re-zipped</li>
                      <li><strong>DICOM files:</strong> Automatically anonymized and zipped</li>
                      <li><strong>TAR.GZ/TGZ:</strong> Uploaded as-is (cannot be processed)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowScriptDialog(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
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
