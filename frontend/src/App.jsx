import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { TournamentProvider, useTournament } from './contexts/TournamentContext';
import HomePage from './pages/HomePage';
import SetupPage from './pages/SetupPage';
import DrawPage from './pages/DrawPage';
import GroupsPage from './pages/GroupsPage';
import BracketPage from './pages/BracketPage';
import Navbar from './components/Navbar';
import LoadingSpinner from './components/LoadingSpinner';

function AppRoutes() {
  const { tournament, loading } = useTournament();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pb-6">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/draw" element={<DrawPage />} />
          <Route
            path="/groups"
            element={
              tournament?.status === 'group_stage' || tournament?.status === 'knockout' || tournament?.status === 'completed'
                ? <GroupsPage />
                : <Navigate to="/" replace />
            }
          />
          <Route
            path="/bracket"
            element={
              tournament?.status === 'knockout' || tournament?.status === 'completed'
                ? <BracketPage />
                : <Navigate to="/" replace />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <TournamentProvider>
        <AppRoutes />
      </TournamentProvider>
    </BrowserRouter>
  );
}
