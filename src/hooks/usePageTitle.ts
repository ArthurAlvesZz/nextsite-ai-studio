import { useEffect } from 'react';

// Disabled in favor of React Helmet Async (SEO.tsx)
export function usePageTitle(title: string) {
  useEffect(() => {
    // Legacy mapping omitted. Managed globally via SEO component now.
  }, [title]);
}
