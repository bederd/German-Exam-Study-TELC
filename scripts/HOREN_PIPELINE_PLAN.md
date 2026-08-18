# Hören Egzersizleri Analiz & Filtreleme Sistemi — Final Plan

> **Bu plan başka bir AI modelin doğrudan implement edebileceği şekilde yazılmıştır.**
> Tüm araştırma tamamlandı, dosya yolları, formatlar ve stratejiler kesinleştirildi.

---

## 1. Proje Bağlamı

**Uygulama:** DeutschFit — Offline PWA, Almanca dil pratiği (Vanilla JS/CSS)  
**Kitap:** Spektrum Deutsch A1+ (Schubert Verlag)  
**Amaç:** Kitaptaki audio track'lerden anlamlı dinleme egzersizlerini tespit et, metinleri ve soruları çıkar, uygulama verisi olarak kaydet.

### Dosya Haritası

| Kaynak | Yol | Boyut | Açıklama |
|---|---|---|---|
| Audio CD1 | `HÖREN/spektrum_a1_cd1/` | 70 MP3 | `01_spektrum_a1-1.mp3` ... `70_spektrum_a1-1.mp3` |
| Audio CD2 | `HÖREN/spektrum_a1_cd2/` | 60 MP3 | `01_spektrum_a1-2.mp3` ... `60_spektrum_a1-2.mp3` |
| Kitap PDF | `PDFLER/A1.pdf` | 238 MB | 272 sayfa, OCR sorunlu |
| Kitap Raw Text | `a1_raw.txt` | 621 KB | PDF→txt çıktısı, `=== SAYFA X ===` marker'lı |
| **Lösungen PDF** | `PDFLER/Spektrum_A1_LöSungen_03_2020.pdf` | 1.3 MB | **28 sayfa**, tüm Hörtexte transcript'leri burada |
| Mevcut analiz | `scripts/horen_track_map.json` | — | İlk analiz sonuçları (14 eşleşme) |
| Mevcut script | `scripts/horen_analysis.py` | — | İlk analiz scripti (referans için) |

### Kapitel → Sayfa Aralıkları

| Kapitel | Sayfa | Konu |
|---|---|---|
| 1 | 9-26 | Hallo und guten Tag |
| 2 | 27-48 | Beruf und Familie |
| 3 | 49-70 | In der Stadt |
| 4 | 71-92 | Von morgens bis abends |
| 5 | 93-112 | Essen und Trinken |
| 6 | 113-132 | Gestern und heute |
| 7 | 133-152 | Unterwegs |
| 8 | 153-172 | Was man so braucht |
| 9 | 173-192 | Arbeit, Probleme, Termine |
| 10 | 193-212 | Freizeit und Gesundheit |
| 11 | 213-234 | Wohnen |
| 12 | 235-272 | Ein Wochenende in Berlin |

### Lösungen PDF → Kapitel Eşleştirmesi

| Lösungen Sayfası | Kapitel |
|---|---|
| 2-3 | 1 (Hallo und guten Tag) |
| 3-5 | 2 (Beruf und Familie) |
| 5-7 | 3 (In der Stadt) |
| 7-8 | 4 (Von morgens bis abends) |
| 9-10 | 5 (Essen und Trinken) |
| 11-12 | 6 (Gestern und heute) |
| 13-14 | 7 (Unterwegs) |
| 15-16 | 8 (Was man so braucht) |
| 17-19 | 9 (Arbeit, Probleme, Termine) |
| 19-20 | 10 (Freizeit und Gesundheit) |
| 21-23 | 11 (Wohnen) |
| 24-26 | 12 (Ein Wochenende in Berlin) |
| 27-28 | Übungstest Start Deutsch 1 |

---

## 2. Kritik Keşifler (Araştırmadan Çıkan)

### 2.1 Lösungen PDF = Altın Madeni
Lösungen PDF'inde **HER "nur Hören" egzersizinin tam transcript'i** `Transkription Hörtext: [Başlık]` formatında mevcut. Örnek:

```
Transkription Hörtext: Wer macht was?
1. Das ist Tiago. Tiago kommt aus Portugal. Er wohnt in Lissabon...

Transkription Hörtext: Ein Telefongespräch mit Frau Müller
Frau Müller: Müller. | Herr Gruber: Ja, guten Tag...

Transkription Hörtexte: Durchsagen
1. Willkommen in Berlin Hauptbahnhof...
```

**Format özellikleri:**
- Başlık: `Transkription Hörtext: [İsim]` veya `Transkription Hörtexte: [İsim]`
- Bazen önünde Aufgabe numarası var (ör: `12\n\nTranskription Hörtext: ...`)
- Dialog formatı: Konuşmacılar `|` ile ayrılmış
- Birden fazla metin: Numaralandırılmış (ör: `1. Das Basler Rheinschwimmen | ...`)

### 2.2 Raw Text'teki CD Referans Sorunları

Raw text'te (`a1_raw.txt`) CD track referansları `[CD_NUM] [TRACK_NUM]` formatında (ör: `1 68` = CD1 Track 68). **AMA:**

- **Kapitel 10-12 bölgesinde `1 10`, `1 11`, `1 12` sayfa footer'ları** CD referanslarıyla karışıyor (Kapitel numarası + kısa sayfa numarası)
- **CD2 referansları çok eksik** — OCR sadece 5 adet bulmuş: `2 21`, `2 27`, `2 28`, `2 31`, `2 53`
- Raw text'te eşleştirme yaparken **mutlaka yakın satırlarda "Hören" instruction'ı olmalı** (yoksa sayfa footer'ı)

### 2.3 Audio Track İstatistikleri

- Toplam track: **130** (CD1: 70, CD2: 60)
- **1 dakikadan uzun: 63 track** (CD1: 32, CD2: 31)
- İlk analizde raw text'ten eşleşen: **14 track** (7 Hören und Lesen + 7 nur Hören)
- Eşleşmeyen: **50 track** — bunlar için PDF'ten çıkarım gerekli

---

## 3. Implementasyon Stratejisi

### 3 Katmanlı Yaklaşım

```
Katman 1: Lösungen PDF'den TÜM Hörtexte'leri çıkar
    ↓
Katman 2: A1.pdf + a1_raw.txt'den CD track → Kapitel/Aufgabe haritası oluştur
    ↓  
Katman 3: Audio süreleri + Hörtext'ler + Aufgabe bilgileri birleştir → karar ver
```

---

## 4. Adım Adım Implementasyon

### Adım 1: Lösungen PDF'den Hörtexte Çıkarma

**Lib:** `PyMuPDF (fitz)` — zaten yüklü  
**Dosya:** `PDFLER/Spektrum_A1_LöSungen_03_2020.pdf` (28 sayfa)

**Yapılacak:**
1. Tüm 28 sayfayı `fitz` ile oku
2. `Transkription Hörtext:` ve `Transkription Hörtexte:` pattern'lerini bul
3. Her birinin:
   - **Aufgabe numarasını** çıkar (genellikle hemen önündeki satırdaki sayı)
   - **Başlığını** çıkar (`:` sonrası)
   - **Tam metnini** çıkar (bir sonraki `Transkription` veya Aufgabe numarasına kadar)
   - **Kapitel numarasını** belirle (sayfadan veya `Kapitel X` başlığından)
4. Sonucu bir dict'e kaydet: `{ kapitel: { aufgabe: { titel, text } } }`

**Regex pattern:**
```python
import re
pattern = r'(?:(\d+)\s*\n\s*)?(?:[a-c]\)\s*)?Transkription\s+Hörtext(?:e)?:\s*(.+?)(?=\n\d+\s*\n\s*(?:[a-c]\)\s*)?Transkription|Vertiefungsteil|Abschlusstest|Übungstest|\Z)'
```

**Beklenen çıktı — Bulunan Hörtexte listesi (araştırmadan):**

| Lösungen Sayfa | Kapitel | Aufgabe | Hörtext Başlığı |
|---|---|---|---|
| 2 | 1 | 11 | Wer macht was? |
| 7 | 4 | 22 | Ein Telefongespräch mit Frau Müller |
| 9 | 5 | 9 | Im Restaurant |
| 11 | 6 | 4 | Bürogespräche |
| 13 | 7 | 12 | Durchsagen |
| 13 | 7 | 16 | Endlich Urlaub! |
| 15 | 8 | 10 | Ein Gespräch am Freitagabend |
| 15 | 8 | 12 | Einkaufen |
| 16 | 8 | Ü9 | Umfrage |
| 17 | 9 | 3 | Probleme, Probleme |
| 17 | 9 | 6 | Einen Termin vereinbaren |
| 17 | 9 | 13 | Dialoge |
| 19 | 10 | 4 | Freizeit |
| 21 | 11 | 7 | Die Wohnung von Eva |
| 22 | 11 | 15 | Wegbeschreibung |
| 22 | 11 | 16 | In einer WG wohnen |
| 23 | 12 | 8 | Auf der Party von Klaus |
| 24 | 12 | 16 | Veranstaltungen in den deutschsprachigen Ländern |
| 24 | 12 | 19 | Aktuelles aus Berlin |
| 25 | 12 | Ü2 | Tiergarten Schönbrunn in Wien |
| 25 | 12 | Ü4 | Wie war die Party? |
| 26-27 | Test | Teil 1-3 | Übungstest Hörtexte |

### Adım 2: A1.pdf'den Track-Aufgabe Haritası

**Amaç:** Her sayfadaki CD track referansını (ör: küçük `1 68` veya `2 21` ikonu) bulmak.

**Yöntem 1 — PDF'den doğrudan (önerilir):**
```python
import fitz
doc = fitz.open(r'PDFLER/A1.pdf')
for page_num in range(8, 272):  # Sayfa 9-272 arası
    page = doc[page_num]
    text = page.get_text()
    # CD referanslarını ara
    for m in re.finditer(r'\b([12])\s+(\d{2})\b', text):
        cd, track = int(m.group(1)), int(m.group(2))
        # Geçerlilik kontrolü: track 1-70 arası olmalı
        if 1 <= track <= 70:
            # Bu sayfadaki diğer bağlamla birlikte kaydet
            ...
```

**Yöntem 2 — Raw text'ten (yedek, kısmi sonuç verir):**
Mevcut `scripts/horen_analysis.py` scriptindeki mantık kullanılabilir. Raw text'te `[12] \d{2}` pattern'ini ararken **±8 satır içinde "Hören/hören" kelimesi olmalı** kuralıyla sayfa footer'ları filtrelenir.

> [!IMPORTANT]
> A1.pdf 238 MB ve taramak uzun sürebilir. Sadece Kapitel 7-12 sayfaları (133-272) taranabilir çünkü Kapitel 1-6 zaten raw text'ten başarıyla eşleştirildi.

### Adım 3: Track Eşleştirme

Her Hörtexte transcript'ini bir CD track'iyle eşleştir. Eşleştirme mantığı:

1. **Lösungen'deki Aufgabe numarası** → raw text/PDF'de aynı Aufgabe'nin yanındaki CD track referansı
2. **Lösungen'deki başlık** → raw text'te aynı başlığı ara (ör: "Ein Treffen auf der Straße")
3. **Kapitel + Aufgabe numarası** → o Kapitel'deki en yakın CD track

### Adım 4: İçerik Sınıflandırma — Karar Ağacı

Her eşleşen track için şu karar ağacını uygula:

```
1. Track süresi > 60 saniye mi?
   └─ Hayır → ATLA (kısa egzersiz)
   └─ Evet → devam

2. Lösungen'de bu track'in Transkription'u var mı?
   └─ Evet → bu bir "nur Hören" egzersizi, metin Lösungen'den
   └─ Hayır → devam

3. Raw text'te "Hören und lesen" instruction'ı var mı?
   └─ Evet → metin kitapta mevcut, raw text'ten çıkar
   └─ Hayır → belirsiz, atla

4. Metin içerik analizi: PARAGRAF mı, RASTGELE CÜMLELER mi?
```

#### Paragraf vs Rastgele Cümleler Tespiti

**Paragraf işaretleri (KAYDET):**
- 3+ cümle birbirine bağlı (zamirler: er, sie, es önceki cümleye referans)
- Bağlaçlar: und, aber, dann, danach, zuerst, auch, dort, deshalb
- Ortak bir konu/hikaye akışı
- Dialog formatı (Konuşmacı: metin | Konuşmacı: metin)
- Toplam metin uzunluğu > 50 kelime

**Rastgele cümleler işaretleri (ATLA):**
- Her satır farklı bağımsız konu
- Kelime listeleri, tekil sözcükler
- Sayı, harf, telaffuz egzersizleri (ör: "sch [ʃ] • Schweden • die Schweiz")
- Tablo/form tamamlama egzersizleri
- "Sprechen Sie die Zahlen" gibi mekanik tekrar

**Heuristik kontrol:**
```python
def is_coherent_text(text):
    sentences = re.split(r'[.!?|]', text)
    sentences = [s.strip() for s in sentences if len(s.strip()) > 10]
    
    if len(sentences) < 3:
        return False
    
    # Bağlaç/zamir yoğunluğu
    coherence_words = ['er ', 'sie ', 'es ', 'dann ', 'danach ', 'aber ', 
                       'und ', 'auch ', 'dort ', 'hier ', 'deshalb ', 
                       'zuerst ', 'wir ', 'ich ']
    text_lower = text.lower()
    coherence_score = sum(text_lower.count(w) for w in coherence_words)
    
    # Dialog formatı (| ayracı ile konuşmacı adları)
    is_dialog = bool(re.search(r'\w+:\s+.+\|', text))
    
    word_count = len(text.split())
    
    return (coherence_score >= 3 and word_count >= 50) or is_dialog
```

### Adım 5: Sonuçları Kaydetme

**İki tür çıktı:**

#### A) Hören und Lesen (metin kitapta var)
```json
{
  "id": "horen_a1_k3_15",
  "kapitel": 3,
  "aufgabe": 15,
  "titel": "Im Hotel",
  "typ": "horen_und_lesen",
  "audio_file": "36_spektrum_a1-1.mp3",
  "audio_cd": 1,
  "audio_track": 36,
  "duration_sec": 89.1,
  "text": "Guten Tag. Herzlich willkommen im Hotel Europa...",
  "fragen": [],
  "quelle": "Spektrum Deutsch A1+, Kapitel 3, Aufgabe 15"
}
```

#### B) Nur Hören (metin Lösungen'den + sorular kitaptan)
```json
{
  "id": "horen_a1_k9_3",
  "kapitel": 9,
  "aufgabe": 3,
  "titel": "Probleme, Probleme",
  "typ": "nur_horen",
  "audio_file": "..._spektrum_a1-2.mp3",
  "audio_cd": 2,
  "audio_track": "...",
  "duration_sec": 161.7,
  "text": "Sabine: Hallo, Petra. | Petra: Hallo, Sabine. Wie war es gestern...",
  "fragen": [
    {
      "typ": "rfn",
      "frage": "Sabine hat die Dokumente übersetzt.",
      "optionen": ["richtig", "falsch"],
      "antwort": "richtig"
    }
  ],
  "quelle": "Spektrum Deutsch A1+, Kapitel 9, Aufgabe 3"
}
```

**Çıktı dosyaları:**
- `data/horen_a1.json` — uygulamaya hazır veriler
- `data/horen_analysis_report.md` — her track için kabul/red raporu

---

## 5. Mevcut İlk Analiz Sonuçları (Referans)

İlk analizde raw text'ten başarıyla eşleştirilen **14 long track:**

### Hören und Lesen (7 adet) — metin kitapta var
| CD | Track | Kap | Aufg | Süre | Section | Karar |
|---|---|---|---|---|---|---|
| 1 | 11 | 1 | — | 1.0m | Länder und Sprachen | ❌ Kelime listesi |
| 1 | 36 | 3 | — | 1.5m | Im Hotel | ✅ Dialog |
| 1 | 41 | 4 | 1 | 1.0m | Wer macht was am Montag? | ⚠️ İncele |
| 1 | 50 | 4 | — | 2.4m | Tagesabläufe | ✅ Paragraf |
| 1 | 58 | 5 | 3 | 2.1m | So essen Sie gesund | ⚠️ Kelime listesi olabilir |
| 1 | 64 | 5 | 5 | 2.8m | Süße Leckereien | ✅ Paragraf |
| 2 | 28 | 9 | 8 | 1.3m | Das Datum | ⚠️ Kısa dialog |

### Nur Hören (7 adet) — metin Lösungen'de
| CD | Track | Kap | Aufg | Süre | Section | Karar |
|---|---|---|---|---|---|---|
| 1 | 10 | 1 | — | 2.3m | Wer macht was? | ✅ Lösungen'de transcript var |
| 1 | 15 | 1 | — | 1.1m | — | ⚠️ İncele |
| 1 | 19 | 2 | 7 | 1.5m | Wortakzent | ❌ Telaffuz egzersizi |
| 1 | 26 | 2 | — | 1.2m | Zahlen | ❌ Sayı tekrarı |
| 1 | 33 | 3 | 9 | 2.1m | Ein Treffen auf der Straße | ✅ Dialog |
| 2 | 21 | 8 | — | 1.8m | Einkaufen | ✅ Dialog, Lösungen'de transcript var |
| 2 | 53 | 12 | — | 2.4m | Veranstaltungen | ✅ Metin, Lösungen'de transcript var |

---

## 6. Oluşturulacak Dosyalar

### 1. `scripts/horen_pipeline.py` — Ana Script

```python
"""
Hören Pipeline — Orchestrates the entire analysis.
Reads: audio files, a1_raw.txt, A1.pdf, Lösungen PDF
Writes: data/horen_a1.json, data/horen_analysis_report.md
"""

# Pseudo-code:
# 1. get_long_tracks() — mutagen ile >60s track'leri filtrele
# 2. extract_hortexte_from_losungen() — Lösungen PDF'den transcript'leri çıkar
# 3. build_track_aufgabe_map() — raw text + PDF'den track→aufgabe haritası
# 4. match_hortexte_to_tracks() — transcript'leri audio track'lerle eşleştir
# 5. extract_book_texts() — "Hören und Lesen" için kitap metnini çıkar
# 6. classify_content() — paragraf mı, rastgele mi karar ver
# 7. extract_questions() — raw text'ten soruları çıkar
# 8. save_results() — JSON + rapor yaz
```

### 2. `data/horen_a1.json` — Çıktı

Uygulamanın mevcut schema'sıyla uyumlu:
```json
[
  {
    "id": "horen_a1_k3_a9",
    "titel": "Ein Treffen auf der Straße",
    "text": "...",
    "quelle": "Spektrum A1+, Kapitel 3, Aufgabe 9",
    "fragen": [...]
  }
]
```

### 3. `data/horen_analysis_report.md` — Analiz Raporu

Her track için:
- Kapitel, Aufgabe, süre
- Sınıflandırma (paragraf/rastgele/dialog)
- Karar (KAYDET/ATLA) ve gerekçe
- Metin önizleme

---

## 7. Bağımlılıklar

Tümü zaten yüklü:
- `mutagen` — MP3 süre ölçümü ✅
- `PyMuPDF (fitz)` — PDF metin çıkarma ✅
- `json`, `re`, `os` — stdlib ✅

---

## 8. Doğrulama Planı

1. Lösungen'den çıkan Hörtext sayısı ≥ 20 olmalı
2. Her kabul edilen entry'de `text` alanı boş olmamalı
3. Her entry'nin `audio_file` dosyası gerçekten var olmalı
4. Toplam eşleşen + reddedilen = 63 (tüm long track'ler)
5. JSON schema mevcut `app/data/` formatıyla uyumlu olmalı

---

## 9. Önemli Uyarılar

> [!CAUTION]
> **A1.pdf taraması:** 238 MB PDF. `fitz` ile tüm sayfaları okumak birkaç dakika sürebilir. Sadece gerekli sayfa aralıklarını tara.

> [!IMPORTANT]
> **Raw text'teki `1 10`, `1 11`, `1 12` TUZAĞI:** Bunlar Kapitel 10/11/12'nin sayfa footer'ları, CD referansı DEĞİL. Filtre: yakın satırlarda "Hören" kelimesi yoksa atla.

> [!TIP]
> **En verimli yol:** Önce Lösungen PDF'den TÜM Hörtexte'leri çıkar. Sonra bunları isimle/içerikle raw text'teki Aufgabe'lere eşle. Son olarak Aufgabe'nin yanındaki CD track numarasını bul. Bu sıra en az hata üretir.

> [!NOTE]  
> **Hören und Lesen için:** Raw text'te metin zaten var ama OCR hataları olabilir. Mümkünse A1.pdf'den `fitz` ile aynı sayfaları okuyup daha temiz metin al.
