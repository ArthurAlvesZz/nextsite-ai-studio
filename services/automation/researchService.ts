import Anthropic from '@anthropic-ai/sdk';

export interface ResearchResult {
  chosenTitle: string;
  sourceKeyword: string;
  sourceNiche: string;
  topResults: Array<{ title: string; link: string; snippet: string }>;
  generatedAt: string;
}

const NICHES = ['Marketing Digital', 'E-commerce', 'Gestão de Tráfego', 'Infoprodutos'];

const PAIN_KEYWORDS = [
  'ROAS baixo',
  'como criar anúncios que convertem',
  'reduzir custo de produção de vídeo',
  'criativos para tráfego pago',
  'escalar vendas com vídeos',
];

export async function runResearch(): Promise<ResearchResult> {
  const dayIndex = new Date().getDay();
  const niche = NICHES[dayIndex % NICHES.length];
  const keyword = PAIN_KEYWORDS[dayIndex % PAIN_KEYWORDS.length];
  const query = `${niche} ${keyword}`;

  console.log(`[ResearchService] Searching SerpAPI for: "${query}"`);

  const serpApiKey = process.env.SERPAPI_KEY;
  if (!serpApiKey) throw new Error('SERPAPI_KEY not set in environment');

  const serpUrl = `https://serpapi.com/search?api_key=${serpApiKey}&q=${encodeURIComponent(query)}&hl=pt-BR&gl=BR&num=10`;
  const serpResponse = await fetch(serpUrl);
  if (!serpResponse.ok) {
    throw new Error(`SerpAPI error: ${serpResponse.status} ${serpResponse.statusText}`);
  }
  const serpData = await serpResponse.json() as any;

  const organicResults: Array<{ title: string; link: string; snippet: string }> =
    (serpData.organic_results || []).slice(0, 5).map((r: any) => ({
      title: r.title || '',
      link: r.link || '',
      snippet: r.snippet || '',
    }));

  console.log(`[ResearchService] Got ${organicResults.length} results. Generating title with Claude...`);

  const snippetsText = organicResults.map((r, i) => `${i + 1}. ${r.snippet}`).join('\n');

  let chosenTitle: string;

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) throw new Error('ANTHROPIC_API_KEY not set in environment');

  try {
    const client = new Anthropic({ apiKey: anthropicKey });
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 200,
      system:
        'Você é um especialista em títulos virais para YouTube Shorts voltados ao mercado brasileiro de marketing digital. ' +
        'Gere UM ÚNICO título em português brasileiro que seja altamente clicável, focado na dor do lead, e ideal para o formato Shorts. ' +
        'O título deve ter entre 6 e 12 palavras. Retorne SOMENTE o título, sem aspas, sem explicações, sem numeração.',
      messages: [
        {
          role: 'user',
          content:
            `Nicho: ${niche}\nPalavra-chave de dor: ${keyword}\n\nResultados de pesquisa para contexto:\n${snippetsText}\n\nGere o título viral:`,
        },
      ],
    });

    const titleContent = message.content[0];
    chosenTitle = titleContent.type === 'text' ? titleContent.text.trim() : '';
    if (!chosenTitle) throw new Error('Empty title returned from Claude');
  } catch (err: any) {
    console.warn(`[ResearchService] Claude title generation failed, using fallback. Error: ${err.message}`);
    chosenTitle = `${keyword}: O Método que Está Mudando o Jogo em ${niche}`;
  }

  console.log(`[ResearchService] Chosen title: "${chosenTitle}"`);

  return {
    chosenTitle,
    sourceKeyword: keyword,
    sourceNiche: niche,
    topResults: organicResults,
    generatedAt: new Date().toISOString(),
  };
}
