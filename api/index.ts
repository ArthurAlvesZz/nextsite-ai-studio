import { app, startServer } from '../server.js';

/**
 * Vercel Serverless Function entry point.
 * Ensures that the Express app is configured with all routes before handling requests.
 */

let isInitialized = false;
const initPromise = (async () => {
  if (!isInitialized) {
    await startServer();
    isInitialized = true;
  }
})();

export default async (req: any, res: any) => {
  await initPromise;
  return app(req, res);
};
