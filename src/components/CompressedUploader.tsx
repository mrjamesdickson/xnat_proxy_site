import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useXnat } from '../contexts/XnatContext';
import { Upload, Loader, CheckCircle, XCircle, AlertCircle, Shield, X, FileText, Download, Eye, Maximize2, Minimize2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { dicomAnonymizer, DEFAULT_ANONYMIZATION_SCRIPT, type AnonymizationManifest } from '../services/dicom-anonymizer';
import * as pako from 'pako';

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
  const [enablePixelCheck, setEnablePixelCheck] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [anonymizationScript, setAnonymizationScript] = useState<string | null>(null);
  const [showScriptDialog, setShowScriptDialog] = useState(false);
  const [isScriptMaximized, setIsScriptMaximized] = useState(false);
  const [anonymizationManifest, setAnonymizationManifest] = useState<AnonymizationManifest | null>(null);
  const [showManifestDialog, setShowManifestDialog] = useState(false);
  const [isManifestMaximized, setIsManifestMaximized] = useState(false);
  const [manifestSortField, setManifestSortField] = useState<'fileName' | 'tag' | 'tagName'>('fileName');
  const [manifestSortDirection, setManifestSortDirection] = useState<'asc' | 'desc'>('asc');

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

  const downloadManifest = () => {
    if (!anonymizationManifest) return;

    // Create CSV content
    const headers = ['File Name', 'DICOM Tag', 'Tag Name', 'Original Value', 'New Value'];
    const rows = anonymizationManifest.changes.map(change => [
      change.fileName,
      change.tag,
      change.tagName,
      change.originalValue,
      change.newValue
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `anonymization-manifest-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleManifestSort = (field: 'fileName' | 'tag' | 'tagName') => {
    if (manifestSortField === field) {
      // Toggle direction if clicking same field
      setManifestSortDirection(manifestSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default to ascending
      setManifestSortField(field);
      setManifestSortDirection('asc');
    }
  };

  const getSortedManifestChanges = () => {
    if (!anonymizationManifest) return [];

    const sorted = [...anonymizationManifest.changes].sort((a, b) => {
      let aVal = a[manifestSortField];
      let bVal = b[manifestSortField];

      const comparison = aVal.localeCompare(bVal);
      return manifestSortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  };

  const anonymizeDicomFiles = async (dicomFiles: File[]): Promise<{ file: File; blob: Blob }[]> => {
    const anonymizedResults: { file: File; blob: Blob }[] = [];
    const allChanges: AnonymizationManifest['changes'] = [];
    const allWarnings: string[] = [];

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
        const result = await dicomAnonymizer.anonymizeFile(
          file,
          { script, enablePixelCheck },
          (msg) => {
            setProcessingMessage(`Anonymizing ${i + 1}/${dicomFiles.length}: ${msg}`);
          }
        );

        anonymizedResults.push({ file, blob: result.blob });
        allChanges.push(...result.changes);
        allWarnings.push(...result.warnings);
      } catch (error) {
        console.error(`Failed to anonymize ${file.name}:`, error);
        throw new Error(`Failed to anonymize ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Store the manifest
    setAnonymizationManifest({
      timestamp: new Date().toISOString(),
      totalFiles: dicomFiles.length,
      changes: allChanges,
      warnings: allWarnings,
    });

    // Warn if no changes were detected - this likely means anonymization failed
    if (dicomFiles.length > 0 && allChanges.length === 0) {
      console.warn('WARNING: Anonymization processed files but no changes were detected. This may indicate a problem with the anonymization script.');
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
    const allChanges: AnonymizationManifest['changes'] = [];
    const allWarnings: string[] = [];

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
          const result = await dicomAnonymizer.anonymizeFile(dcmFile, { script, enablePixelCheck });
          allChanges.push(...result.changes);
          allWarnings.push(...result.warnings);

          // Add to new zip
          const anonymizedBuffer = await result.blob.arrayBuffer();

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

    // Store the manifest
    setAnonymizationManifest({
      timestamp: new Date().toISOString(),
      totalFiles: dicomCount,
      changes: allChanges,
      warnings: allWarnings,
    });

    // Warn if no changes were detected - this likely means anonymization failed
    if (dicomCount > 0 && allChanges.length === 0) {
      console.warn('WARNING: Anonymization processed files but no changes were detected. This may indicate a problem with the anonymization script.');
    }

    setProcessingMessage('Creating anonymized archive...');
    const anonymizedZipBlob = await newZip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    return new File([anonymizedZipBlob], `anonymized_${Date.now()}.zip`, { type: 'application/zip' });
  };

  const processTarGzFile = async (tarGzFile: File): Promise<File> => {
    setProcessingMessage('Loading tar.gz file...');

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

    // Step 1: Read the gzipped file
    const arrayBuffer = await tarGzFile.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Step 2: Decompress with pako
    setProcessingMessage('Decompressing archive...');
    const decompressed = pako.inflate(uint8Array);

    // Step 3: Parse tar file
    setProcessingMessage('Extracting tar archive...');
    const tarFiles = parseTar(decompressed);

    // Step 4: Process files
    const JSZip = (await import('jszip')).default;
    const newZip = new JSZip();
    let processedCount = 0;
    let dicomCount = 0;
    let skippedCount = 0;
    const allChanges: AnonymizationManifest['changes'] = [];
    const allWarnings: string[] = [];

    // Count DICOM files (excluding system files)
    for (const { name } of tarFiles) {
      if (!shouldSkipFile(name) && name.toLowerCase().endsWith('.dcm')) {
        dicomCount++;
      }
    }

    setProcessingMessage(`Found ${dicomCount} DICOM file${dicomCount !== 1 ? 's' : ''} in archive...`);

    // Process each file in the tar
    for (const { name, data } of tarFiles) {
      // Skip system/metadata files
      if (shouldSkipFile(name)) {
        skippedCount++;
        console.log(`Skipping system file: ${name}`);
        continue;
      }

      // Check if it's a DICOM file
      if (name.toLowerCase().endsWith('.dcm')) {
        processedCount++;
        setProcessingMessage(`Anonymizing ${processedCount}/${dicomCount}: ${name}...`);

        try {
          const dcmFile = new File([data], name, { type: 'application/dicom' });

          // Anonymize using dicomedit with XNAT script
          const result = await dicomAnonymizer.anonymizeFile(dcmFile, { script, enablePixelCheck });
          allChanges.push(...result.changes);
          allWarnings.push(...result.warnings);

          // Add to new zip
          const anonymizedBuffer = await result.blob.arrayBuffer();

          console.log(`File ${name}: input=${data.byteLength}, output=${anonymizedBuffer.byteLength}, ratio=${(anonymizedBuffer.byteLength / data.byteLength * 100).toFixed(1)}%`);

          // Verify the output is reasonable
          const sizeRatio = anonymizedBuffer.byteLength / data.byteLength;
          if (sizeRatio < 0.8) {
            console.error(`Output file ${name} is ${(sizeRatio * 100).toFixed(1)}% of input size - seems corrupted! Using original file.`);
            newZip.file(name, data);
            skippedCount++;
          } else {
            newZip.file(name, anonymizedBuffer);
          }
        } catch (error) {
          console.error(`Failed to anonymize ${name}:`, error);
          console.warn(`Skipping file that failed to anonymize: ${name}`);
          skippedCount++;
          continue;
        }
      } else {
        // Non-DICOM file - copy as-is
        newZip.file(name, data);
      }
    }

    if (skippedCount > 0) {
      console.log(`Skipped ${skippedCount} file(s) (system files or failed to process)`);
    }

    // Store the manifest
    setAnonymizationManifest({
      timestamp: new Date().toISOString(),
      totalFiles: dicomCount,
      changes: allChanges,
      warnings: allWarnings,
    });

    // Warn if no changes were detected
    if (dicomCount > 0 && allChanges.length === 0) {
      console.warn('WARNING: Anonymization processed files but no changes were detected. This may indicate a problem with the anonymization script.');
    }

    setProcessingMessage('Creating anonymized archive...');
    const anonymizedZipBlob = await newZip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    return new File([anonymizedZipBlob], `anonymized_${Date.now()}.zip`, { type: 'application/zip' });
  };

  // Simple tar parser
  const parseTar = (tarData: Uint8Array): Array<{ name: string; data: Uint8Array }> => {
    const files: Array<{ name: string; data: Uint8Array }> = [];
    let offset = 0;

    while (offset < tarData.length) {
      // Read header
      const header = tarData.slice(offset, offset + 512);

      // Check if we've hit the end (two consecutive zero blocks)
      if (header.every(byte => byte === 0)) {
        break;
      }

      // Extract filename (first 100 bytes, null-terminated)
      const nameBytes = header.slice(0, 100);
      const nameEnd = nameBytes.indexOf(0);
      const name = new TextDecoder().decode(nameBytes.slice(0, nameEnd > 0 ? nameEnd : 100)).trim();

      if (!name) {
        break;
      }

      // Extract file size (124-135, octal string)
      const sizeBytes = header.slice(124, 136);
      const sizeStr = new TextDecoder().decode(sizeBytes).trim().replace(/\0/g, '');
      const size = parseInt(sizeStr, 8) || 0;

      // Extract type flag (156)
      const typeFlag = String.fromCharCode(header[156]);

      offset += 512; // Move past header

      // Only extract regular files (type '0' or '\0')
      if ((typeFlag === '0' || typeFlag === '\0') && size > 0) {
        const fileData = tarData.slice(offset, offset + size);
        files.push({ name, data: fileData });
      }

      // Move to next header (tar blocks are 512-byte aligned)
      offset += Math.ceil(size / 512) * 512;
    }

    return files;
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
    if (!selectedProject) return;
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

    if (!selectedProject) {
      alert('Please select a project before uploading files.');
      return;
    }

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
        // Process tar.gz/tgz file - extract, anonymize DICOMs, re-zip
        try {
          const anonymizedZip = await processTarGzFile(file);
          setSelectedFile(anonymizedZip);
          setIsProcessing(false);
          setProcessingMessage('');
        } catch (error) {
          console.error('Error processing tar.gz:', error);
          setIsProcessing(false);
          setProcessingMessage('');
          alert(`Failed to process tar.gz file: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
              Project <span className="text-red-500">*</span>
            </label>
            <select
              id="project"
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              disabled={isUploading}
              required
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

          {/* Enable Pixel Data Check */}
          <div>
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={enablePixelCheck}
                onChange={(e) => setEnablePixelCheck(e.target.checked)}
                disabled={isUploading}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:bg-gray-100 mt-0.5"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-700">
                  Check for text in pixel data (OCR)
                </span>
                <p className="text-xs text-gray-500 mt-0.5">
                  Scans DICOM images for burned-in text that may contain PHI. Slower but more thorough.
                </p>
              </div>
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
              onClick={() => !isUploading && selectedProject && fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                !selectedProject
                  ? 'border-gray-200 bg-gray-100 cursor-not-allowed opacity-50'
                  : isDragging
                  ? 'border-blue-500 bg-blue-50 cursor-pointer'
                  : selectedFile
                  ? 'border-green-300 bg-green-50 cursor-pointer'
                  : 'border-gray-300 hover:border-gray-400 bg-gray-50 cursor-pointer'
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
                    {!selectedProject
                      ? 'Select a project first'
                      : isDragging
                      ? 'Drop files or folders here'
                      : 'Drag & drop archive, folder, or DICOM files'}
                  </p>
                  {selectedProject && (
                    <>
                      <p className="text-xs text-gray-500">
                        Archives: .zip, .tar.gz, .tgz • DICOM: .dcm files or folders (auto-zipped)
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        or click to browse
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Anonymization Manifest Preview */}
          {anonymizationManifest && !isUploading && anonymizationManifest.totalFiles > 0 && (
            <div className={`border rounded-lg p-4 ${
              anonymizationManifest.changes.length > 0
                ? 'bg-blue-50 border-blue-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-start gap-2">
                {anonymizationManifest.changes.length > 0 ? (
                  <FileText className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className={`text-sm font-medium ${
                    anonymizationManifest.changes.length > 0 ? 'text-blue-900' : 'text-red-900'
                  }`}>
                    {anonymizationManifest.changes.length > 0 ? 'Anonymization Complete' : 'Anonymization Warning'}
                  </p>
                  <p className={`text-xs mt-1 ${
                    anonymizationManifest.changes.length > 0 ? 'text-blue-700' : 'text-red-700'
                  }`}>
                    {anonymizationManifest.totalFiles} file(s) processed, {anonymizationManifest.changes.length} change(s) recorded
                    {anonymizationManifest.changes.length === 0 && (
                      <span className="block mt-1">
                        No changes were detected. This may indicate a problem with the anonymization script or
                        the DICOM files may not contain identifiable information.
                      </span>
                    )}
                    {anonymizationManifest.warnings && anonymizationManifest.warnings.length > 0 && (
                      <span className="block mt-2 text-amber-700 font-medium">
                        ⚠️ {anonymizationManifest.warnings.length} warning(s): Text detected in pixel data - may contain burned-in PHI
                      </span>
                    )}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setShowManifestDialog(true)}
                      className={`text-xs hover:underline ${
                        anonymizationManifest.changes.length > 0
                          ? 'text-blue-700 hover:text-blue-900'
                          : 'text-red-700 hover:text-red-900'
                      }`}
                    >
                      {anonymizationManifest.changes.length > 0 ? 'View Changes' : 'View Manifest'}
                    </button>
                    {anonymizationManifest.changes.length > 0 && (
                      <>
                        <span className={anonymizationManifest.changes.length > 0 ? 'text-blue-400' : 'text-red-400'}>•</span>
                        <button
                          type="button"
                          onClick={downloadManifest}
                          className="text-xs text-blue-700 hover:text-blue-900 hover:underline"
                        >
                          Download Manifest
                        </button>
                      </>
                    )}
                    <span className={anonymizationManifest.changes.length > 0 ? 'text-blue-400' : 'text-red-400'}>•</span>
                    <button
                      type="button"
                      onClick={() => setShowScriptDialog(true)}
                      className={`text-xs hover:underline ${
                        anonymizationManifest.changes.length > 0
                          ? 'text-blue-700 hover:text-blue-900'
                          : 'text-red-700 hover:text-red-900'
                      }`}
                    >
                      Review Script
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={isUploading || (anonymizationManifest?.totalFiles > 0 && anonymizationManifest?.changes.length === 0)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              title={
                anonymizationManifest?.totalFiles > 0 && anonymizationManifest?.changes.length === 0
                  ? 'Upload blocked: Anonymization produced no changes. Please review the anonymization script.'
                  : ''
              }
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
            {anonymizationManifest?.totalFiles > 0 && anonymizationManifest?.changes.length === 0 && (
              <p className="text-xs text-red-600 mt-2">
                Upload blocked: Anonymization produced no changes. Review the script and ensure your DICOM files contain PHI data.
              </p>
            )}
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
              <div className="space-y-3">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800 mb-3">
                    Your data has been uploaded successfully to the {destination}.
                  </p>
                  <div className="flex gap-2">
                    {destination === 'prearchive' && (
                      <Link
                        to="/prearchive"
                        className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                      >
                        View Prearchive
                      </Link>
                    )}
                    {anonymizationManifest && anonymizationManifest.changes.length > 0 && (
                      <>
                        <button
                          onClick={() => setShowManifestDialog(true)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          View Anonymization Manifest
                        </button>
                        <button
                          onClick={downloadManifest}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          Download Manifest
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {anonymizationManifest && anonymizationManifest.changes.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">
                          Anonymization Summary
                        </p>
                        <p className="text-xs text-blue-700 mt-1">
                          {anonymizationManifest.totalFiles} file(s) processed, {anonymizationManifest.changes.length} change(s) recorded
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Anonymization Script Dialog */}
      {showScriptDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`bg-white rounded-lg shadow-xl p-6 overflow-y-auto transition-all ${
            isScriptMaximized ? 'w-full h-full max-w-none max-h-none' : 'max-w-4xl w-full max-h-[90vh]'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Shield className="w-6 h-6 text-indigo-600" />
                <h3 className="text-lg font-semibold text-gray-900">DICOM Anonymization Script</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsScriptMaximized(!isScriptMaximized)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title={isScriptMaximized ? 'Minimize' : 'Maximize'}
                >
                  {isScriptMaximized ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => setShowScriptDialog(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
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

              {/* Note about archive processing */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-green-800">
                    <p className="font-medium">Automatic Processing:</p>
                    <ul className="mt-1 space-y-1 list-disc list-inside">
                      <li><strong>ZIP files:</strong> Automatically extracted, DICOM files anonymized, then re-zipped</li>
                      <li><strong>TAR.GZ/TGZ files:</strong> Automatically decompressed, DICOM files anonymized, then re-zipped</li>
                      <li><strong>DICOM files:</strong> Automatically anonymized and zipped</li>
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

      {/* Anonymization Manifest Dialog */}
      {showManifestDialog && anonymizationManifest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`bg-white rounded-lg shadow-xl p-6 overflow-y-auto transition-all ${
            isManifestMaximized ? 'w-full h-full max-w-none max-h-none' : 'max-w-6xl w-full max-h-[90vh]'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-indigo-600" />
                <h3 className="text-lg font-semibold text-gray-900">Anonymization Manifest</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsManifestMaximized(!isManifestMaximized)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title={isManifestMaximized ? 'Restore' : 'Maximize'}
                >
                  {isManifestMaximized ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => setShowManifestDialog(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {/* Warnings */}
              {anonymizationManifest.warnings && anonymizationManifest.warnings.length > 0 && (
                <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-amber-900 font-semibold mb-2">Pixel Data Warnings</p>
                      <ul className="text-sm text-amber-800 space-y-1">
                        {anonymizationManifest.warnings.map((warning, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-amber-600 mt-0.5">•</span>
                            <span>{warning}</span>
                          </li>
                        ))}
                      </ul>
                      <p className="text-xs text-amber-700 mt-2">
                        These files may contain PHI burned into the pixel data. DICOM tag anonymization cannot remove burned-in text.
                        Manual review is recommended.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-blue-600 font-medium">Total Files</p>
                    <p className="text-blue-900 text-lg font-semibold">{anonymizationManifest.totalFiles}</p>
                  </div>
                  <div>
                    <p className="text-blue-600 font-medium">Changes Recorded</p>
                    <p className="text-blue-900 text-lg font-semibold">{anonymizationManifest.changes.length}</p>
                  </div>
                  <div>
                    <p className="text-blue-600 font-medium">Timestamp</p>
                    <p className="text-blue-900 text-sm">{new Date(anonymizationManifest.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Changes Table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                {anonymizationManifest.changes.length > 0 ? (
                  <div className={`overflow-x-auto ${isManifestMaximized ? 'max-h-[calc(100vh-300px)]' : 'max-h-96'}`}>
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <button
                              onClick={() => handleManifestSort('fileName')}
                              className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                            >
                              File Name
                              {manifestSortField === 'fileName' ? (
                                manifestSortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 opacity-50" />
                              )}
                            </button>
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <button
                              onClick={() => handleManifestSort('tag')}
                              className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                            >
                              DICOM Tag
                              {manifestSortField === 'tag' ? (
                                manifestSortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 opacity-50" />
                              )}
                            </button>
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <button
                              onClick={() => handleManifestSort('tagName')}
                              className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                            >
                              Tag Name
                              {manifestSortField === 'tagName' ? (
                                manifestSortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                              ) : (
                                <ArrowUpDown className="w-3 h-3 opacity-50" />
                              )}
                            </button>
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Original Value
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            New Value
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {getSortedManifestChanges().map((change, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900 font-mono">
                              {change.fileName}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                              {change.tag}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {change.tagName}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {change.originalValue || <span className="text-gray-400 italic">(empty)</span>}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {change.newValue || <span className="text-gray-400 italic">(empty)</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center bg-gray-50">
                    <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-900 mb-2">No Changes Detected</p>
                    <p className="text-xs text-gray-600 max-w-md mx-auto">
                      The anonymization process ran successfully, but no DICOM tags were modified.
                      This could mean the files were already anonymized or don't contain the tags
                      targeted by the anonymization script.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={downloadManifest}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                <Download className="w-4 h-4" />
                Download as CSV
              </button>
              <button
                onClick={() => setShowManifestDialog(false)}
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
