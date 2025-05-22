import { Routes, Route } from 'react-router-dom';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { getRoutes } from './routes';

// 加载中组件
const Loading = () => (
  <div className="h-screen w-screen flex items-center justify-center">
    <Loader2 className="animate-spin" size={32} />
  </div>
);

// 递归渲染路由
const renderRoutes = (routes: any[]) => {
  return routes.map(({ path, element, children }) => (
    <Route
      key={path}
      path={path}
      element={
        <Suspense fallback={<Loading />}>
          {element}
        </Suspense>
      }
    >
      {children && renderRoutes(children)}
    </Route>
  ));
};

// 主组件
const App = () => {
  return (
    <Routes>
      {renderRoutes(getRoutes())}
    </Routes>
  );
}

export default App;
