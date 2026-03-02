import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProfileProvider } from './context/ProfileContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import LibraryPage from './pages/LibraryPage';
import SearchPage from './pages/SearchPage';
import GameDetailPage from './pages/GameDetailPage';
import CollectionDetailPage from './pages/CollectionDetailPage';
import FeedPage from './pages/FeedPage';
import ProfilePage from './pages/ProfilePage';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<ProfileProvider><Layout /></ProfileProvider>}>
            <Route path="/" element={<LibraryPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/game/:apiId" element={<GameDetailPage />} />
            <Route path="/collection/:collectionId" element={<CollectionDetailPage />} />
            <Route path="/feed" element={<FeedPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/:userId" element={<ProfilePage />} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  );
}
