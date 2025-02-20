import { OpenAI } from 'ai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || '',
  });
  
  async function analyzeText(prompt: string) {
    const response = await openai.chat(prompt);
    return response;
  }


  serve({
    port: 3001,
    async fetch(req) {
      if (req.method === 'POST' && new URL(req.url).pathname === '/analyze') {
        const body = await req.json();
        const result = await analyzeText(body.prompt);
        return new Response(JSON.stringify({ data: result }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response('Not found', { status: 404 });
    }
  });