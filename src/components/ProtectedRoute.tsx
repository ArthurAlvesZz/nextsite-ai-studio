import React from 'react';
import { Navigate } from 'react-router-dom';
import { useGlobalAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireMaster?: boolean;
}

export default function ProtectedRoute({ children, requireMaster }: ProtectedRouteProps) {
  const { currentUser, isMasterAdmin } = useGlobalAuth();

  if (!currentUser && !isMasterAdmin) {
    return <Navigate to="/admin" replace />;
  }

  if (requireMaster && !isMasterAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <>{children}</>;
}
