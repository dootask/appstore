import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { useAppStore } from '@/store/app';
import { Loader2 } from 'lucide-react';

// 异步加载所有页面组件
const Home = lazy(() => import('@/pages/home'));
const Internal = lazy(() => import('@/pages/internal'));
const Development = lazy(() => import('@/pages/development'));
const Publish = lazy(() => import('@/pages/publish'));

// 加载中组件
const Loading = () => (
  <div className="h-screen w-screen flex items-center justify-center">
    <Loader2 className="animate-spin" size={32} />
  </div>
);

function App() {
  const {baseUrl} = useAppStore.getState();
  
  return (
    <Routes>
      <Route 
        path={`${baseUrl}`} 
        element={
          <Suspense fallback={<Loading />}>
            <Home />
          </Suspense>
        } 
      />
      <Route 
        path={`${baseUrl}internal`} 
        element={
          <Suspense fallback={<Loading />}>
            <Internal />
          </Suspense>
        } 
      />
      <Route 
        path={`${baseUrl}development`} 
        element={
          <Suspense fallback={<Loading />}>
            <Development />
          </Suspense>
        } 
      />
      <Route 
        path={`${baseUrl}publish`} 
        element={
          <Suspense fallback={<Loading />}>
            <Publish />
          </Suspense>
        } 
      />
      <Route path="*" element={<Navigate to={baseUrl} replace />} />
    </Routes>
  );
}

export default App;
