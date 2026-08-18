import sys
import os
import re
import json
import fitz
from mutagen.mp3 import MP3

sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = r"c:\Users\Bedirhan\Desktop\deutsch"
CD1_DIR = os.path.join(ROOT_DIR, "HÖREN", "spektrum_a1_cd1")
CD2_DIR = os.path.join(ROOT_DIR, "HÖREN", "spektrum_a1_cd2")
A1_PDF = os.path.join(ROOT_DIR, "PDFLER", "A1.pdf")
A1_RAW = os.path.join(ROOT_DIR, "a1_raw.txt")
LOSUNGEN_PDF = os.path.join(ROOT_DIR, "PDFLER", "Spektrum_A1_LöSungen_03_2020.pdf")

OUTPUT_JSON = os.path.join(ROOT_DIR, "data", "horen_a1.json")
OUTPUT_REPORT = os.path.join(ROOT_DIR, "data", "horen_analysis_report.md")

MIN_DURATION = 60

KAPITEL_PAGES = {
    1: (9, 26), 2: (27, 48), 3: (49, 70), 4: (71, 92),
    5: (93, 112), 6: (113, 132), 7: (133, 152), 8: (153, 172),
    9: (173, 192), 10: (193, 212), 11: (213, 234), 12: (235, 272)
}

def get_long_tracks():
    tracks = {}
    for cd_num, cd_dir in [(1, CD1_DIR), (2, CD2_DIR)]:
        if not os.path.exists(cd_dir): continue
        for f in sorted(os.listdir(cd_dir)):
            if f.endswith(".mp3"):
                m = re.match(r"^(\d+)_", f)
                if m:
                    track_num = int(m.group(1))
                    path = os.path.join(cd_dir, f)
                    try:
                        audio = MP3(path)
                        dur = audio.info.length
                        if dur > MIN_DURATION:
                            tracks[(cd_num, track_num)] = {
                                "file": f,
                                "path": path,
                                "duration_sec": dur
                            }
                    except Exception as e:
                        print(f"Error reading {f}: {e}")
    return tracks

def extract_hortexte_from_losungen():
    doc = fitz.open(LOSUNGEN_PDF)
    page_texts = [doc[p].get_text() for p in range(len(doc))]
    full_text = "\n".join(page_texts)
    
    kapitel_map = {
        (2,3): 1, (3,5): 2, (5,7): 3, (7,8): 4, (9,10): 5, (11,12): 6,
        (13,14): 7, (15,16): 8, (17,19): 9, (19,20): 10, (21,23): 11, (24,26): 12, (27,28): 13
    }
    
    pattern = r"(?:(\d+|Ü\d+)\s*\n\s*)?(?:[a-c]\)\s*)?Transkription\s+Hörtext(?:e)?:\s*(.+?)(?=\n(?:(?:\d+|Ü\d+)\s*\n\s*)?(?:[a-c]\)\s*)?Transkription|\nVertiefungsteil|\nAbschlusstest|\nÜbungstest|\nTeil 1|\nKapitel|\nTeil 2|\nTeil 3|\n\d+\s*\n\s*(?:[a-c]\)\s*)?Transkription|\Z)"
    
    hortexte = []
    for match in re.finditer(pattern, full_text, flags=re.DOTALL):
        aufgabe_str = match.group(1)
        titel = match.group(2).split('\n')[0].strip()
        
        content_start = match.start(2) + len(match.group(2).split('\n')[0])
        content_raw = full_text[content_start:match.end()].strip()
        
        lines = []
        for line in content_raw.split('\n'):
            line = line.strip()
            if re.match(r'^\d+$', line) and len(line) <= 3:
                continue
            if line:
                lines.append(line)
        content = " ".join(lines)
        
        match_start_index = match.start()
        curr_len = 0
        page_num = 1
        for pt in page_texts:
            curr_len += len(pt) + 1
            if match_start_index < curr_len:
                break
            page_num += 1
            
        kapitel = None
        for (start, end), k in kapitel_map.items():
            if start <= page_num <= end:
                kapitel = k
                break
                
        hortexte.append({
            "kapitel": kapitel,
            "aufgabe": aufgabe_str,
            "titel": titel,
            "text": content,
            "losungen_page": page_num
        })
        
    return hortexte

def is_coherent_text(text):
    sentences = re.split(r'[.!?|]', text)
    sentences = [s.strip() for s in sentences if len(s.strip()) > 10]
    
    if len(sentences) < 3:
        return False
    
    coherence_words = ['er ', 'sie ', 'es ', 'dann ', 'danach ', 'aber ', 
                       'und ', 'auch ', 'dort ', 'hier ', 'deshalb ', 
                       'zuerst ', 'wir ', 'ich ']
    text_lower = text.lower()
    coherence_score = sum(text_lower.count(w) for w in coherence_words)
    
    is_dialog = bool(re.search(r'\w+:\s+.+\|', text))
    word_count = len(text.split())
    
    return (coherence_score >= 3 and word_count >= 50) or is_dialog

def extract_track_refs_from_pdf():
    # Read from a1_raw.txt which has better OCR for track numbers than fitz on A1.pdf
    raw_path = 'a1_raw.txt'
    with open(raw_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    refs = []
    current_page = None
    kapitel = None
    
    KAPITEL_PAGES = {
        1: (9, 26), 2: (27, 48), 3: (49, 70), 4: (71, 92),
        5: (93, 112), 6: (113, 132), 7: (133, 152), 8: (153, 172),
        9: (173, 192), 10: (193, 212), 11: (213, 234), 12: (235, 272)
    }
    
    for i, line in enumerate(lines):
        m_page = re.match(r'=+\s*SAYFA\s+(\d+)\s*=+', line.strip())
        if m_page:
            current_page = int(m_page.group(1))
            kapitel = None
            for k, (start, end) in KAPITEL_PAGES.items():
                if start <= current_page <= end:
                    kapitel = k
                    break
            continue
            
        m_track = re.search(r'\b([12])[ \t]+(\d{2})\b', line)
        if m_track:
            cd, track = int(m_track.group(1)), int(m_track.group(2))
            if track > 70 or track < 1:
                continue
                
            if kapitel and cd == 1 and track == kapitel:
                continue
                
            ctx_start = max(0, i - 15)
            ctx_end = min(len(lines), i + 15)
            ctx_lines = lines[ctx_start:ctx_end]
            text_context = ''.join(ctx_lines)
            
            refs.append({
                "cd": cd,
                "track": track,
                "kapitel": kapitel,
                "page": current_page,
                "text_context": text_context
            })
            
    return refs

def main():
    long_tracks = get_long_tracks()
    hortexte = extract_hortexte_from_losungen()
    track_refs = extract_track_refs_from_pdf()
    
    with open(A1_RAW, 'r', encoding='utf-8') as f:
        raw_lines = f.readlines()
        
    results = []
    report_lines = ["# Hören Analysis Report\n"]
    matched_tracks = set()
    
    for ht in hortexte:
        k = ht['kapitel']
        a_str = ht['aufgabe']
        title = ht['titel']
        text = ht['text']
        
        k_refs = [r for r in track_refs if r['kapitel'] == k]
        best_match = None
        
        for ref in k_refs:
            if (ref['cd'], ref['track']) not in long_tracks:
                continue
            ctx = ref['text_context'].replace('\n', ' ')
            if a_str and re.search(r'\b' + re.escape(a_str) + r'\b', ctx):
                best_match = ref
                break
            title_words = [w for w in title.split() if len(w) > 4]
            if title_words and sum(1 for w in title_words if w in ctx) >= 2:
                best_match = ref
                break
                
        if best_match:
            cd, track = best_match['cd'], best_match['track']
            dur = long_tracks[(cd, track)]
            
            item = {
                "id": f"horen_a1_k{k}_a{a_str or 'X'}",
                "kapitel": k,
                "aufgabe": a_str,
                "titel": title,
                "typ": "nur_horen",
                "audio_file": dur['file'],
                "audio_cd": cd,
                "audio_track": track,
                "duration_sec": dur['duration_sec'],
                "text": text,
                "fragen": [],
                "quelle": f"Spektrum Deutsch A1+, Kapitel {k}, Aufgabe {a_str or 'X'}"
            }
            results.append(item)
            matched_tracks.add((cd, track))
            
            report_lines.append(f"## ✅ [NUR HÖREN] CD{cd} Track {track:02d} | Kapitel {k} Aufgabe {a_str}")
            report_lines.append(f"**Titel:** {title}")
            report_lines.append(f"**Süre:** {dur['duration_sec']:.1f}s")
            report_lines.append(f"**Metin:** {text[:150]}...\n")
    
    for (cd, track), dur in long_tracks.items():
        if (cd, track) in matched_tracks:
            continue
            
        refs = [r for r in track_refs if r['cd'] == cd and r['track'] == track]
        if not refs:
            report_lines.append(f"## ❌ [UNMATCHED] CD{cd} Track {track:02d}")
            report_lines.append(f"**Süre:** {dur['duration_sec']:.1f}s")
            report_lines.append("**Sebep:** Kitapta referansı bulunamadı.\n")
            continue
            
        ref = refs[0]
        k = ref['kapitel']
        ctx = ref['text_context']
        is_hul = 'hören und lesen' in ctx.lower() or 'lesen und hören' in ctx.lower()
        
        if is_hul:
            text_extracted = ""
            start_collecting = False
            lines_collected = []
            pg = 0
            
            for line in raw_lines:
                m = re.match(r'=+ SAYFA (\d+) =+', line)
                if m:
                    pg = int(m.group(1))
                    
                if f"{cd} {track:02d}" in line or ('hören und lesen' in line.lower() and ref['page']-2 <= pg <= ref['page']+2):
                    start_collecting = True
                    continue
                    
                if start_collecting:
                    if re.match(r'=+ SAYFA', line) or re.match(r'^[12]\s+\d{2}$', line.strip()) or re.match(r'^\d+\s*$', line.strip()):
                        if len(lines_collected) > 5:
                            break
                    if line.strip() and len(line.strip()) > 5:
                        lines_collected.append(line.strip())
                    if len(lines_collected) > 30:
                        break
                        
            text_extracted = " ".join(lines_collected)
            
            if is_coherent_text(text_extracted):
                item = {
                    "id": f"horen_a1_k{k}_track{track}",
                    "kapitel": k,
                    "aufgabe": "",
                    "titel": f"Hören und Lesen (Kapitel {k})",
                    "typ": "horen_und_lesen",
                    "audio_file": dur['file'],
                    "audio_cd": cd,
                    "audio_track": track,
                    "duration_sec": dur['duration_sec'],
                    "text": text_extracted,
                    "fragen": [],
                    "quelle": f"Spektrum Deutsch A1+, Kapitel {k}"
                }
                results.append(item)
                matched_tracks.add((cd, track))
                
                report_lines.append(f"## ✅ [HÖREN UND LESEN] CD{cd} Track {track:02d} | Kapitel {k}")
                report_lines.append(f"**Süre:** {dur['duration_sec']:.1f}s")
                report_lines.append(f"**Metin:** {text_extracted[:150]}...\n")
            else:
                report_lines.append(f"## ⏭️ [ATLANDI] CD{cd} Track {track:02d} | Kapitel {k}")
                report_lines.append(f"**Süre:** {dur['duration_sec']:.1f}s")
                report_lines.append("**Sebep:** Rastgele cümleler tespit edildi.")
                report_lines.append(f"**Önizleme:** {text_extracted[:150]}...\n")
        else:
            report_lines.append(f"## ⏭️ [ATLANDI] CD{cd} Track {track:02d} | Kapitel {k}")
            report_lines.append(f"**Süre:** {dur['duration_sec']:.1f}s")
            report_lines.append("**Sebep:** 'Hören und Lesen' değil ve Lösungen'de yok.\n")
            
    with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
        
    with open(OUTPUT_REPORT, 'w', encoding='utf-8') as f:
        f.write("\n".join(report_lines))

if __name__ == '__main__':
    main()
