"""
wort_search.py — Almanca Kelime Kitap Arama Motoru
# -*- coding: utf-8 -*-
=========================================================
Kullanım:
  python wort_search.py --word "Haus"      --type isim      --batch 0
  python wort_search.py --word "gehen"     --type fiil      --batch 0 --forms "geht,ging,gegangen,gehen,gehe,gehst"
  python wort_search.py --word "groß"      --type sıfat     --batch 0
  python wort_search.py --word "mit"       --type preposition --batch 0

Çıktı:
  JSON — { "sentences": [...], "total_found": N, "batch_start": X, "batch_end": Y, "sources": [...] }
"""

import re
import os
import sys
import json
import argparse

# Windows konsolunda UTF-8 çıktısı için
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# ─── Kitap txt dosyaları ────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

BOOK_FILES = [
    ("A1", os.path.join(BASE_DIR, "a1_raw.txt")),
    ("A2", os.path.join(BASE_DIR, "a2_raw.txt")),
    ("B1_part1", os.path.join(BASE_DIR, "b1_1_raw.txt")),
    ("B1_part2", os.path.join(BASE_DIR, "b1_2_raw.txt")),
    ("B1_part3", os.path.join(BASE_DIR, "b1_3_raw.txt")),
]

# ─── PDF → TXT otomatik dönüşüm ─────────────────────────────────────────────
PDF_MAP = {
    "a1_raw.txt": os.path.join(BASE_DIR, "PDFLER", "A1.pdf"),
    "a2_raw.txt": os.path.join(BASE_DIR, "PDFLER", "A2.pdf"),
    "b1_1_raw.txt": os.path.join(BASE_DIR, "PDFLER", "B1 (1).pdf"),
    "b1_2_raw.txt": os.path.join(BASE_DIR, "PDFLER", "B1 (2).pdf"),
    "b1_3_raw.txt": os.path.join(BASE_DIR, "PDFLER", "B1 (3).pdf"),
}

def ensure_txt_files():
    """Eksik txt dosyalarını PDF'den otomatik oluşturur."""
    try:
        import fitz
    except ImportError:
        print("[WARN] PyMuPDF bulunamadı. B1 kitapları dönüştürülemez.", file=sys.stderr)
        return

    for txt_name, pdf_path in PDF_MAP.items():
        txt_path = os.path.join(BASE_DIR, txt_name)
        if not os.path.exists(txt_path):
            if os.path.exists(pdf_path):
                print(f"[INFO] {txt_name} bulunamadı, {pdf_path} dönüştürülüyor...", file=sys.stderr)
                doc = fitz.open(pdf_path)
                with open(txt_path, 'w', encoding='utf-8') as f:
                    for i in range(len(doc)):
                        page = doc.load_page(i)
                        text = page.get_text("text")
                        if text.strip():
                            f.write(f"\n\n{'='*20} SAYFA {i+1} {'='*20}\n\n")
                            f.write(text)
                print(f"[OK] {txt_name} oluşturuldu.", file=sys.stderr)
            else:
                print(f"[WARN] {pdf_path} bulunamadı, atlanıyor.", file=sys.stderr)


# ─── Sayfa bilgisi çıkar ────────────────────────────────────────────────────
PAGE_PATTERN = re.compile(r'={10,}\s*SAYFA\s+(\d+)\s*={10,}')

def load_book_with_pages(filepath):
    """
    Txt dosyasını yükler, her karaktere hangi sayfada olduğunu etiketler.
    Returns: list of (page_number, text_chunk) tuples
    """
    if not os.path.exists(filepath):
        return []

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    segments = []
    last_page = 1
    last_pos = 0

    for m in PAGE_PATTERN.finditer(content):
        if m.start() > last_pos:
            segments.append((last_page, content[last_pos:m.start()]))
        last_page = int(m.group(1))
        last_pos = m.end()

    if last_pos < len(content):
        segments.append((last_page, content[last_pos:]))

    return segments


# ─── Cümle çıkarıcı ─────────────────────────────────────────────────────────
# Cümle sonu belirteçleri: . ! ? — çok kısa kırpmaları önlemek için min uzunluk
SENTENCE_END = re.compile(r'(?<=[.!?])\s+(?=[A-ZÜÖÄ\-"„])')

def extract_sentences_from_chunk(text):
    """Bir metin parçasından tam cümleleri çıkarır."""
    # Satır sonlarını boşlukla birleştir (PDF'den gelen kırpmalara karşı)
    text = re.sub(r'\n+', ' ', text)
    text = re.sub(r'\s{2,}', ' ', text)

    # Nokta/soru/ünlem sınırlarında böl
    raw_sentences = SENTENCE_END.split(text)

    sentences = []
    for s in raw_sentences:
        s = s.strip()
        # Minimum 15 karakter, Almanca harf içermeli
        if len(s) < 15:
            continue
        if not re.search(r'[a-zA-Z\u00c4\u00d6\u00dc\u00e4\u00f6\u00fc\u00df]', s):
            continue
        # PDF artefaktlarını filtrele: çok fazla garip karakter içeren satırları atla
        # (normal metinlerde harf oranı yüksek olmalı)
        letter_count = len(re.findall(r'[a-zA-Z\u00c4\u00d6\u00dc\u00e4\u00f6\u00fc\u00df]', s))
        if letter_count / max(len(s), 1) < 0.4:
            continue
        # Temizle: PDF'ten gelen garip unicode sembolleri kaldır
        s_clean = re.sub(r'[\u25aa\u25ab\u25cf\u25cb\u2022\u2023\u2013\u2014\u00b7]', '', s)
        s_clean = re.sub(r'\s{2,}', ' ', s_clean).strip()
        if len(s_clean) >= 15:
            sentences.append(s_clean)
    return sentences


# ─── Ana arama fonksiyonu ────────────────────────────────────────────────────
def build_search_patterns(word, word_type, extra_forms=None):
    """
    Kelime türüne göre arama regex pattern listesi oluşturur.
    Daha kapsamlı eşleşme için kelime sınırları kullanılır.
    """
    patterns = []
    word_lower = word.lower()
    word_cap   = word[0].upper() + word[1:] if word else word

    if word_type == "isim":
        # İsim: büyük harfli ve küçük harfli halleri, yaygın durum ekleri
        variants = {word_cap, word_lower}
        # Durum ekleri: -s, -es, -n, -en (Genitiv, Dativ çoğul vb.)
        for suffix in ("s", "es", "n", "en", "e", "er"):
            variants.add(word_cap + suffix)
        patterns = [re.compile(r'\b' + re.escape(v) + r'\b', re.IGNORECASE) for v in variants]

    elif word_type == "fiil":
        # Fiil: infinitif + ekstra formlar (varsa)
        variants = {word_lower}
        # Temel ekler
        stem = word_lower
        if stem.endswith("en"):
            stem = stem[:-2]
        elif stem.endswith("n"):
            stem = stem[:-1]

        for ending in ("e", "st", "t", "en", "et", "te", "test", "tet", "ten"):
            variants.add(stem + ending)

        # Perfekt: ge + stem (düzenli)
        variants.add("ge" + stem + "t")
        variants.add("ge" + stem + "en")

        if extra_forms:
            for f in extra_forms.split(","):
                variants.add(f.strip().lower())

        patterns = [re.compile(r'\b' + re.escape(v) + r'\b', re.IGNORECASE) for v in variants]

    elif word_type == "sıfat":
        variants = {word_lower}
        stem = word_lower
        # Temel çekim ekleri
        for suffix in ("e", "en", "er", "es", "em"):
            if not word_lower.endswith(suffix):
                variants.add(stem + suffix)
            # eğer zaten -e ile bitiyorsa (z.B. groß→große)
        # Özel: ß→ss (ör: groß → größ...)
        if "ß" in stem:
            alt = stem.replace("ß", "ss")
            for suffix in ("", "e", "en", "er", "es", "em"):
                variants.add(alt + suffix)

        if extra_forms:
            for f in extra_forms.split(","):
                variants.add(f.strip().lower())

        patterns = [re.compile(r'\b' + re.escape(v) + r'\b', re.IGNORECASE) for v in variants]

    elif word_type == "preposition":
        # Preposition: tam eşleşme (sınır önemli)
        patterns = [re.compile(r'\b' + re.escape(word_lower) + r'\b', re.IGNORECASE)]

    else:
        # Genel arama
        patterns = [re.compile(r'\b' + re.escape(word_lower) + r'\b', re.IGNORECASE)]

    return patterns


def search_books(word, word_type, batch_start=0, batch_size=20, extra_forms=None):
    """
    Tüm kitaplarda arama yapar, tam cümleleri döndürür.
    """
    ensure_txt_files()

    patterns = build_search_patterns(word, word_type, extra_forms)
    all_results = []
    seen_sentences = set()

    for book_name, filepath in BOOK_FILES:
        if not os.path.exists(filepath):
            continue
        segments = load_book_with_pages(filepath)
        for page_num, chunk in segments:
            sentences = extract_sentences_from_chunk(chunk)
            for sentence in sentences:
                if any(p.search(sentence) for p in patterns):
                    key = sentence[:60].lower().strip()
                    if key not in seen_sentences:
                        seen_sentences.add(key)
                        all_results.append({
                            "sentence": sentence,
                            "book": book_name,
                            "page": page_num
                        })

    total = len(all_results)
    batch_end = min(batch_start + batch_size, total)
    batch = all_results[batch_start:batch_end]

    return {
        "word": word,
        "word_type": word_type,
        "total_found": total,
        "batch_start": batch_start,
        "batch_end": batch_end,
        "has_more": batch_end < total,
        "sources": batch,
        "sentences": [r["sentence"] for r in batch]
    }


def targeted_search(search_for_list, context_word, batch_size=20):
    """
    Subagentin 'search_for' listesindeki kesin formlari arar.
    Her form icin ayri sonuclar doner — hangi form hangi cumlelerde gecmis gorunur.

    Args:
        search_for_list: list[str]  — orn: ["gegangen", "ging", "ins", "im"]
        context_word: str           — ana kelime (log icin)
        batch_size: int             — her form icin max kac cumle

    Returns:
        dict: {
            "context_word": str,
            "results_by_form": {
                "gegangen": [{sentence, book, page}, ...],
                "ging":     [{sentence, book, page}, ...],
                ...
            },
            "combined": [{sentence, book, page, matched_form}, ...]  # tum benzersiz cumleler
        }
    """
    ensure_txt_files()

    results_by_form = {}
    seen_global = set()
    combined = []

    for form in search_for_list:
        form = form.strip()
        if not form:
            continue

        # Her form icin kesin word-boundary eslesme
        pattern = re.compile(r'\b' + re.escape(form) + r'\b', re.IGNORECASE)
        form_results = []

        for book_name, filepath in BOOK_FILES:
            if not os.path.exists(filepath):
                continue
            segments = load_book_with_pages(filepath)
            for page_num, chunk in segments:
                sentences = extract_sentences_from_chunk(chunk)
                for sentence in sentences:
                    if pattern.search(sentence):
                        key = sentence[:60].lower().strip()
                        if key not in seen_global:
                            seen_global.add(key)
                            entry = {"sentence": sentence, "book": book_name, "page": page_num}
                            form_results.append(entry)
                            combined.append({**entry, "matched_form": form})
                        if len(form_results) >= batch_size:
                            break
                if len(form_results) >= batch_size:
                    break

        results_by_form[form] = form_results
        print(f"[targeted] '{form}' -> {len(form_results)} cumle bulundu", file=sys.stderr)

    return {
        "context_word": context_word,
        "results_by_form": results_by_form,
        "combined": combined
    }


# ─── CLI ────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Almanca Kitap Arama Motoru")
    parser.add_argument("--word",     required=True,  help="Ana kelime")
    parser.add_argument("--type",     default="genel", help="isim / fiil / sıfat / preposition")
    parser.add_argument("--batch",    type=int, default=0, help="Batch başlangıç indeksi")
    parser.add_argument("--size",     type=int, default=20, help="Batch büyüklüğü")
    parser.add_argument("--forms",    default=None, help="Ek formlar (virgülle ayrılmış)")
    parser.add_argument("--targeted", default=None,
                        help="Hedefli arama modu: virgülle ayrılmış kesin formlar. "
                             "Örn: --targeted 'gegangen,ging'")

    args = parser.parse_args()

    if args.targeted:
        # Hedefli mod: subagentin search_for listesindeki formlari ara
        forms = [f.strip() for f in args.targeted.split(",") if f.strip()]
        result = targeted_search(
            search_for_list=forms,
            context_word=args.word,
            batch_size=args.size
        )
    else:
        result = search_books(
            word=args.word,
            word_type=args.type,
            batch_start=args.batch,
            batch_size=args.size,
            extra_forms=args.forms
        )

    print(json.dumps(result, ensure_ascii=False, indent=2))
