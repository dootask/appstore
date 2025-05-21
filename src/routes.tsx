import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import { Navigate, useNavigate } from 'react-router-dom';

// baseUrl 配置
const BASE_URL = import.meta.env.BASE_URL || '/';

// 获取 baseUrl
export const getBaseUrl = () => BASE_URL;

// 获取带 baseUrl 的完整路由路径
export const getFullPath = (path: string) => `${getBaseUrl()}${path}`;

// 路由工具函数
export const useAppNavigate = () => {
  const navigate = useNavigate();

  return {
    // 跳转到首页
    toHome: () => navigate(getBaseUrl()),
    // 跳转到内部页面
    toInternal: () => navigate(getFullPath('internal')),
    // 跳转到开发页面
    toDevelopment: () => navigate(getFullPath('development')),
    // 跳转到发布页面
    toPublish: () => navigate(getFullPath('publish')),
    // 通用跳转方法
    to: (path: string) => navigate(getFullPath(path))
  };
};

// 异步加载所有页面组件
const Home = lazy(() => import('@/pages/home'));
const Internal = lazy(() => import('@/pages/internal'));
const Development = lazy(() => import('@/pages/development'));
const Publish = lazy(() => import('@/pages/publish'));

// 404 重定向组件
const NotFound = () => {
  return <Navigate to={getBaseUrl()} replace />;
};

// 路由配置
const routes: RouteObject[] = [
  {
    path: '',
    element: <Home />
  },
  {
    path: 'internal',
    element: <Internal />
  },
  {
    path: 'development',
    element: <Development />
  },
  {
    path: 'publish',
    element: <Publish />
  },
  {
    path: '*',
    element: <NotFound />
  }
];

// 获取路由配置
export const getRoutes = () => {
  return routes.map(route => ({
    ...route,
    path: `${getBaseUrl()}${route.path}`
  }));
}; 
