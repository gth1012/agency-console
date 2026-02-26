import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/auth.store';
import Layout from './components/Layout';
import Toast from './components/Toast';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ActivationPage from './pages/ActivationPage';
import AgencySeriesPage from './pages/AgencySeriesPage';
import AgencyDownloadPage from './pages/AgencyDownloadPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

export default function App() {
  return (
    <>
      <Toast />
      <HashRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }>
            <Route index element={<DashboardPage />} />
            <Route path="series" element={<AgencySeriesPage />} />
            <Route path="activation" element={<ActivationPage />} />
            <Route path="download" element={<AgencyDownloadPage />} />
          </Route>
        </Routes>
      </HashRouter>
    </>
  );
}
