import { app, startServer } from '../server.js';

/**
 * Vercel Serverless Function entry point.
 * 
 * This file bridges the full Express application to Vercel's serverless environment.
 */

// Initialize routes and middlewares
// We call it but don't await (top level await is complex in some configs)
// Express registers routes synchronously once called.
startServer();

export default app;
