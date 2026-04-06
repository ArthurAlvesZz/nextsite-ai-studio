import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';

export function useRequireAuth(requiredRole?: string) {
  const { user, adminProfile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate('/admin/login');
      return;
    }

    if (requiredRole && adminProfile?.role !== requiredRole && !adminProfile?.isOwner) {
      navigate('/admin/dashboard');
    }
  }, [user, adminProfile, loading, navigate, requiredRole]);

  return { user, adminProfile, loading };
}
