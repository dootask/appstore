export type AppStatus = 'installing' | 'installed' | 'uninstalling' | 'not_installed' | 'error'

export interface AppField {
  name: string;
  type: string;
  default: string | number;
  label: string;
  placeholder: string;
  required?: boolean;
  options?: Array<{
    label: string;
    value: string;
  }>;
}

export interface RequireUninstall {
  version: string;
  operator: string;
  reason: string;
}

export interface AppInfo {
  name: string;
  description: string;
  tags: string[];
  icon: string;
  author: string;
  website: string;
  github: string;
  document: string;
  fields: AppField[];
  require_uninstalls: RequireUninstall[];
}

export interface AppConfig {
  install_at: string;
  install_num: number;
  install_version: string;
  status: AppStatus;
  params: Record<string, string | number>;
  resources: {
    cpu_limit: string;
    memory_limit: string;
  };
}

export interface AppVersion {
  version: string;
}

export interface AppItem {
  name: string;
  info: AppInfo;
  config: AppConfig;
  versions: AppVersion[];
  document?: string
}
