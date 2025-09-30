import axios from 'axios';
import type { AxiosInstance } from 'axios';

export interface XnatConfig {
  baseURL: string;
  username?: string;
  password?: string;
  jsessionid?: string;
}

export interface XnatProject {
  id: string;
  name: string;
  description: string;
  secondary_id?: string;
  pi_firstname?: string;
  pi_lastname?: string;
  accessibility?: string;
  last_modified?: string;
}

export interface XnatSubject {
  id: string;
  label: string;
  project: string;
  src?: string;
  insert_date?: string;
  insert_user?: string;
  group?: string;
  gender?: string;
  handedness?: string;
  dob?: string;
  yob?: string;
  age?: string;
  education?: string;
  educationDesc?: string;
  race?: string;
  ethnicity?: string;
  weight?: string;
  height?: string;
  gestational_age?: string;
  post_menstrual_age?: string;
  birth_weight?: string;
}

export interface XnatExperiment {
  id: string;
  label: string;
  project: string;
  subject_id: string;
  xsiType: string;
  date?: string;
  time?: string;
  note?: string;
  investigator?: string;
  session_type?: string;
  modality?: string;
  scanner?: string;
  operator?: string;
  dcmAccessionNumber?: string;
  dcmPatientId?: string;
  dcmPatientName?: string;
  validation?: {
    status: string;
    date: string;
    user: string;
    method: string;
    notes: string;
  };
}

export interface XnatScan {
  id: string;
  type: string;
  quality: string;
  condition: string;
  series_description?: string;
  documentation?: string;
  note?: string;
  frames?: string;
  validation?: {
    status: string;
    date: string;
    user: string;
    method: string;
    notes: string;
  };
  xnat_imagescandata_id: string;
  xsiType: string;
}

export interface XnatResource {
  label: string;
  description?: string;
  format?: string;
  content?: string;
  file_count?: number;
  file_size?: number;
  cat_id?: string;
  tags?: string;
  URI?: string;
}

export interface XnatFile {
  name: string;
  size: number;
  digest?: string;
  content?: string;
  format?: string;
  collection?: string;
  cat_id?: string;
  tags?: string;
  URI: string;
}

export interface XnatUser {
  id: number;
  login: string;
  firstname: string;
  lastname: string;
  email: string;
  enabled: boolean;
  verified: boolean;
  last_modified?: string;
  xdat_user_id: number;
  primary_password?: string;
  salt?: string;
  authorization?: {
    groups: string[];
    roles: string[];
  };
}

export interface CreateXnatUserRequest {
  login: string;
  email: string;
  firstname: string;
  lastname: string;
  password: string;
  enabled?: boolean;
  verified?: boolean;
  roles?: string[];
  groups?: string[];
}

export interface UpdateXnatUserRequest {
  email?: string;
  firstname?: string;
  lastname?: string;
  password?: string;
  enabled?: boolean;
  verified?: boolean;
  roles?: string[];
  groups?: string[];
}

export interface XnatContainer {
  id: string;
  status: string;
  'status-time': string;
  'container-id': string;
  'docker-image': string;
  'command-id': string;
  'wrapper-id': string;
  'project-id'?: string;
  'user-id': string;
  'workflow-id'?: string;
  created: string;
  history: XnatContainerHistory[];
  mounts: XnatMount[];
  'environment-variables': Record<string, string>;
  'command-line': string;
  'working-directory': string;
  subtype?: string;
  'parent-source-object-name'?: string;
  'derived-data-id'?: string;
  'input-mount-xnat-host-path'?: string;
  'output-mount-xnat-host-path'?: string;
  'log-paths': {
    stdout: string;
    stderr: string;
  };
}

export interface XnatContainerHistory {
  status: string;
  'time-recorded': string;
  'external-timestamp'?: string;
  'exit-code'?: number;
  'entity-type': 'system' | 'event' | 'user';
  'entity-id'?: string;
}

export interface XnatMount {
  name: string;
  'xnat-host-path': string;
  'container-path': string;
  'input-files'?: XnatMountFile[];
  'output-files'?: XnatMountFile[];
}

export interface XnatMountFile {
  name: string;
  path: string;
  'file-input'?: boolean;
  'directory-input'?: boolean;
}

export interface XnatWorkflow {
  id: string;
  status: 'In Progress' | 'Complete' | 'Failed' | 'Queued';
  'pipeline-name': string;
  'data-type': string;
  'step-id': string;
  'step-description': string;
  launch_time: string;
  current_step_launch_time?: string;
  percent_complete?: number;
  category?: string;
  'external-id'?: string;
  details?: Record<string, any>;
}

export interface XnatProcess {
  id: string;
  name: string;
  status: 'ACTIVE' | 'IDLE' | 'ERROR' | 'STOPPED';
  type: 'UPLOAD' | 'PROCESSING' | 'VALIDATION' | 'ANALYSIS' | 'EXPORT';
  user: string;
  project?: string;
  description?: string;
  started: string;
  last_activity?: string;
  cpu_usage?: number;
  memory_usage?: number;
  disk_usage?: number;
  files_processed?: number;
  files_total?: number;
  bytes_processed?: number;
  bytes_total?: number;
}

export interface XnatSystemStats {
  cpu_usage: number;
  memory_usage: number;
  memory_total: number;
  disk_usage: number;
  disk_total: number;
  active_jobs: number;
  queued_jobs: number;
  active_processes: number;
  uptime: number;
  version: string;
}

export class XnatApiClient {
  private client: AxiosInstance;
  private config: XnatConfig;

  constructor(config: XnatConfig) {
    this.config = config;
    
    // Use proxy in development if baseURL is not localhost
    const isDevelopment = import.meta.env.DEV;
    const isLocalhost = config.baseURL.includes('localhost') || config.baseURL.includes('127.0.0.1');
    const baseURL = isDevelopment && !isLocalhost 
      ? '/api/xnat' 
      : config.baseURL;
    
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Accept': 'application/json, application/xml, text/plain, */*',
      },
      // Add CORS headers for development
      ...(isDevelopment && {
        withCredentials: true,
      }),
    });

    // Use basic auth - don't set Cookie header manually as browsers don't allow it
    if (config.username && config.password) {
      this.client.defaults.auth = {
        username: config.username,
        password: config.password,
      };
    }

    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('XNAT API Error:', error);
        
        // Enhance error information for better debugging
        if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
          error.userMessage = 'Cannot connect to XNAT server. Please check the server URL and your network connection.';
          error.isNetworkError = true;
        } else if (error.response?.status === 401) {
          error.userMessage = 'Authentication failed. Please check your username and password.';
          error.isAuthError = true;
        } else if (error.response?.status === 403) {
          error.userMessage = 'Access denied. You do not have permission to access this resource.';
          error.isPermissionError = true;
        } else if (error.response?.status === 404) {
          error.userMessage = 'Resource not found. The requested data may have been moved or deleted.';
          error.isNotFoundError = true;
        } else if (error.response?.status === 406) {
          error.userMessage = 'Server rejected the request format. This may indicate an API compatibility issue.';
          error.isFormatError = true;
        } else if (error.response?.status >= 500) {
          error.userMessage = 'Server error. Please try again later or contact your XNAT administrator.';
          error.isServerError = true;
        } else if (!error.response) {
          // This often indicates CORS issues
          error.userMessage = 'Cannot connect to XNAT server. This may be due to CORS restrictions. Please ensure your XNAT server allows cross-origin requests from this application.';
          error.isCorsError = true;
        }
        
        return Promise.reject(error);
      }
    );
  }

  private parseUserListResponse(data: any): XnatUser[] {
    if (!data) return [];
    if (Array.isArray(data)) {
      return data as XnatUser[];
    }
    if (data.users) {
      return data.users as XnatUser[];
    }
    if (data.ResultSet?.Result) {
      return data.ResultSet.Result as XnatUser[];
    }
    if (data.items) {
      return data.items.map((item: any) => item.data_fields) as XnatUser[];
    }
    return [];
  }

  private buildUserPayload(
    user: Partial<CreateXnatUserRequest & UpdateXnatUserRequest> & { login?: string }
  ): Record<string, any> {
    const payload: Record<string, any> = {};

    if (typeof user.login !== 'undefined') payload.login = user.login;
    if (typeof user.email !== 'undefined') payload.email = user.email;
    if (typeof user.firstname !== 'undefined') payload.firstname = user.firstname;
    if (typeof user.lastname !== 'undefined') payload.lastname = user.lastname;
    if (typeof user.password !== 'undefined' && user.password !== '') payload.password = user.password;
    if (typeof user.enabled !== 'undefined') payload.enabled = user.enabled;
    if (typeof user.verified !== 'undefined') payload.verified = user.verified;

    if (user.roles || user.groups) {
      payload.authorization = {
        roles: user.roles ?? [],
        groups: user.groups ?? [],
      };
    }

    return payload;
  }

  // Authentication methods
  async login(username: string, password: string): Promise<string> {
    const response = await this.client.post('/data/JSESSION', null, {
      auth: { username, password },
    });
    
    const jsessionid = response.data;
    // Don't set Cookie header manually - browser handles this with withCredentials
    return jsessionid;
  }

  async logout(): Promise<void> {
    await this.client.delete('/data/JSESSION');
    // Don't manipulate Cookie header manually
    delete this.client.defaults.auth;
  }

  // Project methods
  async getProjects(): Promise<XnatProject[]> {
    const response = await this.client.get('/data/projects', {
      params: { format: 'json' }
    });
    return response.data.ResultSet.Result || [];
  }

  async getProject(projectId: string): Promise<XnatProject> {
    const response = await this.client.get(`/data/projects/${projectId}`, {
      params: { format: 'json' }
    });
    return response.data.items[0].data_fields;
  }

  async createProject(project: Partial<XnatProject>): Promise<XnatProject> {
    const response = await this.client.put(`/data/projects/${project.id}`, project);
    return response.data;
  }

  async updateProject(projectId: string, project: Partial<XnatProject>): Promise<XnatProject> {
    const response = await this.client.put(`/data/projects/${projectId}`, project);
    return response.data;
  }

  async deleteProject(projectId: string): Promise<void> {
    await this.client.delete(`/data/projects/${projectId}`);
  }

  // Subject methods
  async getSubjects(projectId?: string): Promise<XnatSubject[]> {
    const url = projectId ? `/data/projects/${projectId}/subjects` : '/data/subjects';
    const response = await this.client.get(url, {
      params: { format: 'json' }
    });
    return response.data.ResultSet.Result || [];
  }

  async getSubject(projectId: string, subjectId: string): Promise<XnatSubject> {
    const response = await this.client.get(`/data/projects/${projectId}/subjects/${subjectId}`, {
      params: { format: 'json' }
    });
    return response.data.items[0].data_fields;
  }

  async createSubject(projectId: string, subject: Partial<XnatSubject>): Promise<XnatSubject> {
    const response = await this.client.put(`/data/projects/${projectId}/subjects/${subject.label}`, subject);
    return response.data;
  }

  async updateSubject(projectId: string, subjectId: string, subject: Partial<XnatSubject>): Promise<XnatSubject> {
    const response = await this.client.put(`/data/projects/${projectId}/subjects/${subjectId}`, subject);
    return response.data;
  }

  async deleteSubject(projectId: string, subjectId: string): Promise<void> {
    await this.client.delete(`/data/projects/${projectId}/subjects/${subjectId}`);
  }

  // Experiment/Session methods
  async getExperiments(projectId?: string, subjectId?: string): Promise<XnatExperiment[]> {
    let url = '/data/experiments';
    if (projectId && subjectId) {
      url = `/data/projects/${projectId}/subjects/${subjectId}/experiments`;
    } else if (projectId) {
      url = `/data/projects/${projectId}/experiments`;
    }
    
    const response = await this.client.get(url, {
      params: { format: 'json' }
    });
    return response.data.ResultSet.Result || [];
  }

  async getExperiment(projectId: string, subjectId: string, experimentId: string): Promise<XnatExperiment> {
    const response = await this.client.get(`/data/projects/${projectId}/subjects/${subjectId}/experiments/${experimentId}`, {
      params: { format: 'json' }
    });
    return response.data.items?.[0]?.data_fields || response.data;
  }

  async createExperiment(projectId: string, subjectId: string, experiment: Partial<XnatExperiment>): Promise<XnatExperiment> {
    const response = await this.client.put(
      `/data/projects/${projectId}/subjects/${subjectId}/experiments/${experiment.label}`, 
      experiment
    );
    return response.data;
  }

  async updateExperiment(projectId: string, subjectId: string, experimentId: string, experiment: Partial<XnatExperiment>): Promise<XnatExperiment> {
    const response = await this.client.put(
      `/data/projects/${projectId}/subjects/${subjectId}/experiments/${experimentId}`, 
      experiment
    );
    return response.data;
  }

  async deleteExperiment(projectId: string, subjectId: string, experimentId: string): Promise<void> {
    await this.client.delete(`/data/projects/${projectId}/subjects/${subjectId}/experiments/${experimentId}`);
  }

  // Scan methods
  async getScans(projectId: string, subjectId: string, experimentId: string): Promise<XnatScan[]> {
    const response = await this.client.get(`/data/projects/${projectId}/subjects/${subjectId}/experiments/${experimentId}/scans`, {
      params: { format: 'json' }
    });
    return response.data.ResultSet?.Result || [];
  }

  async getScan(projectId: string, subjectId: string, experimentId: string, scanId: string): Promise<XnatScan> {
    const response = await this.client.get(`/data/projects/${projectId}/subjects/${subjectId}/experiments/${experimentId}/scans/${scanId}`);
    return response.data.items[0].data_fields;
  }

  async updateScan(projectId: string, subjectId: string, experimentId: string, scanId: string, scan: Partial<XnatScan>): Promise<XnatScan> {
    const response = await this.client.put(
      `/data/projects/${projectId}/subjects/${subjectId}/experiments/${experimentId}/scans/${scanId}`, 
      scan
    );
    return response.data;
  }

  async deleteScan(projectId: string, subjectId: string, experimentId: string, scanId: string): Promise<void> {
    await this.client.delete(`/data/projects/${projectId}/subjects/${subjectId}/experiments/${experimentId}/scans/${scanId}`);
  }

  // Resource methods
  async getResources(projectId: string, subjectId: string, experimentId: string, scanId?: string): Promise<XnatResource[]> {
    const basePath = `/data/projects/${projectId}/subjects/${subjectId}/experiments/${experimentId}`;
    const url = scanId ? `${basePath}/scans/${scanId}/resources` : `${basePath}/resources`;
    
    const response = await this.client.get(url);
    return response.data.ResultSet.Result || [];
  }

  async getResource(projectId: string, subjectId: string, experimentId: string, resourceId: string, scanId?: string): Promise<XnatResource> {
    const basePath = `/data/projects/${projectId}/subjects/${subjectId}/experiments/${experimentId}`;
    const url = scanId ? `${basePath}/scans/${scanId}/resources/${resourceId}` : `${basePath}/resources/${resourceId}`;
    
    const response = await this.client.get(url);
    return response.data.items[0].data_fields;
  }

  async createResource(projectId: string, subjectId: string, experimentId: string, resource: Partial<XnatResource>, scanId?: string): Promise<XnatResource> {
    const basePath = `/data/projects/${projectId}/subjects/${subjectId}/experiments/${experimentId}`;
    const url = scanId ? `${basePath}/scans/${scanId}/resources/${resource.label}` : `${basePath}/resources/${resource.label}`;
    
    const response = await this.client.put(url, resource);
    return response.data;
  }

  async deleteResource(projectId: string, subjectId: string, experimentId: string, resourceId: string, scanId?: string): Promise<void> {
    const basePath = `/data/projects/${projectId}/subjects/${subjectId}/experiments/${experimentId}`;
    const url = scanId ? `${basePath}/scans/${scanId}/resources/${resourceId}` : `${basePath}/resources/${resourceId}`;
    
    await this.client.delete(url);
  }

  // File methods
  async getFiles(projectId: string, subjectId: string, experimentId: string, resourceId: string, scanId?: string): Promise<XnatFile[]> {
    const basePath = `/data/projects/${projectId}/subjects/${subjectId}/experiments/${experimentId}`;
    const url = scanId ? `${basePath}/scans/${scanId}/resources/${resourceId}/files` : `${basePath}/resources/${resourceId}/files`;
    
    const response = await this.client.get(url);
    return response.data.ResultSet.Result || [];
  }

  async downloadFile(projectId: string, subjectId: string, experimentId: string, resourceId: string, filename: string, scanId?: string): Promise<Blob> {
    const basePath = `/data/projects/${projectId}/subjects/${subjectId}/experiments/${experimentId}`;
    const url = scanId 
      ? `${basePath}/scans/${scanId}/resources/${resourceId}/files/${filename}` 
      : `${basePath}/resources/${resourceId}/files/${filename}`;
    
    const response = await this.client.get(url, {
      responseType: 'blob',
    });
    return response.data;
  }

  async uploadFile(
    projectId: string, 
    subjectId: string, 
    experimentId: string, 
    resourceId: string, 
    file: File, 
    scanId?: string
  ): Promise<void> {
    const basePath = `/data/projects/${projectId}/subjects/${subjectId}/experiments/${experimentId}`;
    const url = scanId 
      ? `${basePath}/scans/${scanId}/resources/${resourceId}/files/${file.name}` 
      : `${basePath}/resources/${resourceId}/files/${file.name}`;
    
    const formData = new FormData();
    formData.append('file', file);
    
    await this.client.put(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  async deleteFile(projectId: string, subjectId: string, experimentId: string, resourceId: string, filename: string, scanId?: string): Promise<void> {
    const basePath = `/data/projects/${projectId}/subjects/${subjectId}/experiments/${experimentId}`;
    const url = scanId 
      ? `${basePath}/scans/${scanId}/resources/${resourceId}/files/${filename}` 
      : `${basePath}/resources/${resourceId}/files/${filename}`;
    
    await this.client.delete(url);
  }

  // User management methods
  async getUsers(): Promise<XnatUser[]> {
    try {
      const response = await this.client.get('/xapi/users', {
        params: { format: 'json' }
      });
      return this.parseUserListResponse(response.data);
    } catch (error) {
      console.warn('Falling back to legacy user list endpoint', error);
      const response = await this.client.get('/data/users', {
        params: { format: 'json' }
      });
      return this.parseUserListResponse(response.data);
    }
  }

  async getUser(userId: string | number): Promise<XnatUser> {
    const identifier = String(userId);
    try {
      const response = await this.client.get(`/xapi/users/${identifier}`, {
        params: { format: 'json' }
      });
      return response.data;
    } catch (error) {
      console.warn('Falling back to legacy user endpoint', error);
      const response = await this.client.get(`/data/users/${identifier}`, {
        params: { format: 'json' }
      });
      return response.data.items?.[0]?.data_fields || response.data;
    }
  }

  async getCurrentUser(): Promise<XnatUser> {
    const response = await this.client.get('/data/user', {
      params: { format: 'json' }
    });
    return response.data;
  }

  async createUser(user: CreateXnatUserRequest): Promise<XnatUser> {
    const payload = this.buildUserPayload(user);

    try {
      const response = await this.client.post('/xapi/users', payload);
      return response.data;
    } catch (error) {
      console.warn('Falling back to legacy user creation endpoint', error);
      const legacyPayload = { ...payload };
      if (legacyPayload.authorization) {
        legacyPayload.roles = legacyPayload.authorization.roles;
        legacyPayload.groups = legacyPayload.authorization.groups;
        delete legacyPayload.authorization;
      }
      const response = await this.client.put(`/data/users/${user.login}`, legacyPayload);
      return response.data;
    }
  }

  async updateUser(userId: string | number, updates: UpdateXnatUserRequest): Promise<XnatUser> {
    const identifier = String(userId);
    const payload = this.buildUserPayload(updates);

    try {
      const response = await this.client.put(`/xapi/users/${identifier}`, payload);
      return response.data;
    } catch (error) {
      console.warn('Falling back to legacy user update endpoint', error);
      const legacyPayload = { ...payload };
      if (legacyPayload.authorization) {
        legacyPayload.roles = legacyPayload.authorization.roles;
        legacyPayload.groups = legacyPayload.authorization.groups;
        delete legacyPayload.authorization;
      }
      const response = await this.client.put(`/data/users/${identifier}`, legacyPayload);
      return response.data;
    }
  }

  async deleteUser(userId: string | number): Promise<void> {
    const identifier = String(userId);
    try {
      await this.client.delete(`/xapi/users/${identifier}`);
    } catch (error) {
      console.warn('Falling back to legacy user deletion endpoint', error);
      await this.client.delete(`/data/users/${identifier}`);
    }
  }

  // Search methods
  async search(searchXml: string): Promise<any[]> {
    const response = await this.client.post('/data/search', searchXml, {
      headers: {
        'Content-Type': 'application/xml',
      },
      params: {
        format: 'json',
      },
    });
    return response.data.ResultSet.Result || [];
  }

  async savedSearch(searchId: string, params?: Record<string, any>): Promise<any[]> {
    const response = await this.client.get(`/data/search/saved/${searchId}`, {
      params: {
        format: 'json',
        ...params,
      },
    });
    return response.data.ResultSet.Result || [];
  }

  // System methods
  async getSystemInfo(): Promise<any> {
    const response = await this.client.get('/data/version');
    return response.data;
  }

  async ping(): Promise<boolean> {
    try {
      await this.client.get('/data/version');
      return true;
    } catch {
      return false;
    }
  }

  // Container Service methods
  async getContainers(): Promise<XnatContainer[]> {
    try {
      const response = await this.client.get('/xapi/containers', {
        params: { format: 'json' }
      });
      return response.data || [];
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.warn('Container service not available on this XNAT server');
        return [];
      }
      console.error('Error fetching containers:', error);
      return [];
    }
  }

  async getContainer(containerId: string): Promise<XnatContainer | null> {
    try {
      const response = await this.client.get(`/xapi/containers/${containerId}`, {
        params: { format: 'json' }
      });
      return response.data || null;
    } catch (error) {
      console.error('Error fetching container:', error);
      return null;
    }
  }

  async killContainer(containerId: string): Promise<boolean> {
    try {
      await this.client.delete(`/xapi/containers/${containerId}/kill`);
      return true;
    } catch (error) {
      console.error('Error killing container:', error);
      return false;
    }
  }

  async getWorkflows(options?: {
    page?: number;
    id?: string;
    data_type?: string;
    sortable?: boolean;
    days?: number;
  }): Promise<XnatWorkflow[]> {
    try {
      // Use GET request with query parameters since POST is not supported
      const params: any = { format: 'json' };
      
      // Add optional filtering parameters if provided
      if (options?.id) params.id = options.id;
      if (options?.data_type) params.data_type = options.data_type;
      if (options?.days) params.days = options.days;
      if (options?.page) params.page = options.page;
      
      const response = await this.client.get('/data/workflows', { params });
      
      // Handle different possible response formats
      return response.data?.ResultSet?.Result || response.data?.results || response.data || [];
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.warn('Workflows endpoint not available on this XNAT server');
        return [];
      }
      if (error.response?.status === 405) {
        console.warn('Workflows endpoint does not support the requested method');
        return [];
      }
      console.error('Error fetching workflows:', error);
      return [];
    }
  }

  async getWorkflow(workflowId: string): Promise<XnatWorkflow | null> {
    try {
      const response = await this.client.get(`/data/workflows/${workflowId}`, {
        params: { format: 'json' }
      });
      return response.data || null;
    } catch (error) {
      console.error('Error fetching workflow:', error);
      return null;
    }
  }

  async getContainerLogs(containerId: string, logType: 'stdout' | 'stderr' = 'stdout'): Promise<string> {
    try {
      const response = await this.client.get(`/xapi/containers/${containerId}/logs/${logType}`, {
        responseType: 'text'
      });
      return response.data || '';
    } catch (error) {
      console.error('Error fetching container logs:', error);
      return '';
    }
  }

  async getProcesses(): Promise<XnatProcess[]> {
    try {
      // Mock process data - in real implementation would query system processes
      const mockProcesses: XnatProcess[] = [
        {
          id: 'proc-001',
          name: 'DICOM Receiver',
          status: 'ACTIVE',
          type: 'UPLOAD',
          user: 'system',
          description: 'Receiving incoming DICOM files from scanner',
          started: new Date(Date.now() - 1800000).toISOString(),
          last_activity: new Date(Date.now() - 30000).toISOString(),
          cpu_usage: 15.5,
          memory_usage: 512,
          files_processed: 1250,
          bytes_processed: 2.1 * 1024 * 1024 * 1024
        },
        {
          id: 'proc-002',
          name: 'Image Processing Pipeline',
          status: 'ACTIVE',
          type: 'PROCESSING',
          user: 'pipeline',
          project: 'CMB-MML',
          description: 'Running automated image processing workflows',
          started: new Date(Date.now() - 3600000).toISOString(),
          last_activity: new Date(Date.now() - 120000).toISOString(),
          cpu_usage: 85.2,
          memory_usage: 2048,
          files_processed: 45,
          files_total: 78,
          bytes_processed: 5.7 * 1024 * 1024 * 1024,
          bytes_total: 10.2 * 1024 * 1024 * 1024
        },
        {
          id: 'proc-003',
          name: 'Database Maintenance',
          status: 'IDLE',
          type: 'VALIDATION',
          user: 'system',
          description: 'Periodic database cleanup and optimization',
          started: new Date(Date.now() - 7200000).toISOString(),
          last_activity: new Date(Date.now() - 1800000).toISOString(),
          cpu_usage: 2.1,
          memory_usage: 128
        }
      ];
      return mockProcesses;
    } catch (error) {
      console.error('Error fetching processes:', error);
      return [];
    }
  }

  async getSystemStats(): Promise<XnatSystemStats> {
    try {
      // Mock system stats - in real implementation would query system metrics
      const mockStats: XnatSystemStats = {
        cpu_usage: 45.2,
        memory_usage: 6.8,
        memory_total: 16.0,
        disk_usage: 2.4,
        disk_total: 10.0,
        active_jobs: 2,
        queued_jobs: 3,
        active_processes: 5,
        uptime: 2592000, // 30 days in seconds
        version: '1.8.7'
      };
      return mockStats;
    } catch (error) {
      console.error('Error fetching system stats:', error);
      throw error;
    }
  }

  // Utility methods
  getConfig(): XnatConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<XnatConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.baseURL) {
      this.client.defaults.baseURL = newConfig.baseURL;
    }
    
    // Don't set Cookie header manually - browser handles this automatically
    // if (newConfig.jsessionid) {
    //   this.client.defaults.headers.common['Cookie'] = `JSESSIONID=${newConfig.jsessionid}`;
    // }
    
    if (newConfig.username && newConfig.password) {
      this.client.defaults.auth = {
        username: newConfig.username,
        password: newConfig.password,
      };
    }
  }
}