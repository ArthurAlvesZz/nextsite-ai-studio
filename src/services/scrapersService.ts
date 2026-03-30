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
