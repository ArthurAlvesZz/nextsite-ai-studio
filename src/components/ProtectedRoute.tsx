import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import SEO from './SEO';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireOwner?: boolean;
}

export default function ProtectedRoute({
  children,
  requireAdmin = true,
  requireOwner = false,
}: ProtectedRouteProps) {
  const { user, adminProfile, loading } = useAuth();
  const location = useLocation();

  // Aguarda auth carregar — evita flash de conteúdo ou redirect prematuro
  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <SEO title="Autenticando..." />
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-secondary/20 border-t-secondary rounded-full animate-spin" />
          <p className="text-white/40 text-xs font-bold uppercase tracking-[0.3em] animate-pulse">
            Autenticando...
          </p>
        </div>
      </div>
    );
  }

  // Usuário não autenticado → login
  if (!user) {
    return <Navigate to="/admin" state={{ from: location }} replace />;
  }

  // Perfil ainda não carregou (auth ok, Firestore pendente)
  if (requireAdmin && !adminProfile) {
    return <Navigate to="/admin" replace />;
  }

  /**
   * Proteção de rota exclusiva para Owner.
   * isOwner é derivado SOMENTE de role === 'owner' no useAuth,
   * portanto é imune a campos isOwner incorretos no Firestore.
   */
  if (requireOwner) {
    const isOwner =
      adminProfile?.isOwner === true && adminProfile?.role === 'owner';

    console.log('[ProtectedRoute] requireOwner check | isOwner:', isOwner, '| role:', adminProfile?.role);

    if (!isOwner) {
      return <Navigate to="/admin/dashboard" replace />;
    }
  }

  return (
    <>
      <SEO title="Painel de Controlo" />
      {children}
    </>
  );
}
