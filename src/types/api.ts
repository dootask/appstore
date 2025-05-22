export type AppStatus = 'installing' | 'installed' | 'uninstalling' | 'not_installed' | 'error'

// 通用响应格式
export interface Response<T = unknown> {
  code: number;
  message: string;
  data?: T;
}

// 菜单项类型
export interface MenuItem {
  label: unknown;
  icon: string;
  url: string;
  location: string;
  keepAlive: boolean;
  transparent: boolean;
  autoDarkTheme: boolean;
}

// 字段选项类型
export interface FieldOption {
  label: unknown;
  value: string;
}

// 字段配置类型
export interface FieldConfig {
  name: string;
  type: string;
  default: unknown;
  label: unknown;
  placeholder: unknown;
  required?: boolean;
  options?: FieldOption[];
}

// 应用配置资源类型
export interface AppConfigResources {
  cpu_limit: string;
  memory_limit: string;
}

// 应用配置类型
export interface AppConfig {
  install_at: string;
  install_num: number;
  install_version: string;
  status: AppStatus;
  params: Record<string, unknown>;
  resources: AppConfigResources;
}

// 版本卸载要求类型
export interface RequireUninstall {
  version: string;
  operator: string;
  reason: unknown;
}

// 完整应用信息类型
export interface App {
  id: string;
  name: string;
  description: string;
  icon: string;
  author: string;
  github: string;
  website: string;
  document: string;
  download_url: string;
  versions: string[];
  tags: string[];
  fields: FieldConfig[];
  config: AppConfig;
  require_uninstalls: RequireUninstall[];
  menu_items?: MenuItem[];
  rating?: number;
  downloads?: string;
  user_count?: string;
  upgradeable?: boolean;  // todo
}

// 内部下载应用请求
export interface AppInternalDownloadRequest {
  url: string;
}

// 内部上传应用请求
export interface AppInternalUploadRequest {
  file: File;
}

// 内部安装应用请求
export interface AppInternalInstallRequest {
  appid: string;
  version?: string;
  params?: Record<string, unknown>;
  resources?: AppConfigResources;
}

// 内部已安装应用响应
export interface AppInternalInstalledResponse {
  names: string[];
  menus?: MenuItem[];
}
