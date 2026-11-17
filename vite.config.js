import { defineConfig } from 'vite';

const normalize = value => String(value || '').toLocaleLowerCase('tr-TR').normalize('NFKD').replace(/[^\p{L}\p{N}]/gu, '');

function aiMiddleware() {
  return async (req, res) => {
    if (req.method !== 'POST') { res.writeHead(405).end(); return; }
    let raw = '';
    for await (const part of req) raw += part;

    try {
      const input = JSON.parse(raw);
      const text = typeof input.text === 'string' ? input.text.trim() : '';
      const count = Number(input.count);
      const difficulty = ['easy', 'medium', 'hard'].includes(input.difficulty) ? input.difficulty : 'medium';
      const excluded = Array.isArray(input.excludeQuestions) ? input.excludeQuestions.filter(q => typeof q === 'string').map(normalize) : [];
      if (text.length < 120 || text.length > 24000) throw new Error('PDF metni 120–24.000 karakter arasında olmalı.');
      if (!Number.isInteger(count) || count < 4 || count > 12) throw new Error('Soru sayısı 4–12 arasında olmalı.');

      const difficultyGuidance = {
        easy: 'KOLAY: kısa, açık, tek adımlı uygulama alıştırmaları hazırla. Tanım veya doğrudan hatırlama en fazla toplamın beşte biri olsun.',
        medium: 'ORTA: çoğunlukla kuralı yeni örnekte uygulama, cümle tamamlama/düzeltme ve bağlamı yorumlama alıştırmaları hazırla. Tanım veya doğrudan hatırlama en fazla toplamın beşte biri olsun.',
        hard: 'ZOR: neredeyse tüm sorular PDF’de öğretilen kuralları birleştiren çok adımlı uygulama, cümle düzeltme, karşılaştırma veya bağlamdan çıkarım alıştırmaları olsun. Tanım veya doğrudan hatırlama en fazla 1 soru olsun. Belirsizlik ya da kaynak dışı bilgiyle zorlaştırma.',
      }[difficulty];
      const languagePracticeGuidance = 'Önce PDF’nin ders türünü belirle. Yabancı dil öğretimiyse soruların çoğunu boşluk doldurma, fiili kişi/zaman/çekime göre doğru biçime getirme, cümle tamamlama/düzeltme, bağlamda doğru ifadeyi seçme ve kısa çeviri alıştırmaları yap. Kaynakta öğretilen fiil çekimlerini ve dil bilgisi yapılarını farklı örneklerde bolca kullandır; tanım sorusu en fazla 1 olsun. Soru köklerini ve hedef dildeki seçenek/metinleri hedef dilde yaz. Kaynakta bulunan soru cümlelerini ve kalıpları aynen koru; çevirme veya yeniden yazma. Yeni örneklerde yalnızca PDF’de öğretilen kelime ve kuralları kullan. Açıklama ve ipuçları Türkçe olsun. Başka bir dersse o dersin içeriğine göre uygulama soruları üret, bu dil-özel yönergeleri kullanma.';
      const history = excluded.length ? `Önceki turlarda sorulanları yeniden sorma veya aynı bilgiyi farklı sözcüklerle sorma: ${JSON.stringify(input.excludeQuestions)}.` : '';
      const prompt = `Sen dikkatli bir öğretmensin. Yalnızca PDF’den çıkarılan içeriğe dayan. ${languagePracticeGuidance} ${difficultyGuidance} Konu özetini, başlıkları, önemli noktaları ve ipuçlarını doğal ve doğru Türkçeyle yaz. Hedef dildeki örnekleri ve kaynakta bulunan soru kalıplarını aynen koru. ${count} kısa, çoktan seçmeli uygulama alıştırması üret. Boşluk doldurma kullanırsan boşluğu açıkça (________) göster. Her soru dört farklı seçenek, tek doğru yanıt, Türkçe kısa ipucu ve şu alanları içersin: topic (ölçülen başlık), evidence (doğru yanıtı destekleyen PDF’den aynen alınmış en az 12 karakterlik kanıt). Cevap soru kökünde görünmesin. Yalnızca PDF’de desteklenen, açık ve dil bilgisi doğru soruları üret. ${history}\nJSON biçimi: {"summary":"Türkçe kısa özet","topics":["başlık"],"keyPoints":["önemli nokta"],"questions":[{"question":"soru","topic":"başlık","evidence":"PDF’den aynen alıntı","options":["A","B","C","D"],"answer":0,"hint":"Türkçe açıklama"}],"warning":""}\n\nPDF metni:\n${text}`;

      const response = await fetch('http://127.0.0.1:11434/api/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'qwen2.5:3b', stream: false, format: 'json', prompt }),
      });
      const payload = await response.json();
      if (!response.ok) { res.writeHead(response.status, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: payload.error || 'Ollama isteği başarısız oldu.' })); return; }

      const data = JSON.parse(payload.response);
      const source = normalize(text);
      const questions = (Array.isArray(data.questions) ? data.questions : []).filter(q => {
        if (!q || typeof q.question !== 'string' || !q.question.trim() || typeof q.topic !== 'string' || !q.topic.trim()) return false;
        if (typeof q.evidence !== 'string' || normalize(q.evidence).length < 12 || !source.includes(normalize(q.evidence))) return false;
        if (!Array.isArray(q.options) || q.options.length !== 4 || q.options.some(option => typeof option !== 'string' || !option.trim())) return false;
        if (new Set(q.options.map(normalize)).size !== 4 || !Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3 || typeof q.hint !== 'string') return false;
        if (normalize(q.options[q.answer]).length >= 10 && normalize(q.question).includes(normalize(q.options[q.answer]))) return false;
        return !excluded.includes(normalize(q.question));
      }).slice(0, count);
      if (typeof data.summary !== 'string' || data.summary.trim().length < 20 || !questions.length) {
        res.writeHead(502, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Model bu PDF’den doğrulanabilir soru üretemedi. Farklı sayfalar seçip yeniden dene.' })); return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' }).end(JSON.stringify({
        summary: data.summary.trim(),
        topics: Array.isArray(data.topics) ? data.topics.filter(topic => typeof topic === 'string').slice(0, 8) : [],
        keyPoints: Array.isArray(data.keyPoints) ? data.keyPoints.filter(point => typeof point === 'string').slice(0, 8) : [],
        questions,
        warning: typeof data.warning === 'string' ? data.warning : '',
      }));
    } catch (error) {
      const unavailable = error.cause?.code === 'ECONNREFUSED' || error.cause?.code === 'ECONNRESET';
      res.writeHead(unavailable ? 503 : 400, { 'Content-Type': 'application/json; charset=utf-8' }).end(JSON.stringify({
        error: unavailable ? 'Ollama çalışmıyor. Ollama’yı açıp “ollama run qwen2.5:3b” komutuyla ücretsiz modeli indir.' : error.message,
      }));
    }
  };
}

function localAiPlugin() {
  return {
    name: 'ders-cebi-local-ai',
    configureServer(server) { server.middlewares.use('/api/generate', aiMiddleware()); },
    configurePreviewServer(server) { server.middlewares.use('/api/generate', aiMiddleware()); },
  };
}

export default defineConfig({ plugins: [localAiPlugin()] });
