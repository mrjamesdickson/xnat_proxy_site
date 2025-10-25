# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start development server**: `npm run dev` (runs on http://localhost:5173)
- **Build for production**: `npm run build` (TypeScript compilation + Vite build)
- **Lint code**: `npm run lint` (ESLint with TypeScript support)
- **Preview production build**: `npm run preview`

## Important Development Rules

**CRITICAL**: Before committing any code changes, always run `../build_plugin.sh` from the root plugin directory to ensure the TypeScript build passes and the plugin builds successfully. This script:
1. Cleans the plugin resources directory
2. Runs `npm run build` to compile TypeScript and build with Vite
3. Runs Gradle tasks to build the plugin JAR
4. Catches any TypeScript errors or build issues before commit

Never commit code without running this build script first.

## Architecture Overview

This is a React TypeScript application that provides a modern web interface for XNAT (neuroimaging data management platform). The app uses a client-server architecture where the React frontend communicates with XNAT servers via REST APIs.

### Core Architecture Patterns

- **State Management**: React Query for server state, React Context for authentication
- **Authentication Flow**: Session-based auth with JSESSIONID storage in localStorage
- **API Communication**: Centralized API client (`XnatApiClient`) with request/response interceptors
- **Routing**: Hierarchical routes reflecting XNAT data structure (Projects → Subjects → Experiments → Scans)

### Key Directory Structure

```
src/
├── contexts/XnatContext.tsx     # Authentication state and XNAT client management
├── services/xnat-api.ts         # Comprehensive XNAT REST API client
├── providers/QueryProvider.tsx  # React Query configuration
├── components/                  # UI components organized by feature
│   ├── Login.tsx               # Authentication interface
│   ├── Layout.tsx              # Main app shell with navigation
│   ├── Dashboard.tsx           # Overview with metrics and charts
│   ├── Projects.tsx            # Project listing and management
│   ├── Subjects.tsx            # Subject browsing
│   ├── Experiments.tsx         # Experiment/session management  
│   ├── Scans.tsx              # Scan data viewing
│   ├── OhifViewer.tsx         # DICOM viewer integration
│   ├── Processing.tsx         # Data processing workflows
│   ├── Upload.tsx             # File upload interface
│   ├── Search.tsx             # Cross-entity search
│   └── Settings.tsx           # Configuration management
└── App.tsx                     # Main app with routing
```

### Data Flow Architecture

1. **Authentication**: `XnatContext` manages login state, creates `XnatApiClient` instances
2. **API Client**: `XnatApiClient` handles all XNAT REST API communication with TypeScript interfaces
3. **Server State**: React Query caches and synchronizes server data
4. **Component Tree**: Authentication gates access to main `Layout` containing routed components

### XNAT Integration Details

- **Proxy Configuration**: Development proxy in `vite.config.ts` routes `/api/xnat/*` to XNAT server
- **CORS Handling**: Production deployments require XNAT server CORS configuration
- **Demo Server**: Pre-configured with `http://demo02.xnatworks.io` for testing
- **Session Management**: Automatic session refresh and error handling

### Technology Stack Integration

- **Vite**: Build tool with React plugin and development proxy
- **Tailwind CSS**: Utility-first styling with forms plugin
- **React Router**: Client-side routing reflecting XNAT hierarchy
- **Axios**: HTTP client with comprehensive interceptors for XNAT APIs
- **Lucide React**: Consistent icon system
- **Recharts**: Data visualization for dashboard metrics

### Environment Configuration

- Environment variables prefixed with `VITE_`
- Default XNAT server configurable via `VITE_DEFAULT_XNAT_URL`
- Development proxy target can be changed in `vite.config.ts`

## XNAT REST API Structure

The system interfaces with two main XNAT API layers:

### Core Data API (Traditional REST)
**Base Path**: `/data/archive`
- **Projects**: `/data/archive/projects` - CRUD operations on projects
- **Subjects**: `/data/archive/projects/{project}/subjects` - Subject management
- **Experiments**: `/data/archive/projects/{project}/subjects/{subject}/experiments` - Session management  
- **Scans**: `/data/archive/experiments/{experiment}/scans` - Scan data access
- **Resources**: `/data/archive/experiments/{experiment}/resources` - File resource management

### Extended API (Administrative/Services)
**Base Path**: `/xapi` (documented in `config/api-docs.json`)
- **Authentication**: `/xapi/users/current`, `/xapi/users/authProviders`
- **Access Control**: `/xapi/access/projects`, `/xapi/access/displays`
- **DICOM Operations**: `/xapi/dicomscp`, `/xapi/dqr/query/*`
- **OHIF Viewer**: `/xapi/viewer/projects/{projectId}`, `/xapi/viewerConfig/projects/{projectId}`
- **File Operations**: `/xapi/archive/download`, `/xapi/archive/upload/xml`
- **Containers**: `/xapi/projects/{project}/containers`, `/xapi/commands`

### API Client Implementation Notes
- `XnatApiClient` primarily uses the traditional REST API (`/data`) for data operations
- Session-based authentication with JSESSIONID cookie
- Request/response interceptors handle authentication and error states
- TypeScript interfaces defined for all major data entities (Project, Subject, Experiment, Scan)

## Popup Mode Integration

The React application supports a popup mode that hides navigation UI elements, making it ideal for embedding pages in popup windows from the XNAT plugin.

### How It Works

The `Layout` component checks for a `popup=true` URL parameter. When present, it hides:
- Left sidebar navigation
- Top header bar
- Mobile navigation
- Chat widget
- Container jobs widget
- Route debug panel
- Reduces content padding for a more compact view

### Usage from XNAT Plugin

**Velocity Template Example:**
```velocity
<a href="/morpheus/upload/compressed?popup=true"
   onclick="window.open(this.href, 'uploader', 'width=1000,height=700,scrollbars=yes,resizable=yes'); return false;">
  Open Compressed Uploader
</a>
```

**JavaScript Helper Function:**
```javascript
function openMorpheusPopup(path) {
  window.open(
    `/morpheus${path}?popup=true`,
    'morpheus-popup',
    'width=1200,height=800,scrollbars=yes,resizable=yes'
  );
}

// Usage examples:
openMorpheusPopup('/upload/compressed');
openMorpheusPopup('/projects/PROJ001');
openMorpheusPopup('/experiments/PROJ001/SUBJ001/EXP001');
openMorpheusPopup('/search?term=MRI&type=all');
```

**Benefits:**
- Any page in the React app can be opened in popup mode
- Consistent authentication (shares session with main XNAT)
- Clean, focused UI without navigation clutter
- User stays in context of their XNAT workflow

### Implementation Details

Located in `src/components/Layout.tsx`:
- Uses `useSearchParams()` hook to detect `popup=true`
- Conditionally renders UI elements based on `isPopupMode` boolean
- Maintains full functionality while hiding navigation chrome