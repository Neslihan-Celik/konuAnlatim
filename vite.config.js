import { defineConfig } from 'vite';
function aiMiddleware() {
  return async (req, res) => {
        if (req.method !== 'POST') { res.writeHead(405).end(); return; }
        let raw = '';
        for await (const part of req) raw += part;
        try {
          const { text, language, count, model = 'qwen2.5:3b' } = JSON.parse(raw);
          if (typeof text !== 'string' || text.length < 120 || text.length > 24000) throw new Error('PDF metni 120–24000 karakter arasında olmalı.');
          if (!Number.isInteger(count) || count < 4 || count > 12) throw new Error('Soru sayısı 4–12 arasında olmalı.');
          const response = await fetch('http://127.0.0.1:11434/api/generate', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, stream: false, format: 'json', prompt: `You are a careful language teacher. Analyze only the textbook excerpt. Return valid JSON with keys summary (2-4 concise sentences in Turkish explaining the real concept), topics (short topic names in Turkish), questions (exactly ${count} objects with question, options (4 strings), answer (zero-based integer), hint (brief Turkish explanation)). Questions should assess language concepts actually taught in the excerpt, have one defensible answer, avoid generic or unrelated questions, and be appropriate for a student learning ${language}. If the excerpt does not contain enough instructional content for ${count} meaningful questions, return as many as are meaningful and include a JSON key "warning" explaining the limitation. Never invent topics. Excerpt:\n${text}` })
          });
          const payload = await response.json();
          if (!response.ok) { res.writeHead(response.status, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: payload.error || 'Ollama error' })); return; }
          const data = JSON.parse(payload.response);
          const questions = Array.isArray(data.questions) ? data.questions.filter(q => typeof q.question === 'string' && Array.isArray(q.options) && q.options.length === 4 && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4 && typeof q.hint === 'string') : [];
          if (typeof data.summary !== 'string' || !questions.length) throw new Error('Model yeterli, doğrulanabilir içerik üretmedi.');
          res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ summary: data.summary, topics: Array.isArray(data.topics) ? data.topics.slice(0, 6) : [], questions, warning: data.warning || '' }));
        } catch (error) {
          const unavailable = error.cause?.code === 'ECONNREFUSED' || error.cause?.code === 'ECONNRESET';
          res.writeHead(unavailable ? 503 : 400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: unavailable ? 'Ollama çalışmıyor. Ollama’yı açıp “ollama run qwen2.5:3b” komutuyla ücretsiz modeli indir.' : error.message }));
        }
      };
}

function localAiPlugin() {
  return {
    name: 'ders-cebi-local-ai',
    configureServer(server) {
      server.middlewares.use('/api/generate', aiMiddleware());
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/generate', aiMiddleware());
    }
  };
}

export default defineConfig({ plugins: [localAiPlugin()] });
