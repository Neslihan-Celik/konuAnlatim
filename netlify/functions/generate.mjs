const MODEL = 'gemini-3.5-flash-lite';
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
  const language = typeof input.language === 'string' && input.language.trim() ? input.language.trim().slice(0, 40) : '';
  const count = Number(input.count);
  const pageCount = Number.isInteger(Number(input.pages)) ? Math.min(200, Math.max(1, Number(input.pages))) : 1;
  const denseContent = pageCount >= 4 || text.length >= 6500;
  const veryDenseContent = pageCount >= 8 || text.length >= 12000;
  if (text.length < 120) return json(400, { error: 'Seçilen sayfalarda içerik üretmek için yeterli metin yok. Taranmış PDF için OCR gerekir.' });
  if (text.length > MAX_TEXT_LENGTH) return json(413, { error: 'Seçilen sayfaların metni çok uzun. Daha dar bir sayfa aralığı seç.' });
  if (!Number.isInteger(count) || count < 4 || count > 12) return json(400, { error: 'Soru sayısı 4 ile 12 arasında olmalı.' });

  const summaryGuidance = veryDenseContent
    ? `Seçilen içerik ${pageCount} sayfa veya çok yoğun; kısa ama kapsamlı bir çalışma özeti hazırla. summary alanında ana fikri ve konuların ilişkisini 4–6 cümlede açıkla. topics alanında içerikte gerçekten bulunan en önemli 6–8 konu başlığını birbirinden ayrı yaz. keyPoints alanında bu başlıkları kapsayan 6–8 kısa madde üret; her maddede ilgili kuralı, formülü, kullanım kalıbını ya da önemli ayrımı belirt. Kaynakta formül veya dil bilgisi kalıbı varsa gösterimini açıkça yaz ve sembol/eklerin görevini bir cümleyle açıkla; istisna ya da örnek varsa yalnızca en öğretici olanı ekle. Önemli başlıkları atlama, tekrarı ve uzun açıklamaları çıkar.`
    : denseContent
      ? `Seçilen içerik ${pageCount} sayfa ve orta yoğunlukta. summary alanında ana fikri 3–5 cümlede anlat. topics alanında 4–7 önemli konu başlığını ayrı ayrı yaz. keyPoints alanında 4–7 kısa maddeyle başlıca kuralı, formülü, kullanım kalıbını veya istisnayı açıkla. Kaynakta formül ya da dil bilgisi kalıbı varsa gösterimini koru ve ne zaman kullanıldığını kısaca belirt; metindeki yararlı bir örneği ekleyebilirsin. Tekrarları çıkar.`
      : `Seçilen içerik ${pageCount} sayfa ve görece sınırlı. summary alanında konuyu 4–6 cümlede adım adım açıkla. topics alanında 2–4 ana başlığı ayrı ayrı yaz. keyPoints alanında 2–4 kısa maddeyle mutlaka hatırlanması gereken kuralı, formülü, kullanım kalıbını veya ipucunu belirt. Formül ya da dil bilgisi kalıbı varsa gösterimini ve temel kullanımını kısaca açıkla; metindeki en az bir yararlı örneği ekle.`;
  const subjectGuidance = language
    ? `Ders/öğrenme dili ${language} olarak belirtilmiş; bu dili ve kaynakta görünen ders konularını esas al.`
    : 'PDF’den dersin ana konusunu ve varsa öğrenilen dili kendin belirle. İçerik dil öğrenimiyle ilgiliyse kaynakta geçen dili ve kuralları kullan; başka bir dersse yalnızca o dersin kavramlarını, kurallarını ve formüllerini ölç. Rusça ya da başka bir dili, kaynakta yoksa konuya ekleme.';
  const prompt = `Sen dikkatli bir öğretmensin. Yalnızca aşağıdaki PDF sayfalarındaki içeriğe dayan. ${subjectGuidance} summary, topics, keyPoints, soru metinleri, seçenekler, hint ve warning alanlarını doğal ve dil bilgisi doğru Türkçeyle yaz. Kaynaktaki özel terimleri, sembolleri, formülleri ve hedef dil örneklerini doğru yazımlarıyla koru; başka alfabeye aktarma veya kaynakta olmayan bilgi uydurma. Noktalama, boşluk ve cümle başlangıçlarında Türkçe yazım kurallarına uy. topics alanında her başlığı ayrı ve kısa bir dize olarak yaz; başlıkları tek bir dizede birleştirme. ${summaryGuidance} PDF’de yeterli içerik varsa, her birinin tek ve savunulabilir doğru yanıtı bulunan ${count} kısa çoktan seçmeli alıştırma hazırla. Konuya uygun soru türlerini kullan: kavramı açıklama, kuralı/formülü uygulama, neden-sonuç, örnek yorumlama veya metni anlama. Boşluk doldurma sorusu kullanırsan boşluğu soru içinde açıkça sekiz alt çizgiyle (________) göster ve seçenekleri bu boşluğu tamamlayacak şekilde yaz; boşluk göstermeden boşluk doldurma isteme. Cevabı sorunun içinde verme veya aynı ifadeyi tekrar seçtirme. Her sorunun dört seçeneği ve doğru yanıtı açıklayan kısa, Türkçe bir ipucu olsun. İçerik sayıyı karşılamaya yetmiyorsa zayıf soru uydurma; anlamlı olanları üret ve warning alanında bunu kısaca belirt.\n\nPDF’den çıkarılan metin:\n${text}`;
  const responseSchema = {
    type: 'OBJECT',
    properties: {
      summary: { type: 'STRING' },
      topics: { type: 'ARRAY', items: { type: 'STRING' } },
      keyPoints: { type: 'ARRAY', items: { type: 'STRING' } },
      questions: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            question: { type: 'STRING' },
            options: { type: 'ARRAY', items: { type: 'STRING' }, minItems: 4, maxItems: 4 },
            answer: { type: 'INTEGER', minimum: 0, maximum: 3 },
            hint: { type: 'STRING' },
          },
          required: ['question', 'options', 'answer', 'hint'],
        },
      },
      warning: { type: 'STRING' },
    },
    required: ['summary', 'topics', 'keyPoints', 'questions', 'warning'],
  };

  const requestBody = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema,
      temperature: 0.25,
      maxOutputTokens: 5000,
      thinkingConfig: { thinkingLevel: 'minimal' },
    },
  });
  let upstream;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: requestBody,
      });
    } catch {
      if (attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, 350 * (attempt + 1)));
        continue;
      }
      return json(502, { error: 'Yapay zekâ servisine ulaşılamadı. Bağlantını kontrol edip yeniden dene.' });
    }
    if (upstream.status !== 503 || attempt === 2) break;
    await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
  }

  const raw = await upstream.text();
  let result;
  try { result = JSON.parse(raw); }
  catch { return json(502, { error: `Yapay zekâ servisi geçersiz yanıt verdi (HTTP ${upstream.status}).` }); }
  if (!upstream.ok) {
    const status = upstream.status === 429 ? 429 : upstream.status === 401 || upstream.status === 403 || upstream.status === 503 ? 503 : 502;
    const message = upstream.status === 429
      ? 'Modelin ücretsiz kullanım sınırına ulaşıldı. Bir süre bekleyip yeniden dene.'
      : upstream.status === 503
        ? 'Yapay zekâ servisi şu anda yoğun. Birkaç saniye sonra yeniden dene.'
        : upstream.status === 401 || upstream.status === 403
          ? 'Yapay zekâ bağlantısının API anahtarı geçersiz. Site yöneticisi Netlify ayarlarını kontrol etmeli.'
          : 'Yapay zekâ isteği başarısız oldu. Biraz sonra yeniden dene.';
    return json(status, { error: message });
  }

  const answerText = result.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('').trim();
  if (!answerText) return json(502, { error: 'Model boş yanıt verdi. Bir kez daha dene; sorun sürerse daha az sayfa seç.' });
  let data;
  try { data = JSON.parse(answerText); }
  catch { return json(502, { error: 'Model geçerli bir özet ve quiz oluşturamadı. Daha az sayfa seçip tekrar dene.' }); }

  const questions = Array.isArray(data.questions) ? data.questions.map(question => ({
    ...question,
    answer: Number(question?.answer),
  })).filter(question =>
    question && typeof question === 'object' &&
    typeof question.question === 'string' && question.question.trim() &&
    Array.isArray(question.options) && question.options.length === 4 && question.options.every(option => typeof option === 'string' && option.trim()) &&
    Number.isInteger(question.answer) && question.answer >= 0 && question.answer < 4 &&
    typeof question.hint === 'string'
  ).slice(0, count) : [];
  if (typeof data.summary !== 'string' || data.summary.trim().length < 20 || !questions.length) {
    return json(502, { error: 'Model bu içerikten doğrulanabilir soru oluşturamadı. Yeniden dene veya daha fazla konu içeren sayfalar seç.' });
  }

  return json(200, {
    summary: data.summary.trim(),
    topics: Array.isArray(data.topics) ? data.topics.filter(topic => typeof topic === 'string').slice(0, 8) : [],
    keyPoints: Array.isArray(data.keyPoints) ? data.keyPoints.filter(point => typeof point === 'string').slice(0, 8) : [],
    questions,
    warning: typeof data.warning === 'string' ? data.warning : '',
  });
}
