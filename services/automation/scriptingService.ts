import Anthropic from '@anthropic-ai/sdk';

export interface VideoScript {
  title: string;
  hook: string;
  body: string;
  cta: string;
  fullScript: string;
  wordCount: number;
  estimatedDurationSeconds: number;
  generatedAt: string;
}

const FIXED_CTA =
  'A Next Creatives Studio cria os melhores criativos de IA do mercado para o seu negócio. ' +
  'Clique no link na bio e agende agora uma consultoria gratuita para escalar suas vendas com vídeos que realmente convertem.';

export async function generateScript(title: string): Promise<VideoScript> {
  console.log(`[ScriptingService] Generating script for title: "${title}"`);

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) throw new Error('ANTHROPIC_API_KEY not set in environment');

  const client = new Anthropic({ apiKey: anthropicKey });

  const systemPrompt = `Você é um roteirista especializado em vídeos curtos de alta conversão para o mercado brasileiro de marketing digital.
Crie um roteiro de 60 segundos para o formato de vídeo vertical (Shorts/Reels), estruturado em três partes.
Retorne SOMENTE um JSON válido no seguinte formato (sem markdown, sem explicações):
{"hook": "...", "body": "..."}

Regras obrigatórias:
- hook (0-5s): DEVE começar com uma afirmação agressiva focada na dor. Exemplo: "Você está perdendo dinheiro todos os dias com criativos amadores e caros."
- body (5-45s): Apresente a solução. Explique como vídeos criados pelas melhores IAs do mercado retêm atenção, explodem o ROAS e custam uma fração do tempo e valor da produção tradicional. Seja persuasivo e específico.
- NÃO inclua a CTA no JSON — ela será adicionada separadamente.
- Escreva em português brasileiro coloquial e persuasivo.
- Total de hook + body deve ter entre 100 e 160 palavras.`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Crie o roteiro para o seguinte título de vídeo: "${title}"`,
      },
    ],
  });

  const rawContent = message.content[0];
  if (rawContent.type !== 'text') {
    throw new Error('[ScriptingService] Unexpected response type from Claude');
  }

  let hook = '';
  let body = '';

  try {
    // Strip potential markdown code fences before parsing
    const jsonText = rawContent.text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(jsonText);
    hook = parsed.hook || '';
    body = parsed.body || '';
  } catch {
    // Regex fallback if JSON parsing fails
    console.warn('[ScriptingService] JSON parse failed, using regex fallback');
    const hookMatch = rawContent.text.match(/"hook":\s*"([^"]+)"/);
    const bodyMatch = rawContent.text.match(/"body":\s*"([^"]+)"/);
    hook = hookMatch ? hookMatch[1] : '';
    body = bodyMatch ? bodyMatch[1] : '';
  }

  if (!hook || !body) {
    throw new Error('[ScriptingService] Failed to extract hook and body from Claude response');
  }

  const cta = FIXED_CTA;
  const fullScript = `${hook} ${body} ${cta}`;
  const wordCount = fullScript.split(/\s+/).filter(Boolean).length;
  const estimatedDurationSeconds = Math.round((wordCount / 130) * 60);

  if (estimatedDurationSeconds > 70) {
    console.warn(
      `[ScriptingService] Script estimated at ${estimatedDurationSeconds}s, which exceeds 70s. Consider trimming.`
    );
  }

  console.log(
    `[ScriptingService] Script generated: ${wordCount} words, ~${estimatedDurationSeconds}s`
  );

  return {
    title,
    hook,
    body,
    cta,
    fullScript,
    wordCount,
    estimatedDurationSeconds,
    generatedAt: new Date().toISOString(),
  };
}
