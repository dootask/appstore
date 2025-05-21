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

function App() {
  const routes = getRoutes();
  
  return (
    <Routes>
      {routes.map(({ path, element }) => (
        <Route
          key={path}
          path={path}
          element={
            <Suspense fallback={<Loading />}>
              {element}
            </Suspense>
          }
        />
      ))}
    </Routes>
  );
}

export default App;
