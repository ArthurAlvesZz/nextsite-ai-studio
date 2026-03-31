import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import SEO from './SEO';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireOwner?: boolean;
}

export default function ProtectedRoute({ children, requireAdmin = true, requireOwner = false }: ProtectedRouteProps) {
  const { user, adminProfile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <SEO title="Autenticando..." />
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-secondary/20 border-t-secondary rounded-full animate-spin"></div>
          <p className="text-white/40 text-xs font-bold uppercase tracking-[0.3em] animate-pulse">Autenticando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin" state={{ from: location }} replace />;
  }

  // Rota exclusiva para owner: redireciona qualquer não-owner para o dashboard
  if (requireOwner && adminProfile?.isOwner !== true) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (requireAdmin && !adminProfile) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <>
      <SEO title="Painel de Controlo" />
      {children}
    </>
  );
}
