export interface ScraperStats {
  shopify: {
    totalLeads: number;
    successRate: number;
    queueProgress: number;
    lastSync: string;
    status: 'running' | 'stopped' | 'paused';
  };
  adLibrary: {
    newAdsFound: number;
    velocity: number;
    memoryLoad: number;
    lastSync: string;
    status: 'running' | 'stopped' | 'paused';
  };
  telegram: {
    leadsToday: number;
    activeListeners: number;
    connectionStability: number;
    lastSync: string;
    status: 'running' | 'stopped' | 'paused';
  };
  global: {
    enginesRunning: number;
    lastSync: string;
  };
}

export const getScraperStats = async (): Promise<ScraperStats> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));

  return {
    shopify: {
      totalLeads: 847 + Math.floor(Math.random() * 10),
      successRate: 98.2 + (Math.random() * 0.5),
      queueProgress: 70 + Math.floor(Math.random() * 10),
      lastSync: "1m ago",
      status: 'running'
    },
    adLibrary: {
      newAdsFound: 312 + Math.floor(Math.random() * 5),
      velocity: 20 + Math.floor(Math.random() * 10),
      memoryLoad: 40 + Math.floor(Math.random() * 10),
      lastSync: "3m ago",
      status: 'running'
    },
    telegram: {
      leadsToday: 45 + Math.floor(Math.random() * 3),
      activeListeners: 8,
      connectionStability: 98 + (Math.random() * 2),
      lastSync: "Active",
      status: 'running'
    },
    global: {
      enginesRunning: 3,
      lastSync: "Just now"
    }
  };
};
