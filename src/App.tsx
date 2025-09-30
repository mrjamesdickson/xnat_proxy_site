import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryProvider } from './providers/QueryProvider';
import { XnatProvider, useXnat } from './contexts/XnatContext';
import { Login } from './components/Login';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
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
import { ApiExplorer } from './components/ApiExplorer';

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
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/:project" element={<ProjectDetail />} />
        <Route path="/subjects" element={<Subjects />} />
        <Route path="/subjects/:project/:subject/experiments" element={<Experiments />} />
        <Route path="/subjects/:project/:subject" element={<SubjectDetail />} />
        <Route path="/experiments" element={<Experiments />} />
        <Route path="/experiments/:project/:subject/:experiment/scans" element={<Scans />} />
        <Route path="/experiments/:project/:subject/:experiment/viewer" element={<OhifViewer />} />
        <Route path="/experiments/:project/:subject/:experiment" element={<ExperimentDetail />} />
        <Route path="/processing" element={<Processing />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/search" element={<Search />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/api" element={<ApiExplorer />} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <QueryProvider>
      <XnatProvider>
        <Router>
          <AppContent />
        </Router>
      </XnatProvider>
    </QueryProvider>
  );
}

export default App;
