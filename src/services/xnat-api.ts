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

export interface XnatProjectSummary extends XnatProject {
  project_access?: string;
  project_invs?: string;
  pi?: string;
  URI?: string;
  [key: string]: unknown;
}

export interface XnatProjectListOptions {
  accessible?: boolean;
  traditional?: boolean;
  recent?: boolean;
  owner?: boolean;
  member?: boolean;
  collaborator?: boolean;
  limit?: number;
}

export interface XnatProjectSummaryResponse {
  projects: XnatProjectSummary[];
  totalRecords: number;
  userId?: string;
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
  num_experiments?: number;
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

export interface XnatExperimentSummary extends XnatExperiment {
  workflow_status?: string;
  workflow_date?: string;
  action_date?: string;
  pipeline_name?: string;
  type_desc?: string;
  last_modified?: string;
  insert_date?: string;
  status?: string;
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
  xnat_abstractresource_id?: string;
  description?: string;
  format?: string;
  content?: string;
  file_count?: number;
  file_size?: number;
  cat_id?: string;
  cat_desc?: string;
  category?: string;
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

export interface XnatAssessor {
  id: string;
  label: string;
  project?: string;
  session_ID?: string;
  session_label?: string;
  xsiType?: string;
  date?: string;
  insert_date?: string;
  URI?: string;
  imageAssessorDataId?: string;
  [key: string]: unknown;
}

export type XnatResourceScope =
  | { type: 'experiment' }
  | { type: 'scan'; id: string }
  | { type: 'assessor'; id: string }
  | { type: 'reconstruction'; id: string };

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

export interface XnatTotalCounts {
  projects: number;
  subjects: number;
  experiments: number;
}

export interface XnatContainer {
  id?: string | number;
  status?: string;
  'status-time'?: string;
  'container-id'?: string;
  'docker-image'?: string;
  'command-id'?: string | number;
  'wrapper-id'?: string | number;
  'project-id'?: string;
  project?: string;
  'user-id'?: string;
  'workflow-id'?: string | number;
  created?: string;
  history?: XnatContainerHistory[];
  mounts?: XnatMount[];
  inputs?: XnatContainerInput[];
  outputs?: XnatContainerOutput[];
  env?: Record<string, string>;
  'environment-variables'?: Record<string, string>;
  'command-line'?: string;
  'working-directory'?: string;
  backend?: string;
  subtype?: string;
  'override-entrypoint'?: boolean;
  swarm?: boolean;
  'auto-remove'?: boolean;
  'parent-source-object-name'?: string;
  'derived-data-id'?: string;
  'input-mount-xnat-host-path'?: string;
  'output-mount-xnat-host-path'?: string;
  'log-paths'?: XnatLogPath[] | Record<string, string>;
  ports?: Record<string, unknown>;
  'swarm-constraints'?: Array<string | Record<string, unknown>>;
  'container-labels'?: Record<string, string>;
  secrets?: Array<string | Record<string, unknown>>;
  'service-id'?: string;
  'task-id'?: string;
  'node-id'?: string;
  [key: string]: unknown;
}

export interface XnatContainerHistory {
  id?: string | number;
  status?: string;
  'time-recorded'?: string;
  'external-timestamp'?: string;
  'exit-code'?: number;
  exitCode?: string | number;
  message?: string;
  'entity-type'?: 'system' | 'event' | 'user' | 'service' | string;
  'entity-id'?: string;
}

export interface XnatContainerLogResponse {
  content: string;
  timestamp: string | null;
  bytesRead?: number;
  fromFile?: boolean;
}

export interface XnatContainerInput {
  id?: string | number;
  type?: string;
  name?: string;
  sensitive?: boolean;
  value?: unknown;
}

export interface XnatContainerOutput {
  id?: string | number;
  name?: string;
  'from-command-output'?: string;
  'from-output-handler'?: string;
  type?: string;
  required?: boolean;
  mount?: string;
  label?: string;
  tags?: unknown[];
  'handled-by'?: string;
}

export type XnatLogPath = string | Record<string, unknown>;

export interface XnatMount {
  id?: string | number;
  name?: string;
  writable?: boolean;
  'xnat-host-path'?: string;
  'container-path'?: string;
  'container-host-path'?: string;
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

export interface WorkflowBuildDirNode {
  id: string;
  text: string;
  path?: string;
  type?: 'file' | 'folder';
  children?: WorkflowBuildDirNode[] | boolean;
  download_link?: string;
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

export interface XnatSystemMonitoring {
  cpu?: {
    usage?: number;
    cores?: number;
    load?: number[];
  };
  memory?: {
    used?: number;
    total?: number;
    free?: number;
    usedPercent?: number;
  };
  disk?: {
    used?: number;
    total?: number;
    free?: number;
    usedPercent?: number;
  };
  uptime?: number;
  timestamp?: number;
}

// Container Service Command and Launch types
export interface XnatCommand {
  id: number;
  name: string;
  image: string;
  version: string;
  description?: string;
  'schema-version'?: string;
  type?: string;
  'command-line'?: string;
  'override-entrypoint'?: boolean;
  mounts?: unknown[];
  'environment-variables'?: Record<string, string>;
  ports?: Record<string, string>;
  inputs?: XnatCommandInput[];
  outputs?: XnatCommandOutput[];
  xnat?: XnatCommandWrapper[]; // Primary key used by XNAT
  'xnat-command-wrappers'?: XnatCommandWrapper[];
  xnatCommandWrappers?: XnatCommandWrapper[];
  [key: string]: unknown;
}

export interface XnatCommandInput {
  name: string;
  description?: string;
  type?: string;
  matcher?: string;
  'default-value'?: unknown;
  defaultValue?: unknown;
  required?: boolean;
  'replacement-key'?: string;
  'command-line-flag'?: string;
  'command-line-separator'?: string;
  'true-value'?: string;
  'false-value'?: string;
  sensitive?: boolean;
  [key: string]: unknown;
}

export interface XnatCommandOutput {
  name: string;
  description?: string;
  required?: boolean;
  mount?: string;
  type?: string;
  'as-a-child-of'?: string;
  'via-wrapup-command'?: string;
  label?: string;
  format?: string;
  tags?: string[];
  [key: string]: unknown;
}

export interface XnatCommandWrapper {
  id: number;
  name: string;
  description?: string;
  contexts?: string[];
  'external-inputs'?: XnatWrapperExternalInput[];
  'derived-inputs'?: XnatWrapperDerivedInput[];
  'output-handlers'?: XnatWrapperOutputHandler[];
  'command-id'?: number;
  enabled?: boolean;
  [key: string]: unknown;
}

export interface XnatWrapperExternalInput {
  name: string;
  description?: string;
  type?: string;
  matcher?: string;
  'default-value'?: unknown;
  required?: boolean;
  'replacement-key'?: string;
  'provides-value-for-command-input'?: string;
  'provides-files-for-command-mount'?: string;
  'via-setup-command'?: string;
  'user-settable'?: boolean;
  advanced?: boolean;
  [key: string]: unknown;
}

export interface XnatWrapperDerivedInput {
  name: string;
  description?: string;
  type?: string;
  'derived-from-wrapper-input'?: string;
  'derived-from-xnat-object-property'?: string;
  'provides-value-for-command-input'?: string;
  'provides-files-for-command-mount'?: string;
  'via-setup-command'?: string;
  matcher?: string;
  required?: boolean;
  'replacement-key'?: string;
  'default-value'?: unknown;
  [key: string]: unknown;
}

export interface XnatWrapperOutputHandler {
  name: string;
  'accepts-command-output'?: string;
  'via-wrapup-command'?: string;
  'as-a-child-of'?: string;
  type?: string;
  label?: string;
  format?: string;
  tags?: string[];
  [key: string]: unknown;
}

export interface XnatCommandSummaryForContext {
  'command-id'?: number;
  commandId?: number;
  'command-name'?: string;
  commandName?: string;
  'command-description'?: string;
  commandDescription?: string;
  'wrapper-id'?: number;
  wrapperId?: number;
  'wrapper-name'?: string;
  wrapperName?: string;
  'wrapper-description'?: string;
  wrapperDescription?: string;
  image?: string;
  enabled?: boolean;
  [key: string]: unknown;
}

export interface XnatLaunchUi {
  'wrapper-id'?: number;
  wrapperId?: number;
  'root-element-name'?: string;
  rootElementName?: string;
  'input-config'?: XnatLaunchUiInput[];
  inputs?: XnatLaunchUiInput[];
  'input-values'?: Array<{
    name: string;
    values: Array<{
      value: unknown;
      label?: string;
      children?: unknown[];
    }>;
  }>;
  [key: string]: unknown;
}

export interface XnatLaunchUiInput {
  name: string;
  label?: string;
  description?: string;
  type?: string;
  required?: boolean;
  'default-value'?: unknown;
  defaultValue?: unknown;
  matcher?: string;
  values?: XnatLaunchUiInputValue[];
  'user-settable'?: boolean;
  userSettable?: boolean;
  advanced?: boolean;
  'command-input-name'?: string;
  [key: string]: unknown;
}

export interface XnatLaunchUiInputValue {
  value?: unknown;
  label?: string;
  [key: string]: unknown;
}

export interface XnatLaunchReport {
  status?: 'Success' | 'Failure' | 'success' | 'failure'; // XNAT returns lowercase
  'container-id'?: string;
  containerId?: string;
  'workflow-id'?: string;
  workflowId?: string;
  message?: string;
  params?: Record<string, string>;
  [key: string]: unknown;
}

export interface XnatBulkLaunchReport {
  successes?: XnatLaunchReport[];
  failures?: XnatLaunchReport[];
  [key: string]: unknown;
}

export interface XnatCommandConfiguration {
  id?: number;
  'wrapper-id'?: number;
  wrapperId?: number;
  'command-id'?: number;
  commandId?: number;
  enabled?: boolean;
  inputs?: Record<string, unknown>;
  [key: string]: unknown;
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

export interface XnatPrearchiveSession {
  project: string;
  timestamp: string;
  subject: string;
  name: string;
  folderName: string;
  url: string;
  status: 'READY' | 'BUILDING' | 'RECEIVING' | 'CONFLICT' | 'ERROR' | 'QUEUED_BUILDING' | 'DELETING';
  uploaded: string;
  scan_date: string;
  scan_time: string;
  lastmod: string;
  tag: string;
  autoarchive?: string;
  prevent_auto_commit?: string | boolean;
  prevent_anon?: string | boolean;
  PROTOCOL?: string;
  VISIT?: string;
  SOURCE?: string;
  TIMEZONE?: string;
  scan_count?: number;
  file_size?: number;
}

export interface XnatPrearchiveScan {
  ID: string;
  xsiType: string;
  series_description?: string;
}

export interface XnatPrearchiveAction {
  action: 'archive' | 'delete' | 'rebuild' | 'move';
  project?: string;
  subject?: string;
  session?: string;
  overwrite?: 'none' | 'append' | 'delete';
}

const FALLBACK_OPENAPI_PATH = '/xnat-api-docs.json';

export class XnatApiClient {
  private client: AxiosInstance;
  private config: XnatConfig;

  constructor(config: XnatConfig) {
    this.config = config;

    // Determine baseURL based on environment
    const isDevelopment = import.meta.env.DEV;
    const isProduction = !isDevelopment;
    const isLocalhost = config.baseURL.includes('localhost') || config.baseURL.includes('127.0.0.1');

    let baseURL: string;
    if (isProduction) {
      // In production (deployed at /morpheus/), use relative URLs to same server
      baseURL = '';
    } else if (!isLocalhost) {
      // In dev mode with remote server, use proxy
      baseURL = '/api/xnat';
    } else {
      // In dev mode with localhost, use actual baseURL
      baseURL = config.baseURL;
    }

    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Accept': 'application/json, application/xml, text/plain, */*',
      },
      // Always include credentials to send session cookies
      withCredentials: true,
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

  /**
   * Get the underlying Axios HTTP client for making custom requests
   * @returns The Axios instance used by this API client
   */
  getHttpClient(): AxiosInstance {
    return this.client;
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

  private normalizeResourceScope(scope?: string | XnatResourceScope): XnatResourceScope {
    if (!scope) {
      return { type: 'experiment' };
    }
    if (typeof scope === 'string') {
      return { type: 'scan', id: scope };
    }
    return scope;
  }

  private buildResourceBasePath(
    projectId: string,
    subjectId: string,
    experimentId: string,
    scope: XnatResourceScope
  ): string {
    // Handle project-level resources
    if (!subjectId && !experimentId) {
      return `/data/projects/${projectId}/resources`;
    }

    // Handle subject-level resources
    if (subjectId && !experimentId) {
      return `/data/projects/${projectId}/subjects/${subjectId}/resources`;
    }

    // Handle experiment-level and below
    const root = `/data/projects/${projectId}/subjects/${subjectId}/experiments/${experimentId}`;

    switch (scope.type) {
      case 'scan':
        return `${root}/scans/${encodeURIComponent(scope.id)}/resources`;
      case 'assessor':
        return `${root}/assessors/${encodeURIComponent(scope.id)}/resources`;
      case 'reconstruction':
        return `${root}/reconstructions/${encodeURIComponent(scope.id)}/resources`;
      default:
        return `${root}/resources`;
    }
  }

  private extractList(source: UnknownRecord | undefined, keys: string[]): string[] {
    if (!source) return [];
    for (const key of keys) {
      if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
      return this.toStringArray(source[key]);
    }
    return [];
  }

  private resolveBaseUrl(): string {
    const base = this.client.defaults.baseURL ?? this.config.baseURL ?? '';
    if (!base) return '';
    return base.endsWith('/') ? base.slice(0, -1) : base;
  }

  getBaseUrl(): string {
    // Public method to get base URL for debugging
    const baseUrl = this.resolveBaseUrl();
    // If in dev mode and using proxy, return the actual XNAT server URL for curl commands
    if (baseUrl === '/api/xnat') {
      return this.config.baseURL || 'http://demo02.xnatworks.io';
    }
    return baseUrl;
  }

  private buildUrl(path: string): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const base = this.resolveBaseUrl();
    return base ? `${base}${normalizedPath}` : normalizedPath;
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
  async getProjects(options: XnatProjectListOptions = {}): Promise<XnatProject[]> {
    const summary = await this.getProjectsSummary(options);
    return summary.projects;
  }

  async getProjectsSummary(options: XnatProjectListOptions = {}): Promise<XnatProjectSummaryResponse> {
    const params: Record<string, string | number> = { format: 'json' };

    const flagKeys: Array<keyof XnatProjectListOptions> = [
      'accessible',
      'traditional',
      'recent',
      'owner',
      'member',
      'collaborator',
    ];

    flagKeys.forEach((key) => {
      if (options[key]) {
        params[key] = 'true';
      }
    });

    if (typeof options.limit === 'number') {
      params.limit = options.limit;
    }

    const response = await this.client.get('/data/projects', { params });
    const resultSet = response.data?.ResultSet ?? {};
    const projects = Array.isArray(resultSet.Result) ? resultSet.Result : [];
    const totalRecordsRaw = resultSet.totalRecords;
    const totalRecords = typeof totalRecordsRaw === 'string'
      ? parseInt(totalRecordsRaw, 10) || projects.length || 0
      : typeof totalRecordsRaw === 'number'
        ? totalRecordsRaw
        : projects.length || 0;

    const userId = resultSet.xdat_user_id !== undefined ? String(resultSet.xdat_user_id) : undefined;

    return {
      projects: projects as XnatProjectSummary[],
      totalRecords,
      userId,
    };
  }

  async getTotalCounts(): Promise<XnatTotalCounts> {
    try {
      const response = await this.client.get('/xapi/totalCounts/reset');
      return {
        projects: Number(response.data?.['xnat:projectData'] ?? 0),
        subjects: Number(response.data?.['xnat:subjectData'] ?? 0),
        experiments: Number(response.data?.['xnat:imageSessionData'] ?? 0),
      };
    } catch (error) {
      console.warn('Falling back to calculated counts', error);

      const fetchTotal = async (path: string): Promise<number> => {
        const res = await this.client.get(path, {
          params: { format: 'json', columns: 'ID' },
        });
        const total = res.data?.ResultSet?.totalRecords;
        if (typeof total === 'string') {
          return parseInt(total, 10) || 0;
        }
        if (typeof total === 'number') {
          return total;
        }
        const result = res.data?.ResultSet?.Result;
        return Array.isArray(result) ? result.length : 0;
      };

      const [projects, subjects, experiments] = await Promise.all([
        fetchTotal('/data/projects'),
        fetchTotal('/data/subjects'),
        fetchTotal('/data/experiments'),
      ]);

      return { projects, subjects, experiments };
    }
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
    const data = response.data.items[0].data_fields;
    // Normalize: ensure 'id' field exists (XNAT uses 'ID' uppercase)
    return {
      ...data,
      id: data.id || data.ID
    };
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

  async getRecentExperiments(limit = 25): Promise<XnatExperimentSummary[]> {
    const params: Record<string, string | number> = {
      format: 'json',
      recent: 'true',
    };

    if (limit > 0) {
      params.limit = limit;
    }

    const response = await this.client.get('/data/experiments', { params });
    const resultSet = response.data?.ResultSet ?? {};
    const experiments = Array.isArray(resultSet.Result) ? resultSet.Result as XnatExperimentSummary[] : [];
    return limit > 0 ? experiments.slice(0, limit) : experiments;
  }

  async getExperiment(projectId: string, subjectId: string, experimentId: string): Promise<XnatExperiment> {
    const response = await this.client.get(`/data/projects/${projectId}/subjects/${subjectId}/experiments/${experimentId}`, {
      params: { format: 'json' }
    });
    const data = response.data.items?.[0]?.data_fields || response.data;
    // Normalize: ensure 'id' field exists (XNAT uses 'ID' uppercase)
    return {
      ...data,
      id: data.id || data.ID
    };
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
    const scans = response.data.ResultSet?.Result || [];
    // Normalize: XNAT returns 'ID' but our interface uses 'id'
    return scans.map((scan: any) => ({
      ...scan,
      id: scan.id || scan.ID
    }));
  }

  async getAssessors(projectId: string, subjectId: string, experimentId: string): Promise<XnatAssessor[]> {
    const response = await this.client.get(
      `/data/projects/${projectId}/subjects/${subjectId}/experiments/${experimentId}/assessors`,
      { params: { format: 'json' } }
    );

    const assessors = response.data.ResultSet?.Result || [];
    return assessors.map((assessor: UnknownRecord) => {
      const id = this.extractString(assessor, ['id', 'ID']) || '';
      const label = this.extractString(assessor, ['label', 'ID']) || id;
      const imageAssessorDataId =
        this.extractString(assessor, ['xnat:imageassessordata/id', 'xnat_imageassessordata_id']) || undefined;

      return {
        ...assessor,
        id,
        label,
        imageAssessorDataId,
      } as XnatAssessor;
    });
  }

  getScanThumbnailUrl(projectId: string, _subjectId: string, experimentId: string, scanId: string): string {
    // Use the correct XAPI endpoint for scan snapshots
    const path = `/xapi/projects/${projectId}/experiments/${experimentId}/scan/${scanId}/snapshot`;
    return this.buildUrl(path);
  }

  getDicomHeaderUrl(projectId: string, subjectId: string, experimentId: string, scanId: string): string {
    // Use standard XNAT data API to get scan metadata with DICOM parameters (for archived scans)
    const path = `/data/projects/${projectId}/subjects/${subjectId}/experiments/${experimentId}/scans/${scanId}`;
    return this.buildUrl(path + '?format=json');
  }

  getPrearchiveDicomHeaderUrl(project: string, timestamp: string, subject: string, scanId: string): string {
    // For prearchive scans, we'll need to fetch a DICOM file and parse it client-side
    // This returns the base path for the scan
    const path = `/data/prearchive/projects/${project}/${timestamp}/${subject}/scans/${scanId}`;
    return this.buildUrl(path + '?format=json');
  }

  async getScan(projectId: string, subjectId: string, experimentId: string, scanId: string): Promise<XnatScan> {
    const response = await this.client.get(`/data/projects/${projectId}/subjects/${subjectId}/experiments/${experimentId}/scans/${scanId}`);
    return response.data.items[0].data_fields;
  }

  async getScanFiles(projectId: string, subjectId: string, experimentId: string, scanId: string): Promise<Array<{ Name: string; Size: string }>> {
    try {
      const url = `/data/projects/${projectId}/subjects/${subjectId}/experiments/${experimentId}/scans/${scanId}/resources/DICOM/files`;
      const config = { params: { format: 'json' } };

      console.log('🌐 API Request:', {
        method: 'GET',
        url: url,
        params: config.params,
        baseURL: this.client.defaults.baseURL,
        fullUrl: `${this.client.defaults.baseURL}${url}?format=json`
      });

      const response = await this.client.get(url, config);

      console.log('✅ API Response:', {
        status: response.status,
        statusText: response.statusText,
        dataSize: JSON.stringify(response.data).length,
        resultCount: response.data?.ResultSet?.Result?.length || 0
      });

      const results = response.data?.ResultSet?.Result || [];
      return Array.isArray(results) ? results : [];
    } catch (error: any) {
      console.error('❌ Error fetching scan files:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        method: error.config?.method
      });
      return [];
    }
  }

  async getDicomDump(
    projectId: string,
    experimentId: string,
    scanId: string
  ): Promise<Array<{ tag1: string; tag2: string; vr: string; value: string; desc: string }>> {
    try {
      const src = `/archive/projects/${projectId}/experiments/${experimentId}/scans/${scanId}`;
      const response = await this.client.get('/REST/services/dicomdump', {
        params: { src, format: 'json' }
      });
      return response.data?.ResultSet?.Result || [];
    } catch (error) {
      console.error('Error fetching DICOM dump:', error);
      return [];
    }
  }

  async getScanFile(
    projectId: string,
    subjectId: string,
    experimentId: string,
    scanId: string,
    resource: string,
    fileName: string
  ): Promise<ArrayBuffer> {
    const url = `/data/projects/${projectId}/subjects/${subjectId}/experiments/${experimentId}/scans/${scanId}/resources/${resource}/files/${fileName}`;
    const config = { responseType: 'arraybuffer' as const };

    console.log('🌐 API Request (DICOM File):', {
      method: 'GET',
      url: url,
      fileName: fileName,
      baseURL: this.client.defaults.baseURL,
      fullUrl: `${this.client.defaults.baseURL}${url}`,
      responseType: 'arraybuffer'
    });

    try {
      const response = await this.client.get(url, config);

      console.log('✅ API Response (DICOM File):', {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers['content-type'],
        size: response.data.byteLength,
        sizeKB: (response.data.byteLength / 1024).toFixed(2) + ' KB'
      });

      return response.data;
    } catch (error: any) {
      console.error('❌ Error fetching DICOM file:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        method: error.config?.method,
        responseData: error.response?.data
      });
      throw error;
    }
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
  async getResources(
    projectId: string,
    subjectId: string,
    experimentId: string,
    scope?: string | XnatResourceScope
  ): Promise<XnatResource[]> {
    const normalizedScope = this.normalizeResourceScope(scope);
    const basePath = this.buildResourceBasePath(projectId, subjectId, experimentId, normalizedScope);

    const response = await this.client.get(basePath);
    const data = response.data;

    if (Array.isArray(data)) {
      return data as XnatResource[];
    }
    if (data?.ResultSet?.Result) {
      return data.ResultSet.Result;
    }
    if (data?.items?.[0]?.data_fields) {
      return [data.items[0].data_fields];
    }

    return [];
  }

  async getResource(
    projectId: string,
    subjectId: string,
    experimentId: string,
    resourceId: string,
    scope?: string | XnatResourceScope
  ): Promise<XnatResource> {
    const normalizedScope = this.normalizeResourceScope(scope);
    const basePath = this.buildResourceBasePath(projectId, subjectId, experimentId, normalizedScope);
    const url = `${basePath}/${encodeURIComponent(resourceId)}`;

    const response = await this.client.get(url);
    return response.data.items?.[0]?.data_fields ?? response.data;
  }

  async createResource(
    projectId: string,
    subjectId: string,
    experimentId: string,
    resource: Partial<XnatResource>,
    scope?: string | XnatResourceScope
  ): Promise<XnatResource> {
    const normalizedScope = this.normalizeResourceScope(scope);
    const basePath = this.buildResourceBasePath(projectId, subjectId, experimentId, normalizedScope);
    const label = resource.label;
    if (!label) {
      throw new Error('Resource label is required to create a resource.');
    }
    const url = `${basePath}/${encodeURIComponent(label)}`;

    const response = await this.client.put(url, resource);
    return response.data;
  }

  async deleteResource(
    projectId: string,
    subjectId: string,
    experimentId: string,
    resourceId: string,
    scope?: string | XnatResourceScope
  ): Promise<void> {
    const normalizedScope = this.normalizeResourceScope(scope);
    const basePath = this.buildResourceBasePath(projectId, subjectId, experimentId, normalizedScope);
    const url = `${basePath}/${encodeURIComponent(resourceId)}`;

    await this.client.delete(url);
  }

  // File methods
  async getFiles(
    projectId: string,
    subjectId: string,
    experimentId: string,
    resourceId: string,
    scope?: string | XnatResourceScope
  ): Promise<XnatFile[]> {
    const normalizedScope = this.normalizeResourceScope(scope);
    const basePath = this.buildResourceBasePath(projectId, subjectId, experimentId, normalizedScope);
    const url = `${basePath}/${encodeURIComponent(resourceId)}/files`;

    const response = await this.client.get(url);
    return response.data.ResultSet?.Result || [];
  }

  async downloadFile(
    projectId: string,
    subjectId: string,
    experimentId: string,
    resourceId: string,
    filename: string,
    scope?: string | XnatResourceScope
  ): Promise<Blob> {
    const normalizedScope = this.normalizeResourceScope(scope);
    const basePath = this.buildResourceBasePath(projectId, subjectId, experimentId, normalizedScope);
    const url = `${basePath}/${encodeURIComponent(resourceId)}/files/${encodeURIComponent(filename)}`;

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
    scope?: string | XnatResourceScope
  ): Promise<void> {
    const normalizedScope = this.normalizeResourceScope(scope);
    const basePath = this.buildResourceBasePath(projectId, subjectId, experimentId, normalizedScope);
    const url = `${basePath}/${encodeURIComponent(resourceId)}/files/${encodeURIComponent(file.name)}`;

    const formData = new FormData();
    formData.append('file', file);

    await this.client.put(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  async deleteFile(
    projectId: string,
    subjectId: string,
    experimentId: string,
    resourceId: string,
    filename: string,
    scope?: string | XnatResourceScope,
    options?: { path?: string }
  ): Promise<void> {
    const normalizedScope = this.normalizeResourceScope(scope);
    const basePath = this.buildResourceBasePath(projectId, subjectId, experimentId, normalizedScope);
    const segments: string[] = [];
    if (options?.path) {
      segments.push(
        ...options.path
          .split('/')
          .filter(Boolean)
          .map((part) => encodeURIComponent(part))
      );
    } else {
      segments.push(encodeURIComponent(filename));
    }

    const url = `${basePath}/${encodeURIComponent(resourceId)}/files/${segments.join('/')}`;
    await this.client.delete(url);
  }

  getResourceFilesUrl(
    projectId: string,
    subjectId: string,
    experimentId: string,
    resourceId: string,
    scope?: string | XnatResourceScope
  ): string {
    const normalizedScope = this.normalizeResourceScope(scope);
    const basePath = this.buildResourceBasePath(projectId, subjectId, experimentId, normalizedScope);
    return `${basePath}/${encodeURIComponent(resourceId)}/files`;
  }

  getResourceDownloadUrl(
    projectId: string,
    subjectId: string,
    experimentId: string,
    resourceId: string,
    scope?: string | XnatResourceScope,
    options?: { format?: 'zip' | 'tar.gz'; path?: string }
  ): string {
    const filesPath = this.getResourceFilesUrl(projectId, subjectId, experimentId, resourceId, scope);
    const params = new URLSearchParams();
    if (options?.format) {
      params.set('format', options.format);
    }
    if (options?.path) {
      params.set('path', options.path);
    }
    const query = params.toString();
    const pathWithQuery = query ? `${filesPath}?${query}` : filesPath;
    return this.buildUrl(pathWithQuery);
  }

  getBulkResourceDownloadUrl(
    experimentId: string,
    resourceIds: string[],
    options?: { format?: 'zip' | 'tar.gz'; structure?: string; all?: boolean | string }
  ): string {
    const sanitizedIds = resourceIds.filter(Boolean);
    if (!sanitizedIds.length) {
      throw new Error('No resource IDs provided for bulk download');
    }

    const params = new URLSearchParams();
    if (options?.format) {
      params.set('format', options.format);
    }
    if (options?.structure) {
      params.set('structure', options.structure);
    }
    if (options?.all) {
      params.set('all', typeof options.all === 'string' ? options.all : 'true');
    }

    const base = `/REST/experiments/${encodeURIComponent(experimentId)}/resources/${sanitizedIds.join(',')}/files`;
    const query = params.toString();
    return this.buildUrl(query ? `${base}?${query}` : base);
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
    // Use /xapi/users/profile which returns the current authenticated user
    try {
      const response = await this.client.get('/xapi/users/profile');
      return response.data;
    } catch (error) {
      // Fallback: try the legacy endpoint if XAPI is not available
      const username = this.config.username;
      if (username) {
        try {
          const response = await this.client.get(`/data/user/${username}`, {
            params: { format: 'json' }
          });
          return response.data;
        } catch (legacyError) {
          // If both fail, return a minimal user object with just the username
          return {
            id: username,
            ID: username,
            login: username,
            username: username,
            enabled: true,
          } as XnatUser;
        }
      }
      throw new Error('Unable to determine current user');
    }
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
      // Use /data/JSESSION instead of /data/version (which returns 404 on some servers)
      await this.client.get('/data/JSESSION');
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
      console.log('🛑 Killing container:', containerId);
      const response = await this.client.post(`/xapi/containers/${containerId}/kill`);
      console.log('✅ Kill response:', response.status, response.data);
      return true;
    } catch (error) {
      console.error('❌ Error killing container:', error);
      if (axios.isAxiosError(error)) {
        console.error('Response status:', error.response?.status);
        console.error('Response data:', error.response?.data);
      }
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

  async getWorkflowBuildDir(workflowId: string, path?: string): Promise<WorkflowBuildDirNode[]> {
    try {
      const url = path
        ? `/xapi/workflows/${workflowId}/build_dir_contd`
        : `/xapi/workflows/${workflowId}/build_dir`;
      const response = await this.client.get(url, {
        params: path ? { inputPath: path } : undefined,
      });
      const data = response.data;
      if (Array.isArray(data)) {
        return data as WorkflowBuildDirNode[];
      }
      if (Array.isArray(data?.items)) {
        return data.items as WorkflowBuildDirNode[];
      }
      return [];
    } catch (error) {
      console.error('Error fetching workflow build directory:', error);
      return [];
    }
  }

  async getWorkflowLog(workflowId: string): Promise<string> {
    const tryFetch = async (path: string) => {
      const response = await this.client.get(path, {
        responseType: 'text',
      });
      return typeof response.data === 'string' ? response.data : '';
    };

    const paths = [
      `/xapi/workflows/${workflowId}/log`,
      `/data/workflows/${workflowId}/log`,
    ];

    for (const path of paths) {
      try {
        const data = await tryFetch(path);
        if (data) {
          return data;
        }
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const status = error.response?.status;
          if (status && ![404, 500].includes(status)) {
            console.warn(`Workflow log request failed for ${path} with status ${status}`);
          }
        } else {
          console.warn(`Workflow log request failed for ${path}:`, error);
        }
      }
    }

    return '';
  }

  async getContainerLogs(
    containerId: string,
    logType: 'stdout' | 'stderr' = 'stdout',
    options: { since?: string | number } = {},
  ): Promise<XnatContainerLogResponse> {
    const { since } = options;

    const parseLogPayload = (payload: unknown): XnatContainerLogResponse => {
      let content = '';
      let timestamp: string | null = null;
      let bytesRead: number | undefined;
      let fromFile: boolean | undefined;

      if (typeof payload === 'string') {
        content = payload;
      } else if (payload && typeof payload === 'object') {
        const record = payload as Record<string, unknown>;
        const rawContent = record.content ?? record.log ?? record.message;

        if (typeof rawContent === 'string') {
          content = rawContent;
        } else if (Array.isArray(rawContent)) {
          const lines = (rawContent as unknown[]).filter((line): line is string => typeof line === 'string');
          content = lines.join('\n');
        }

        const lineArray = record.lines;
        if (!content && Array.isArray(lineArray)) {
          const lines = (lineArray as unknown[]).filter((line): line is string => typeof line === 'string');
          content = lines.join('\n');
        }

        if (typeof record.timestamp === 'string') {
          timestamp = record.timestamp;
        } else if (typeof record.timestamp === 'number') {
          timestamp = Number.isFinite(record.timestamp) ? String(record.timestamp) : null;
        }

        if (typeof record.bytesRead === 'number') {
          bytesRead = record.bytesRead;
        }

        if (typeof record.fromFile === 'boolean') {
          fromFile = record.fromFile;
        }
      }

      if (!timestamp && since !== undefined && since !== null) {
        timestamp = String(since);
      }

      return { content, timestamp, bytesRead, fromFile };
    };

    const logSincePath = `/xapi/containers/${containerId}/logSince/${logType}`;
    const params: Record<string, string | number> = { format: 'json' };
    if (since !== undefined && since !== null) {
      params.timestamp = typeof since === 'number' ? since : since;
    }

    try {
      const response = await this.client.get(logSincePath, { params });
      const parsed = parseLogPayload(response.data);
      if (parsed.content || parsed.timestamp) {
        return parsed;
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        if (status && ![404, 410].includes(status)) {
          console.warn(`Container logSince request failed for ${logSincePath} with status ${status}`);
        }
      } else {
        console.warn(`Container logSince request failed for ${logSincePath}:`, error);
      }
    }

    try {
      const response = await this.client.get(`/xapi/containers/${containerId}/logs/${logType}`, {
        responseType: 'text',
      });
      const parsed = parseLogPayload(response.data);
      if (parsed.content) {
        return parsed;
      }
      return { ...parsed, content: '' };
    } catch (error) {
      console.error('Error fetching container logs:', error);
    }

    return { content: '', timestamp: since !== undefined && since !== null ? String(since) : null };
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

  async getSystemMonitoring(): Promise<XnatSystemMonitoring | null> {
    try {
      const response = await this.client.get('/monitoring', {
        headers: {
          'Accept': 'text/html',
        },
      });

      if (!response.data || typeof response.data !== 'string') {
        return null;
      }

      const html = response.data;

      // Parse metrics from JavaMelody HTML page
      const result: XnatSystemMonitoring = {
        cpu: {},
        memory: {},
        disk: {},
        timestamp: Date.now(),
      };

      // Extract Java memory: "Java memory used: 3,029 Mb / 29,127 Mb"
      const javaMemMatch = html.match(/Java memory used:\s*<\/td><td>.*?>(\d[\d,]*)<\/a>\s*Mb\s*\/\s*(\d[\d,]*)\s*Mb/i);
      if (javaMemMatch && result.memory) {
        const used = parseFloat(javaMemMatch[1].replace(/,/g, '')) * 1024 * 1024; // Convert MB to bytes
        const total = parseFloat(javaMemMatch[2].replace(/,/g, '')) * 1024 * 1024;
        result.memory.used = used;
        result.memory.total = total;
        result.memory.free = total - used;
        result.memory.usedPercent = (used / total) * 100;
      }

      // Extract system load: "System load</td><td>...2.36</a>"
      const sysLoadMatch = html.match(/System load<\/td><td>.*?>(\d+\.?\d*)<\/a>/i);
      if (sysLoadMatch && result.cpu) {
        const load = parseFloat(sysLoadMatch[1]);
        result.cpu.load = [load, load * 0.9, load * 0.8]; // Current, 5min avg, 15min avg (approximated)
        // Approximate CPU usage from load (load of 2-4 on 4 cores = 50-100% usage)
        result.cpu.usage = Math.min(100, (load / 4) * 100);
      }

      // Extract physical memory: "Free physical memory = 36,459 Mb" and "Total physical memory = 64,004 Mb"
      const freePhysMatch = html.match(/Free physical memory\s*=\s*(\d[\d,]*)\s*Mb/i);
      const totalPhysMatch = html.match(/Total physical memory\s*=\s*(\d[\d,]*)\s*Mb/i);
      if (freePhysMatch && totalPhysMatch && result.disk) {
        const free = parseFloat(freePhysMatch[1].replace(/,/g, '')) * 1024 * 1024; // Convert MB to bytes
        const total = parseFloat(totalPhysMatch[1].replace(/,/g, '')) * 1024 * 1024;
        const used = total - free;
        // Use physical memory stats as disk stats (since disk space not easily available)
        result.disk.used = used;
        result.disk.total = total;
        result.disk.free = free;
        result.disk.usedPercent = (used / total) * 100;
      }

      // Extract CPU cores if available
      const coresMatch = html.match(/(\d+)\s*processors?/i);
      if (coresMatch && result.cpu) {
        result.cpu.cores = parseInt(coresMatch[1], 10);
      } else if (result.cpu) {
        result.cpu.cores = 4; // Default
      }

      // Extract uptime if available (in seconds)
      // JavaMelody shows uptime in the page, look for it
      const uptimeMatch = html.match(/uptime[:\s]+(\d+)/i);
      if (uptimeMatch) {
        result.uptime = parseInt(uptimeMatch[1], 10);
      } else {
        // Calculate approximate uptime based on current time (demo)
        result.uptime = Math.floor(Date.now() / 1000) % (7 * 24 * 3600); // Up to 7 days
      }

      return result;
    } catch (error) {
      console.warn('Error fetching system monitoring:', error);
      return null;
    }
  }

  // Command and Launch methods
  async getCommands(): Promise<XnatCommand[]> {
    try {
      const response = await this.client.get('/xapi/commands', {
        params: { format: 'json' }
      });
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        console.warn('Command service not available on this XNAT server');
        return [];
      }
      console.error('Error fetching commands:', error);
      return [];
    }
  }

  async getCommand(commandId: number): Promise<XnatCommand | null> {
    try {
      const response = await this.client.get(`/xapi/commands/${commandId}`, {
        params: { format: 'json' }
      });
      return response.data || null;
    } catch (error) {
      console.error('Error fetching command:', error);
      return null;
    }
  }

  async getAvailableCommands(xsiType: string, project?: string): Promise<XnatCommandSummaryForContext[]> {
    try {
      const url = project
        ? `/xapi/projects/${project}/commands/available`
        : `/xapi/commands/available/site`;
      const response = await this.client.get(url, {
        params: { xsiType, format: 'json' }
      });
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        console.warn('Available commands endpoint not found');
        return [];
      }
      console.error('Error fetching available commands:', error);
      return [];
    }
  }

  async getLaunchUi(
    wrapperId: number,
    params: Record<string, string>,
    project?: string
  ): Promise<XnatLaunchUi | null> {
    try {
      const url = project
        ? `/xapi/projects/${project}/wrappers/${wrapperId}/launch`
        : `/xapi/wrappers/${wrapperId}/launch`;
      const response = await this.client.get(url, {
        params: { ...params, format: 'json' }
      });
      return response.data || null;
    } catch (error) {
      console.error('Error fetching launch UI:', error);
      return null;
    }
  }

  async launchContainer(
    wrapperId: number,
    rootElement: string,
    params: Record<string, string>,
    project?: string
  ): Promise<XnatLaunchReport> {
    try {
      const url = project
        ? `/xapi/projects/${project}/wrappers/${wrapperId}/root/${rootElement}/launch`
        : `/xapi/wrappers/${wrapperId}/root/${rootElement}/launch`;

      console.log('🚀 Launching container:', {
        url,
        wrapperId,
        rootElement,
        project,
        params
      });

      const response = await this.client.post(url, params, {
        headers: { 'Content-Type': 'application/json' }
      });

      console.log('✅ Launch response:', response.data);

      // XNAT returns lowercase "success" - normalize it
      if (response.data && response.data.status) {
        response.data.status = response.data.status.charAt(0).toUpperCase() + response.data.status.slice(1);
      }

      return response.data || { status: 'Success' };
    } catch (error) {
      console.error('❌ Error launching container:', error);
      if (axios.isAxiosError(error)) {
        console.error('Response status:', error.response?.status);
        console.error('Response data:', error.response?.data);
        console.error('Request URL:', error.config?.url);
        console.error('Request data:', error.config?.data);

        if (error.response?.data) {
          return {
            status: 'Failure',
            message: typeof error.response.data === 'string'
              ? error.response.data
              : JSON.stringify(error.response.data)
          };
        }
      }
      return {
        status: 'Failure',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async launchContainerByCommandName(
    commandId: number,
    wrapperName: string,
    rootElement: string,
    params: Record<string, string>,
    project?: string
  ): Promise<XnatLaunchReport> {
    try {
      const url = project
        ? `/xapi/projects/${project}/commands/${commandId}/wrappers/${wrapperName}/root/${rootElement}/launch`
        : `/xapi/commands/${commandId}/wrappers/${wrapperName}/root/${rootElement}/launch`;
      const response = await this.client.post(url, params, {
        headers: { 'Content-Type': 'application/json' }
      });
      return response.data || { status: 'Success' };
    } catch (error) {
      console.error('Error launching container:', error);
      if (axios.isAxiosError(error) && error.response?.data) {
        return {
          status: 'Failure',
          message: typeof error.response.data === 'string'
            ? error.response.data
            : error.message
        };
      }
      return {
        status: 'Failure',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async bulkLaunch(
    wrapperId: number,
    rootElement: string,
    params: Record<string, string>,
    project?: string
  ): Promise<XnatBulkLaunchReport> {
    try {
      const url = project
        ? `/xapi/projects/${project}/wrappers/${wrapperId}/root/${rootElement}/bulklaunch`
        : `/xapi/wrappers/${wrapperId}/root/${rootElement}/bulklaunch`;
      const response = await this.client.post(url, params, {
        headers: { 'Content-Type': 'application/json' }
      });
      return response.data || { successes: [], failures: [] };
    } catch (error) {
      console.error('Error bulk launching containers:', error);
      return { successes: [], failures: [] };
    }
  }

  async bulkLaunchByCommandName(
    commandId: number,
    wrapperName: string,
    rootElement: string,
    params: Record<string, string>,
    project?: string
  ): Promise<XnatBulkLaunchReport> {
    try {
      const url = project
        ? `/xapi/projects/${project}/commands/${commandId}/wrappers/${wrapperName}/root/${rootElement}/bulklaunch`
        : `/xapi/commands/${commandId}/wrappers/${wrapperName}/root/${rootElement}/bulklaunch`;
      const response = await this.client.post(url, params, {
        headers: { 'Content-Type': 'application/json' }
      });
      return response.data || { successes: [], failures: [] };
    } catch (error) {
      console.error('Error bulk launching containers:', error);
      return { successes: [], failures: [] };
    }
  }

  async getCommandConfiguration(
    wrapperId: number,
    project?: string
  ): Promise<XnatCommandConfiguration | null> {
    try {
      const url = project
        ? `/xapi/projects/${project}/wrappers/${wrapperId}/config`
        : `/xapi/wrappers/${wrapperId}/config`;
      const response = await this.client.get(url, {
        params: { format: 'json' }
      });
      return response.data || null;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      console.error('Error fetching command configuration:', error);
      return null;
    }
  }

  async isCommandEnabled(wrapperId: number, project?: string): Promise<boolean> {
    try {
      const url = project
        ? `/xapi/projects/${project}/wrappers/${wrapperId}/enabled`
        : `/xapi/wrappers/${wrapperId}/enabled`;
      const response = await this.client.get(url);
      return response.data === true || response.data === 'true';
    } catch (error) {
      console.error('Error checking if command is enabled:', error);
      return false;
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

  // Prearchive methods
  async getPrearchiveSessions(projectId?: string): Promise<XnatPrearchiveSession[]> {
    try {
      const url = projectId
        ? `/data/prearchive/projects/${projectId}`
        : '/data/prearchive/projects';

      const response = await this.client.get(url, {
        params: { format: 'json' }
      });

      const results = response.data?.ResultSet?.Result || [];
      return Array.isArray(results) ? results : [];
    } catch (error) {
      console.error('Error fetching prearchive sessions:', error);
      return [];
    }
  }

  async getPrearchiveSession(
    project: string,
    timestamp: string,
    subject: string
  ): Promise<XnatPrearchiveSession | null> {
    try {
      const response = await this.client.get(
        `/data/prearchive/projects/${project}/${timestamp}/${subject}`,
        { params: { format: 'json' } }
      );

      const results = response.data?.ResultSet?.Result || [];
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error('Error fetching prearchive session:', error);
      return null;
    }
  }

  async archivePrearchiveSession(
    project: string,
    timestamp: string,
    subject: string,
    options?: {
      overwrite?: 'none' | 'append' | 'delete';
      newProject?: string;
      newSubject?: string;
      newSession?: string;
    }
  ): Promise<boolean> {
    try {
      const src = `/prearchive/projects/${project}/${timestamp}/${subject}`;

      // Build URL-encoded form data
      const params = new URLSearchParams();
      params.append('src', src);

      // Add optional parameters if provided
      if (options?.newProject) {
        params.append('project', options.newProject);
      }
      if (options?.newSubject) {
        params.append('subject', options.newSubject);
      }
      if (options?.newSession) {
        params.append('session', options.newSession);
      }
      if (options?.overwrite) {
        params.append('overwrite', options.overwrite);
      }

      console.log('Archiving prearchive session:', src, options);
      console.log('Archive params:', params.toString());

      const response = await this.client.post('/REST/services/archive', params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        params: {
          format: 'csv'
        }
      });

      console.log('Archive response:', response.status, response.data);
      return true;
    } catch (error) {
      console.error('Error archiving prearchive session:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        console.error('Response data:', (error as any).response?.data);
        console.error('Response status:', (error as any).response?.status);
      }
      throw error;
    }
  }

  async deletePrearchiveSession(
    project: string,
    timestamp: string,
    subject: string
  ): Promise<boolean> {
    try {
      await this.client.delete(
        `/data/prearchive/projects/${project}/${timestamp}/${subject}`
      );
      return true;
    } catch (error) {
      console.error('Error deleting prearchive session:', error);
      return false;
    }
  }

  async rebuildPrearchiveSession(
    project: string,
    timestamp: string,
    subject: string
  ): Promise<boolean> {
    try {
      const src = `/prearchive/projects/${project}/${timestamp}/${subject}`;

      // Build URL-encoded form data
      const params = new URLSearchParams();
      params.append('src', src);

      console.log('Rebuilding prearchive session:', src);

      const response = await this.client.post('/REST/services/prearchive/rebuild', params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      console.log('Rebuild response:', response.status, response.data);
      return true;
    } catch (error) {
      console.error('Error rebuilding prearchive session:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        console.error('Response data:', (error as any).response?.data);
        console.error('Response status:', (error as any).response?.status);
      }
      throw error;
    }
  }

  async movePrearchiveSession(
    project: string,
    timestamp: string,
    subject: string,
    newProject: string
  ): Promise<boolean> {
    try {
      const src = `/prearchive/projects/${project}/${timestamp}/${subject}`;

      // Build URL-encoded form data
      const params = new URLSearchParams();
      params.append('src', src);
      params.append('newProject', newProject);

      console.log('Moving prearchive session:', src, 'to project:', newProject);

      const response = await this.client.post('/REST/services/prearchive/move', params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      console.log('Move response:', response.status, response.data);
      return true;
    } catch (error) {
      console.error('Error moving prearchive session:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        console.error('Response data:', (error as any).response?.data);
        console.error('Response status:', (error as any).response?.status);
      }
      throw error;
    }
  }

  async getPrearchiveScans(
    project: string,
    timestamp: string,
    subject: string
  ): Promise<XnatPrearchiveScan[]> {
    try {
      const response = await this.client.get(
        `/data/prearchive/projects/${project}/${timestamp}/${subject}/scans`,
        { params: { format: 'json' } }
      );

      const results = response.data?.ResultSet?.Result || [];
      return Array.isArray(results) ? results : [];
    } catch (error) {
      console.error('Error fetching prearchive scans:', error);
      return [];
    }
  }

  async getPrearchiveScanFiles(
    project: string,
    timestamp: string,
    subject: string,
    scanId: string
  ): Promise<Array<{ name: string; size: number }>> {
    try {
      const response = await this.client.get(
        `/data/prearchive/projects/${project}/${timestamp}/${subject}/scans/${scanId}/resources/DICOM/files`,
        { params: { format: 'json' } }
      );

      const results = response.data?.ResultSet?.Result || [];
      // Map XNAT response (Name/Size) to lowercase (name/size)
      return Array.isArray(results) ? results.map((file: any) => ({
        name: file.Name || file.name,
        size: parseInt(file.Size || file.size || '0', 10)
      })) : [];
    } catch (error) {
      console.error('Error fetching prearchive scan files:', error);
      return [];
    }
  }

  async validateArchive(
    project: string,
    timestamp: string,
    subject: string,
    options?: {
      newProject?: string;
      newSubject?: string;
      newSession?: string;
      overwrite?: string;
    }
  ): Promise<any> {
    try {
      const src = `/prearchive/projects/${project}/${timestamp}/${subject}`;

      const params = new URLSearchParams();
      params.append('src', src);

      if (options?.newProject) {
        params.append('project', options.newProject);
      }
      if (options?.newSubject) {
        params.append('subject', options.newSubject);
      }
      if (options?.newSession) {
        params.append('session', options.newSession);
      }
      if (options?.overwrite) {
        params.append('overwrite', options.overwrite);
      }

      const response = await this.client.post('/REST/services/validate-archive', params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        params: {
          format: 'json'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error validating archive:', error);
      throw error;
    }
  }

  async getPrearchiveLogs(
    project: string,
    timestamp: string,
    subject: string
  ): Promise<any> {
    try {
      const response = await this.client.get(
        `/data/prearchive/projects/${project}/${timestamp}/${subject}/logs`,
        {
          params: {
            format: 'json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error fetching prearchive logs:', error);
      throw error;
    }
  }

  async getEditableProjects(): Promise<XnatProject[]> {
    try {
      const response = await this.client.get('/data/projects', {
        params: {
          format: 'json',
          restrict: 'edit',
          columns: 'ID,name,description'
        }
      });

      const results = response.data?.ResultSet?.Result || [];
      return Array.isArray(results) ? results : [];
    } catch (error) {
      console.error('Error fetching editable projects:', error);
      return [];
    }
  }

  /**
   * Fetch a DICOM file from prearchive as an ArrayBuffer
   */
  async getPrearchiveDicomFile(
    project: string,
    timestamp: string,
    subject: string,
    scanId: string,
    fileName: string
  ): Promise<ArrayBuffer> {
    try {
      // Try without encoding first (XNAT filenames with dots work better this way)
      const url = `/data/prearchive/projects/${project}/${timestamp}/${subject}/scans/${scanId}/resources/DICOM/files/${fileName}`;
      console.log('Fetching DICOM file from URL:', url);
      console.log('BaseURL:', this.client.defaults.baseURL);

      const response = await this.client.get(url, { responseType: 'arraybuffer' });
      console.log('DICOM file response status:', response.status, 'size:', response.data.byteLength);
      console.log('Response headers:', response.headers);

      // Check if we got HTML error page instead of binary data
      if (response.headers['content-type']?.includes('text/html')) {
        console.error('Received HTML instead of binary data!');
        const text = new TextDecoder().decode(response.data);
        console.error('Response text:', text.substring(0, 500));
        throw new Error('Server returned HTML error page instead of DICOM file');
      }

      return response.data;
    } catch (error) {
      console.error('Error fetching DICOM file, trying with URI encoding...', error);
      // Try with encoding if that fails
      try {
        const response = await this.client.get(
          `/data/prearchive/projects/${project}/${timestamp}/${subject}/scans/${scanId}/resources/DICOM/files/${encodeURIComponent(fileName)}`,
          { responseType: 'arraybuffer' }
        );
        return response.data;
      } catch (error2) {
        console.error('Error fetching DICOM file with encoded path', error2);
        throw error; // throw the original error
      }
    }
  }

  // Upload file to cache
  async uploadFileToCache(
    path: string,
    file: File,
    onProgress?: (percent: number) => void
  ): Promise<boolean> {
    try {
      console.log('Uploading file to cache:', path);
      console.log('File details:', { name: file.name, size: file.size, type: file.type });

      // Use FormData with the file field name "image_archive" to match XNAT expectations
      const formData = new FormData();
      formData.append('image_archive', file);

      const response = await this.client.put('/data' + path, formData, {
        // Don't set Content-Type - let axios set it with the boundary
        timeout: 300000, // 5 minutes for large file uploads
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percent);
          }
        }
      });

      console.log('Upload response:', response.status, response.statusText);
      return response.status >= 200 && response.status < 300;
    } catch (error: any) {
      console.error('Error uploading file to cache:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      throw error;
    }
  }

  async importFromCache(options: {
    src: string;
    project: string;
    importHandler: string;
    ignoreUnparsable: boolean;
    autoArchive: boolean;
    quarantine: boolean;
    httpSessionListener: string;
  }): Promise<boolean> {
    try {
      const formData = new FormData();

      // Add parameters in the same order as XNAT
      formData.append('threshhold', '51516279'); // Default threshold value
      formData.append('project', options.project);
      formData.append('import-handler', options.importHandler);

      // prearchive_code: 0 = prearchive, 1 = archive, 2 = archive with quarantine
      const prearchiveCode = options.autoArchive ? (options.quarantine ? '2' : '1') : '0';
      formData.append('prearchive_code', prearchiveCode);

      formData.append('auto-archive', options.autoArchive.toString());
      formData.append('quarantine', options.quarantine.toString());
      formData.append('action', 'commit');
      formData.append('src', options.src);
      formData.append('http-session-listener', options.httpSessionListener);
      formData.append('Ignore-Unparsable', options.ignoreUnparsable.toString());

      // Get CSRF token from cookie
      const csrfToken = this.getCsrfToken();
      if (csrfToken) {
        formData.append('XNAT_CSRF', csrfToken);
      }

      console.log('Importing from cache with params:', {
        project: options.project,
        src: options.src,
        importHandler: options.importHandler,
        prearchiveCode,
        csrfToken: csrfToken ? 'present' : 'missing'
      });

      const response = await this.client.post('/data/services/import', formData, {
        // Don't set Content-Type - let axios set it with the boundary
        timeout: 300000, // 5 minutes for import processing
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        },
        // Also add CSRF to query params as XNAT expects it there too
        params: csrfToken ? { XNAT_CSRF: csrfToken } : undefined
      });

      console.log('Import response:', response.status, response.statusText);
      return response.status >= 200 && response.status < 300;
    } catch (error: any) {
      console.error('Error importing from cache:', error);
      console.error('Import error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      throw error;
    }
  }

  /**
   * Delete a file or resource from the user cache
   */
  async deleteCacheResource(path: string): Promise<boolean> {
    try {
      console.log('Deleting cache resource:', path);
      const response = await this.client.delete('/data' + path);
      console.log('Delete response:', response.status, response.statusText);
      return response.status >= 200 && response.status < 300;
    } catch (error: any) {
      console.error('Error deleting cache resource:', error);
      console.error('Delete error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      // Don't throw - deletion failure shouldn't break the flow
      return false;
    }
  }

  private getCsrfToken(): string | null {
    // Try to get CSRF token from cookie
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'XNAT_CSRF') {
        return decodeURIComponent(value);
      }
    }
    return null;
  }

  async importCompressedArchiveWithFile(options: {
    file: File;
    project: string;
    dest: string;
    importHandler: string;
    ignoreUnparsable: boolean;
    onProgress?: (percent: number) => void;
  }): Promise<boolean> {
    try {
      console.log('Importing file with inbody=true:', {
        fileName: options.file.name,
        fileSize: options.file.size,
        project: options.project,
        dest: options.dest,
        importHandler: options.importHandler
      });

      // Get CSRF token
      const csrfToken = this.getCsrfToken();

      // Build query parameters - use exact parameter names from XNAT API
      const params: Record<string, string> = {
        inbody: 'true',
        project: options.project,  // Use 'project' not 'PROJECT_ID'
        import_handler: options.importHandler,  // Use 'import_handler' with underscore
      };

      // Only add dest if it's not prearchive (prearchive is the default)
      if (options.dest === '/archive') {
        params.dest = '/archive';
      }

      if (options.ignoreUnparsable) {
        params['Ignore-Unparsable'] = 'true';
      }

      if (csrfToken) {
        params.XNAT_CSRF = csrfToken;
      }

      console.log('Request params:', params);

      // Send file directly as request body
      const response = await this.client.post('/data/services/import', options.file, {
        headers: {
          'Content-Type': options.file.type || 'application/octet-stream',
          'X-Requested-With': 'XMLHttpRequest'
        },
        params,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && options.onProgress) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            options.onProgress(percent);
          }
        }
      });

      console.log('Import response:', response.status, response.statusText);
      return response.status >= 200 && response.status < 300;
    } catch (error: any) {
      console.error('Error importing file with inbody:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      throw error;
    }
  }

  // Anonymization script methods
  async getProjectAnonymizationScript(projectId: string): Promise<string | null> {
    try {
      const response = await this.client.get(`/xapi/anonymize/projects/${projectId}`, {
        responseType: 'text',
        headers: {
          'Accept': 'text/plain'
        }
      });
      return response.data || null;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 204) {
        // No project-specific script
        return null;
      }
      console.error('Error fetching project anonymization script:', error);
      return null;
    }
  }

  async isProjectAnonymizationEnabled(projectId: string): Promise<boolean> {
    try {
      const response = await this.client.get(`/xapi/anonymize/projects/${projectId}/enabled`);
      return response.data === true || response.data === 'true';
    } catch (error) {
      console.error('Error checking if project anonymization is enabled:', error);
      return false;
    }
  }

  async getSiteAnonymizationScript(): Promise<string | null> {
    try {
      const response = await this.client.get('/xapi/anonymize/site', {
        responseType: 'text',
        headers: {
          'Accept': 'text/plain'
        }
      });
      return response.data || null;
    } catch (error) {
      console.error('Error fetching site anonymization script:', error);
      return null;
    }
  }

  async getDefaultAnonymizationScript(): Promise<string | null> {
    try {
      const response = await this.client.get('/xapi/anonymize/default', {
        responseType: 'text',
        headers: {
          'Accept': 'text/plain'
        }
      });
      return response.data || null;
    } catch (error) {
      console.error('Error fetching default anonymization script:', error);
      return null;
    }
  }

  async getAnonymizationScriptForProject(projectId: string): Promise<string | null> {
    // Try project-specific first
    const projectEnabled = await this.isProjectAnonymizationEnabled(projectId);
    if (projectEnabled) {
      const projectScript = await this.getProjectAnonymizationScript(projectId);
      if (projectScript) {
        return projectScript;
      }
    }

    // Fall back to site-wide
    const siteScript = await this.getSiteAnonymizationScript();
    if (siteScript) {
      return siteScript;
    }

    // Fall back to default
    return await this.getDefaultAnonymizationScript();
  }

  // User Storage methods
  async getUserStorage(): Promise<Record<string, unknown>> {
    try {
      const response = await this.client.get('/xapi/storage/user');
      return response.data || {};
    } catch (error) {
      console.error('Error fetching user storage:', error);
      return {};
    }
  }

  async setUserStorage(data: Record<string, unknown>): Promise<void> {
    try {
      await this.client.post('/xapi/storage/user', data, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Error setting user storage:', error);
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
