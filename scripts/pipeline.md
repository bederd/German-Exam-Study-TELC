# DeutschFit Veri İşleme ve Soru Üretim Pipeline'ı

Bu belge, metinlerin standart formata getirilmesi (diyalogların ayrıştırılması, OCR hatalarının düzeltilmesi vs.) ve eksik soruların üretilmesi için kurulan otonom ajans (subagent) yapısını açıklar. Başka bir oturumda "Pipeline'ı çalıştır" diyerek bu belgeyi referans gösterebilirsiniz.

## 1. Veri Analizi ve Temizliği (Data Cleaning)
Uygulamamızdaki metinler `data/deutschfit.db` (SQLite) dosyasında bulunur.
Pipeline'ın ilk adımı, veritabanını tarayarak eksik veya hatalı yapıları bulmak ve anlamsız metinleri temizlemektir:
- **Kalitesiz Metinlerin Temizlenmesi:** İçinde `___`, `...` gibi boşluk doldurma işaretleri veya madde imleri (`1.`, `2.`) bulunduran anlamsız kısa metinlerin tespit edilip silinmesi (bunun için `scripts/clean_data.py` kullanılır).
- **Eksik Sorular:** `fragen` dizisinde 3'ten az soru bulunan okuma metinlerinin tespit edilmesi.
- **Diyalog Formatı Hataları:** Diyalog içeren metinlerde konuşmacı isimlerinin (örn. `Kellner:`, `Kunde:`) eksik olması veya metnin düz yazı gibi birleşik olması.
- **OCR ve Karakter Hataları (YENİ):** PDF kopyalamasından kaynaklanan bozuk karakterlerin (`~mas`, `1 ~~~mund`, eksik ä/ö/ü vb.) tespit edilmesi.
- **Eksik Bağlam/Özne (YENİ):** Sorularda adı geçen ancak metin parçalandığı için metinde hiç geçmeyen (örn. sadece 'Ich' veya 'Er' yazan) isimlerin tespit edilmesi.

## 2. Ajan (Subagent) Organizasyonu
Sorunlu metinler tespit edildikten sonra, büyük veriyi işleyebilmek için görevler alt ajanlara (subagent) bölünür:

### Ajan Türleri ve Rolleri:
1. **Araştırmacı Ajan (research / orchestrator):** SQLite veritabanını okur, tespit edilen sorunlu metinleri küçük gruplara (batch) böler (örn: 20 metinlik `batch_0.json` dosyaları).
2. **Görev Dağıtıcı Ajan:** Bölünen metin gruplarını işlemek üzere birden fazla paralel `self` (veya özel olarak tanımlanmış, örn: `german_proofreader`) ajana gönderir.
3. **İşleyici (Worker) Ajanlar:**
   - **Soru Üretici (Question Generator):** Kendisine verilen metni analiz eder. Eğer yeterli soru yoksa, mevcut metnin bağlamından ve dil seviyesinden yola çıkarak eksik soruları (`typ`, `frage/aussage`, `optionen`, `antwort`, `erklaerung`) üretir.
   - **Diyalog Düzenleyici (Dialogue Formatter):** Diyalog metinlerini okur, bağlamdan konuşan kişileri tahmin eder ve her cümlenin başına konuşmacı adını (`İsim: ...`) ekleyerek metni yapılandırır.
   - **Alman Dil Uzmanı (German Proofreader / Filter):**
     1. **Metin Filtreleme (YENİ):** Veritabanındaki metinlerin gerçekten bir okuma parçası (hikaye, diyalog, paragraf vb.) olup olmadığını kontrol eder. Sadece kelime listesi veya kalıp ifadelerden (Redemittel) oluşan anlamsız metinleri veritabanından silinmek üzere işaretler.
     2. **OCR Düzeltme:** Metinleri ve soruları okur. OCR karakter hatalarını anlamsal olarak düzeltir (örn. `~mas` -> `Thomas`).
     3. **Bağlam Ekleme:** Eksik olan bağlamı/özneyi cümlenin başına ekler (örn. `Thomas: Ich bin...`).

## 3. Çalışma Mantığı ve Prompts (Talimatlar)
İşleyici ajanlara gönderilen prompt'lar çok net olmalıdır. Örnek prompt taslağı (OCR / Proofreader için):
> "Sen bir Alman dil uzmanısın. Sana JSON formatında okuma metinleri ve sorularını veriyorum. Metinlerdeki OCR hatalarını (1 n Deutschland -> In Deutschland vb.) düzelt. Eğer sorularda bir isim geçiyorsa ancak metin sadece 'Ich' ile başlıyorsa, bu ismi metnin başına 'Thomas: Ich...' şeklinde ekle. Çıktıyı SADECE JSON dizisi olarak dön."

## 4. Sonuçların Birleştirilmesi
Tüm alt ajanlar görevlerini tamamlayıp JSON formatında çıktılarını döndürdüğünde, ana ajan (Antigravity):
- Çıktıları toplar.
- Hatalı JSON varsa düzeltir.
- Üretilen yeni metinleri veya soruları orijinal `data/deutschfit.db` veritabanına `UPDATE` komutları ile kalıcı olarak kaydeder.

## Kısayol Talimatı
Gelecekteki oturumlarda sadece şu komutu vermeniz yeterlidir:
**"Daha önce scripts/pipeline.md dosyasında anlaştığımız veri işleme pipeline'ını A2 (veya B1) seviyesi için çalıştır. Eksik soruları tamamla, diyalogları formatla ve OCR/Eksik İsim (Proofreader) ajanını kullanarak veritabanını temizle."**
