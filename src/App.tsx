import { Routes, Route, Navigate } from 'react-router-dom';
import Main from '@/pages/Main';
import Store from '@/pages/Store';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Main />} />
      <Route path="/store" element={<Store />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
