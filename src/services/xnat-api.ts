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

export interface XnatProjectAccess {
  ID: string;
  name?: string;
  description?: string;
  secondary_ID?: string;
  role?: string;
  group_id?: string;
  URI?: string;
  [key: string]: unknown;
}

export interface XnatSavedSearch {
  id?: string;
  ID?: string;
  title?: string;
  description?: string;
  owner?: string;
  element_name?: string;
  shares?: number;
  [key: string]: unknown;
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
  id: number | string;
  xdat_user_id?: number | string;
  login: string;
  username?: string;
  firstname?: string;
  firstName?: string;
  lastname?: string;
  lastName?: string;
  email?: string;
  enabled?: boolean;
  verified?: boolean;
  last_modified?: string;
  lastModified?: string;
  lastSuccessfulLogin?: string;
  last_login?: string;
  last_login_date?: string;
  roles?: string[];
  groups?: string[];
  authorization?: {
    groups: string[];
    roles: string[];
  };
  [key: string]: unknown;
}

export interface CreateXnatUserRequest {
  login?: string;
  username: string;
  email: string;
  firstname?: string;
  firstName?: string;
  lastname?: string;
  lastName?: string;
  password: string;
  enabled?: boolean;
  verified?: boolean;
  roles?: string[];
  groups?: string[];
}

export interface UpdateXnatUserRequest {
  email?: string;
  firstname?: string;
  firstName?: string;
  lastname?: string;
  lastName?: string;
  password?: string;
  enabled?: boolean;
  verified?: boolean;
  roles?: string[];
  groups?: string[];
}

export type XnatUserRoleMap = Record<string, string[]>;

export type XnatActiveUserSessions = Record<string, { sessions: string[]; count: number }>;

export interface XnatUserAuthDetail {
  authMethod: string;
  authMethodId?: string;
  authUser?: string;
  lastLoginAttempt?: string | number;
  lastSuccessfulLogin?: string | number;
  failedLoginAttempts?: number;
  [key: string]: unknown;
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
  id?: string | number;
  wfid?: number;
  label?: string;
  externalId?: string;
  status?: string;
  pipelineName?: string;
  'pipeline-name'?: string;
  dataType?: string;
  'data-type'?: string;
  launchTime?: number | string;
  launch_time?: number | string;
  modTime?: number | string;
  current_step_launch_time?: number | string;
  percent_complete?: number;
  percentageComplete?: number;
  stepDescription?: string;
  'step-description'?: string;
  createUser?: string;
  details?: string | Record<string, unknown>;
  comments?: string;
  justification?: string;
  [key: string]: unknown;
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
  cpu_usage?: number;
  memory_usage?: number;
  memory_total?: number;
  disk_usage?: number;
  disk_total?: number;
  active_jobs?: number;
  queued_jobs?: number;
  active_processes?: number;
  uptime?: number;
  version?: string;
}

type UnknownRecord = Record<string, unknown>;

export interface OpenApiTag {
  name: string;
  description?: string;
}

export interface OpenApiOperation {
  tags?: string[];
  summary?: string;
  description?: string;
  operationId?: string;
  deprecated?: boolean;
  [key: string]: unknown;
}

export interface OpenApiSpec {
  swagger?: string;
  openapi?: string;
  info?: {
    title?: string;
    version?: string;
    description?: string;
    [key: string]: unknown;
  };
  basePath?: string;
  servers?: Array<{ url?: string; description?: string }>;
  tags?: OpenApiTag[];
  paths?: Record<string, Record<string, OpenApiOperation>>;
  [key: string]: unknown;
}

const FALLBACK_OPENAPI_PATH = '/xnat-api-docs.json';

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

  private extractString(source: UnknownRecord | undefined, keys: string[]): string | undefined {
    if (!source) return undefined;
    for (const key of keys) {
      if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
      const value = source[key];
      if (value === undefined || value === null) continue;
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed.length > 0) return trimmed;
      }
      if (typeof value === 'number') {
        return String(value);
      }
      if (typeof value === 'boolean') {
        return value ? 'true' : 'false';
      }
    }
    return undefined;
  }

  private extractNumber(source: UnknownRecord | undefined, keys: string[]): number | undefined {
    if (!source) return undefined;
    for (const key of keys) {
      if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
      const value = source[key];
      if (value === undefined || value === null) continue;
      if (typeof value === 'number' && !Number.isNaN(value)) {
        return value;
      }
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (/^-?\d+$/.test(trimmed)) {
          const num = Number.parseInt(trimmed, 10);
          if (!Number.isNaN(num)) {
            return num;
          }
        }
      }
    }
    return undefined;
  }

  private toBooleanValue(value: unknown): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (!normalized) return false;
      if (['false', '0', 'no', 'n', 'off'].includes(normalized)) return false;
      return true;
    }
    return Boolean(value);
  }

  private extractBoolean(source: UnknownRecord | undefined, keys: string[], fallback?: boolean): boolean | undefined {
    if (!source) return fallback;
    for (const key of keys) {
      if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
      const value = source[key];
      if (value === undefined || value === null) return fallback;
      return this.toBooleanValue(value);
    }
    return fallback;
  }

  private toStringArray(value: unknown): string[] {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value
        .map((item) => (typeof item === 'string' ? item : String(item)))
        .map((item) => item.trim())
        .filter(Boolean);
    }
    if (typeof value === 'string') {
      return value
        .split(/[\s,;|]+/)
        .map((part) => part.trim())
        .filter(Boolean);
    }
    return [String(value).trim()].filter(Boolean);
  }

  private extractList(source: UnknownRecord | undefined, keys: string[]): string[] {
    if (!source) return [];
    for (const key of keys) {
      if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
      return this.toStringArray(source[key]);
    }
    return [];
  }

  private normalizeUserRecord(raw: UnknownRecord): XnatUser {
    const username = this.extractString(raw, ['username', 'login', 'LOGIN']) || '';
    const numericId = this.extractNumber(raw, ['xdat_user_id', 'id', 'ID', 'userId']);
    const firstName = this.extractString(raw, ['firstName', 'firstname', 'Firstname', 'FIRSTNAME']);
    const lastName = this.extractString(raw, ['lastName', 'lastname', 'Lastname', 'LASTNAME']);
    const email = this.extractString(raw, ['email', 'Email', 'EMAIL', 'mail', 'MAIL']);
    const enabled = this.extractBoolean(raw, ['enabled', 'ENABLED', 'status']);
    const verified = this.extractBoolean(raw, ['verified', 'VERIFIED']);
    const roles = this.extractList(raw, ['roles', 'Roles']);
    const groups = this.extractList(raw, ['groups', 'Groups']);
    const lastModified = this.extractString(raw, ['lastModified', 'last_modified']);
    const lastSuccessfulLogin =
      this.extractString(raw, ['lastSuccessfulLogin', 'last_successful_login', 'last_login', 'lastLogin']) ||
      this.extractString(raw, ['LAST_SUCCESSFUL_LOGIN']);

    const login = username || (numericId !== undefined ? String(numericId) : '');
    const idValue = numericId ?? raw.xdat_user_id ?? raw.id ?? raw.ID ?? login;

    const rawAuthorization = raw.authorization as { roles?: unknown; groups?: unknown } | undefined;
    const authRoles = Array.isArray(rawAuthorization?.roles)
      ? rawAuthorization!.roles.filter((role): role is string => typeof role === 'string' && role.trim().length > 0)
      : roles;
    const authGroups = Array.isArray(rawAuthorization?.groups)
      ? rawAuthorization!.groups.filter((group): group is string => typeof group === 'string' && group.trim().length > 0)
      : groups;

    const authorization = {
      roles: authRoles.length ? authRoles : [],
      groups: authGroups.length ? authGroups : [],
    };

    const normalized: XnatUser = {
      ...(raw as XnatUser),
      id: idValue as number | string,
      xdat_user_id: (raw.xdat_user_id ?? numericId ?? raw.id ?? raw.ID) as number | string | undefined,
      login,
      username: username || (typeof raw.username === 'string' ? raw.username : undefined),
      firstname: firstName ?? (typeof raw.firstname === 'string' ? raw.firstname : undefined),
      firstName: firstName ?? (typeof raw.firstName === 'string' ? raw.firstName : undefined),
      lastname: lastName ?? (typeof raw.lastname === 'string' ? raw.lastname : undefined),
      lastName: lastName ?? (typeof raw.lastName === 'string' ? raw.lastName : undefined),
      email: email ?? (typeof raw.email === 'string' ? raw.email : undefined),
      enabled: enabled ?? (typeof raw.enabled === 'boolean' ? raw.enabled : undefined),
      verified: verified ?? (typeof raw.verified === 'boolean' ? raw.verified : undefined),
      last_modified: lastModified ?? (typeof raw.last_modified === 'string' ? raw.last_modified : undefined),
      lastModified: lastModified ?? (typeof raw.lastModified === 'string' ? raw.lastModified : undefined),
      lastSuccessfulLogin: lastSuccessfulLogin ?? (typeof raw.lastSuccessfulLogin === 'string' ? raw.lastSuccessfulLogin : undefined),
      roles: roles.length ? roles : Array.isArray(raw.roles) ? (raw.roles as string[]) : undefined,
      groups: groups.length ? groups : Array.isArray(raw.groups) ? (raw.groups as string[]) : undefined,
      authorization,
    };

    if (!normalized.authorization) {
      normalized.authorization = {
        roles: normalized.roles ?? [],
        groups: normalized.groups ?? [],
      };
    }

    return normalized;
  }

  private parseUserListResponse(data: unknown): XnatUser[] {
    if (!data) return [];

    const normalizeArray = (items: unknown[]): XnatUser[] =>
      items
        .filter((item): item is UnknownRecord => typeof item === 'object' && item !== null)
        .map((item) => this.normalizeUserRecord(item));

    if (Array.isArray(data)) {
      return normalizeArray(data);
    }

    const recordData = data as UnknownRecord;

    if (Array.isArray(recordData.users)) {
      return normalizeArray(recordData.users);
    }

    const resultSet = recordData.ResultSet as UnknownRecord | undefined;
    if (Array.isArray(resultSet?.Result)) {
      return normalizeArray(resultSet.Result);
    }

    if (Array.isArray(recordData.items)) {
      return normalizeArray(
        recordData.items.map((item) =>
          typeof item === 'object' && item !== null && 'data_fields' in item
            ? ((item as UnknownRecord).data_fields as UnknownRecord)
            : (item as UnknownRecord)
        )
      );
    }

    if (typeof data === 'object' && data !== null) {
      return [this.normalizeUserRecord(recordData)];
    }

    return [];
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

  private buildUserPayload(
    user: Partial<CreateXnatUserRequest & UpdateXnatUserRequest> & { login?: string; username?: string }
  ): { username: string; xapi: Record<string, unknown>; legacy: Record<string, unknown> } {
    const username = (user.username ?? user.login ?? '').trim();
    const firstName = user.firstName ?? user.firstname;
    const lastName = user.lastName ?? user.lastname;
    const email = user.email;
    const enabled = user.enabled;
    const verified = user.verified;
    const roles = user.roles ?? [];
    const groups = user.groups ?? [];

    const xapiPayload: Record<string, unknown> = {};
    const legacyPayload: Record<string, unknown> = {};

    if (username) {
      xapiPayload.username = username;
      legacyPayload.login = username;
    }

    if (typeof email !== 'undefined') {
      xapiPayload.email = email;
      legacyPayload.email = email;
    }

    if (typeof firstName !== 'undefined') {
      xapiPayload.firstName = firstName;
      legacyPayload.firstname = firstName;
    }

    if (typeof lastName !== 'undefined') {
      xapiPayload.lastName = lastName;
      legacyPayload.lastname = lastName;
    }

    if (typeof user.password !== 'undefined' && user.password !== '') {
      xapiPayload.password = user.password;
      legacyPayload.password = user.password;
    }

    if (typeof enabled !== 'undefined') {
      xapiPayload.enabled = enabled;
      legacyPayload.enabled = enabled;
    }

    if (typeof verified !== 'undefined') {
      xapiPayload.verified = verified;
      legacyPayload.verified = verified;
    }

    if (roles.length) {
      xapiPayload.roles = roles;
      legacyPayload.roles = roles;
    }

    if (groups.length) {
      xapiPayload.groups = groups;
      legacyPayload.groups = groups;
    }

    return { username, xapi: xapiPayload, legacy: legacyPayload };
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

  async getProjectAccess(): Promise<XnatProjectAccess[]> {
    try {
      const response = await this.client.get('/xapi/access/projects');
      if (Array.isArray(response.data)) {
        return response.data as XnatProjectAccess[];
      }
      if (Array.isArray(response.data?.ResultSet?.Result)) {
        return response.data.ResultSet.Result as XnatProjectAccess[];
      }
      return [];
    } catch (error) {
      console.error('Error fetching project access information:', error);
      return [];
    }
  }

  async getSavedSearches(): Promise<XnatSavedSearch[]> {
    try {
      const response = await this.client.get('/data/search/saved', {
        params: { format: 'json' },
      });
      const saved = response.data?.ResultSet?.Result;
      if (Array.isArray(saved)) {
        return saved as XnatSavedSearch[];
      }
      return [];
    } catch (error) {
      console.error('Error fetching saved searches:', error);
      return [];
    }
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
  async getUsers(options?: { scope?: 'current' | 'all' }): Promise<XnatUser[]> {
    const scope = options?.scope ?? 'current';
    const endpoint = scope === 'all' ? '/xapi/users/profiles' : '/xapi/users/current';

    try {
      const response = await this.client.get(endpoint, {
        params: { format: 'json' }
      });
      return this.parseUserListResponse(response.data);
    } catch (error) {
      console.warn('Falling back to legacy user list endpoint', error);
      const legacyEndpoint = scope === 'all' ? '/data/users' : '/data/users';
      const response = await this.client.get(legacyEndpoint, {
        params: { format: 'json' }
      });
      return this.parseUserListResponse(response.data);
    }
  }

  async getUser(userId: string | number): Promise<XnatUser> {
    const identifier = String(userId);
    try {
      const encoded = encodeURIComponent(identifier);
      const response = await this.client.get(`/xapi/users/profile/${encoded}`);
      return this.parseUserListResponse(response.data)[0];
    } catch (error) {
      console.warn('Falling back to legacy user endpoint', error);
      const response = await this.client.get(`/data/users/${identifier}`, {
        params: { format: 'json' }
      });
      return this.parseUserListResponse(response.data)[0];
    }
  }

  async getCurrentUser(): Promise<XnatUser> {
    const response = await this.client.get('/data/user', {
      params: { format: 'json' }
    });
    return response.data;
  }

  async createUser(user: CreateXnatUserRequest): Promise<XnatUser> {
    const { username, xapi, legacy } = this.buildUserPayload(user);
    if (!username) {
      throw new Error('Username is required to create an XNAT user');
    }

    try {
      const response = await this.client.post('/xapi/users', xapi);
      return this.normalizeUserRecord(response.data);
    } catch (error) {
      console.warn('Falling back to legacy user creation endpoint', error);
      const response = await this.client.put(`/data/users/${encodeURIComponent(username)}`, legacy);
      return this.normalizeUserRecord(response.data);
    }
  }

  async updateUser(userId: string | number, updates: UpdateXnatUserRequest): Promise<XnatUser> {
    const identifier = String(userId);
    const { username, xapi, legacy } = this.buildUserPayload({ ...updates, username: identifier });
    const target = encodeURIComponent(username || identifier);

    try {
      const response = await this.client.put(`/xapi/users/${target}`, xapi);
      return this.normalizeUserRecord(response.data);
    } catch (error) {
      console.warn('Falling back to legacy user update endpoint', error);
      const response = await this.client.put(`/data/users/${target}`, legacy);
      return this.normalizeUserRecord(response.data);
    }
  }

  async deleteUser(userId: string | number): Promise<void> {
    const identifier = String(userId);
    try {
      await this.client.delete(`/xapi/users/${encodeURIComponent(identifier)}`);
    } catch (error) {
      console.warn('Falling back to legacy user deletion endpoint', error);
      await this.client.delete(`/data/users/${identifier}`);
    }
  }

  async getUserRoleMap(): Promise<XnatUserRoleMap> {
    try {
      const response = await this.client.get('/xapi/users/rolemap');
      return response.data || {};
    } catch (error) {
      console.warn('Failed to fetch user role map', error);
      return {};
    }
  }

  async getActiveUsers(): Promise<XnatActiveUserSessions> {
    try {
      const response = await this.client.get('/xapi/users/active');
      return response.data || {};
    } catch (error) {
      console.warn('Failed to fetch active user sessions', error);
      return {};
    }
  }

  async getUserRoles(username: string): Promise<string[]> {
    try {
      const response = await this.client.get(`/xapi/users/${encodeURIComponent(username)}/roles`);
      return this.toStringArray(response.data);
    } catch (error) {
      console.warn('Failed to fetch user roles', error);
      return [];
    }
  }

  async setUserVerified(username: string, verified: boolean): Promise<void> {
    await this.client.put(`/xapi/users/${encodeURIComponent(username)}/verified/${verified}`);
  }

  async setUserEnabled(username: string, enabled: boolean): Promise<void> {
    await this.client.put(`/xapi/users/${encodeURIComponent(username)}/enabled/${enabled}`);
  }

  async killUserSessions(username: string): Promise<void> {
    await this.client.delete(`/xapi/users/active/${encodeURIComponent(username)}`);
  }

  async getUserAuthDetails(username: string): Promise<XnatUserAuthDetail[]> {
    try {
      const response = await this.client.get(`/xapi/users/authDetails/${encodeURIComponent(username)}`);
      if (Array.isArray(response.data)) {
        return response.data as XnatUserAuthDetail[];
      }
      return [];
    } catch (error) {
      console.warn('Failed to fetch user authentication details', error);
      return [];
    }
  }

  // Search methods
  async search(searchXml: string): Promise<unknown[]> {
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

  async savedSearch(searchId: string, params?: Record<string, unknown>): Promise<unknown[]> {
    const response = await this.client.get(`/data/search/saved/${searchId}`, {
      params: {
        format: 'json',
        ...params,
      },
    });
    return response.data.ResultSet.Result || [];
  }

  // System methods
  async getSystemInfo(): Promise<unknown> {
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
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
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
    size?: number;
    admin_workflows?: boolean;
  }): Promise<XnatWorkflow[]> {
    try {
      const body: Record<string, unknown> = {
        data_type: options?.data_type ?? 'xnat:imageSessionData',
        days: options?.days ?? 7,
        page: options?.page ?? 1,
        size: options?.size ?? 50,
        sortable: options?.sortable ?? true,
      };

      if (options?.id) {
        body.id = options.id;
      }

      if (options?.admin_workflows) {
        body.admin_workflows = true;
      }

      const response = await this.client.post('/xapi/workflows', body, {
        timeout: 10000,
      });

      const rawData = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.items)
          ? response.data.items
          : Array.isArray(response.data?.workflows)
            ? response.data.workflows
            : Array.isArray(response.data?.ResultSet?.Result)
              ? response.data.ResultSet.Result
              : [];

      if (!Array.isArray(rawData)) {
        return [];
      }

      const pickIdentifier = (...values: unknown[]): string | number | undefined => {
        for (const value of values) {
          if (typeof value === 'string' && value.trim().length > 0) {
            return value;
          }
          if (typeof value === 'number' && !Number.isNaN(value)) {
            return value;
          }
        }
        return undefined;
      };

      const pickString = (...values: unknown[]): string | undefined => {
        for (const value of values) {
          if (typeof value === 'string' && value.trim().length > 0) {
            return value;
          }
        }
        return undefined;
      };

      const pickNumber = (...values: unknown[]): number | undefined => {
        for (const value of values) {
          if (typeof value === 'number' && !Number.isNaN(value)) {
            return value;
          }
          if (typeof value === 'string') {
            const parsed = Number(value);
            if (!Number.isNaN(parsed)) {
              return parsed;
            }
          }
        }
        return undefined;
      };

      return rawData.map((item: UnknownRecord) => {
        const idValue = pickIdentifier(item.id, item.wfid, item.ID, item['wfid']);
        const launchValue = pickNumber(item.launchTime, item['launch_time']);
        const modValue = pickNumber(item.modTime, item['mod_time']);
        const currentStepValue = pickNumber(item.current_step_launch_time, item['current-step-launch-time']);
        const percentValue = pickNumber(item.percent_complete, item.percentageComplete, item['percent-complete']);
        const detailsValue = item.details;
        let normalizedDetails: string | Record<string, unknown> | undefined;
        if (typeof detailsValue === 'string') {
          normalizedDetails = detailsValue;
        } else if (detailsValue && typeof detailsValue === 'object') {
          normalizedDetails = detailsValue as Record<string, unknown>;
        }

        const normalized: XnatWorkflow = {
          ...item,
          id: idValue,
          wfid: typeof item.wfid === 'number' ? item.wfid : pickNumber(item.wfid),
          externalId: pickString(item.externalId, item['external-id']),
          pipelineName: pickString(item.pipelineName, item['pipeline-name']),
          dataType: pickString(item.dataType, item['data-type']),
          launchTime: launchValue,
          modTime: modValue,
          current_step_launch_time: currentStepValue,
          percent_complete: percentValue,
          stepDescription: pickString(item.stepDescription, item['step-description']),
          createUser: pickString(item.createUser, item['create-user']),
          status: pickString(item.status),
          details: normalizedDetails,
          comments: pickString(item.comments),
          justification: pickString(item.justification),
        };

        return normalized;
      });
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        if (status && [401, 403, 404, 405, 500, 502, 503].includes(status)) {
          console.warn('Workflows endpoint returned status', status);
          return [];
        }
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
      const response = await this.client.get('/xapi/containers', {
        params: { format: 'json' },
        timeout: 10000,
      });

      const data = response.data;
      if (Array.isArray(data)) {
        return data as XnatProcess[];
      }
      if (Array.isArray(data?.items)) {
        return data.items as XnatProcess[];
      }
      return [];
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        if (status && [401, 403, 404, 500, 502, 503, 504].includes(status)) {
          console.warn('Containers endpoint returned status', status);
          return [];
        }
      }
      console.error('Error fetching processes:', error);
      return [];
    }
  }

  async getSystemStats(): Promise<XnatSystemStats | null> {
    try {
      const info = await this.getSystemInfo();
      if (info && typeof info === 'object') {
        const record = info as Record<string, unknown>;
        const version = typeof record.Version === 'string'
          ? record.Version
          : typeof record.version === 'string'
            ? record.version
            : undefined;

        if (version) {
          return { version };
        }
      }
      return null;
    } catch (error) {
      console.warn('Error fetching system stats:', error);
      return null;
    }
  }

  async getOpenApiSpec(): Promise<OpenApiSpec> {
    const candidateUrls = [
      '/xapi/api-docs?format=json',
      '/xapi/api-docs',
      '/xapi/swagger.json',
      '/xapi/api/swagger.json',
    ];

    let lastError: unknown;

    for (const url of candidateUrls) {
      try {
        const response = await this.client.get(url, { responseType: 'json' });
        if (response?.data && typeof response.data === 'object') {
          return response.data as OpenApiSpec;
        }
      } catch (error) {
        lastError = error;
        console.warn(`Failed to fetch OpenAPI spec from ${url}`, error);
      }
    }

    try {
      const fallbackResponse = await axios.get(FALLBACK_OPENAPI_PATH, { responseType: 'json' });
      if (fallbackResponse?.data && typeof fallbackResponse.data === 'object') {
        return fallbackResponse.data as OpenApiSpec;
      }
    } catch (fallbackError) {
      console.error('Failed to load fallback OpenAPI spec', fallbackError);
      if (lastError) {
        throw lastError;
      }
      throw fallbackError;
    }

    throw lastError ?? new Error('Unable to load OpenAPI specification.');
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
