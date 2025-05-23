import { get, post } from './request';
import type { 
  App,
  AppInternalInstallRequest, 
  AppInternalDownloadRequest,
  AppInternalUploadRequest,
  AppInternalInstalledResponse
} from '@/types/api';

/**
 * 应用相关API
 */
export const AppApi = {
  /**
   * 获取应用列表
   */
  getAppList(appIds?: string[]) {
    if (appIds?.length) {
      return get<App[]>(`/list?appIds=${appIds?.join(',')}`);
    }
    return get<App[]>('/list');
  },

  /**
   * 获取应用详情
   * @param appId 应用ID
   */
  getAppDetail(appId: string) {
    return get<App>(`/one/${appId}`);
  },

  /**
   * 获取应用README文件
   * @param appId 应用ID
   */
  getAppReadme(appId: string) {
    return get<Record<string, string>>(`/readme/${appId}`);
  }
};

/**
 * 内部API
 */
export const InternalApi = {
  /**
   * 通过URL下载应用
   * @param url 下载URL
   */
  downloadApp(params: AppInternalDownloadRequest) {
    return post<Record<string, string>, AppInternalDownloadRequest>('/internal/apps/download', params);
  },

  /**
   * 通过文件上传应用
   * @param file 文件
   */
  uploadApp(params: AppInternalUploadRequest) {
    const formData = new FormData();
    formData.append('file', params.file);
    if (params.appid) {
      formData.append('appid', params.appid);
    }
    return post<Record<string, string>, FormData>('/internal/apps/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  /**
   * 更新应用列表
   */
  updateAppList() {
    return get('/internal/apps/update');
  },

  /**
   * 安装应用
   * @param params 安装参数
   */
  installApp(params: AppInternalInstallRequest) {
    return post<unknown, AppInternalInstallRequest>('/internal/install', params);
  },

  /**
   * 获取已安装应用列表
   */
  getInstalledApps() {
    return get<AppInternalInstalledResponse[]>('/internal/installed');
  },

  /**
   * 获取应用日志
   * @param appId 应用ID
   */
  getAppLog(appId: string) {
    return get<Record<string, string>>(`/internal/log/${appId}`);
  },

  /**
   * 卸载应用
   * @param appId 应用ID
   */
  uninstallApp(appId: string) {
    return get(`/internal/uninstall/${appId}`);
  }
}; 