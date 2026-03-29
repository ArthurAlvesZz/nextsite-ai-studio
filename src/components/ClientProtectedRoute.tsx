import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface ClientProtectedRouteProps {
  children: React.ReactNode;
}

export default function ClientProtectedRoute({ children }: ClientProtectedRouteProps) {
  const { user, adminProfile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-secondary/20 border-t-secondary rounded-full animate-spin"></div>
          <p className="text-white/40 text-xs font-bold uppercase tracking-[0.3em] animate-pulse">Autenticando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Redirect to client login but save the current location
    return <Navigate to="/client/login" state={{ from: location }} replace />;
  }

  // If they are logged in but not a client (e.g., admin), redirect them to admin dashboard
  if (adminProfile?.role !== 'client' && adminProfile?.role !== 'admin' && adminProfile?.role !== 'editor') {
    return <Navigate to="/client/login" replace />;
  }

  return <>{children}</>;
}
