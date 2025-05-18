import { Routes, Route, Navigate } from 'react-router-dom';
import Home from '@/pages/Home';
import Store from '@/pages/Store';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/store" element={<Store />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
