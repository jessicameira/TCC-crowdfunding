import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import EventDetailPage from './pages/EventDetailPage';
import HowItWorksPage from './pages/HowItWorksPage';
import ComingSoonPage from './pages/ComingSoonPage';
import NotFoundPage from './pages/NotFoundPage';

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="cadastro" element={<SignupPage />} />
        <Route path="eventos/:eventId" element={<EventDetailPage />} />
        <Route path="como-funciona" element={<HowItWorksPage />} />
        <Route path="criar-evento" element={<ComingSoonPage title="Criar Evento" />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;
