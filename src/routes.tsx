import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';

// baseUrl 配置
const BASE_URL = import.meta.env.BASE_URL || '/';

// 路由工具函数
export const useAppNavigate = () => {
  const navigate = useNavigate();
  const fullPath = (path: string) => `${BASE_URL}${path}`;
  const basePath = () => BASE_URL;

  return {
    // 跳转到首页
    toHome: () => navigate(basePath()),
    // 跳转到内部页面
    toInternal: () => navigate(fullPath('internal')),
    // 跳转到开发页面
    toDevelopment: () => navigate(fullPath('development')),
    // 通用跳转方法
    to: (path: string) => navigate(fullPath(path)),

    // 基础路径
    basePath,
    // 完整地址
    fullPath
  };
};

// 异步加载所有页面组件
const Home = lazy(() => import('@/pages/home'));
const Internal = lazy(() => import('@/pages/internal'));
const Development = lazy(() => import('@/pages/home/children/development'));
const NotFound = lazy(() => import('@/pages/404'));

// 路由配置
const routes: RouteObject[] = [
  {
    path: '',
    element: <Home />,
    children: [
      {
        path: 'development',
        element: <Development />
      }
    ]
  },
  {
    path: 'internal',
    element: <Internal />
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
    path: `${BASE_URL}${route.path}`
  }));
};
