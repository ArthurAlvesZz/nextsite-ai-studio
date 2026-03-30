import fs from 'fs';
import { google } from 'googleapis';
import type { VideoScript } from './scriptingService.js';

export interface PublishingResult {
  youtubeVideoId: string;
  youtubeUrl: string;
  title: string;
  publishedAt: string;
}

const YOUTUBE_TAGS = [
  'YouTube Shorts',
  'Marketing Digital',
  'Criativos',
  'Tráfego Pago',
  'Next Creatives Studio',
  'Vídeos para Anúncios',
  'IA',
  'Infoprodutos',
  'E-commerce',
  'ROAS',
];

function buildOAuth2Client() {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;

  if (!clientId) throw new Error('YOUTUBE_CLIENT_ID not set');
  if (!clientSecret) throw new Error('YOUTUBE_CLIENT_SECRET not set');
  if (!refreshToken) throw new Error('YOUTUBE_REFRESH_TOKEN not set');

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    'urn:ietf:wg:oauth:2.0:oob'
  );

  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
}

function buildDescription(script: VideoScript): string {
  const agencyUrl = process.env.APP_URL || 'https://nextcreativestudio.com';
  return (
    `Precisa de vídeos profissionais para suas campanhas? Fale com a Next Creatives Studio: ${agencyUrl}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `${script.body}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `#Shorts #MarketingDigital #TráfegoPago #Criativos #NextCreativesStudio #IA #ROAS`
  );
}

export async function publishToYouTube(
  videoPath: string,
  title: string,
  script: VideoScript
): Promise<PublishingResult> {
  console.log(`[PublishingService] Uploading video to YouTube: "${title}"`);

  const oauth2Client = buildOAuth2Client();
  const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

  const description = buildDescription(script);

  const response = await youtube.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title,
        description,
        tags: YOUTUBE_TAGS,
        categoryId: '22',
        defaultLanguage: 'pt',
        defaultAudioLanguage: 'pt',
      },
      status: {
        privacyStatus: 'public',
        selfDeclaredMadeForKids: false,
      },
    },
    media: {
      mimeType: 'video/mp4',
      body: fs.createReadStream(videoPath),
    },
  });

  const youtubeVideoId = response.data.id;
  if (!youtubeVideoId) {
    throw new Error(`YouTube upload succeeded but no video ID returned. Response: ${JSON.stringify(response.data)}`);
  }

  const youtubeUrl = `https://www.youtube.com/shorts/${youtubeVideoId}`;
  console.log(`[PublishingService] Video published: ${youtubeUrl}`);

  return {
    youtubeVideoId,
    youtubeUrl,
    title,
    publishedAt: new Date().toISOString(),
  };
}
