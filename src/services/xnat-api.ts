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

  // Authentication methods
  async login(username: string, password: string): Promise<string> {
    const response = await this.client.post('/data/JSESSION', null, {
      auth: { username, password },
    });
    
    const jsessionid = response.data;
    this.client.defaults.headers.common['Cookie'] = `JSESSIONID=${jsessionid}`;
    return jsessionid;
  }

  async logout(): Promise<void> {
    await this.client.delete('/data/JSESSION');
    delete this.client.defaults.headers.common['Cookie'];
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
    console.log('🌐 Making scans API call to:', `/data/projects/${projectId}/subjects/${subjectId}/experiments/${experimentId}/scans`);
    const response = await this.client.get(`/data/projects/${projectId}/subjects/${subjectId}/experiments/${experimentId}/scans`, {
      params: { format: 'json' }
    });
    console.log('🌐 Full HTTP response:', response);
    console.log('🌐 Response data:', response.data);
    console.log('🌐 Response data ResultSet:', response.data.ResultSet);
    console.log('🌐 Response data ResultSet Result:', response.data.ResultSet?.Result);
    const result = response.data.ResultSet?.Result || [];
    console.log('🌐 Final scans result:', result);
    return result;
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
    const response = await this.client.get('/data/users');
    return response.data.ResultSet.Result || [];
  }

  async getUser(username: string): Promise<XnatUser> {
    const response = await this.client.get(`/data/users/${username}`);
    return response.data.items[0].data_fields;
  }

  async getCurrentUser(): Promise<XnatUser> {
    const response = await this.client.get('/data/user', {
      params: { format: 'json' }
    });
    return response.data;
  }

  async createUser(user: Partial<XnatUser>): Promise<XnatUser> {
    const response = await this.client.put(`/data/users/${user.login}`, user);
    return response.data;
  }

  async updateUser(username: string, user: Partial<XnatUser>): Promise<XnatUser> {
    const response = await this.client.put(`/data/users/${username}`, user);
    return response.data;
  }

  async deleteUser(username: string): Promise<void> {
    await this.client.delete(`/data/users/${username}`);
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

  // Utility methods
  getConfig(): XnatConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<XnatConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.baseURL) {
      this.client.defaults.baseURL = newConfig.baseURL;
    }
    
    if (newConfig.jsessionid) {
      this.client.defaults.headers.common['Cookie'] = `JSESSIONID=${newConfig.jsessionid}`;
    }
    
    if (newConfig.username && newConfig.password) {
      this.client.defaults.auth = {
        username: newConfig.username,
        password: newConfig.password,
      };
    }
  }
}