# DeutschFit Veri Madenciliği (Data Mining) Pipeline
Bu belge, herhangi bir Almanca ders kitabından (PDF) otomatik olarak TELC formatında okuma parçaları (Lesen) ve sorular çıkarıp uygulamaya (PWA) eklemek için kullanılacak **standart çalışma prosedürüdür**.

**Herhangi bir yapay zeka ajanı bu belgeyi okuduğunda, aşağıdaki adımları sırasıyla uygulamalıdır:**

## Aşama 1: PDF'ten Ham Metin Çıkarımı
**Amaç:** Görsel PDF dosyasını, YZ'nin ve Python scriptlerinin okuyabileceği düz bir metne dönüştürmek.
- **Komut:** `python 1_pdf_to_text.py --input PDFLER/[KITAP_ADI].pdf --output [seviye]_raw.txt`
- **Ajan Notu:** Eğer karakter (Unicode/emoji) sorunları çıkarsa script içindeki `print` ifadelerinden emojileri temizle.

## Aşama 2: Heuristik Metin ve Soru Blokları Tespiti
**Amaç:** Koca kitabın içindeki "sadece" okuma parçalarını ve o okuma parçasının altındaki kitabın orjinal hazır sorularını (Richtig/Falsch, Çoktan Seçmeli vs.) yakalamak.
- **Komut:** `python 2a_extract_raw_texts.py --input [seviye]_raw.txt --output [seviye]_raw_texts_with_questions.json`
- **Mantık:** Script; "Lesen Sie", "Lesen und hören Sie", "Eine E-Mail" gibi anahtar kelimeleri arar. Tespit ettiğinde, tamamen farklı bir bölüme (Örn: Grammatik, Wortschatz, Phonetik vb.) gelene kadar o metni ve altındaki soru bloğunu BÜTÜN bir paket olarak çeker. 100 karakterden kısa (sadece gramer olan) blokları eler.

## Aşama 3: Yapay Zeka ile Akıllı Ayrıştırma (G4F Entegrasyonu)
**Amaç:** 2. Aşamadan çıkan ham "metin + soru" bloklarını inceleyip; metni temizlemek, kitapta varsa orjinal soruları (a,b,c veya D/Y) JSON'a aktarmak, yoksa A2/B1 formatında yeni sorular üretmek.
- **Komut:** `python 2b_process_with_ai.py`
  *(Not: Kodun içinde `input_file` ve `output_file` değişkenlerini ilgili seviyeye göre güncellemeyi unutma, örn: `b1_raw_texts_with_questions.json` -> `b1_final.json`)*
- **Model:** Bu script hiçbir API key gerektirmeyen `g4f` kütüphanesini kullanır. 
- **Çıktı Formatı:**
```json
{
  "titel": "Metin başlığı",
  "text": "Okuma parçası metni",
  "quelle": "Spektrum Deutsch",
  "fragen": [
    {"typ": "rf", "aussage": "...", "antwort": "richtig", "erklaerung": "..."}
  ]
}
```

## Aşama 4: Uygulama Veritabanına Enjeksiyon
**Amaç:** Tüm testlerden geçmiş ve JSON formatına dönüştürülmüş metinleri ana PWA (Web App) uygulamasının veri havuzuna eklemek.
- **Komut:** `python 3_merge_to_app.py --input [seviye]_final.json --level [seviye]`
- **İşlem:** Script, mevcut verileri silmez, yenilerini üstüne ekler. Güvenlik için eski verilerin `.bak` uzantılı yedeğini alır.

---
**YZ AJANINA TALİMAT:** 
Kullanıcı sana *"Şu PDF için metinleri çıkar"* dediğinde; kesinlikle kendi hafızanı kullanarak veya metni chat üzerinden tek tek okuyarak soru üretmeye çalışma. Yalnızca bu belgedeki 4 adımlı Pipeline'ı sırasıyla işlet. Mümkünse arka plan görevlerini (background tasks) kullan.
