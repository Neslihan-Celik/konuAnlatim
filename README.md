# Ders Cebi

Herhangi bir ders PDF'inde sayfa aralığı seçip kısa özet ve mini quiz oluşturmayı deneyebileceğiniz çalışma alanı. İlk odak Rusça öğrenimi; ders dili seçilebilir ve üretim PDF içeriğine göre yapılır.

## Başlatma

1. Node.js 20+ kurulu olsun.
2. Proje klasöründe `npm.cmd install` çalıştır.
3. `npm.cmd run dev` çalıştır ve terminalde verilen yerel adresi aç.

PDF metni çıkarımı tarayıcıda yapılır; PDF dosyasının kendisi yüklenmez. Taranmış, görüntü tabanlı PDF'ler henüz OCR ile okunmaz.

## Ücretsiz yerel yapay zekâ

1. Ollama'yı [ollama.com](https://ollama.com) adresinden kurup aç.
2. Proje klasöründeki terminalde `ollama run qwen2.5:3b` komutunu çalıştır. Model ilk seferinde indirilir.
3. Vite sunucusunu `npm.cmd run dev` ile başlat. PDF metni yerel Ollama modeline gönderilir; başka bir servise yüklenmez.

## Telefon ve bilgisayarda açma

Bilgisayarda verilen `localhost` adresini aç. Telefon ve bilgisayar aynı Wi-Fi ağına bağlıyken, bilgisayarın yerel IPv4 adresini bul (`ipconfig` komutundaki IPv4 Address) ve telefonda `http://BILGISAYAR-IP:5173` adresini aç. Vite başka bir port (ör. 5174) seçtiyse o portu kullan. Gerekirse Windows Güvenlik Duvarı'nda Node.js için özel ağ erişimine izin ver. Ollama bilgisayarda açık kalmalıdır.

Uygulama, seçilen PDF sayfalarının metnini özet ve quiz üretmesi için yerel modele yollar. Üretim seçilen öğrenme diline göre yapılır; PDF/kitap içeriğine sabitlenmez. Modelden gelen soru ve seçenekler biçim açısından doğrulanır. Çıktıyı kullanan kişi doğruluğunu gözden geçirmelidir. Ollama kapalıysa veya seçilen sayfalarda yeterli metin yoksa uygulama içerik uydurmak yerine açık hata verir.
