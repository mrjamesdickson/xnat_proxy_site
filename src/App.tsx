import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryProvider } from './providers/QueryProvider';
import { XnatProvider, useXnat } from './contexts/XnatContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ContainerJobsProvider } from './contexts/ContainerJobsContext';
import { Login } from './components/Login';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { LegacyIndex } from './components/LegacyIndex';
import { Projects } from './components/Projects';
import { ProjectDetail } from './components/ProjectDetail';
import { Subjects } from './components/Subjects';
import { SubjectDetail } from './components/SubjectDetail';
import { Experiments } from './components/Experiments';
import { ExperimentDetail } from './components/ExperimentDetail';
import { Scans } from './components/Scans';
import { OhifViewer } from './components/OhifViewer';
import { Processing } from './components/Processing';
import { Upload } from './components/Upload';
import { Search } from './components/Search';
import { Settings } from './components/Settings';
import { AdminUsers } from './components/AdminUsers';
import { SiteAdministration } from './components/SiteAdministration';
import { AdminGroups } from './components/AdminGroups';
import { AdminDataTypes } from './components/AdminDataTypes';
import { AdminEmail } from './components/AdminEmail';
import { AdminAutomation } from './components/AdminAutomation';
import { AdminStoredSearches } from './components/AdminStoredSearches';
import { AdminPlugins } from './components/AdminPlugins';
import { AdminEventService } from './components/AdminEventService';
import { AdminTasks } from './components/AdminTasks';
import { ApiExplorer } from './components/ApiExplorer';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { Prearchive } from './components/Prearchive';
import { CompressedUploader } from './components/CompressedUploader';
import { CornerstoneViewer } from './components/CornerstoneViewer';
import { WorkflowDetail } from './components/WorkflowDetail';
import { WorkflowLog } from './components/WorkflowLog';
import { CommandBrowser } from './components/CommandBrowser';
import { CommandLauncher } from './components/CommandLauncher';
import { SystemMonitoring } from './components/SystemMonitoring';

function AppContent() {
  const { isAuthenticated, isLoading } = useXnat();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/index" element={<LegacyIndex />} />
        <Route path="/analytics" element={<AnalyticsDashboard />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/:project" element={<ProjectDetail />} />
        <Route path="/subjects" element={<Subjects />} />
        <Route path="/subjects/:project/:subject/experiments" element={<Experiments />} />
        <Route path="/subjects/:project/:subject" element={<SubjectDetail />} />
        <Route path="/experiments" element={<Experiments />} />
        <Route path="/experiments/:project/:subject/:experiment/scans" element={<Scans />} />
        <Route path="/experiments/:project/:subject/:experiment/viewer" element={<OhifViewer />} />
        <Route path="/experiments/:experimentId/scans/:scanId/cornerstone" element={<CornerstoneViewer />} />
        <Route path="/experiments/:project/:subject/:experiment" element={<ExperimentDetail />} />
        <Route path="/prearchive" element={<Prearchive />} />
        <Route path="/processing" element={<Processing />} />
        <Route path="/processing/commands" element={<CommandBrowser />} />
        <Route path="/processing/launch" element={<CommandLauncher />} />
        <Route path="/processing/workflows/:workflowId" element={<WorkflowDetail />} />
        <Route path="/processing/workflows/:workflowId/log" element={<WorkflowLog />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/upload/compressed" element={<CompressedUploader />} />
        <Route path="/search" element={<Search />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/admin" element={<SiteAdministration />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/groups" element={<AdminGroups />} />
        <Route path="/admin/data-types" element={<AdminDataTypes />} />
        <Route path="/admin/email" element={<AdminEmail />} />
        <Route path="/admin/automation" element={<AdminAutomation />} />
        <Route path="/admin/stored-searches" element={<AdminStoredSearches />} />
        <Route path="/admin/plugins" element={<AdminPlugins />} />
        <Route path="/admin/event-service" element={<AdminEventService />} />
        <Route path="/admin/tasks" element={<AdminTasks />} />
        <Route path="/api" element={<ApiExplorer />} />
        <Route path="/monitoring" element={<SystemMonitoring />} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryProvider>
        <XnatProvider>
          <ContainerJobsProvider>
            <Router>
              <AppContent />
            </Router>
          </ContainerJobsProvider>
        </XnatProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}

export default App;
