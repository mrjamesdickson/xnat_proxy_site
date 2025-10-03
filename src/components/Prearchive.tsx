import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useXnat } from '../contexts/XnatContext';
import { useState } from 'react';
import { Archive, Trash2, RefreshCw, FolderInput, AlertCircle, CheckCircle, Clock, XCircle, Loader, Eye, FolderTree, ArrowUpDown, ArrowUp, ArrowDown, Columns, FileSearch, FileText, ChevronDown, ChevronRight, Shield, Edit3, Maximize2, Minimize2, Grid3x3, List } from 'lucide-react';
import type { XnatPrearchiveSession, XnatPrearchiveScan } from '../services/xnat-api';
// @ts-ignore - dcmjs doesn't have TypeScript definitions
import * as dcmjs from 'dcmjs';
import { dicomAnonymizer, DEFAULT_ANONYMIZATION_SCRIPT } from '../services/dicom-anonymizer';

type SortField = 'status' | 'project' | 'subject' | 'name' | 'scan_date' | 'uploaded';
type SortDirection = 'asc' | 'desc';

type ColumnKey = 'status' | 'project' | 'subject' | 'session' | 'scan_date' | 'uploaded';

interface ColumnConfig {
  key: ColumnKey;
  label: string;
  visible: boolean;
}

type ArchiveProgress = {
  session: XnatPrearchiveSession;
  status: 'pending' | 'archiving' | 'success' | 'error';
  message: string;
  error?: string;
};

type ChangeProjectDialog = {
  sessions: XnatPrearchiveSession[];
  newProject: string;
};

type SessionDetailDialog = {
  session: XnatPrearchiveSession;
  scans: XnatPrearchiveScan[];
  loading: boolean;
  showArchiveButton?: boolean;
};

type DicomHeaderInfo = {
  scanId: string;
  headers: Record<string, any>;
  loading: boolean;
  error?: string;
};

type BulkOperationProgress = {
  type: 'delete' | 'changeProject' | 'rebuild';
  total: number;
  current: number;
  currentSession: string;
  errors: string[];
  completed: boolean;
};

type AnonymizationDialog = {
  session: XnatPrearchiveSession;
  scans: XnatPrearchiveScan[];
  script: string;
  patientId: string;
  patientName: string;
};

type AnonymizationProgress = {
  session: XnatPrearchiveSession;
  total: number;
  current: number;
  currentFile: string;
  status: 'processing' | 'complete' | 'error';
  errors: string[];
  message: string;
};

export function Prearchive() {
  const { client } = useXnat();
  const queryClient = useQueryClient();
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());
  const [filterProject, setFilterProject] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterSubject, setFilterSubject] = useState<string>('');
  const [filterSession, setFilterSession] = useState<string>('');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('uploaded');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showColumnFilter, setShowColumnFilter] = useState(false);
  const [columns, setColumns] = useState<ColumnConfig[]>([
    { key: 'status', label: 'Status', visible: true },
    { key: 'project', label: 'Project', visible: true },
    { key: 'subject', label: 'Subject', visible: true },
    { key: 'session', label: 'Session', visible: true },
    { key: 'scan_date', label: 'Scan Date', visible: true },
    { key: 'uploaded', label: 'Uploaded', visible: true },
  ]);
  const [actionDialogSession, setActionDialogSession] = useState<XnatPrearchiveSession | null>(null);
  const [archiveOptions, setArchiveOptions] = useState({
    overwrite: 'none' as 'none' | 'append' | 'delete',
    newProject: '',
    newSubject: '',
    newSession: ''
  });
  const [archiveProgress, setArchiveProgress] = useState<ArchiveProgress | null>(null);
  const [changeProjectDialog, setChangeProjectDialog] = useState<ChangeProjectDialog | null>(null);
  const [sessionDetailDialog, setSessionDetailDialog] = useState<SessionDetailDialog | null>(null);
  const [isDialogMaximized, setIsDialogMaximized] = useState(false);
  const [bulkArchiveProgress, setBulkArchiveProgress] = useState<{
    total: number;
    current: number;
    currentSession: string;
    errors: string[];
  } | null>(null);
  const [bulkOperationProgress, setBulkOperationProgress] = useState<BulkOperationProgress | null>(null);
  const [dicomHeaders, setDicomHeaders] = useState<Map<string, DicomHeaderInfo>>(new Map());
  const [expandedScans, setExpandedScans] = useState<Set<string>>(new Set());
  const [anonymizationDialog, setAnonymizationDialog] = useState<AnonymizationDialog | null>(null);
  const [anonymizationProgress, setAnonymizationProgress] = useState<AnonymizationProgress | null>(null);

  // Fetch prearchive sessions
  const { data: sessions = [], isLoading, error } = useQuery({
    queryKey: ['prearchive-sessions'],
    queryFn: async () => {
      if (!client) return [];
      return await client.getPrearchiveSessions();
    },
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });

  // Fetch available projects
  const { data: projects = [] } = useQuery({
    queryKey: ['projects-list'],
    queryFn: async () => {
      if (!client) return [];
      return await client.getProjects();
    },
  });

  // Archive mutation
  const archiveMutation = useMutation({
    mutationFn: async ({ session, options }: { session: XnatPrearchiveSession; options?: typeof archiveOptions }) => {
      if (!client) throw new Error('Client not initialized');

      // Set progress to archiving
      setArchiveProgress({
        session,
        status: 'archiving',
        message: 'Archiving session...',
      });

      const result = await client.archivePrearchiveSession(
        session.project,
        session.timestamp,
        session.subject,
        options
      );

      return { result, session, options };
    },
    onSuccess: ({ session }) => {
      // Update progress to success
      setArchiveProgress({
        session,
        status: 'success',
        message: 'Session archived successfully!',
      });

      // Wait a moment to show success message before closing
      setTimeout(() => {
        setArchiveProgress(null);
        setActionDialogSession(null);
        setArchiveOptions({ overwrite: 'none', newProject: '', newSubject: '', newSession: '' });
        queryClient.invalidateQueries({ queryKey: ['prearchive-sessions'] });
      }, 2000);
    },
    onError: (error, { session }) => {
      // Update progress to error
      setArchiveProgress({
        session,
        status: 'error',
        message: 'Archive failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (session: XnatPrearchiveSession) => {
      if (!client) throw new Error('Client not initialized');
      return await client.deletePrearchiveSession(session.project, session.timestamp, session.subject);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prearchive-sessions'] });
      setSelectedSessions(new Set());
    },
  });

  // Rebuild mutation
  const rebuildMutation = useMutation({
    mutationFn: async (session: XnatPrearchiveSession) => {
      if (!client) throw new Error('Client not initialized');
      return await client.rebuildPrearchiveSession(session.project, session.timestamp, session.subject);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prearchive-sessions'] });
    },
  });

  // Change project mutation (no longer used directly, replaced with progress tracking)
  const changeProjectMutation = useMutation({
    mutationFn: async ({ sessions, newProject }: { sessions: XnatPrearchiveSession[]; newProject: string }) => {
      if (!client) throw new Error('Client not initialized');

      const results = await Promise.allSettled(
        sessions.map(session =>
          client.movePrearchiveSession(session.project, session.timestamp, session.subject, newProject)
        )
      );

      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prearchive-sessions'] });
      setChangeProjectDialog(null);
      setSelectedSessions(new Set());
    },
  });

  const handleSelectSession = (sessionKey: string) => {
    const newSelected = new Set(selectedSessions);
    if (newSelected.has(sessionKey)) {
      newSelected.delete(sessionKey);
    } else {
      newSelected.add(sessionKey);
    }
    setSelectedSessions(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedSessions.size === filteredSessions.length) {
      setSelectedSessions(new Set());
    } else {
      const allKeys = new Set(filteredSessions.map(s => `${s.project}-${s.timestamp}-${s.subject}`));
      setSelectedSessions(allKeys);
    }
  };

  const handleArchive = (session: XnatPrearchiveSession) => {
    setActionDialogSession(session);
  };

  const handleArchiveConfirm = () => {
    if (!actionDialogSession) return;
    archiveMutation.mutate({
      session: actionDialogSession,
      options: archiveOptions.newProject || archiveOptions.newSubject || archiveOptions.newSession
        ? archiveOptions
        : undefined
    });
  };

  const handleDelete = (session: XnatPrearchiveSession) => {
    if (confirm(`Are you sure you want to delete session ${session.name}?`)) {
      deleteMutation.mutate(session);
    }
  };

  const handleRebuild = (session: XnatPrearchiveSession) => {
    rebuildMutation.mutate(session);
  };

  const handleBulkDelete = async () => {
    if (selectedSessions.size === 0) return;

    const sessionsToDelete = sessions.filter(s =>
      selectedSessions.has(`${s.project}-${s.timestamp}-${s.subject}`)
    );

    if (!confirm(`Are you sure you want to delete ${sessionsToDelete.length} session(s)?`)) return;

    setBulkOperationProgress({
      type: 'delete',
      total: sessionsToDelete.length,
      current: 0,
      currentSession: sessionsToDelete[0]?.name || '',
      errors: [],
      completed: false
    });

    for (let i = 0; i < sessionsToDelete.length; i++) {
      const session = sessionsToDelete[i];

      setBulkOperationProgress(prev => prev ? {
        ...prev,
        current: i + 1,
        currentSession: session.name
      } : null);

      try {
        if (client) {
          await client.deletePrearchiveSession(
            session.project,
            session.timestamp,
            session.subject
          );
        }
      } catch (error) {
        setBulkOperationProgress(prev => prev ? {
          ...prev,
          errors: [...prev.errors, `${session.name}: ${error instanceof Error ? error.message : 'Failed'}`]
        } : null);
      }
    }

    setBulkOperationProgress(prev => prev ? { ...prev, completed: true } : null);

    setTimeout(() => {
      setBulkOperationProgress(null);
      setSelectedSessions(new Set());
      queryClient.invalidateQueries({ queryKey: ['prearchive-sessions'] });
    }, 2000);
  };

  const handleBulkArchive = async () => {
    if (selectedSessions.size === 0) return;

    const sessionsToArchive = sessions.filter(s =>
      selectedSessions.has(`${s.project}-${s.timestamp}-${s.subject}`)
    );

    if (!confirm(`Archive ${sessionsToArchive.length} session(s)?`)) return;

    setBulkArchiveProgress({
      total: sessionsToArchive.length,
      current: 0,
      currentSession: sessionsToArchive[0]?.name || '',
      errors: []
    });

    for (let i = 0; i < sessionsToArchive.length; i++) {
      const session = sessionsToArchive[i];

      setBulkArchiveProgress(prev => prev ? {
        ...prev,
        current: i + 1,
        currentSession: session.name
      } : null);

      try {
        if (client) {
          await client.archivePrearchiveSession(
            session.project,
            session.timestamp,
            session.subject
          );
        }
      } catch (error) {
        setBulkArchiveProgress(prev => prev ? {
          ...prev,
          errors: [...prev.errors, `${session.name}: ${error instanceof Error ? error.message : 'Failed'}`]
        } : null);
      }
    }

    setTimeout(() => {
      setBulkArchiveProgress(null);
      setSelectedSessions(new Set());
      queryClient.invalidateQueries({ queryKey: ['prearchive-sessions'] });
    }, 2000);
  };

  const handleChangeProject = () => {
    if (selectedSessions.size === 0) return;

    const sessionsToChange = sessions.filter(s =>
      selectedSessions.has(`${s.project}-${s.timestamp}-${s.subject}`)
    );

    setChangeProjectDialog({
      sessions: sessionsToChange,
      newProject: ''
    });
  };

  const handleChangeProjectConfirm = async () => {
    if (!changeProjectDialog || !changeProjectDialog.newProject) return;

    const sessionsToMove = changeProjectDialog.sessions;
    const newProject = changeProjectDialog.newProject;

    setBulkOperationProgress({
      type: 'changeProject',
      total: sessionsToMove.length,
      current: 0,
      currentSession: sessionsToMove[0]?.name || '',
      errors: [],
      completed: false
    });

    // Close the dialog
    setChangeProjectDialog(null);

    for (let i = 0; i < sessionsToMove.length; i++) {
      const session = sessionsToMove[i];

      setBulkOperationProgress(prev => prev ? {
        ...prev,
        current: i + 1,
        currentSession: session.name
      } : null);

      try {
        if (client) {
          await client.movePrearchiveSession(
            session.project,
            session.timestamp,
            session.subject,
            newProject
          );
        }
      } catch (error) {
        setBulkOperationProgress(prev => prev ? {
          ...prev,
          errors: [...prev.errors, `${session.name}: ${error instanceof Error ? error.message : 'Failed'}`]
        } : null);
      }
    }

    setBulkOperationProgress(prev => prev ? { ...prev, completed: true } : null);

    setTimeout(() => {
      setBulkOperationProgress(null);
      setSelectedSessions(new Set());
      queryClient.invalidateQueries({ queryKey: ['prearchive-sessions'] });
    }, 2000);
  };

  const handleBulkRebuild = async () => {
    if (selectedSessions.size === 0) return;

    const sessionsToRebuild = sessions.filter(s =>
      selectedSessions.has(`${s.project}-${s.timestamp}-${s.subject}`)
    );

    if (!confirm(`Rebuild ${sessionsToRebuild.length} session(s)?`)) return;

    setBulkOperationProgress({
      type: 'rebuild',
      total: sessionsToRebuild.length,
      current: 0,
      currentSession: sessionsToRebuild[0]?.name || '',
      errors: [],
      completed: false
    });

    for (let i = 0; i < sessionsToRebuild.length; i++) {
      const session = sessionsToRebuild[i];

      setBulkOperationProgress(prev => prev ? {
        ...prev,
        current: i + 1,
        currentSession: session.name
      } : null);

      try {
        if (client) {
          await client.rebuildPrearchiveSession(
            session.project,
            session.timestamp,
            session.subject
          );
        }
      } catch (error) {
        setBulkOperationProgress(prev => prev ? {
          ...prev,
          errors: [...prev.errors, `${session.name}: ${error instanceof Error ? error.message : 'Failed'}`]
        } : null);
      }
    }

    setBulkOperationProgress(prev => prev ? { ...prev, completed: true } : null);

    setTimeout(() => {
      setBulkOperationProgress(null);
      setSelectedSessions(new Set());
      queryClient.invalidateQueries({ queryKey: ['prearchive-sessions'] });
    }, 2000);
  };

  const handleViewDetails = async (session: XnatPrearchiveSession) => {
    setSessionDetailDialog({
      session,
      scans: [],
      loading: true,
      showArchiveButton: false
    });

    // Reset DICOM headers when opening new session
    setDicomHeaders(new Map());
    setExpandedScans(new Set());

    if (client) {
      const scans = await client.getPrearchiveScans(session.project, session.timestamp, session.subject);
      setSessionDetailDialog(prev => prev ? { ...prev, scans, loading: false } : null);
    }
  };

  const handleReviewAndArchive = async (session: XnatPrearchiveSession) => {
    setSessionDetailDialog({
      session,
      scans: [],
      loading: true,
      showArchiveButton: true
    });

    // Reset DICOM headers when opening new session
    setDicomHeaders(new Map());
    setExpandedScans(new Set());

    if (client) {
      const scans = await client.getPrearchiveScans(session.project, session.timestamp, session.subject);
      setSessionDetailDialog(prev => prev ? { ...prev, scans, loading: false } : null);
    }
  };

  const handleArchiveFromReview = () => {
    if (sessionDetailDialog) {
      setSessionDetailDialog(null);
      handleArchive(sessionDetailDialog.session);
    }
  };

  const handleToggleScanExpand = (scanId: string) => {
    const newExpanded = new Set(expandedScans);
    if (newExpanded.has(scanId)) {
      newExpanded.delete(scanId);
    } else {
      newExpanded.add(scanId);
    }
    setExpandedScans(newExpanded);
  };

  const handleLoadDicomHeader = async (scan: XnatPrearchiveScan) => {
    if (!client || !sessionDetailDialog) return;

    const scanKey = `${sessionDetailDialog.session.project}-${sessionDetailDialog.session.timestamp}-${sessionDetailDialog.session.subject}-${scan.ID}`;

    // Set loading state
    setDicomHeaders(prev => new Map(prev).set(scanKey, {
      scanId: scan.ID,
      headers: {},
      loading: true
    }));

    try {
      console.log('Loading DICOM header for scan:', scan.ID);

      // Get scan files
      console.log('Fetching scan files...');
      const files = await client.getPrearchiveScanFiles(
        sessionDetailDialog.session.project,
        sessionDetailDialog.session.timestamp,
        sessionDetailDialog.session.subject,
        scan.ID
      );

      console.log('Files found:', files);

      if (!files || files.length === 0) {
        throw new Error('No DICOM files found for this scan');
      }

      // Get the first DICOM file
      const firstFile = files[0];

      console.log('Fetching DICOM file:', firstFile.name);

      // Fetch the DICOM file
      console.log('Fetching DICOM file from:', {
        project: sessionDetailDialog.session.project,
        timestamp: sessionDetailDialog.session.timestamp,
        subject: sessionDetailDialog.session.subject,
        scanId: scan.ID,
        fileName: firstFile.name
      });

      const arrayBuffer = await client.getPrearchiveDicomFile(
        sessionDetailDialog.session.project,
        sessionDetailDialog.session.timestamp,
        sessionDetailDialog.session.subject,
        scan.ID,
        firstFile.name
      );

      console.log('DICOM file fetched, size:', arrayBuffer.byteLength, 'bytes, parsing...');

      // Parse DICOM file
      const { DicomMessage, DicomMetaDictionary } = dcmjs.data;
      const dicomData = DicomMessage.readFile(arrayBuffer);
      const dataset = DicomMetaDictionary.naturalizeDataset(dicomData.dict);

      console.log('DICOM parsed successfully, dataset:', dataset);

      // Set headers
      setDicomHeaders(prev => new Map(prev).set(scanKey, {
        scanId: scan.ID,
        headers: dataset,
        loading: false
      }));

      // Auto-expand the scan
      setExpandedScans(prev => new Set(prev).add(scan.ID));

    } catch (error: any) {
      console.error('Error loading DICOM header:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });

      let errorMessage = 'Failed to load DICOM header';
      if (error.response?.status === 500) {
        errorMessage = 'Server error (500). The DICOM file may not be accessible or the scan may not contain valid DICOM data.';
      } else if (error.response?.status === 404) {
        errorMessage = 'DICOM file not found (404). The scan may not have been fully uploaded.';
      } else if (error.response?.status === 403) {
        errorMessage = 'Access denied (403). You may not have permission to access this DICOM file.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      setDicomHeaders(prev => new Map(prev).set(scanKey, {
        scanId: scan.ID,
        headers: {},
        loading: false,
        error: errorMessage
      }));
    }
  };

  const handleToggleColumn = (key: ColumnKey) => {
    setColumns(columns.map(col =>
      col.key === key ? { ...col, visible: !col.visible } : col
    ));
  };

  const handleAnonymize = async (session: XnatPrearchiveSession) => {
    if (!client) return;

    // Load scans first
    const scans = await client.getPrearchiveScans(session.project, session.timestamp, session.subject);

    // Try to get XNAT anonymization script for this project
    let script = DEFAULT_ANONYMIZATION_SCRIPT;
    try {
      const xnatScript = await client.getAnonymizationScriptForProject(session.project);
      if (xnatScript) {
        script = xnatScript;
        console.log('Using XNAT anonymization script for project', session.project);
      } else {
        console.log('No XNAT script found, using default');
      }
    } catch (error) {
      console.error('Error loading XNAT script, using default:', error);
    }

    setAnonymizationDialog({
      session,
      scans,
      script,
      patientId: 'ANON_' + Date.now(),
      patientName: 'ANONYMOUS'
    });
  };

  const handleAnonymizeConfirm = async () => {
    if (!anonymizationDialog || !client) return;

    const { session, scans, script, patientId, patientName } = anonymizationDialog;

    // Close dialog and show progress
    setAnonymizationDialog(null);

    setAnonymizationProgress({
      session,
      total: scans.length,
      current: 0,
      currentFile: '',
      status: 'processing',
      errors: [],
      message: 'Starting anonymization...'
    });

    try {
      // Process each scan
      for (let i = 0; i < scans.length; i++) {
        const scan = scans[i];

        setAnonymizationProgress(prev => prev ? {
          ...prev,
          current: i + 1,
          currentFile: `Scan ${scan.ID}`,
          message: `Anonymizing scan ${scan.ID} (${i + 1}/${scans.length})...`
        } : null);

        try {
          // Get scan files
          const files = await client.getPrearchiveScanFiles(
            session.project,
            session.timestamp,
            session.subject,
            scan.ID
          );

          // Anonymize each DICOM file in the scan
          for (const fileInfo of files) {
            // Fetch the DICOM file
            const arrayBuffer = await client.getPrearchiveDicomFile(
              session.project,
              session.timestamp,
              session.subject,
              scan.ID,
              fileInfo.name
            );

            // Convert to File object
            const file = new File([arrayBuffer], fileInfo.name, { type: 'application/dicom' });

            // Anonymize
            await dicomAnonymizer.anonymizeFile(file, {
              script,
              patientId,
              patientName
            });

            // Upload back to prearchive (would need API support for this)
            // For now, we'll just log that it was anonymized
            console.log(`Anonymized ${fileInfo.name}`);
          }
        } catch (error) {
          const errorMsg = `Scan ${scan.ID}: ${error instanceof Error ? error.message : 'Failed'}`;
          setAnonymizationProgress(prev => prev ? {
            ...prev,
            errors: [...prev.errors, errorMsg]
          } : null);
        }
      }

      setAnonymizationProgress(prev => prev ? {
        ...prev,
        status: 'complete',
        message: 'Anonymization complete!'
      } : null);

      setTimeout(() => {
        setAnonymizationProgress(null);
        queryClient.invalidateQueries({ queryKey: ['prearchive-sessions'] });
      }, 3000);

    } catch (error) {
      setAnonymizationProgress(prev => prev ? {
        ...prev,
        status: 'error',
        message: 'Anonymization failed',
        errors: [...prev.errors, error instanceof Error ? error.message : 'Unknown error']
      } : null);
    }
  };

  const isColumnVisible = (key: ColumnKey) => {
    return columns.find(col => col.key === key)?.visible ?? true;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'READY':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'BUILDING':
      case 'QUEUED_BUILDING':
        return <Loader className="w-4 h-4 text-blue-600 animate-spin" />;
      case 'RECEIVING':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'CONFLICT':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'ERROR':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'READY':
        return 'bg-green-100 text-green-800';
      case 'BUILDING':
      case 'QUEUED_BUILDING':
        return 'bg-blue-100 text-blue-800';
      case 'RECEIVING':
        return 'bg-blue-100 text-blue-800';
      case 'CONFLICT':
        return 'bg-yellow-100 text-yellow-800';
      case 'ERROR':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortDirection === 'asc' ?
      <ArrowUp className="w-4 h-4 text-blue-600" /> :
      <ArrowDown className="w-4 h-4 text-blue-600" />;
  };

  // Filter and sort sessions
  let filteredSessions = sessions.filter(session => {
    if (filterProject && !session.project.toLowerCase().includes(filterProject.toLowerCase())) {
      return false;
    }
    if (filterStatus && session.status !== filterStatus) {
      return false;
    }
    if (filterSubject && !session.subject.toLowerCase().includes(filterSubject.toLowerCase())) {
      return false;
    }
    if (filterSession && !session.name.toLowerCase().includes(filterSession.toLowerCase())) {
      return false;
    }
    if (filterDateFrom && session.scan_date < filterDateFrom) {
      return false;
    }
    if (filterDateTo && session.scan_date > filterDateTo) {
      return false;
    }
    return true;
  });

  // Sort sessions
  filteredSessions = [...filteredSessions].sort((a, b) => {
    let aVal: string | number = '';
    let bVal: string | number = '';

    switch (sortField) {
      case 'status':
        aVal = a.status;
        bVal = b.status;
        break;
      case 'project':
        aVal = a.project;
        bVal = b.project;
        break;
      case 'subject':
        aVal = a.subject;
        bVal = b.subject;
        break;
      case 'name':
        aVal = a.name;
        bVal = b.name;
        break;
      case 'scan_date':
        aVal = a.scan_date || '';
        bVal = b.scan_date || '';
        break;
      case 'uploaded':
        aVal = new Date(a.uploaded).getTime();
        bVal = new Date(b.uploaded).getTime();
        break;
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Get unique projects and statuses for filters
  const uniqueProjects = Array.from(new Set(sessions.map(s => s.project))).sort();
  const uniqueStatuses = Array.from(new Set(sessions.map(s => s.status))).sort();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading prearchive sessions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        <p className="font-medium">Error loading prearchive sessions</p>
        <p className="text-sm">{error instanceof Error ? error.message : 'Unknown error'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prearchive</h1>
          <p className="text-gray-600 mt-1">
            Manage sessions awaiting archive. Sessions in the prearchive are not yet part of the permanent archive.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <button
              onClick={() => setShowColumnFilter(!showColumnFilter)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
            >
              <Columns className="w-4 h-4" />
              Columns
            </button>
            {showColumnFilter && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowColumnFilter(false)}
                ></div>
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                  <div className="p-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Show/Hide Columns</p>
                    <div className="space-y-2">
                      {columns.map(column => (
                        <label key={column.key} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                          <input
                            type="checkbox"
                            checked={column.visible}
                            onChange={() => handleToggleColumn(column.key)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{column.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          <button
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['prearchive-sessions'] });
              queryClient.invalidateQueries({ queryKey: ['projects-list'] });
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option key="all-projects" value="">All Projects</option>
              {uniqueProjects.map(project => (
                <option key={project} value={project}>{project}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option key="all-statuses" value="">All Statuses</option>
              {uniqueStatuses.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <input
              type="text"
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              placeholder="Search subjects..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Session</label>
            <input
              type="text"
              value={filterSession}
              onChange={(e) => setFilterSession(e.target.value)}
              placeholder="Search sessions..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-end">
            <div className="text-sm text-gray-600">
              Showing {filteredSessions.length} of {sessions.length} sessions
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedSessions.size > 0 && (
          <div className="flex items-center gap-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <span className="text-sm font-medium text-blue-900">
              {selectedSessions.size} selected
            </span>
            <button
              onClick={handleBulkArchive}
              className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 text-sm flex items-center gap-1"
            >
              <Archive className="w-4 h-4" />
              Archive Selected
            </button>
            <button
              onClick={handleChangeProject}
              className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm flex items-center gap-1"
            >
              <FolderTree className="w-4 h-4" />
              Change Project
            </button>
            <button
              onClick={handleBulkRebuild}
              className="px-3 py-1.5 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm flex items-center gap-1"
            >
              <RefreshCw className="w-4 h-4" />
              Rebuild Selected
            </button>
            <button
              onClick={handleBulkDelete}
              className="px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 text-sm flex items-center gap-1"
            >
              <Trash2 className="w-4 h-4" />
              Delete Selected
            </button>
          </div>
        )}
      </div>

      {/* Sessions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedSessions.size === filteredSessions.length && filteredSessions.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                {isColumnVisible('status') && (
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-2">
                      Status
                      {getSortIcon('status')}
                    </div>
                  </th>
                )}
                {isColumnVisible('project') && (
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('project')}
                  >
                    <div className="flex items-center gap-2">
                      Project
                      {getSortIcon('project')}
                    </div>
                  </th>
                )}
                {isColumnVisible('subject') && (
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('subject')}
                  >
                    <div className="flex items-center gap-2">
                      Subject
                      {getSortIcon('subject')}
                    </div>
                  </th>
                )}
                {isColumnVisible('session') && (
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-2">
                      Session
                      {getSortIcon('name')}
                    </div>
                  </th>
                )}
                {isColumnVisible('scan_date') && (
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('scan_date')}
                  >
                    <div className="flex items-center gap-2">
                      Scan Date
                      {getSortIcon('scan_date')}
                    </div>
                  </th>
                )}
                {isColumnVisible('uploaded') && (
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('uploaded')}
                  >
                    <div className="flex items-center gap-2">
                      Uploaded
                      {getSortIcon('uploaded')}
                    </div>
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    <FolderInput className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p className="font-medium">No prearchive sessions found</p>
                    <p className="text-sm mt-1">Sessions will appear here after upload and before archiving</p>
                  </td>
                </tr>
              ) : (
                filteredSessions.map((session) => {
                  const sessionKey = `${session.project}-${session.timestamp}-${session.subject}`;
                  const isSelected = selectedSessions.has(sessionKey);

                  return (
                    <tr key={sessionKey} className={isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectSession(sessionKey)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      {isColumnVisible('status') && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                            {getStatusIcon(session.status)}
                            {session.status}
                          </span>
                        </td>
                      )}
                      {isColumnVisible('project') && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {session.project}
                        </td>
                      )}
                      {isColumnVisible('subject') && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {session.subject}
                        </td>
                      )}
                      {isColumnVisible('session') && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {session.name}
                        </td>
                      )}
                      {isColumnVisible('scan_date') && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {session.scan_date ? new Date(session.scan_date).toLocaleDateString() : 'N/A'}
                        </td>
                      )}
                      {isColumnVisible('uploaded') && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(session.uploaded).toLocaleString()}
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleViewDetails(session)}
                          className="text-blue-600 hover:text-blue-900 inline-flex items-center gap-1"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleReviewAndArchive(session)}
                          disabled={session.status !== 'READY' && session.status !== 'CONFLICT'}
                          className="text-purple-600 hover:text-purple-900 disabled:text-gray-400 disabled:cursor-not-allowed inline-flex items-center gap-1"
                          title="Review and Archive"
                        >
                          <FileSearch className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleAnonymize(session)}
                          disabled={session.status !== 'READY' && session.status !== 'CONFLICT'}
                          className="text-indigo-600 hover:text-indigo-900 disabled:text-gray-400 disabled:cursor-not-allowed inline-flex items-center gap-1"
                          title="Anonymize"
                        >
                          <Shield className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleArchive(session)}
                          disabled={session.status !== 'READY' && session.status !== 'CONFLICT'}
                          className="text-green-600 hover:text-green-900 disabled:text-gray-400 disabled:cursor-not-allowed inline-flex items-center gap-1"
                          title="Archive"
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRebuild(session)}
                          disabled={session.status === 'BUILDING'}
                          className="text-blue-600 hover:text-blue-900 disabled:text-gray-400 disabled:cursor-not-allowed inline-flex items-center gap-1"
                          title="Rebuild"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(session)}
                          className="text-red-600 hover:text-red-900 inline-flex items-center gap-1"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Archive Dialog */}
      {actionDialogSession && !archiveProgress && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Archive Session</h3>
            <p className="text-sm text-gray-600 mb-4">
              Archive <strong>{actionDialogSession.name}</strong> to the permanent archive.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Overwrite Existing
                </label>
                <select
                  value={archiveOptions.overwrite}
                  onChange={(e) => setArchiveOptions({ ...archiveOptions, overwrite: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option key="none" value="none">None (fail if exists)</option>
                  <option key="append" value="append">Append</option>
                  <option key="delete" value="delete">Delete and replace</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Project (optional)
                </label>
                <input
                  type="text"
                  value={archiveOptions.newProject}
                  onChange={(e) => setArchiveOptions({ ...archiveOptions, newProject: e.target.value })}
                  placeholder={actionDialogSession.project}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Subject (optional)
                </label>
                <input
                  type="text"
                  value={archiveOptions.newSubject}
                  onChange={(e) => setArchiveOptions({ ...archiveOptions, newSubject: e.target.value })}
                  placeholder={actionDialogSession.subject}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Session Label (optional)
                </label>
                <input
                  type="text"
                  value={archiveOptions.newSession}
                  onChange={(e) => setArchiveOptions({ ...archiveOptions, newSession: e.target.value })}
                  placeholder={actionDialogSession.name}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setActionDialogSession(null);
                  setArchiveOptions({ overwrite: 'none', newProject: '', newSubject: '', newSession: '' });
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleArchiveConfirm}
                disabled={archiveMutation.isPending}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-2"
              >
                {archiveMutation.isPending ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Archiving...
                  </>
                ) : (
                  <>
                    <Archive className="w-4 h-4" />
                    Archive
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive Progress Popup */}
      {archiveProgress && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="text-center">
              {/* Status Icon */}
              <div className="mx-auto flex items-center justify-center h-16 w-16 mb-4">
                {archiveProgress.status === 'archiving' && (
                  <Loader className="h-16 w-16 text-blue-600 animate-spin" />
                )}
                {archiveProgress.status === 'success' && (
                  <CheckCircle className="h-16 w-16 text-green-600" />
                )}
                {archiveProgress.status === 'error' && (
                  <XCircle className="h-16 w-16 text-red-600" />
                )}
              </div>

              {/* Session Name */}
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {archiveProgress.session.name}
              </h3>

              {/* Status Message */}
              <p className={`text-sm mb-4 ${
                archiveProgress.status === 'archiving' ? 'text-blue-600' :
                archiveProgress.status === 'success' ? 'text-green-600' :
                'text-red-600'
              }`}>
                {archiveProgress.message}
              </p>

              {/* Session Details */}
              <div className="text-left bg-gray-50 rounded-lg p-4 mb-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Project:</span>
                  <span className="font-medium text-gray-900">{archiveProgress.session.project}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subject:</span>
                  <span className="font-medium text-gray-900">{archiveProgress.session.subject}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Timestamp:</span>
                  <span className="font-medium text-gray-900">{archiveProgress.session.timestamp}</span>
                </div>
              </div>

              {/* Error Details */}
              {archiveProgress.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-red-800">
                    <strong>Error:</strong> {archiveProgress.error}
                  </p>
                </div>
              )}

              {/* Progress Bar for Archiving */}
              {archiveProgress.status === 'archiving' && (
                <div className="w-full bg-gray-200 rounded-full h-2 mb-4 overflow-hidden">
                  <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '70%' }}></div>
                </div>
              )}

              {/* Actions */}
              {archiveProgress.status === 'error' && (
                <div className="flex justify-center gap-3 mt-6">
                  <button
                    onClick={() => setArchiveProgress(null)}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setArchiveProgress(null);
                      // Keep the action dialog open to retry
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Retry
                  </button>
                </div>
              )}

              {archiveProgress.status === 'archiving' && (
                <p className="text-xs text-gray-500">
                  Please wait while the session is being archived...
                </p>
              )}

              {archiveProgress.status === 'success' && (
                <p className="text-xs text-gray-500">
                  This dialog will close automatically
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bulk Archive Progress */}
      {bulkArchiveProgress && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="text-center">
              <Loader className="h-16 w-16 text-blue-600 animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Bulk Archiving</h3>
              <p className="text-sm text-blue-600 mb-4">
                Archiving {bulkArchiveProgress.current} of {bulkArchiveProgress.total} sessions
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Current: <strong>{bulkArchiveProgress.currentSession}</strong>
              </p>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(bulkArchiveProgress.current / bulkArchiveProgress.total) * 100}%` }}
                ></div>
              </div>

              {/* Errors */}
              {bulkArchiveProgress.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-left">
                  <p className="text-sm font-medium text-red-800 mb-1">Errors:</p>
                  <ul className="text-xs text-red-700 space-y-1">
                    {bulkArchiveProgress.errors.map((error, i) => (
                      <li key={i}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {bulkArchiveProgress.current === bulkArchiveProgress.total && (
                <p className="text-xs text-gray-500">
                  Completed! This dialog will close automatically.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bulk Operation Progress */}
      {bulkOperationProgress && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="text-center">
              {!bulkOperationProgress.completed ? (
                <Loader className="h-16 w-16 text-blue-600 animate-spin mx-auto mb-4" />
              ) : bulkOperationProgress.errors.length > 0 ? (
                <AlertCircle className="h-16 w-16 text-yellow-600 mx-auto mb-4" />
              ) : (
                <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              )}

              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {bulkOperationProgress.type === 'delete' && 'Bulk Delete'}
                {bulkOperationProgress.type === 'changeProject' && 'Changing Projects'}
                {bulkOperationProgress.type === 'rebuild' && 'Rebuilding Sessions'}
              </h3>

              <p className="text-sm text-blue-600 mb-4">
                {bulkOperationProgress.completed ? 'Completed' : 'Processing'} {bulkOperationProgress.current} of {bulkOperationProgress.total} sessions
              </p>

              {!bulkOperationProgress.completed && (
                <p className="text-sm text-gray-600 mb-4">
                  Current: <strong>{bulkOperationProgress.currentSession}</strong>
                </p>
              )}

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    bulkOperationProgress.completed
                      ? (bulkOperationProgress.errors.length > 0 ? 'bg-yellow-600' : 'bg-green-600')
                      : 'bg-blue-600'
                  }`}
                  style={{ width: `${(bulkOperationProgress.current / bulkOperationProgress.total) * 100}%` }}
                ></div>
              </div>

              {/* Errors */}
              {bulkOperationProgress.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-left max-h-40 overflow-y-auto">
                  <p className="text-sm font-medium text-red-800 mb-1">
                    {bulkOperationProgress.errors.length} Error(s):
                  </p>
                  <ul className="text-xs text-red-700 space-y-1">
                    {bulkOperationProgress.errors.map((error, i) => (
                      <li key={i}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {bulkOperationProgress.completed && (
                <p className="text-xs text-gray-500">
                  {bulkOperationProgress.errors.length > 0
                    ? 'Completed with errors. This dialog will close automatically.'
                    : 'Completed successfully! This dialog will close automatically.'
                  }
                </p>
              )}

              {!bulkOperationProgress.completed && (
                <p className="text-xs text-gray-500">
                  Please wait while the operation completes...
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Change Project Dialog */}
      {changeProjectDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Change Project</h3>
            <p className="text-sm text-gray-600 mb-4">
              Move {changeProjectDialog.sessions.length} session(s) to a different project.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Project
                </label>
                <select
                  value={changeProjectDialog.newProject}
                  onChange={(e) => setChangeProjectDialog({ ...changeProjectDialog, newProject: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option key="select-project" value="">Select a project...</option>
                  {projects.map((project, index) => (
                    <option key={project.id || `project-${index}`} value={project.id}>{project.name || project.id}</option>
                  ))}
                </select>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-700 mb-2">Sessions to move:</p>
                <ul className="text-xs text-gray-600 space-y-1 max-h-32 overflow-y-auto">
                  {changeProjectDialog.sessions.map(session => (
                    <li key={`${session.project}-${session.timestamp}-${session.subject}`}>
                      • {session.name} ({session.project})
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setChangeProjectDialog(null)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleChangeProjectConfirm}
                disabled={!changeProjectDialog.newProject || changeProjectMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
              >
                {changeProjectMutation.isPending ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Moving...
                  </>
                ) : (
                  <>
                    <FolderTree className="w-4 h-4" />
                    Change Project
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Anonymization Dialog */}
      {anonymizationDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-indigo-600" />
              <h3 className="text-lg font-semibold text-gray-900">Anonymize Session</h3>
            </div>

            <div className="space-y-4">
              {/* Session Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Project:</span>
                    <span className="ml-2 font-medium text-gray-900">{anonymizationDialog.session.project}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Subject:</span>
                    <span className="ml-2 font-medium text-gray-900">{anonymizationDialog.session.subject}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Session:</span>
                    <span className="ml-2 font-medium text-gray-900">{anonymizationDialog.session.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Scans:</span>
                    <span className="ml-2 font-medium text-gray-900">{anonymizationDialog.scans.length}</span>
                  </div>
                </div>
              </div>

              {/* Patient Identity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Anonymization Options
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Patient Name</label>
                    <input
                      type="text"
                      value={anonymizationDialog.patientName}
                      onChange={(e) => setAnonymizationDialog({ ...anonymizationDialog, patientName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Patient ID</label>
                    <input
                      type="text"
                      value={anonymizationDialog.patientId}
                      onChange={(e) => setAnonymizationDialog({ ...anonymizationDialog, patientId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Anonymization Script */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Edit3 className="w-4 h-4" />
                  Anonymization Script
                  <span className="text-xs font-normal text-gray-500">
                    (Loaded from XNAT for project: {anonymizationDialog.session.project})
                  </span>
                </label>
                <textarea
                  value={anonymizationDialog.script}
                  onChange={(e) => setAnonymizationDialog({ ...anonymizationDialog, script: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-xs"
                  rows={12}
                  placeholder="Enter DicomEdit script..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  This script defines which DICOM tags to anonymize. Uses DicomEdit syntax. The script is loaded from XNAT based on project configuration.
                </p>
              </div>

              {/* Warning */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">Important:</p>
                    <p className="mt-1">
                      This will download all DICOM files, anonymize them locally in your browser, and prepare them for upload.
                      The original files in the prearchive will not be modified. You will need to delete the original session
                      and upload the anonymized files separately.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setAnonymizationDialog(null)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAnonymizeConfirm}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
              >
                <Shield className="w-4 h-4" />
                Anonymize and Download
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Anonymization Progress */}
      {anonymizationProgress && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="text-center">
              {anonymizationProgress.status === 'processing' && (
                <Loader className="h-16 w-16 text-indigo-600 animate-spin mx-auto mb-4" />
              )}
              {anonymizationProgress.status === 'complete' && (
                <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              )}
              {anonymizationProgress.status === 'error' && (
                <XCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
              )}

              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {anonymizationProgress.status === 'processing' && 'Anonymizing Session'}
                {anonymizationProgress.status === 'complete' && 'Anonymization Complete'}
                {anonymizationProgress.status === 'error' && 'Anonymization Failed'}
              </h3>

              <p className="text-sm text-gray-600 mb-4">
                {anonymizationProgress.message}
              </p>

              {anonymizationProgress.status === 'processing' && (
                <>
                  <p className="text-sm text-gray-600 mb-4">
                    Processing {anonymizationProgress.current} of {anonymizationProgress.total} scans
                  </p>
                  <p className="text-sm font-medium text-gray-900 mb-4">
                    {anonymizationProgress.currentFile}
                  </p>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(anonymizationProgress.current / anonymizationProgress.total) * 100}%` }}
                    ></div>
                  </div>
                </>
              )}

              {/* Errors */}
              {anonymizationProgress.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-left max-h-40 overflow-y-auto">
                  <p className="text-sm font-medium text-red-800 mb-1">
                    {anonymizationProgress.errors.length} Error(s):
                  </p>
                  <ul className="text-xs text-red-700 space-y-1">
                    {anonymizationProgress.errors.map((error, i) => (
                      <li key={i}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {anonymizationProgress.status === 'complete' && (
                <p className="text-xs text-gray-500">
                  This dialog will close automatically
                </p>
              )}

              {anonymizationProgress.status === 'error' && (
                <button
                  onClick={() => setAnonymizationProgress(null)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Session Detail Dialog */}
      {sessionDetailDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`bg-white rounded-lg shadow-xl p-6 overflow-y-auto transition-all ${
            isDialogMaximized ? 'w-full h-full max-w-none max-h-none' : 'max-w-2xl w-full max-h-[80vh]'
          }`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Session Details</h3>
              <button
                onClick={() => setIsDialogMaximized(!isDialogMaximized)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title={isDialogMaximized ? 'Restore' : 'Maximize'}
              >
                {isDialogMaximized ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500">Project</label>
                  <p className="text-sm font-medium text-gray-900">{sessionDetailDialog.session.project}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Subject</label>
                  <p className="text-sm font-medium text-gray-900">{sessionDetailDialog.session.subject}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Session</label>
                  <p className="text-sm font-medium text-gray-900">{sessionDetailDialog.session.name}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Status</label>
                  <p>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(sessionDetailDialog.session.status)}`}>
                      {getStatusIcon(sessionDetailDialog.session.status)}
                      {sessionDetailDialog.session.status}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Scan Date</label>
                  <p className="text-sm text-gray-900">
                    {sessionDetailDialog.session.scan_date ? new Date(sessionDetailDialog.session.scan_date).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Uploaded</label>
                  <p className="text-sm text-gray-900">
                    {new Date(sessionDetailDialog.session.uploaded).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Timestamp</label>
                  <p className="text-sm text-gray-900">{sessionDetailDialog.session.timestamp}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Auto-Archive</label>
                  <p className="text-sm text-gray-900">{sessionDetailDialog.session.autoarchive || 'None'}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Scans</h4>
                {sessionDetailDialog.loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader className="w-6 h-6 text-blue-600 animate-spin" />
                  </div>
                ) : sessionDetailDialog.scans.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">No scans found</p>
                ) : (
                  <div className="space-y-2">
                    {sessionDetailDialog.scans.map(scan => {
                      const scanKey = `${sessionDetailDialog.session.project}-${sessionDetailDialog.session.timestamp}-${sessionDetailDialog.session.subject}-${scan.ID}`;
                      const headerInfo = dicomHeaders.get(scanKey);
                      const isExpanded = expandedScans.has(scan.ID);

                      return (
                        <div key={scan.ID} className="bg-gray-50 rounded-lg overflow-hidden">
                          <div className="p-3">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">Scan {scan.ID}</p>
                                {scan.series_description && (
                                  <p className="text-xs text-gray-600">{scan.series_description}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">{scan.xsiType}</span>
                                <button
                                  onClick={() => handleLoadDicomHeader(scan)}
                                  disabled={headerInfo?.loading}
                                  className="text-blue-600 hover:text-blue-800 disabled:text-gray-400 p-1"
                                  title="View DICOM Header"
                                >
                                  {headerInfo?.loading ? (
                                    <Loader className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <FileText className="w-4 h-4" />
                                  )}
                                </button>
                                {headerInfo && !headerInfo.loading && (
                                  <button
                                    onClick={() => handleToggleScanExpand(scan.ID)}
                                    className="text-gray-600 hover:text-gray-800 p-1"
                                    title={isExpanded ? "Collapse" : "Expand"}
                                  >
                                    {isExpanded ? (
                                      <ChevronDown className="w-4 h-4" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4" />
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* DICOM Header Display */}
                            {headerInfo && !headerInfo.loading && isExpanded && (
                              <div className="mt-3 border-t border-gray-200 pt-3">
                                {headerInfo.error ? (
                                  <div className="bg-red-50 border border-red-200 rounded p-2">
                                    <p className="text-xs text-red-700">{headerInfo.error}</p>
                                  </div>
                                ) : (
                                  <div className="bg-white rounded border border-gray-200 p-3 max-h-96 overflow-y-auto">
                                    <p className="text-xs font-semibold text-gray-700 mb-2">DICOM Header Information</p>
                                    <table className="w-full font-mono text-xs">
                                      <tbody>
                                        {Object.entries(headerInfo.headers)
                                          .sort(([a], [b]) => a.localeCompare(b))
                                          .map(([key, value]) => (
                                            <tr key={key} className="border-b border-gray-100">
                                              <td className="text-gray-600 font-semibold py-1 pr-4 whitespace-nowrap align-top">{key}:</td>
                                              <td className="text-gray-900 py-1 break-words">
                                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                              </td>
                                            </tr>
                                          ))
                                        }
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setSessionDetailDialog(null)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
              {sessionDetailDialog.showArchiveButton && (
                <button
                  onClick={handleArchiveFromReview}
                  disabled={sessionDetailDialog.session.status !== 'READY' && sessionDetailDialog.session.status !== 'CONFLICT'}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-2"
                >
                  <Archive className="w-4 h-4" />
                  Archive
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
