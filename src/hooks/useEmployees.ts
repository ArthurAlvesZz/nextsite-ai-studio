import { useState, useEffect } from 'react';

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  login: string;
  lastLogin: string;
  initials: string;
  monthlySalesGoal?: number;
  monthlyVideoGoal?: number;
}

export function useEmployees() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(() => {
    const saved = localStorage.getItem('teamMembers');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: '1',
        name: 'Admin Master',
        role: 'Admin',
        login: '15599873676',
        lastLogin: 'Agora',
        initials: 'AM'
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('teamMembers', JSON.stringify(teamMembers));
  }, [teamMembers]);

  const addMember = (member: Omit<TeamMember, 'id' | 'lastLogin' | 'initials'>) => {
    const initials = member.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'NU';
    const newMember: TeamMember = {
      ...member,
      id: Date.now().toString(),
      lastLogin: 'Nunca',
      initials
    };
    setTeamMembers(prev => [...prev, newMember]);
  };

  const updateMember = (id: string, data: Partial<Omit<TeamMember, 'id'>>) => {
    setTeamMembers(prev => prev.map(m => {
      if (m.id === id) {
        const updated = { ...m, ...data };
        if (data.name) {
          updated.initials = data.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'NU';
        }
        return updated;
      }
      return m;
    }));
  };

  const deleteMember = (id: string) => {
    setTeamMembers(prev => prev.filter(m => m.id !== id));
  };

  return { teamMembers, addMember, updateMember, deleteMember };
}
