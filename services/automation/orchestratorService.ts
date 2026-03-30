import pino from 'pino';
import cron from 'node-cron';
import admin from 'firebase-admin';
import { runResearch, type ResearchResult } from './researchService.js';
import { generateScript, type VideoScript } from './scriptingService.js';
import { generateVideo, type VideoGenerationResult } from './videoGenerationService.js';
import { runPostProduction, type PostProductionResult } from './postProductionService.js';
import { publishToYouTube, type PublishingResult } from './publishingService.js';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const pipelineLogger = logger.child({ module: 'video-pipeline' });

export type PipelineStep = 'research' | 'scripting' | 'videoGeneration' | 'postProduction' | 'publishing';

export interface StepResult {
  status: 'success' | 'failed';
  startedAt: string;
  completedAt: string;
  durationMs: number;
  output?: Record<string, unknown>;
  error?: string;
}

export interface PipelineRun {
  id: string;
  status: 'running' | 'completed' | 'failed';
  triggeredBy: 'cron' | 'manual';
  triggeredByEmail?: string;
  startedAt: string;
  completedAt?: string;
  failedAt?: string;
  failedStep?: PipelineStep;
  errorMessage?: string;
  steps: Partial<Record<PipelineStep, StepResult>>;
  result?: {
    youtubeVideoId: string;
    youtubeUrl: string;
    title: string;
    localVideoPath: string;
  };
}

function makeStepResult(
  startedAt: string,
  success: boolean,
  output?: Record<string, unknown>,
  error?: string
): StepResult {
  const completedAt = new Date().toISOString();
  const durationMs = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  return {
    status: success ? 'success' : 'failed',
    startedAt,
    completedAt,
    durationMs,
    ...(output ? { output } : {}),
    ...(error ? { error } : {}),
  };
}

export async function runVideoPipeline(
  triggeredBy: 'cron' | 'manual',
  triggeredByEmail?: string
): Promise<PipelineRun> {
  const db = admin.firestore();
  const runRef = db.collection('videoPipelineRuns').doc();
  const runId = runRef.id;
  const startedAt = new Date().toISOString();

  pipelineLogger.info({ runId, triggeredBy }, '[Pipeline] Starting video pipeline run');

  const initialRun: PipelineRun = {
    id: runId,
    status: 'running',
    triggeredBy,
    ...(triggeredByEmail ? { triggeredByEmail } : {}),
    startedAt,
    steps: {},
  };

  await runRef.set(initialRun);

  let researchResult: ResearchResult;
  let scriptResult: VideoScript;
  let videoResult: VideoGenerationResult;
  let postProdResult: PostProductionResult;
  let pubResult: PublishingResult;

  // ── Step 1: Research ─────────────────────────────────────────────────────────
  const researchStartedAt = new Date().toISOString();
  pipelineLogger.info({ runId, step: 'research' }, '[Pipeline] Starting research step');
  try {
    researchResult = await runResearch();
    const stepResult = makeStepResult(researchStartedAt, true, {
      chosenTitle: researchResult.chosenTitle,
      sourceKeyword: researchResult.sourceKeyword,
    });
    await runRef.update({ 'steps.research': stepResult });
    pipelineLogger.info({ runId, step: 'research', durationMs: stepResult.durationMs }, '[Pipeline] Research complete');
  } catch (err: any) {
    const stepResult = makeStepResult(researchStartedAt, false, undefined, err.message);
    await runRef.update({
      'steps.research': stepResult,
      status: 'failed',
      failedAt: new Date().toISOString(),
      failedStep: 'research',
      errorMessage: err.message,
    });
    pipelineLogger.error({ runId, step: 'research', err: err.message }, '[Pipeline] Research step failed');
    return { ...initialRun, status: 'failed', failedStep: 'research', errorMessage: err.message, steps: { research: stepResult } };
  }

  // ── Step 2: Scripting ─────────────────────────────────────────────────────────
  const scriptingStartedAt = new Date().toISOString();
  pipelineLogger.info({ runId, step: 'scripting' }, '[Pipeline] Starting scripting step');
  try {
    scriptResult = await generateScript(researchResult.chosenTitle);
    const stepResult = makeStepResult(scriptingStartedAt, true, {
      wordCount: scriptResult.wordCount,
      estimatedDurationSeconds: scriptResult.estimatedDurationSeconds,
    });
    await runRef.update({ 'steps.scripting': stepResult });
    pipelineLogger.info({ runId, step: 'scripting', durationMs: stepResult.durationMs }, '[Pipeline] Scripting complete');
  } catch (err: any) {
    const stepResult = makeStepResult(scriptingStartedAt, false, undefined, err.message);
    await runRef.update({
      'steps.scripting': stepResult,
      status: 'failed',
      failedAt: new Date().toISOString(),
      failedStep: 'scripting',
      errorMessage: err.message,
    });
    pipelineLogger.error({ runId, step: 'scripting', err: err.message }, '[Pipeline] Scripting step failed');
    return { ...initialRun, status: 'failed', failedStep: 'scripting', errorMessage: err.message, steps: {} };
  }

  // ── Step 3: Video Generation ──────────────────────────────────────────────────
  const videoGenStartedAt = new Date().toISOString();
  pipelineLogger.info({ runId, step: 'videoGeneration' }, '[Pipeline] Starting video generation step');
  try {
    videoResult = await generateVideo(scriptResult);
    const stepResult = makeStepResult(videoGenStartedAt, true, {
      heygenVideoId: videoResult.videoId,
      localPath: videoResult.localPath,
    });
    await runRef.update({ 'steps.videoGeneration': stepResult });
    pipelineLogger.info({ runId, step: 'videoGeneration', durationMs: videoResult.durationMs }, '[Pipeline] Video generation complete');
  } catch (err: any) {
    const stepResult = makeStepResult(videoGenStartedAt, false, undefined, err.message);
    await runRef.update({
      'steps.videoGeneration': stepResult,
      status: 'failed',
      failedAt: new Date().toISOString(),
      failedStep: 'videoGeneration',
      errorMessage: err.message,
    });
    pipelineLogger.error({ runId, step: 'videoGeneration', err: err.message }, '[Pipeline] Video generation step failed');
    return { ...initialRun, status: 'failed', failedStep: 'videoGeneration', errorMessage: err.message, steps: {} };
  }

  // ── Step 4: Post-Production ───────────────────────────────────────────────────
  const postProdStartedAt = new Date().toISOString();
  pipelineLogger.info({ runId, step: 'postProduction' }, '[Pipeline] Starting post-production step');
  try {
    postProdResult = await runPostProduction(videoResult.localPath, researchResult.chosenTitle);
    const stepResult = makeStepResult(postProdStartedAt, true, {
      submagicJobId: postProdResult.submagicJobId,
      optimizedVideoPath: postProdResult.optimizedVideoPath,
    });
    await runRef.update({ 'steps.postProduction': stepResult });
    pipelineLogger.info({ runId, step: 'postProduction', durationMs: stepResult.durationMs }, '[Pipeline] Post-production complete');
  } catch (err: any) {
    const stepResult = makeStepResult(postProdStartedAt, false, undefined, err.message);
    await runRef.update({
      'steps.postProduction': stepResult,
      status: 'failed',
      failedAt: new Date().toISOString(),
      failedStep: 'postProduction',
      errorMessage: err.message,
    });
    pipelineLogger.error({ runId, step: 'postProduction', err: err.message }, '[Pipeline] Post-production step failed');
    return { ...initialRun, status: 'failed', failedStep: 'postProduction', errorMessage: err.message, steps: {} };
  }

  // ── Step 5: Publishing ────────────────────────────────────────────────────────
  const publishStartedAt = new Date().toISOString();
  pipelineLogger.info({ runId, step: 'publishing' }, '[Pipeline] Starting publishing step');
  try {
    pubResult = await publishToYouTube(postProdResult.optimizedVideoPath, researchResult.chosenTitle, scriptResult);
    const stepResult = makeStepResult(publishStartedAt, true, {
      youtubeVideoId: pubResult.youtubeVideoId,
      youtubeUrl: pubResult.youtubeUrl,
      title: pubResult.title,
    });
    await runRef.update({ 'steps.publishing': stepResult });
    pipelineLogger.info({ runId, step: 'publishing', durationMs: stepResult.durationMs }, '[Pipeline] Publishing complete');
  } catch (err: any) {
    const stepResult = makeStepResult(publishStartedAt, false, undefined, err.message);
    await runRef.update({
      'steps.publishing': stepResult,
      status: 'failed',
      failedAt: new Date().toISOString(),
      failedStep: 'publishing',
      errorMessage: err.message,
    });
    pipelineLogger.error({ runId, step: 'publishing', err: err.message }, '[Pipeline] Publishing step failed');
    return { ...initialRun, status: 'failed', failedStep: 'publishing', errorMessage: err.message, steps: {} };
  }

  // ── All steps complete ────────────────────────────────────────────────────────
  const completedAt = new Date().toISOString();
  const totalMs = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  const result = {
    youtubeVideoId: pubResult.youtubeVideoId,
    youtubeUrl: pubResult.youtubeUrl,
    title: researchResult.chosenTitle,
    localVideoPath: postProdResult.optimizedVideoPath,
  };

  await runRef.update({ status: 'completed', completedAt, result });

  pipelineLogger.info(
    { runId, totalMs, youtubeUrl: pubResult.youtubeUrl },
    '[Pipeline] Pipeline completed successfully!'
  );

  return { ...initialRun, status: 'completed', completedAt, result, steps: {} };
}

export function initializeCronJob(): void {
  // 0 12 * * * = 12:00 UTC = 09:00 Brasília (UTC-3)
  cron.schedule(
    '0 12 * * *',
    async () => {
      pipelineLogger.info('[Cron] Daily video pipeline triggered at 12:00 UTC (09:00 Brasília)');
      await runVideoPipeline('cron');
    },
    { timezone: 'UTC' }
  );
  pipelineLogger.info('[Cron] Video pipeline cron job initialized: 0 12 * * * UTC (09:00 Brasília)');
}
