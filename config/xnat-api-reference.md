# XNAT API Reference

Quick reference for XNAT REST API endpoints commonly used in the React application.

## Base Configuration

- **XNAT Version**: 1.9.2-RC-SNAPSHOT-484-1bce1abd60
- **Demo Server**: `demo02.xnatworks.io`
- **Traditional REST Base**: `/data/archive`
- **Extended API Base**: `/xapi`

## Authentication

| Endpoint | Method | Description |
|----------|---------|-------------|
| `/data/JSESSION` | POST | Login with username/password |
| `/data/JSESSION` | DELETE | Logout |
| `/xapi/users/current` | GET | Get current user info |
| `/xapi/users/authProviders` | GET | Get available auth providers |

## Core Data Hierarchy (Traditional REST API)

### Projects
| Endpoint | Method | Description |
|----------|---------|-------------|
| `/data/archive/projects` | GET | List all accessible projects |
| `/data/archive/projects` | POST | Create new project |
| `/data/archive/projects/{project}` | GET | Get project details |
| `/data/archive/projects/{project}` | PUT | Update project |
| `/data/archive/projects/{project}` | DELETE | Delete project |

### Subjects
| Endpoint | Method | Description |
|----------|---------|-------------|
| `/data/archive/projects/{project}/subjects` | GET | List project subjects |
| `/data/archive/projects/{project}/subjects` | POST | Create subject |
| `/data/archive/projects/{project}/subjects/{subject}` | GET | Get subject details |
| `/data/archive/projects/{project}/subjects/{subject}` | PUT | Update subject |
| `/data/archive/projects/{project}/subjects/{subject}` | DELETE | Delete subject |

### Experiments/Sessions
| Endpoint | Method | Description |
|----------|---------|-------------|
| `/data/archive/projects/{project}/subjects/{subject}/experiments` | GET | List subject experiments |
| `/data/archive/projects/{project}/experiments` | GET | List all project experiments |
| `/data/archive/experiments/{experiment}` | GET | Get experiment details |
| `/data/archive/experiments/{experiment}` | PUT | Update experiment |
| `/data/archive/experiments/{experiment}` | DELETE | Delete experiment |

### Scans
| Endpoint | Method | Description |
|----------|---------|-------------|
| `/data/archive/experiments/{experiment}/scans` | GET | List experiment scans |
| `/data/archive/experiments/{experiment}/scans/{scan}` | GET | Get scan details |
| `/data/archive/experiments/{experiment}/scans/{scan}` | PUT | Update scan |
| `/data/archive/experiments/{experiment}/scans/{scan}` | DELETE | Delete scan |

### Resources & Files
| Endpoint | Method | Description |
|----------|---------|-------------|
| `/data/archive/experiments/{experiment}/resources` | GET | List experiment resources |
| `/data/archive/experiments/{experiment}/resources/{resource}` | GET | Get resource details |
| `/data/archive/experiments/{experiment}/resources/{resource}/files` | GET | List resource files |
| `/data/archive/experiments/{experiment}/resources/{resource}/files/{file}` | GET | Download file |
| `/data/archive/experiments/{experiment}/resources/{resource}/files/{file}` | PUT | Upload file |

## Access Control & Permissions

| Endpoint | Method | Description |
|----------|---------|-------------|
| `/xapi/access/projects` | GET | Get projects and roles for current user |
| `/xapi/access/{username}/projects` | GET | Get projects for specific user (admin) |
| `/xapi/access/displays` | GET | Get available element displays |
| `/xapi/access/displays/{display}` | GET | Get element displays of specific type |

## Search & Query

| Endpoint | Method | Description |
|----------|---------|-------------|
| `/data/search` | GET | Search across data types |
| `/data/search/saved` | GET | Get saved searches |
| `/xapi/schemas/datatypes/searchable` | GET | Get searchable datatypes |

## DICOM Operations

| Endpoint | Method | Description |
|----------|---------|-------------|
| `/xapi/dicomscp` | GET, POST | DICOM SCP receiver management |
| `/xapi/dqr/query/studies` | POST | Query DICOM studies |
| `/xapi/dqr/query/patients` | POST | Query DICOM patients |
| `/xapi/dqr/query/series` | POST | Query DICOM series |
| `/xapi/dicom/list/active` | GET | List active DICOM operations |

## File Operations

| Endpoint | Method | Description |
|----------|---------|-------------|
| `/xapi/archive/download` | POST | Create download catalog |
| `/xapi/archive/upload/xml` | POST, PUT | XML-based data upload |
| `/xapi/archive/catalogs/refresh` | PUT | Refresh archive catalogs |

## OHIF Viewer Integration

| Endpoint | Method | Description |
|----------|---------|-------------|
| `/xapi/viewer/projects/{projectId}` | POST | Generate viewer session metadata |
| `/xapi/viewerDicomweb/projects/{projectId}` | POST | Generate DICOMweb data |
| `/xapi/viewerConfig/projects/{projectId}` | GET, PUT | Get/set viewer configuration |
| `/xapi/ohifaiaa/servers` | GET, PUT | AIAA server configuration |

## Container & Processing

| Endpoint | Method | Description |
|----------|---------|-------------|
| `/xapi/projects/{project}/containers` | GET, POST | Container management |
| `/xapi/projects/{project}/commands/available` | GET | Available commands |
| `/xapi/commands` | GET, POST | Command configuration |
| `/xapi/workflows` | GET | Workflow status |

## Common Query Parameters

- `format=json` - Return JSON format (default for most endpoints)
- `format=xml` - Return XML format
- `format=csv` - Return CSV format
- `columns=` - Specify columns to return
- `where=` - Add WHERE clause conditions
- `sortBy=` - Sort results
- `JSESSIONID=` - Session ID (usually in cookie)

## Response Codes

- `200` - Success
- `201` - Created
- `204` - No Content
- `400` - Bad Request
- `401` - Must be authenticated
- `403` - Insufficient permissions
- `404` - Not Found
- `500` - Internal Server Error

## Notes

- Most endpoints support both JSON and XML formats
- Authentication typically uses JSESSIONID cookie
- Extended API (`/xapi`) requires XNAT 1.7+ 
- Traditional REST API (`/data`) is the primary interface for data operations
- Some endpoints may require specific user permissions or project roles