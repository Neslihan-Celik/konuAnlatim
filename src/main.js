import * as pdfjsLib from 'pdfjs-dist';
import './style.css';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

const svgPaths={'book-open':'<path d="M12 7v14m0-14C9 5 5 4 2 5v14c3-1 7 0 10 2m0-14c3-2 7-3 10-2v14c-3-1-7 0-10 2"/>',sparkles:'<path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z"/><path d="m19 14 1.2 2.8L23 18l-2.8 1.2L19 22l-1.2-2.8L15 18l2.8-1.2L19 14Z"/>',upload:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5m5-5v12"/>','file-text':'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8m-8 4h8"/>','chevron-down':'<path d="m6 9 6 6 6-6"/>','chevron-right':'<path d="m9 18 6-6-6-6"/>','arrow-right':'<path d="M5 12h14m-7-7 7 7-7 7"/>',download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5m-5 5V3"/>',check:'<path d="m5 12 4 4L19 6"/>','rotate-ccw':'<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>','clock-3':'<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>','book-marked':'<path d="M12 7v14m0-14C9 5 5 4 2 5v14c3-1 7 0 10 2m0-14c3-2 7-3 10-2v14c-3-1-7 0-10 2"/><path d="M17 4v5l2-1 2 1V4"/>',languages:'<path d="m5 8 6 6m-7 0 6-6 2-3M2 5h12M7 2h1m14 19-5-11-5 11m2-4h6"/>','circle-help':'<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3m.1 4h.01"/>',x:'<path d="m18 6-12 12M6 6l12 12"/>',leaf:'<path d="M11 20A7 7 0 0 1 4 13C4 5 20 3 20 3s-2 16-10 17Z"/><path d="M8 16c2-3 5-5 9-7"/>','party-popper':'<path d="m5 11 4 4M2 22l10-10M7 3l1 5m8-5-2 5m8 2-5 1"/><path d="M14 14 3 21l7-11 4 4Z"/>','circle-check':'<circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-6"/>','arrow-left':'<path d="M19 12H5m7 7-7-7 7-7"/>',lightbulb:'<path d="M9 18h6m-5 4h4m-5-8a6 6 0 1 1 6 0c-.8.6-1 1.1-1 2h-4c0-.9-.2-1.4-1-2Z"/>'};
function createIcons(){document.querySelectorAll('[data-lucide]').forEach(el=>{const name=el.getAttribute('data-lucide');el.innerHTML=`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${svgPaths[name]||svgPaths.sparkles}</svg>`;});}
const app = document.querySelector('#app');
const state = { file: null, pdf: null, pages: [], selected: null, questions: [], questionIndex: 0, answers: [], chosen: null, phase: 'setup', busy: false, ai: null, error: '' };

const sample = [
  { question: '“She ___ to school every morning.” cümlesinde doğru seçenek hangisi?', options: ['go', 'goes', 'going', 'gone'], answer: 1, hint: 'He, she ve it ile Simple Present zamanında fiile çoğunlukla -s eklenir.' },
  { question: 'Hangisi bir sıklık zarfıdır?', options: ['Beautiful', 'Yesterday', 'Usually', 'Carefully'], answer: 2, hint: 'Sıklık zarfları bir eylemin ne kadar sık yapıldığını anlatır.' },
  { question: '“I don’t drink coffee.” cümlesi ne anlatıyor?', options: ['Şu anda kahve içiyorum.', 'Kahve içmem.', 'Kahve içtim.', 'Kahve içeceğim.'], answer: 1, hint: 'Simple Present olumsuz cümlelerde I, you, we, they ile “don’t” kullanılır.' },
  { question: '“Her zaman” anlamına gelen sıklık zarfını seç.', options: ['Never', 'Sometimes', 'Often', 'Always'], answer: 3, hint: 'Sıklık zarfları: never, sometimes, often, usually ve always.' },
  { question: '“They ___ football on Sundays.” cümlesinde boşluk nasıl tamamlanır?', options: ['plays', 'play', 'playing', 'played'], answer: 1, hint: 'They ile Simple Present kullanırken fiile -s takısı eklenmez.' },
  { question: '“Does he like music?” sorusuna uygun kısa yanıt hangisi?', options: ['Yes, he likes.', 'Yes, he do.', 'Yes, he does.', 'Yes, he is.'], answer: 2, hint: 'Does ile başlayan soruya olumlu kısa yanıt: “Yes, he does.”' },
  { question: '“What time do you wake up?” sorusuna hangisi uygun yanıttır?', options: ['At seven o’clock.', 'I wake yesterday.', 'Yes, I do.', 'I am fine.'], answer: 0, hint: 'Soru “Saat kaçta?” diye soruyor; bir saatle cevap verebilirsin.' },
  { question: '“He doesn’t ___ tea.” cümlesinde doğru fiil hangisi?', options: ['drinks', 'drinking', 'drink', 'drank'], answer: 2, hint: 'Doesn’t sonrasında fiilin yalın hâli kullanılır.' },
  { question: '“My sister is rarely late.” cümlesinde “rarely” ne demek?', options: ['Daima', 'Nadiren', 'Bazen', 'Sıklıkla'], answer: 1, hint: 'Rarely, bir şeyin çok seyrek olduğunu anlatır.' },
  { question: 'Simple Present en çok hangi durum için kullanılır?', options: ['Alışkanlıklar ve rutinler', 'Tam şu anda yapılan işler', 'Geçen yıl yaşananlar', 'Gelecek hafta yapılacak planlar'], answer: 0, hint: 'Bu zaman, düzenli yapılan işleri ve genel gerçekleri anlatır.' },
];

function render() {
  if (state.phase === 'quiz') return renderQuiz();
  if (state.phase === 'result') return renderResult();
  app.innerHTML = `
    <div class="shell">
      <aside class="sidebar">
        <a class="brand" href="#"><span class="brand-icon"><i data-lucide="book-open"></i></span><span>Ders Cebi<span class="brand-dot">.</span></span></a>
        <div class="side-label">ÇALIŞMA ALANI</div>
        <button class="side-item active" type="button"><i data-lucide="sparkles"></i> Yeni çalışma <span class="side-plus">+</span></button>
        <button class="side-item" id="sampleBtn" type="button"><i data-lucide="book-marked"></i> Örnek dersi aç</button>
        <div class="sidebar-bottom"><div class="tip-card"><span class="tip-icon"><i data-lucide="leaf"></i></span><p><strong>Küçük adımlar,</strong><br>kalıcı öğrenme.</p><span>✳</span></div><div class="profile"><div class="avatar">D</div><div><strong>Ders Cebi</strong><small>Öğrenme alanı</small></div><i data-lucide="chevron-down"></i></div></div>
      </aside>
      <main class="main">
        <header class="topbar"><span>Çalışma alanı</span><span class="top-status"><span></span> Her şey hazır</span></header>
        <section class="content">
          <div class="welcome"><div><div class="eyebrow"><span class="eyebrow-line"></span> DAHA AZ HAZIRLIK, DAHA ÇOK ÖĞRENME</div><h1>Konuyu cebine koy<span>.</span></h1><p>Kitabından sayfaları seç; konu özetin ve kısa alıştırmaların hazır olsun.</p></div><div class="welcome-art"><div class="sun"></div><div class="book-art"><span></span><span></span><span></span></div><div class="plant">✳</div><div class="art-label">öğrenmek<br>güzel şey.</div></div></div>
          <div class="workspace">
            <section class="form-panel"><div class="section-heading"><span class="step">01</span><div><h2>Kaynağını ekle</h2><p>Ders kitabının PDF dosyasını yükle.</p></div></div>
              <label class="upload-zone ${state.file ? 'has-file' : ''}" for="pdfInput"><input id="pdfInput" type="file" accept="application/pdf,.pdf" hidden /><span class="upload-icon"><i data-lucide="${state.file ? 'file-text' : 'upload'}"></i></span><span class="upload-title">${state.file ? escapeHtml(state.file.name) : 'PDF’ni buraya bırak'}</span><span class="upload-sub">${state.file ? `${state.pdf?.numPages || '…'} sayfa · Dosyayı değiştirmek için tıkla` : 'ya da bilgisayarından seç'}</span><span class="upload-meta">PDF · En fazla 25 MB</span></label>
              <div class="divider"><span></span><em>sonra</em><span></span></div>
              <div class="step-two"><div class="section-heading compact"><span class="step">02</span><div><h2>Çalışma aralığını seç</h2><p>Hangi sayfalar üzerinde çalışılsın?</p></div></div>
              <div class="range-fields"><label>İlk sayfa<div class="input-wrap"><input id="startPage" type="number" min="1" value="1" ${state.pdf ? `max="${state.pdf.numPages}"` : ''}><span>syf.</span></div></label><span class="range-dash">—</span><label>Son sayfa<div class="input-wrap"><input id="endPage" type="number" min="1" value="${state.pdf ? Math.min(3, state.pdf.numPages) : 3}" ${state.pdf ? `max="${state.pdf.numPages}"` : ''}><span>syf.</span></div></label></div>
              <label class="select-label">Alıştırma soru sayısı<select id="questionCount"><option value="6">6 soru · Hızlı tekrar</option><option value="8" selected>8 soru · Dengeli tekrar</option><option value="10">10 soru · Konuyu pekiştir</option></select><i data-lucide="chevron-down"></i></label>
              <button id="createBtn" class="primary-button" type="button" ${state.busy ? 'disabled' : ''}><span>${state.busy ? 'Sayfalar okunuyor…' : 'Özeti ve soruları oluştur'}</span><i data-lucide="arrow-right"></i></button><div class="privacy-note"><i data-lucide="circle-check"></i> Dosyan tarayıcından ayrılmaz.</div>
              </div>
            </section>
        <section class="preview-panel"><div class="preview-head"><div><div class="preview-kicker"><i data-lucide="sparkles"></i> PDF’İNE GÖRE HAZIRLANIR</div><h2>Ön izleme</h2></div><span class="preview-tag">RUSÇA</span></div><div class="preview-body"><div class="lesson-chip"><i data-lucide="languages"></i> HER PDF <span>·</span> HER KONU</div><h3>Önce PDF’ni<br>yükle</h3><p class="preview-description">Seçtiğin sayfalardaki konuya göre kısa bir özet ve seviyene uygun sorular hazırlanır.</p><div class="preview-rule"></div><div class="preview-subtitle"><i data-lucide="book-open"></i> KISA KONU ÖZETİ</div><p class="summary-copy">Yüklediğin sayfalardaki konular burada kısa ve anlaşılır bir özet hâlinde gösterilir.</p><div class="preview-foot"><span><i data-lucide="circle-help"></i> 6–10 kısa soru</span><span>•</span><span>Konu sayısına göre</span></div></div><div class="preview-footer"><span class="avatar tiny">D</span><span>Her PDF için içeriğe özel çalışma</span><span>♡</span></div></section>
          </div><footer class="page-foot"><span>Öğrenme, merakla başlar. <span>✳</span></span><span>AZ VE ÖZ, HER GÜN.</span></footer>
        </section>
      </main>
    </div>`;
  document.querySelector('#pdfInput').addEventListener('change', handleFile);
  document.querySelector('#createBtn').addEventListener('click', createLesson);
  document.querySelector('#sampleBtn').addEventListener('click', () => alert('Ollama’yı ollama.com adresinden kur. Ardından terminalde “ollama run qwen2.5:3b” komutunu çalıştır. İlk model indirmesi tamamlanınca PDF yükleyebilirsin.'));
  const zone = document.querySelector('.upload-zone');
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragging'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragging'));
  zone.addEventListener('drop', e => { e.preventDefault(); zone.classList.remove('dragging'); const f = e.dataTransfer.files[0]; if (f) processFile(f); });
  createIcons();
}

async function handleFile(e) { if (e.target.files[0]) await processFile(e.target.files[0]); }
async function processFile(file) {
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) return alert('Lütfen bir PDF dosyası seç.');
  if (file.size > 25 * 1024 * 1024) return alert('Dosya 25 MB sınırını aşıyor.');
  state.file = file; state.pdf = null; render();
  try { state.pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise; render(); }
  catch (e) { console.error(e); alert('PDF okunamadı. Dosyanın şifreli olmadığını kontrol edip yeniden dene.'); state.file = null; render(); }
}

async function createLesson() {
  const start = Number(document.querySelector('#startPage').value), end = Number(document.querySelector('#endPage').value), count = Number(document.querySelector('#questionCount').value);
  if (!state.file) return alert('Önce bir ders kitabı PDF’i yükle.');
  const max = state.pdf?.numPages || 1;
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start || end > max) return alert(`Sayfa aralığını 1 ile ${max} arasında seç.`);
  state.busy = true; render();
  try {
    const pages = [];
    if (state.pdf?.getPage) for (let n = start; n <= end; n++) { const p = await state.pdf.getPage(n); const c = await p.getTextContent(); pages.push(c.items.map(x => x.str).join(' ')); }
    const text = pages.join('\n').replace(/\s+/g, ' ').trim();
    if (text.length < 120) throw new Error('Seçilen sayfalardan yeterli metin çıkarılamadı. PDF taranmış olabilir veya seçilen sayfalarda metin bulunmayabilir.');
    const language = 'Rusça';
    const response = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: text.slice(0, 24000), language, count, pages: end - start + 1 }) });
    const rawResponse = await response.text();
    let generated;
    try {
      generated = JSON.parse(rawResponse);
    } catch {
      const detail = rawResponse.trim().slice(0, 180);
      throw new Error(detail
        ? `API geçerli JSON döndürmedi (HTTP ${response.status}). ${detail}`
        : `API boş yanıt döndürdü (HTTP ${response.status}). Geliştirme sunucusunu yeniden başlatıp aynı adresi aç.`);
    }
    if (!response.ok) throw new Error(generated.error || 'Yapay zekâ içeriği üretilemedi.');
    state.selected = { start, end, text, language, summary: generated.summary, topics: generated.topics, keyPoints: generated.keyPoints, warning: generated.warning };
    state.questions = generated.questions;
    if (!state.questions.length) throw new Error('Bu sayfalarda quiz oluşturacak yeterli konu içeriği bulunamadı.');
    state.questionIndex = 0; state.answers = []; state.chosen = null; state.busy = false;
    state.phase = 'lesson'; renderLesson();
  } catch (e) { console.error(e); state.busy = false; render(); alert(e.message || 'Sayfalar okunurken bir hata oluştu.'); }
}

async function generateLesson(text, language, count) {
  let response;
  try {
    response = await fetch('http://localhost:11434/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: localStorage.getItem('dersCebiModel') || 'qwen2.5:3b', stream: false, format: 'json', prompt: `You are a careful language teacher. Use only the provided textbook excerpt. Return valid JSON in Turkish with keys summary (2-4 short sentences that explain the actual concept), topics (array of short topic names), questions (exactly ${count} objects with question, options (4 strings), answer (zero-based integer), hint). Assess concepts that appear in the excerpt, give one defensible answer, and explain briefly in Turkish. Do not invent concepts absent from the excerpt. The student is learning ${language}. Excerpt:\n${text.slice(0, 18000)}` }) });
  } catch { throw new Error('Yerel yapay zekâya ulaşılamadı. Ollama’yı yükleyip başlat; sonra “ollama run qwen2.5:3b” komutunu çalıştır ve yeniden dene.'); }
  if (!response.ok) throw new Error(`Ollama yanıt vermedi (${response.status}). Ollama’nın çalıştığını ve qwen2.5:3b modelinin indirildiğini kontrol et.`);
  const payload = await response.json();
  let result;
  try { result = JSON.parse(payload.response); } catch { throw new Error('Yapay zekâ geçerli bir quiz oluşturamadı. Daha az sayfa seçip yeniden dene.'); }
  if (typeof result.summary !== 'string' || !Array.isArray(result.questions) || result.questions.length < Math.min(count, 4)) throw new Error('Yapay zekâ eksik içerik üretti. Yeniden deneyebilir veya daha az sayfa seçebilirsin.');
  const questions = result.questions.slice(0, count).filter(q => typeof q.question === 'string' && Array.isArray(q.options) && q.options.length === 4 && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4);
  if (questions.length < Math.min(count, 4)) throw new Error('Üretilen sorulardan bazıları doğrulamadan geçmedi. Yeniden dene.');
  return { summary: result.summary, topics: Array.isArray(result.topics) ? result.topics.slice(0, 6) : [], questions };
}
function renderLesson() {
  const summary = [state.selected.summary || 'Özet oluşturulamadı.', ...(state.selected.keyPoints?.length ? ['', 'ÖNEMLİ NOKTALAR', ...state.selected.keyPoints.map(point => `• ${point}`)] : [])].join('\n');
  app.innerHTML = `<div class="shell"><aside class="sidebar"><a class="brand" href="#"><span class="brand-icon"><i data-lucide="book-open"></i></span><span>Ders Cebi<span class="brand-dot">.</span></span></a><div class="side-label">ÇALIŞMA ALANI</div><button class="side-item active"><i data-lucide="sparkles"></i> Yeni çalışma <span class="side-plus">+</span></button><button class="side-item" id="sampleBtn"><i data-lucide="book-marked"></i> Model kurulumu</button><div class="sidebar-bottom"><div class="tip-card"><span class="tip-icon"><i data-lucide="leaf"></i></span><p><strong>Küçük adımlar,</strong><br>kalıcı öğrenme.</p><span>✳</span></div><div class="profile"><div class="avatar">D</div><div><strong>Ders Cebi</strong><small>Öğrenme alanı</small></div></div></div></aside><main class="main"><header class="topbar"><span>Çalışma alanı</span><span class="top-status"><span></span> Çalışman hazır</span></header><section class="content lesson-content"><button class="back-link" id="backBtn"><i data-lucide="arrow-left"></i> Yeni çalışma oluştur</button><div class="lesson-title"><div class="eyebrow"><span class="eyebrow-line"></span> SAYFA ${state.selected.start}–${state.selected.end} · ${escapeHtml(state.selected.language.toUpperCase())}</div><h1>Önce konuyu anlayalım<span>.</span></h1><p>${escapeHtml(state.file.name)}</p></div><div class="lesson-grid"><article class="summary-card"><div class="card-kicker"><i data-lucide="book-open"></i> KISA KONU ÖZETİ</div><h2>Bu sayfalarda neler var?</h2><p class="extracted">${escapeHtml(summary)}</p>${state.selected.topics?.length ? `<div class="topics">${state.selected.topics.map(topic => `<span>${escapeHtml(topic)}</span>`).join('')}</div>` : ''}${state.selected.warning ? `<div class="notice"><i data-lucide="lightbulb"></i><span>${escapeHtml(state.selected.warning)}</span></div>` : ''}<div class="notice"><i data-lucide="lightbulb"></i><span>Özet ve sorular seçtiğin sayfalardaki içeriğe göre hazırlandı. Önemli terim ve örnekler kaynak metindeki yazımıyla korunur.</span></div><button class="secondary-button pdf-download-button" id="downloadPdf"><i data-lucide="download"></i><span>Özeti ve soruları PDF olarak indir</span></button><div class="source-meta"><i data-lucide="file-text"></i> ${escapeHtml(state.file.name)} <span>·</span> ${state.selected.end - state.selected.start + 1} sayfa</div></article><article class="quiz-start-card"><div class="quiz-decoration">✳</div><div class="card-kicker"><i data-lucide="sparkles"></i> HAZIR MISIN?</div><h2>Biraz pratik,<br>daha çok özgüven.</h2><p>${state.questions.length} kısa soru. Her soruda küçük bir ipucu.</p><div class="quiz-facts"><span><i data-lucide="clock-3"></i> ~ 3 dakika</span><span><i data-lucide="circle-help"></i> ${state.questions.length} soru</span></div><button class="primary-button" id="startQuiz"><span>Alıştırmaya başla</span><i data-lucide="arrow-right"></i></button></article></div></section></main></div>`;
  document.querySelector('#backBtn').onclick = () => { state.phase = 'setup'; render(); };
  document.querySelector('#downloadPdf').onclick = downloadStudyPdf;
  document.querySelector('#startQuiz').onclick = () => { state.phase = 'quiz'; state.questionIndex = 0; state.answers = []; state.chosen = null; render(); };
  createIcons();
}

function renderQuiz() {
  const q = state.questions[state.questionIndex]; const total = state.questions.length; const selected = state.chosen;
  app.innerHTML = `<main class="quiz-page"><header class="quiz-top"><a class="brand" href="#"><span class="brand-icon"><i data-lucide="book-open"></i></span><span>Ders Cebi<span class="brand-dot">.</span></span></a><button class="exit-quiz" id="exitQuiz"><i data-lucide="x"></i> Alıştırmadan çık</button></header><section class="quiz-wrap"><div class="quiz-progress-label"><span>SORU ${String(state.questionIndex + 1).padStart(2, '0')} <span>/ ${String(total).padStart(2, '0')}</span></span><span>GÜZEL GİDİYORSUN <span>✳</span></span></div><div class="progress-track"><div style="width:${(state.questionIndex / total) * 100}%"></div></div><div class="quiz-question"><div class="question-icon"><i data-lucide="sparkles"></i></div><h1>${escapeHtml(q.question).replace(/\n/g, '<br>')}</h1><p>Doğru cevabı seç.</p></div><div class="options">${q.options.map((o, i) => `<button class="option ${selected === i ? (i === q.answer ? 'correct' : 'incorrect') : ''} ${selected !== null && i === q.answer ? 'show-correct' : ''}" data-option="${i}" ${selected !== null ? 'disabled' : ''}><span class="option-letter">${String.fromCharCode(65 + i)}</span><span>${escapeHtml(o)}</span><span class="option-mark">${selected !== null && i === q.answer ? '✓' : selected === i ? '×' : ''}</span></button>`).join('')}</div>${selected !== null ? `<div class="hint-box ${selected === q.answer ? 'right' : 'try-again'}"><i data-lucide="${selected === q.answer ? 'circle-check' : 'lightbulb'}"></i><span><strong>${selected === q.answer ? 'Harika, doğru cevap!' : 'Güzel deneme!'}</strong> ${escapeHtml(q.hint)}</span></div>` : ''}<div class="quiz-actions"><span class="gentle-note">${selected === null ? 'Acele etme, düşünmek için vaktin var.' : selected === q.answer ? 'Bir adım daha öğrendin ✨' : 'Her deneme seni ileri taşır.'}</span>${selected !== null ? `<button class="primary-button next-button" id="nextBtn"><span>${state.questionIndex === total - 1 ? 'Sonucu gör' : 'Devam et'}</span><i data-lucide="arrow-right"></i></button>` : ''}</div></section></main>`;
  document.querySelectorAll('.option:not([disabled])').forEach(b => b.onclick = () => { state.chosen = Number(b.dataset.option); state.answers.push(state.chosen === q.answer); renderQuiz(); });
  document.querySelector('#exitQuiz').onclick = () => { state.phase = 'lesson'; renderLesson(); };
  const next = document.querySelector('#nextBtn'); if (next) next.onclick = () => { if (state.questionIndex === total - 1) { state.phase = 'result'; render(); } else { state.questionIndex++; state.chosen = null; renderQuiz(); } };
  createIcons();
}

function renderResult() {
  const score = state.answers.filter(Boolean).length, total = state.questions.length; const pct = score / total;
  const message = pct >= .8 ? ['Harika iş çıkardın!', 'Konunun büyük kısmı yerine oturmuş. Bu tempoyla devam!'] : pct >= .5 ? ['Güzel bir başlangıç!', 'Bir tur daha göz atınca çok daha sağlam olacak.'] : ['Her şey pratikle oturur.', 'Özete bir kez daha göz atıp yeniden deneyebilirsin.'];
  app.innerHTML = `<main class="result-page"><a class="brand" href="#"><span class="brand-icon"><i data-lucide="book-open"></i></span><span>Ders Cebi<span class="brand-dot">.</span></span></a><section class="result-card"><div class="result-confetti">✳</div><div class="result-icon"><i data-lucide="${pct >= .8 ? 'party-popper' : 'sparkles'}"></i></div><div class="eyebrow">ALIŞTIRMA TAMAMLANDI</div><h1>${message[0]}</h1><p>${message[1]}</p><div class="score-ring" style="--score:${pct * 100}%"><div><strong>${score}<span>/${total}</span></strong><small>doğru cevap</small></div></div><div class="result-stats"><span><i data-lucide="circle-check"></i> ${score} doğru</span><span><i data-lucide="rotate-ccw"></i> ${total - score} tekrar fırsatı</span></div><button class="secondary-button pdf-download-button" id="downloadPdf"><i data-lucide="download"></i><span>Özeti ve soruları PDF olarak indir</span></button><button class="primary-button" id="retryBtn"><span>Bir tur daha deneyelim</span><i data-lucide="rotate-ccw"></i></button><button class="text-button" id="summaryBtn">Özete geri dön</button></section><div class="result-footer">HER GÜN BİR TIK DAHA İYİ. <span>✳</span></div></main>`;
  document.querySelector('#retryBtn').onclick = () => { state.phase = 'quiz'; state.questionIndex = 0; state.answers = []; state.chosen = null; render(); };
  document.querySelector('#downloadPdf').onclick = downloadStudyPdf;
  document.querySelector('#summaryBtn').onclick = () => { state.phase = 'lesson'; renderLesson(); };
  createIcons();
}

async function downloadStudyPdf() {
  try {
    const [{ default: pdfMake }, { default: virtualFonts }] = await Promise.all([
      import('pdfmake/build/pdfmake.js'),
      import('pdfmake/build/vfs_fonts.js'),
    ]);
    pdfMake.addVirtualFileSystem(virtualFonts);

    const { selected, questions } = state;
    const content = [
      { text: 'DERS CEBİ', style: 'brand' },
      { text: `${selected.language} · KONU ÖZETİ VE ALIŞTIRMALAR`, style: 'title' },
      { text: `Kaynak: ${state.file.name}\nSayfa aralığı: ${selected.start}–${selected.end} · ${new Intl.DateTimeFormat('tr-TR').format(new Date())}`, style: 'meta' },
      { text: 'Konu özeti', style: 'section' },
      { text: selected.summary || 'Özet oluşturulamadı.', style: 'body' },
    ];

    if (selected.topics?.length) {
      content.push({ text: 'Bu sayfalardaki konular', style: 'subsection' });
      selected.topics.forEach(topic => content.push({ text: `•  ${topic}`, style: 'body', margin: [0, 2, 0, 2] }));
    }
    if (selected.keyPoints?.length) {
      content.push({ text: 'Önemli noktalar', style: 'subsection' });
      selected.keyPoints.forEach(point => content.push({ text: `•  ${point}`, style: 'body', margin: [0, 2, 0, 2] }));
    }
    if (selected.warning) content.push({ text: selected.warning, style: 'notice' });

    content.push({ text: 'Kendini dene', style: 'section' });
    questions.forEach((question, index) => {
      content.push({ text: [{ text: `${index + 1}. `, bold: true }, { text: question.question }], style: 'question' });
      question.options.forEach((option, optionIndex) => {
        content.push({ text: `${String.fromCharCode(65 + optionIndex)}.  ${option}`, style: 'option' });
      });
      content.push({ text: ' ', margin: [0, 0, 0, 5] });
    });

    content.push({ text: 'Cevap anahtarı & ipuçları', style: 'section', pageBreak: 'before' });
    questions.forEach((question, index) => {
      const letter = String.fromCharCode(65 + question.answer);
      content.push({ text: `${index + 1}. ${letter}. ${question.options[question.answer]}`, style: 'answer' });
      content.push({ text: question.hint, style: 'hint' });
    });

    if (state.phase === 'result') {
      const score = state.answers.filter(Boolean).length;
      content.splice(3, 0, { text: `Alıştırma sonucu: ${score}/${questions.length} doğru`, style: 'result' });
    }

    const docDefinition = {
      pageSize: 'A4',
      pageMargins: [48, 48, 48, 52],
      defaultStyle: { font: 'Roboto', fontSize: 10, color: '#29342d', lineHeight: 1.35 },
      content,
      styles: {
        brand: { fontSize: 9, bold: true, color: '#60765d', characterSpacing: 1.5, margin: [0, 0, 0, 10] },
        title: { fontSize: 19, bold: true, color: '#29342d', margin: [0, 0, 0, 8] },
        meta: { fontSize: 9, color: '#777d73', lineHeight: 1.5, margin: [0, 0, 0, 18] },
        section: { fontSize: 14, bold: true, color: '#425f47', margin: [0, 14, 0, 8] },
        subsection: { fontSize: 11, bold: true, color: '#566b52', margin: [0, 12, 0, 5] },
        body: { fontSize: 10, lineHeight: 1.5, margin: [0, 0, 0, 8] },
        question: { fontSize: 10, bold: true, lineHeight: 1.4, margin: [0, 7, 0, 4] },
        option: { fontSize: 9.5, margin: [13, 2, 0, 2] },
        answer: { fontSize: 10, bold: true, color: '#425f47', margin: [0, 9, 0, 2] },
        hint: { fontSize: 9, color: '#6f756c', margin: [12, 0, 0, 4] },
        notice: { fontSize: 9, italics: true, color: '#7b7050', margin: [0, 7, 0, 4] },
        result: { fontSize: 11, bold: true, color: '#425f47', margin: [0, 0, 0, 12] },
      },
      footer: (currentPage, pageCount) => ({
        columns: [
          { text: 'Ders Cebi · Kısa tekrar', alignment: 'left' },
          { text: `${currentPage} / ${pageCount}`, alignment: 'right' },
        ],
        fontSize: 8,
        color: '#92968d',
        margin: [48, 18, 48, 0],
      }),
    };

    const safeName = state.file.name.replace(/\.pdf$/i, '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9-]+/gi, '-').replace(/^-|-$/g, '').slice(0, 48) || 'calisma';
    pdfMake.createPdf(docDefinition).download(`ders-cebi-${safeName}.pdf`);
  } catch (error) {
    console.error('PDF export failed:', error);
    alert('PDF oluşturulamadı. Sayfayı yenileyip tekrar dene.');
  }
}

function escapeHtml(value) { return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function escapeRegExp(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
render();



