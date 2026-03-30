import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_DIR = path.join(__dirname, '../../output');

// ─── Submagic API constants (update here if the API changes) ─────────────────
const SUBMAGIC_BASE_URL = () => process.env.SUBMAGIC_API_BASE_URL || 'https://api.submagic.co';
const SUBMAGIC_UPLOAD_PATH = '/api/v1/assets/upload';
const SUBMAGIC_JOBS_PATH = '/api/v1/jobs';
const SUBMAGIC_JOB_STATUS_PATH = (jobId: string) => `/api/v1/jobs/${jobId}`;

export interface PostProductionResult {
  optimizedVideoPath: string;
  fileName: string;
  submagicJobId: string;
  generatedAt: string;
}

async function uploadToSubmagic(filePath: string): Promise<string> {
  const apiKey = process.env.SUBMAGIC_API_KEY;
  if (!apiKey) throw new Error('SUBMAGIC_API_KEY not set');

  console.log(`[PostProductionService] Uploading video to Submagic: ${path.basename(filePath)}`);

  const fileBuffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);

  const formData = new FormData();
  formData.append('file', new Blob([fileBuffer], { type: 'video/mp4' }), fileName);

  const response = await fetch(`${SUBMAGIC_BASE_URL()}${SUBMAGIC_UPLOAD_PATH}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Submagic upload error ${response.status}: ${errorText}`);
  }

  const data = await response.json() as any;
  const assetId = data?.asset_id || data?.id || data?.data?.id;
  if (!assetId) throw new Error(`Submagic did not return an asset ID. Response: ${JSON.stringify(data)}`);

  console.log(`[PostProductionService] Submagic asset uploaded. Asset ID: ${assetId}`);
  return String(assetId);
}

async function createSubmagicJob(assetId: string, title: string): Promise<string> {
  const apiKey = process.env.SUBMAGIC_API_KEY!;

  const payload = {
    asset_id: assetId,
    title,
    language: 'pt-BR',
    effects: ['captions', 'brolls', 'transitions'],
  };

  const response = await fetch(`${SUBMAGIC_BASE_URL()}${SUBMAGIC_JOBS_PATH}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Submagic job creation error ${response.status}: ${errorText}`);
  }

  const data = await response.json() as any;
  const jobId = data?.job_id || data?.id || data?.data?.id;
  if (!jobId) throw new Error(`Submagic did not return a job ID. Response: ${JSON.stringify(data)}`);

  console.log(`[PostProductionService] Submagic job created. Job ID: ${jobId}`);
  return String(jobId);
}

async function pollSubmagicCompletion(jobId: string): Promise<string> {
  const apiKey = process.env.SUBMAGIC_API_KEY!;
  const maxAttempts = 20;
  const initialDelayMs = 10_000;
  const backoffMultiplier = 1.5;
  const maxDelayMs = 90_000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const delayMs = Math.min(initialDelayMs * Math.pow(backoffMultiplier, attempt - 1), maxDelayMs);
    console.log(
      `[PostProductionService] Polling Submagic (attempt ${attempt}/${maxAttempts}), waiting ${Math.round(delayMs / 1000)}s...`
    );
    await sleep(delayMs);

    const response = await fetch(`${SUBMAGIC_BASE_URL()}${SUBMAGIC_JOB_STATUS_PATH(jobId)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      console.warn(`[PostProductionService] Submagic poll failed: ${response.status}`);
      continue;
    }

    const data = await response.json() as any;
    const status = data?.status || data?.data?.status;

    console.log(`[PostProductionService] Submagic job status: ${status}`);

    if (status === 'completed' || status === 'done' || status === 'finished') {
      const downloadUrl = data?.download_url || data?.output_url || data?.data?.download_url;
      if (!downloadUrl) throw new Error('Submagic completed but no download URL in response');
      return downloadUrl;
    }

    if (status === 'failed' || status === 'error') {
      const errorMsg = data?.error || data?.message || 'Unknown Submagic error';
      throw new Error(`Submagic job failed: ${errorMsg}`);
    }
  }

  throw new Error(`Submagic polling timed out after ${maxAttempts} attempts for job ${jobId}`);
}

async function downloadOptimizedVideo(url: string, jobId: string): Promise<string> {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const timestamp = Date.now();
  const fileName = `submagic_${jobId}_${timestamp}.mp4`;
  const localPath = path.join(OUTPUT_DIR, fileName);

  console.log(`[PostProductionService] Downloading optimized video to ${localPath}...`);

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download Submagic video: ${response.status}`);
  if (!response.body) throw new Error('No response body for Submagic download');

  const writeStream = fs.createWriteStream(localPath);
  const reader = response.body.getReader();

  await new Promise<void>((resolve, reject) => {
    const pump = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            writeStream.end();
            break;
          }
          if (!writeStream.write(value)) {
            await new Promise<void>(r => writeStream.once('drain', r));
          }
        }
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      } catch (err) {
        reject(err);
      }
    };
    pump();
  });

  console.log(`[PostProductionService] Optimized video downloaded: ${fileName}`);
  return localPath;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function runPostProduction(
  inputVideoPath: string,
  videoTitle: string
): Promise<PostProductionResult> {
  console.log('[PostProductionService] Starting post-production with Submagic...');

  const assetId = await uploadToSubmagic(inputVideoPath);
  const submagicJobId = await createSubmagicJob(assetId, videoTitle);
  const downloadUrl = await pollSubmagicCompletion(submagicJobId);
  const optimizedVideoPath = await downloadOptimizedVideo(downloadUrl, submagicJobId);
  const fileName = path.basename(optimizedVideoPath);

  console.log(`[PostProductionService] Post-production complete. File: ${fileName}`);

  return {
    optimizedVideoPath,
    fileName,
    submagicJobId,
    generatedAt: new Date().toISOString(),
  };
}
