import axios from 'axios';
import type { AxiosRequestConfig } from 'axios';
import type { Response } from '@/types/api';
import { getUrlParam } from './utils';
import { props } from '@dootask/tools';
import i18n from '@/i18n';

// 创建axios实例
const instance = axios.create({
  baseURL: `${import.meta.env.VITE_BASE_PATH || '/'}api/v1`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
instance.interceptors.request.use(
  (config) => {
    const token = getUrlParam('token') || props?.userToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (i18n.language) {
      config.headers.Language = i18n.language;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
instance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('网络错误:', error);
    return Promise.reject(error);
  }
);

// 封装GET请求
export async function get<T = unknown>(
  url: string,
  params?: Record<string, unknown>,
  config?: AxiosRequestConfig
): Promise<Response<T>> {
  try {
    const response = await instance.get(url, { params, ...config });
    const result = response.data as Response<T>;

    if (result.code !== 200) {
      throw new Error(result.message || '请求错误');
    }

    return result;
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
    }
    throw error;
  }
}

// 封装POST请求
export async function post<T = unknown, D = unknown>(
  url: string,
  data?: D,
  config?: AxiosRequestConfig
): Promise<Response<T>> {
  try {
    const response = await instance.post(url, data, config);
    const result = response.data as Response<T>;

    if (result.code !== 200) {
      throw new Error(result.message || '请求错误');
    }

    return result;
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
    }
    throw error;
  }
}

export default instance;
