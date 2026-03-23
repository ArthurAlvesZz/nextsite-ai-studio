import { useState, useEffect } from 'react';

export interface AdminProfile {
  name: string;
  phone: string;
  avatarUrl: string;
  password?: string;
}

export function useAuth() {
  const [adminProfile, setAdminProfile] = useState<AdminProfile>(() => {
    const saved = localStorage.getItem('admin_profile');
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      name: 'Admin Master',
      phone: '15599873676',
      avatarUrl: '',
      password: '963369'
    };
  });

  useEffect(() => {
    localStorage.setItem('admin_profile', JSON.stringify(adminProfile));
  }, [adminProfile]);

  const updateAdminProfile = (data: Partial<AdminProfile>) => {
    setAdminProfile(prev => ({ ...prev, ...data }));
  };

  return { adminProfile, updateAdminProfile };
}
