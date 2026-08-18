# DeutschFit Multi-Agent Data Processing Pipeline

Bu doküman, ham dil öğrenim verilerini (PDF'den çıkarılmış JSON'lar) DeutschFit mobil uygulamasına uygun mikro-öğrenim formatına çeviren **Çoklu-Ajan (Multi-Agent)** pipeline yapısını açıklamaktadır.

Bu dosyadaki talimatları gelecekte yeni veriler (A2, B1 vb.) için "DeutschFit pipeline'ını çalıştır" diyerek doğrudan uygulayabilirsiniz.

## 1. Veri Hazırlığı (Raw Data)
Elimizdeki ham veri (örneğin `a2_raw_texts_with_questions.json`) metin + orijinal kitap sorularından oluşur.

## 2. Pipeline Adımları

### Adım 1: Batch Filtering (Filtreleme Ajanları)
- **Amaç:** Sadece gerçek "Lesetext" (Okuma metni) olan verileri ayıklamak. Dilbilgisi kuralları, sözlük listeleri gibi gereksiz blokları elemek.
- **Yöntem:**
  - `batch_filter_agent` adında subagent'lar oluşturulur. Model olarak **flash** (verimlilik için) kullanılır.
  - Veri `b1.json`, `b2.json` gibi batch'lere (20'li gruplar) bölünür.
  - Her bir subagent, kendi JSON dosyasını okuyup `Lesetext` olanları `true`, diğerlerini `false` olarak sınıflandırarak temiz bir JSON döner.
- **Sonuç:** `valid_lesetexts.json` oluşturulur.

### Adım 2: Batch Chunking (Parçalara Ayırma Ajanları)
- **Amaç:** Uzun okuma metinlerini mobil uygulama için uygun olan 20-80 kelimelik kısa parçalara (chunk) bölmek.
- **Yöntem:**
  - `batch_chunker_agent` adında subagent'lar oluşturulur.
  - `valid_lesetexts.json` verisi `c1.json`, `c2.json` gibi parçalara ayrılır (5'li veya 10'lu gruplar).
  - Subagent'lar, cümleleri ortadan bölmeden mantıksal bir bütünlük içinde chunk'lar oluşturur (Örn: `id: "78-1"`, `text: "..."`).
- **Sonuç:** `all_chunks.json` dosyasına yazılır.

### Adım 3: Batch Question Generation (Soru Üretim Ajanları)
- **Amaç:** Elde edilen her bir chunk için DeutschFit formatına uygun, tam metne bağlı 3 adet soru üretmek (1x Çoktan Seçmeli "mc", 2x Doğru/Yanlış "rf").
- **Yöntem:**
  - `batch_question_generator_agent` subagent'ları devreye sokulur. Model olarak **flash** seçilir.
  - `all_chunks.json` dosyası `q1.json`, `q2.json` gibi 10'ar chunk'lık parçalara (batch) bölünür.
  - Aynı anda 15-20 paralel ajan çalıştırılır. Ajanlar metni okur ve JSON array formatında `fragen` (sorular) listesi döner.
- **Sonuç:** Ajanlardan gelen JSON verileri toplanır.

### Adım 4: Veri Birleştirme (Aggregation)
- **Amaç:** Ajanlardan gelen JSON yanıtlarını ana veri formatına entegre etmek.
- **Yöntem:**
  - AI ajanının (benim) doğrudan context sistemine düşen loglar, Python betiği (örn: `ext_fragen.py`) ile okunur ve çıkarılır (`all_fragen.json`).
  - Çıkarılan sorular `all_chunks.json` ile `chunk_id` üzerinden eşleştirilir.
  - Sonuç `app/data/a1.json` (veya ilgili seviye) formatına dökülerek uygulama veritabanına hazır hale getirilir.

## 3. Subagent Yönetimi Kuralları (ÖNEMLİ)
- **Kill All:** Her bir adım tamamlandığında `manage_subagents` aracı ile `Action: "kill_all"` çağrılarak arka planda biriken ajanlar MUTLAKA sonlandırılmalıdır. Bu bellek ve API tasarrufu sağlar.
- **JSON Encoding:** Python ile dosya yazarken ve okurken her zaman `ensure_ascii=False` ve `encoding='utf-8'` kullanılmalıdır (Almanca karakterler `ä, ö, ü, ß` bozulmamalıdır).

## Gelecek Görevler İçin Otomatik Talimat
Bana yeni bir seviye için "DeutschFit pipeline'ını A2 verisi için çalıştır" dediğinizde bu belgedeki 4 adımı otomatik olarak Python scriptleri ve paralel subagent'lar (flash modeli) kullanarak uygulayacağım.
