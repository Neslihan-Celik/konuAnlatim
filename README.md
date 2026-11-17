# Ders Cebi

Herhangi bir ders PDF'inde sayfa aralığı seçip kısa özet ve mini quiz oluşturmayı deneyebileceğiniz çalışma alanı. İlk odak Rusça öğrenimi; ders dili seçilebilir ve üretim PDF içeriğine göre yapılır.

## Başlatma

1. Node.js 20+ kurulu olsun.
2. Proje klasöründe `npm.cmd install` çalıştır.
3. `npm.cmd run dev` çalıştır ve terminalde verilen yerel adresi aç.

PDF metni çıkarımı tarayıcıda yapılır; PDF dosyasının kendisi yüklenmez. Taranmış, görüntü tabanlı PDF'ler henüz OCR ile okunmaz.

## Canlı Netlify kurulumu

Canlı sitede yerel Ollama adresi kullanılamaz; Netlify sunucusu senin bilgisayarına erişemez. Üretimde Netlify Function, Gemini API üzerinden kısa özet ve quiz üretir.

1. Google AI Studio'dan ücretsiz Gemini API anahtarı al: [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
2. Netlify site ayarlarında **Environment variables** bölümüne `GEMINI_API_KEY` adında değişken ekle ve anahtarını değer olarak kaydet. Anahtarı istemci koduna veya GitHub'a koyma.
3. `GEMINI_API_KEY` ekledikten veya değiştirdikten sonra yeni bir production deploy başlat. Deploy, Netlify Function'a yeni değeri aktarır; `netlify.toml` ise `/api/generate` çağrılarını Function'a yönlendirir.

Ücretsiz Gemini API kotası sınırlıdır ve değişebilir. Ücretsiz katmanda gönderilen içerik Google ürünlerini geliştirmek için kullanılabilir; öğrenci verisi veya paylaşım izni olmayan telifli kitap sayfalarıyla kullanmadan önce Google AI Studio şartlarını incele.

## Yerel geliştirme için Ollama

1. Ollama'yı [ollama.com](https://ollama.com) adresinden kurup aç.
2. Proje klasöründeki terminalde `ollama run qwen2.5:3b` komutunu çalıştır. Model ilk seferinde indirilir.
3. Vite sunucusunu `npm.cmd run dev` ile başlat. PDF metni yerel Ollama modeline gönderilir; başka bir servise yüklenmez.

## Telefon ve bilgisayarda açma

Bilgisayarda verilen `localhost` adresini aç. Telefon ve bilgisayar aynı Wi-Fi ağına bağlıyken, bilgisayarın yerel IPv4 adresini bul (`ipconfig` komutundaki IPv4 Address) ve telefonda `http://BILGISAYAR-IP:5173` adresini aç. Vite başka bir port (ör. 5174) seçtiyse o portu kullan. Gerekirse Windows Güvenlik Duvarı'nda Node.js için özel ağ erişimine izin ver. Ollama bilgisayarda açık kalmalıdır.

Yerelde geliştirme sunucusu PDF metnini Ollama'ya yollar; canlı Netlify sürümü ise yapılandırılmış Gemini Function'ını kullanır. Her iki akışta da üretim seçilen öğrenme diline ve PDF içeriğine dayanır. Modelden gelen soru ve seçenekler biçim açısından doğrulanır; pedagojik doğruluk garanti edilmez. Taranmış görsel PDF'lerde henüz OCR yoktur.
