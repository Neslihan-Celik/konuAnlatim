const MODEL = 'gemini-2.5-flash';
const MAX_TEXT_LENGTH = 24000;

export const config = { path: '/api/generate' };

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  body: JSON.stringify(body),
});

export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Bu endpoint yalnızca POST isteği kabul eder.' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return json(503, { error: 'Canlı yapay zekâ bağlantısı henüz etkin değil. Netlify ortam değişkenlerine GEMINI_API_KEY eklenmeli ve site yeniden deploy edilmeli.' });

  let input;
  try { input = JSON.parse(event.body || '{}'); }
  catch { return json(400, { error: 'İstek gövdesi geçerli JSON değil.' }); }

  const text = typeof input.text === 'string' ? input.text.trim() : '';
  const language = typeof input.language === 'string' ? input.language.slice(0, 40) : 'Rusça';
  const count = Number(input.count);
  if (text.length < 120) return json(400, { error: 'Seçilen sayfalarda içerik üretmek için yeterli metin yok. Taranmış PDF için OCR gerekir.' });
  if (text.length > MAX_TEXT_LENGTH) return json(413, { error: 'Seçilen sayfaların metni çok uzun. Daha dar bir sayfa aralığı seç.' });
  if (!Number.isInteger(count) || count < 4 || count > 12) return json(400, { error: 'Soru sayısı 4 ile 12 arasında olmalı.' });

  const prompt = `Sen dikkatli bir ${language} dili öğretmenisin. Yalnızca aşağıdaki ders kitabı içeriğine dayan. Çıktı dili Türkçe olsun. Kısa, anlaşılır ve öğrencinin seviyesine uygun bir konu özeti hazırla; metindeki gerçek dil konularını belirle; her soruda tek ve savunulabilir doğru yanıt olan ${count} kısa quiz sorusu üret. Soruların farklı türlerini kullan: anlam, dil bilgisi, kelimeyi bağlamda kullanma, cümle kurma veya metni anlama; içerikte olmayan konuları uydurma. Dört seçenek ve Türkçe açıklayıcı ipucu ekle. Yeterli konu yoksa zayıf sorularla sayıyı doldurma; yalnızca anlamlı soruları üret ve warning alanında nedenini açıkla.\n\nDers kitabı metni:\n${text}`;

  let upstream;
  try {
    upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.25, maxOutputTokens: 5000 },
      }),
    });
  } catch {
    return json(502, { error: 'Yapay zekâ servisine ulaşılamadı. Biraz sonra yeniden dene.' });
  }

  const raw = await upstream.text();
  let result;
  try { result = JSON.parse(raw); }
  catch { return json(502, { error: `Yapay zekâ servisi geçersiz yanıt verdi (HTTP ${upstream.status}).` }); }
  if (!upstream.ok) {
    const message = result.error?.message || 'Yapay zekâ isteği başarısız oldu.';
    const status = upstream.status === 429 ? 429 : upstream.status === 401 || upstream.status === 403 ? 503 : 502;
    return json(status, { error: upstream.status === 429 ? 'Ücretsiz model kullanım sınırına ulaşıldı. Bir süre sonra yeniden dene.' : message });
  }

  const answerText = result.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('').trim();
  let data;
  try { data = JSON.parse(answerText); }
  catch { return json(502, { error: 'Model geçerli bir özet ve quiz oluşturamadı. Daha az sayfa seçip tekrar dene.' }); }

  const questions = Array.isArray(data.questions) ? data.questions.filter(question =>
    typeof question.question === 'string' && question.question.trim() &&
    Array.isArray(question.options) && question.options.length === 4 && question.options.every(option => typeof option === 'string') &&
    Number.isInteger(question.answer) && question.answer >= 0 && question.answer < 4 &&
    typeof question.hint === 'string'
  ).slice(0, count) : [];
  if (typeof data.summary !== 'string' || data.summary.trim().length < 20 || !questions.length) {
    return json(502, { error: 'Model yeterli ve doğrulanabilir içerik üretmedi. Daha dar bir sayfa aralığıyla tekrar dene.' });
  }

  return json(200, {
    summary: data.summary.trim(),
    topics: Array.isArray(data.topics) ? data.topics.filter(topic => typeof topic === 'string').slice(0, 8) : [],
    questions,
    warning: typeof data.warning === 'string' ? data.warning : '',
  });
}
