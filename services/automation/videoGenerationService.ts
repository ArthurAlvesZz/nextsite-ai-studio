import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { VideoScript } from './scriptingService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_DIR = path.join(__dirname, '../../output');

export interface VideoGenerationResult {
  videoId: string;
  localPath: string;
  fileName: string;
  durationMs: number;
  generatedAt: string;
}

const HEYGEN_API_BASE = 'https://api.heygen.com';

async function submitHeyGenJob(script: VideoScript): Promise<string> {
  const apiKey = process.env.HEYGEN_API_KEY;
  const avatarId = process.env.HEYGEN_AVATAR_ID;
  const voiceId = process.env.HEYGEN_VOICE_ID;

  if (!apiKey) throw new Error('HEYGEN_API_KEY not set');
  if (!avatarId) throw new Error('HEYGEN_AVATAR_ID not set');
  if (!voiceId) throw new Error('HEYGEN_VOICE_ID not set');

  const payload = {
    video_inputs: [
      {
        character: {
          type: 'avatar',
          avatar_id: avatarId,
          avatar_style: 'normal',
        },
        voice: {
          type: 'text',
          input_text: script.fullScript,
          voice_id: voiceId,
        },
      },
    ],
    dimension: { width: 1080, height: 1920 },
  };

  const response = await fetch(`${HEYGEN_API_BASE}/v2/video/generate`, {
    method: 'POST',
    headers: {
      'X-Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HeyGen submit error ${response.status}: ${errorText}`);
  }

  const data = await response.json() as any;
  const videoId = data?.data?.video_id;
  if (!videoId) throw new Error(`HeyGen did not return a video_id. Response: ${JSON.stringify(data)}`);

  console.log(`[VideoGenerationService] HeyGen job submitted. Video ID: ${videoId}`);
  return videoId;
}

async function pollHeyGenStatus(videoId: string): Promise<string> {
  const apiKey = process.env.HEYGEN_API_KEY!;
  const maxAttempts = 30;
  const initialDelayMs = 15_000;
  const backoffMultiplier = 1.5;
  const maxDelayMs = 120_000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const delayMs = Math.min(initialDelayMs * Math.pow(backoffMultiplier, attempt - 1), maxDelayMs);
    console.log(
      `[VideoGenerationService] Polling HeyGen status (attempt ${attempt}/${maxAttempts}), waiting ${Math.round(delayMs / 1000)}s...`
    );
    await sleep(delayMs);

    const response = await fetch(
      `${HEYGEN_API_BASE}/v1/video_status.get?video_id=${videoId}`,
      { headers: { 'X-Api-Key': apiKey } }
    );

    if (!response.ok) {
      console.warn(`[VideoGenerationService] Poll request failed: ${response.status}`);
      continue;
    }

    const data = await response.json() as any;
    const status = data?.data?.status;

    console.log(`[VideoGenerationService] HeyGen status: ${status}`);

    if (status === 'completed') {
      const videoUrl = data?.data?.video_url;
      if (!videoUrl) throw new Error('HeyGen completed but no video_url in response');
      return videoUrl;
    }

    if (status === 'failed') {
      const errorMsg = data?.data?.error || 'Unknown HeyGen render error';
      throw new Error(`HeyGen render failed: ${errorMsg}`);
    }
  }

  throw new Error(`HeyGen polling timed out after ${maxAttempts} attempts for video ${videoId}`);
}

async function downloadVideo(url: string, videoId: string): Promise<string> {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const timestamp = Date.now();
  const fileName = `heygen_${videoId}_${timestamp}.mp4`;
  const localPath = path.join(OUTPUT_DIR, fileName);

  console.log(`[VideoGenerationService] Downloading video to ${localPath}...`);

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download video: ${response.status}`);
  if (!response.body) throw new Error('No response body for video download');

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

  console.log(`[VideoGenerationService] Video downloaded: ${fileName}`);
  return localPath;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function generateVideo(script: VideoScript): Promise<VideoGenerationResult> {
  const startMs = Date.now();
  console.log('[VideoGenerationService] Submitting video to HeyGen...');

  const videoId = await submitHeyGenJob(script);
  const videoUrl = await pollHeyGenStatus(videoId);
  const localPath = await downloadVideo(videoUrl, videoId);
  const fileName = path.basename(localPath);
  const durationMs = Date.now() - startMs;

  console.log(`[VideoGenerationService] Done in ${Math.round(durationMs / 1000)}s. File: ${fileName}`);

  return {
    videoId,
    localPath,
    fileName,
    durationMs,
    generatedAt: new Date().toISOString(),
  };
}
