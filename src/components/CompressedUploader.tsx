import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useXnat } from '../contexts/XnatContext';
import { Upload, Loader, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

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

  // Fetch available projects
  const { data: projects = [] } = useQuery({
    queryKey: ['projects-list'],
    queryFn: async () => {
      if (!client) return [];
      return await client.getProjects();
    },
  });

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);

    // Check if these are DICOM files (could be from folder selection)
    const dicomFiles = fileArray.filter(f => f.name.toLowerCase().endsWith('.dcm'));

    if (dicomFiles.length > 0 && dicomFiles.length === fileArray.length) {
      // All files are DICOM - zip them up
      try {
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();

        // Add all DICOM files to the zip, preserving folder structure
        // Read files as ArrayBuffer first to avoid Safari blob issues
        for (const file of dicomFiles) {
          try {
            const arrayBuffer = await file.arrayBuffer();
            // Use webkitRelativePath if available (from folder selection), otherwise just the name
            const path = (file as any).webkitRelativePath || file.name;
            zip.file(path, arrayBuffer);
          } catch (readError) {
            console.error(`Error reading file ${file.name}:`, readError);
            throw new Error(`Failed to read file: ${file.name}`);
          }
        }

        // Generate the zip file
        const zipBlob = await zip.generateAsync({
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 }
        });
        const zipFile = new File([zipBlob], `dicom_upload_${Date.now()}.zip`, { type: 'application/zip' });
        setSelectedFile(zipFile);
      } catch (error) {
        console.error('Error creating zip:', error);
        alert(`Failed to create zip file from DICOM files: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else if (fileArray.length === 1) {
      // Single file - use it directly if it's an archive, or zip if DICOM
      const file = fileArray[0];
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith('.gz') || fileName.endsWith('.tgz') || fileName.endsWith('.zip')) {
        setSelectedFile(file);
      } else if (fileName.endsWith('.dcm')) {
        // Single DICOM file - zip it
        try {
          const JSZip = (await import('jszip')).default;
          const zip = new JSZip();
          const arrayBuffer = await file.arrayBuffer();
          zip.file(file.name, arrayBuffer);
          const zipBlob = await zip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
          });
          const zipFile = new File([zipBlob], `dicom_upload_${Date.now()}.zip`, { type: 'application/zip' });
          setSelectedFile(zipFile);
        } catch (error) {
          console.error('Error creating zip:', error);
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
      alert('No files detected. In Safari, please use the file browser instead of drag-and-drop for folders.');
      return;
    }

    // Check if all files are DICOM files
    const dicomFiles = allFiles.filter(f => f.name.toLowerCase().endsWith('.dcm'));

    if (dicomFiles.length > 0 && dicomFiles.length === allFiles.length) {
      // All files are DICOM - zip them up
      try {
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();

        // Add all DICOM files to the zip, preserving folder structure
        // Read files as ArrayBuffer first to avoid Safari blob issues
        for (const file of dicomFiles) {
          try {
            const arrayBuffer = await file.arrayBuffer();
            // Use webkitRelativePath if available, otherwise just the name
            const path = (file as any).webkitRelativePath || file.name;
            zip.file(path, arrayBuffer);
          } catch (readError) {
            console.error(`Error reading file ${file.name}:`, readError);
            throw new Error(`Failed to read file: ${file.name}`);
          }
        }

        // Generate the zip file
        const zipBlob = await zip.generateAsync({
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 }
        });
        const zipFile = new File([zipBlob], `dicom_upload_${Date.now()}.zip`, { type: 'application/zip' });
        setSelectedFile(zipFile);
      } catch (error) {
        console.error('Error creating zip:', error);
        alert(`Failed to create zip file from DICOM files: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else if (allFiles.length === 1) {
      // Single file - check if it's a valid archive
      const file = allFiles[0];
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith('.gz') || fileName.endsWith('.tgz') || fileName.endsWith('.zip')) {
        setSelectedFile(file);
      } else if (fileName.endsWith('.dcm')) {
        // Single DICOM file - zip it
        try {
          const JSZip = (await import('jszip')).default;
          const zip = new JSZip();
          const arrayBuffer = await file.arrayBuffer();
          zip.file(file.name, arrayBuffer);
          const zipBlob = await zip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
          });
          const zipFile = new File([zipBlob], `dicom_upload_${Date.now()}.zip`, { type: 'application/zip' });
          setSelectedFile(zipFile);
        } catch (error) {
          console.error('Error creating zip:', error);
          alert('Failed to create zip file from DICOM file');
        }
      } else {
        alert('Please drop a valid archive file (.zip, .tar.gz, or .tgz) or DICOM files (.dcm)');
      }
    } else if (dicomFiles.length > 0) {
      // Mixed files with some DICOM - zip only the DICOM files
      try {
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();

        for (const file of dicomFiles) {
          try {
            const arrayBuffer = await file.arrayBuffer();
            const path = (file as any).webkitRelativePath || file.name;
            zip.file(path, arrayBuffer);
          } catch (readError) {
            console.error(`Error reading file ${file.name}:`, readError);
            throw new Error(`Failed to read file: ${file.name}`);
          }
        }

        const zipBlob = await zip.generateAsync({
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 }
        });
        const zipFile = new File([zipBlob], `dicom_upload_${Date.now()}.zip`, { type: 'application/zip' });
        setSelectedFile(zipFile);
      } catch (error) {
        console.error('Error creating zip:', error);
        alert(`Failed to create zip file from DICOM files: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
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

      setUploadProgress({
        stage: 'complete',
        percent: 100,
        message: `Upload successful! Data sent to ${destination}.`
      });

      // Reset form after success
      setTimeout(() => {
        setUploadProgress(null);
        setSelectedFile(null);
        setSelectedProject('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 3000);

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

  const isUploading = uploadProgress && (uploadProgress.stage === 'uploading' || uploadProgress.stage === 'archiving');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
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
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800">
                  Your data has been uploaded successfully.
                  {destination === 'prearchive' && (
                    <> You can review it in the <a href="/prearchive" className="font-medium underline">prearchive</a>.</>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
