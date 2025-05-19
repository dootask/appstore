import { Routes, Route, Navigate } from 'react-router-dom';
import Home from '@/pages/home';
import Internal from '@/pages/internal';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/internal" element={<Internal />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
