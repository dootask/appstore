import { Routes, Route, Navigate } from 'react-router-dom';
import Home from '@/pages/home';
import Internal from '@/pages/internal';

function App() {
  const baseUrl = import.meta.env.BASE_URL || '/';
  
  return (
    <Routes>
      <Route path={`${baseUrl}`} element={<Home />} />
      <Route path={`${baseUrl}internal`} element={<Internal />} />
      <Route path="*" element={<Navigate to={baseUrl} replace />} />
    </Routes>
  );
}

export default App;
