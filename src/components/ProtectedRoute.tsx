import React from 'react';
import { Navigate } from 'react-router-dom';
import { useGlobalAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { currentUser, isMasterAdmin } = useGlobalAuth();

  if (!currentUser && !isMasterAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}
