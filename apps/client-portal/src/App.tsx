import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import LoginPage from './pages/LoginPage';
import PublicAlbum from './pages/PublicAlbum';
import PortalLayout from './components/PortalLayout';
import PortalEntry from './pages/PortalEntry';
import OverviewPage from './pages/portal/OverviewPage';
import EventPage from './pages/portal/EventPage';
import ShootsPage from './pages/portal/ShootsPage';
import PackagePage from './pages/portal/PackagePage';
import PaymentsPage from './pages/portal/PaymentsPage';
import GalleryPage from './pages/portal/GalleryPage';
import ProofingPage from './pages/portal/ProofingPage';
import AlbumPage from './pages/portal/AlbumPage';
import AgreementPage from './pages/portal/AgreementPage';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: string, session: Session | null) => {
        setUser(session?.user ?? null);
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div style={{ padding: 32, color: '#8b968f' }}>Loading…</div>;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/album/:token" element={<PublicAlbum />} />
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />

        {user ? (
          <>
            <Route index element={<PortalEntry />} />
            <Route path="/portal/:jobId" element={<PortalLayout user={user} />}>
              <Route index element={<Navigate to="overview" replace />} />
              <Route path="overview"  element={<OverviewPage />} />
              <Route path="event"     element={<EventPage />} />
              <Route path="shoots"    element={<ShootsPage />} />
              <Route path="package"   element={<PackagePage />} />
              <Route path="payments"  element={<PaymentsPage />} />
              <Route path="gallery"   element={<GalleryPage />} />
              <Route path="proofing"  element={<ProofingPage />} />
              <Route path="album"     element={<AlbumPage />} />
              <Route path="agreement" element={<AgreementPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        ) : (
          <Route path="*" element={<Navigate to="/login" replace />} />
        )}
      </Routes>
    </BrowserRouter>
  );
}
