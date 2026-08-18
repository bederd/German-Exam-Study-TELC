"""
Hören Analysis - Step 1: Precise Track Mapping
Reads the raw text and builds a definitive CD_track -> Kapitel/Aufgabe map.

The book Spektrum Deutsch A1+ uses this notation for CD references:
  - Real CD references appear NEAR instructions containing "Hören" 
  - Footer patterns like "1 11" (Kapitel 1, page 11) should be IGNORED
  - A real CD ref is typically: the line right before/after an instruction line with Hören
"""
import sys, re, os, json
from mutagen.mp3 import MP3

sys.stdout.reconfigure(encoding='utf-8')

RAW_FILE = r'c:\Users\Bedirhan\Desktop\deutsch\a1_raw.txt'
CD1_DIR = r'c:\Users\Bedirhan\Desktop\deutsch\HÖREN\spektrum_a1_cd1'
CD2_DIR = r'c:\Users\Bedirhan\Desktop\deutsch\HÖREN\spektrum_a1_cd2'
OUTPUT_FILE = r'c:\Users\Bedirhan\Desktop\deutsch\scripts\horen_track_map.json'

MIN_DURATION_SECONDS = 60

KAPITEL_PAGES = {
    1: (9, 26), 2: (27, 48), 3: (49, 70), 4: (71, 92),
    5: (93, 112), 6: (113, 132), 7: (133, 152), 8: (153, 172),
    9: (173, 192), 10: (193, 212), 11: (213, 234), 12: (235, 272)
}

def get_kapitel_from_page(page):
    if page is None:
        return None
    for k, (start, end) in KAPITEL_PAGES.items():
        if start <= page <= end:
            return k
    return None

def get_audio_durations():
    durations = {}
    for cd_num, cd_dir in [(1, CD1_DIR), (2, CD2_DIR)]:
        for f in sorted(os.listdir(cd_dir)):
            if f.endswith('.mp3'):
                track_num = int(f.split('_')[0])
                path = os.path.join(cd_dir, f)
                audio = MP3(path)
                durations[(cd_num, track_num)] = {
                    'file': f,
                    'path': path,
                    'duration': audio.info.length
                }
    return durations

def is_horen_instruction(line):
    """Check if a line is a Hören instruction."""
    lower = line.strip().lower()
    horen_keywords = [
        'hören und lesen', 'hören sie', 'hären und lesen',
        'lesen und hören', 'hören und ergänzen', 'hören sie und',
        'hören sie die', 'hören sie den', 'hören sie das',
        'hören sie ein', 'hören sie zur kontrolle',
        'hören sie zuerst', 'hören sie noch',
    ]
    return any(kw in lower for kw in horen_keywords)

def is_page_footer(line, cd_num, track_num, current_page):
    """
    Detect if a '1 11' pattern is actually a page footer, not a CD reference.
    Page footers in Spektrum: kapitel_num page_last_2_digits
    e.g. in Kapitel 11 on page 217: "1 217" appears but also "1 11" for Kapitel 1 on some pages
    """
    # If CD=1 and track matches a kapitel number, be suspicious
    # Actual book pages near this have patterns like:
    #  "zweihundertsiebzehn 1 217" or just page nums
    # Also: kapitel pages use format "Kapitel_num Page_num" at bottom
    
    # Page footers have format: kapitel_number [space] page_number
    # But page numbers are > 8 (first chapter starts at 9)
    # So "1 11" could be CD1 Track 11 OR Kapitel 1 Page 11
    
    # We'll rely on context instead - see if there's a Hören instruction nearby
    return False  # Let context-based filtering handle this

def main():
    with open(RAW_FILE, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    durations = get_audio_durations()
    long_tracks = {k: v for k, v in durations.items() if v['duration'] > MIN_DURATION_SECONDS}
    
    print(f"Total tracks: {len(durations)}")
    print(f"Long tracks (>{MIN_DURATION_SECONDS}s): {len(long_tracks)}")
    
    # List all long tracks for reference
    print("\n=== ALL LONG TRACKS ===")
    for (cd, track), info in sorted(long_tracks.items()):
        print(f"  CD{cd} Track {track:02d}: {info['duration']:.1f}s ({info['duration']/60:.1f}min) - {info['file']}")
    
    # Strategy: Find all "N NN" patterns and determine if they're CD refs
    # by checking if there's a Hören-related instruction within 5 lines
    current_page = None
    found_refs = []
    
    for i, line in enumerate(lines):
        # Track page markers
        m = re.match(r'=+ SAYFA (\d+) =+', line.strip())
        if m:
            current_page = int(m.group(1))
            continue
        
        # Look for potential CD track references
        stripped = line.strip()
        m2 = re.match(r'^([12])\s+(\d{2})$', stripped)
        if not m2:
            continue
        
        cd = int(m2.group(1))
        track = int(m2.group(2))
        
        # Check if this is a long track
        if (cd, track) not in long_tracks:
            continue
        
        # Check context: is there a Hören instruction within 8 lines?
        has_horen_context = False
        instruction_text = ""
        aufgabe_num = None
        exercise_type = "unknown"
        
        # Search ±8 lines for Hören instructions
        for j in range(max(0, i-8), min(len(lines), i+8)):
            if is_horen_instruction(lines[j]):
                has_horen_context = True
                instruction_text = lines[j].strip()
                
                # Classify type
                lower_instr = instruction_text.lower()
                if 'hören und lesen' in lower_instr or 'hären und lesen' in lower_instr or 'lesen und hören' in lower_instr:
                    exercise_type = "horen_und_lesen"
                elif 'hören sie' in lower_instr or 'hören und' in lower_instr:
                    if 'lesen' not in lower_instr:
                        exercise_type = "nur_horen"
                    else:
                        exercise_type = "horen_und_lesen"
                break
        
        # Also check for "CD" nearby which confirms it's a CD reference
        has_cd_marker = False
        for j in range(max(0, i-3), min(len(lines), i+3)):
            if 'CD' in lines[j] and j != i:
                has_cd_marker = True
                break
        
        if not has_horen_context and not has_cd_marker:
            # This is likely a page footer or kapitel marker, skip
            continue
        
        # Find Aufgabe number (look backwards for standalone numbers 1-30)
        for j in range(i-1, max(0, i-12), -1):
            line_j = lines[j].strip()
            # Aufgabe numbers are typically standalone single/double digits
            m3 = re.match(r'^(\d{1,2})$', line_j)
            if m3:
                num = int(m3.group(1))
                if 1 <= num <= 30:
                    aufgabe_num = num
                    break
            # Also check for "Aufgabe X" pattern
            m4 = re.search(r'Aufgabe\s+(\d+)', line_j)
            if m4:
                aufgabe_num = int(m4.group(1))
                break
        
        # Find section title (look backwards for a title-like line)
        section_title = ""
        for j in range(i-1, max(0, i-8), -1):
            line_j = lines[j].strip()
            # Section titles are typically longer text without special patterns
            if (len(line_j) > 5 and 
                not re.match(r'^\d+$', line_j) and 
                not re.match(r'^[12]\s+\d{2}$', line_j) and
                not re.match(r'^=+ SAYFA', line_j) and
                not is_horen_instruction(lines[j]) and
                not re.match(r'^[a-c]\s+', line_j) and
                'Spektrum Deutsch' not in line_j):
                section_title = line_j
                break
        
        kapitel = get_kapitel_from_page(current_page)
        dur_info = long_tracks[(cd, track)]
        
        # Get text content after the instruction (for horen_und_lesen exercises)
        text_after = []
        if exercise_type == "horen_und_lesen":
            collecting = False
            for j in range(i+1, min(len(lines), i+40)):
                l = lines[j].strip()
                if is_horen_instruction(lines[j]):
                    collecting = True
                    continue
                if collecting:
                    if re.match(r'^=+ SAYFA', l):
                        continue
                    if re.match(r'^[12]\s+\d{2}$', l):
                        break
                    if re.match(r'^\d{1,2}$', l) and int(l) <= 30:
                        break
                    if l and len(l) > 3:
                        text_after.append(l)
                    if len(text_after) >= 15:
                        break
            # If we didn't start collecting, try from right after CD ref
            if not text_after:
                for j in range(i+1, min(len(lines), i+40)):
                    l = lines[j].strip()
                    if re.match(r'^=+ SAYFA', l) or re.match(r'^[12]\s+\d{2}$', l):
                        continue
                    if l and len(l) > 10 and not l.startswith('CD'):
                        text_after.append(l)
                    if len(text_after) >= 15:
                        break
        
        # For nur_horen, get the question/instruction that follows
        questions_after = []
        if exercise_type == "nur_horen":
            for j in range(i+1, min(len(lines), i+30)):
                l = lines[j].strip()
                if re.match(r'^=+ SAYFA', l):
                    continue
                if l and len(l) > 5:
                    questions_after.append(l)
                if len(questions_after) >= 10:
                    break
        
        entry = {
            'cd': cd,
            'track': track,
            'kapitel': kapitel,
            'aufgabe': aufgabe_num,
            'page': current_page,
            'line_in_raw': i + 1,
            'duration_sec': round(dur_info['duration'], 1),
            'duration_min': round(dur_info['duration'] / 60, 1),
            'file': dur_info['file'],
            'file_path': dur_info['path'],
            'exercise_type': exercise_type,
            'instruction': instruction_text,
            'section_title': section_title,
            'text_content': '\n'.join(text_after) if text_after else '',
            'questions': '\n'.join(questions_after) if questions_after else '',
            'has_text_in_book': len(text_after) > 0,
        }
        found_refs.append(entry)
    
    # Deduplicate (same CD+track combination)
    seen = set()
    unique_refs = []
    for entry in found_refs:
        key = (entry['cd'], entry['track'])
        if key not in seen:
            seen.add(key)
            unique_refs.append(entry)
    
    # Find long tracks that weren't matched
    matched_tracks = {(e['cd'], e['track']) for e in unique_refs}
    unmatched = {k: v for k, v in long_tracks.items() if k not in matched_tracks}
    
    # Print results
    print(f"\n{'='*100}")
    print(f"MATCHED LONG TRACKS: {len(unique_refs)}")
    print(f"{'='*100}")
    
    for entry in sorted(unique_refs, key=lambda x: (x['cd'], x['track'])):
        type_emoji = {"horen_und_lesen": "📖", "nur_horen": "🎧", "unknown": "❓"}
        emoji = type_emoji.get(entry['exercise_type'], '❓')
        print(f"\n{emoji} CD{entry['cd']} Track {entry['track']:02d} | Kap.{entry['kapitel']} Aufg.{entry['aufgabe']} | p.{entry['page']} | {entry['duration_min']}min")
        print(f"   📝 {entry['instruction']}")
        print(f"   📋 Section: {entry['section_title']}")
        if entry['text_content']:
            preview = entry['text_content'][:150].replace('\n', ' ')
            print(f"   📄 Text preview: {preview}...")
        if entry['questions']:
            preview = entry['questions'][:150].replace('\n', ' ')
            print(f"   ❓ Questions: {preview}...")
    
    print(f"\n{'='*100}")
    print(f"UNMATCHED LONG TRACKS: {len(unmatched)}")
    print(f"{'='*100}")
    for (cd, track), info in sorted(unmatched.items()):
        print(f"  CD{cd} Track {track:02d}: {info['duration']:.1f}s ({info['duration']/60:.1f}min)")
    
    # Summary
    hul = [e for e in unique_refs if e['exercise_type'] == 'horen_und_lesen']
    nh = [e for e in unique_refs if e['exercise_type'] == 'nur_horen']
    unk = [e for e in unique_refs if e['exercise_type'] == 'unknown']
    
    print(f"\n--- SUMMARY ---")
    print(f"📖 Hören und Lesen: {len(hul)}")
    print(f"🎧 Nur Hören: {len(nh)}")
    print(f"❓ Unknown: {len(unk)}")
    print(f"❌ Unmatched: {len(unmatched)}")
    
    # Save
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump({
            'matched': unique_refs,
            'unmatched': [{'cd': k[0], 'track': k[1], 'file': v['file'], 'duration_sec': round(v['duration'], 1)} for k, v in sorted(unmatched.items())]
        }, f, ensure_ascii=False, indent=2)
    
    print(f"\nSaved to {OUTPUT_FILE}")

if __name__ == '__main__':
    main()
