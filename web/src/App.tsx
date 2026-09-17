import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import SimpleChatPage from './pages/SimpleChatPage';
import CustomMessengerPage from './pages/CustomMessengerPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/simple" element={<SimpleChatPage />} />
        <Route path="/custom" element={<CustomMessengerPage />} />
        <Route path="/" element={<Navigate to="/simple" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
