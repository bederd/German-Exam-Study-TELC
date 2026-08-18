import sqlite3
import re
import json
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'deutschfit.db')

conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
rows = conn.execute('SELECT t.id, t.text, f.frage, f.aussage FROM lesen_texts t JOIN lesen_fragen f ON t.id = f.text_id').fetchall()

suspects = {}
for row in rows:
    text_id = row['id']
    if text_id not in suspects:
        suspects[text_id] = {'id': text_id, 'text': row['text'], 'fragen': []}
    
    q = row['frage'] or row['aussage']
    if q:
        suspects[text_id]['fragen'].append(q)

final_suspects = []
for text_id, data in suspects.items():
    text = data['text']
    fragen_text = ' '.join(data['fragen'])
    
    is_suspect = False
    
    # OCR errors
    if re.search(r'[~^_|\\]', text) or re.search(r'\b1\b', text) or 'z. B. ;' in text or '' in text or 'Universitt' in text or 'grte' in text:
        is_suspect = True
    
    # Missing names
    if not is_suspect:
        words = re.findall(r'\b[A-ZÖÄÜ][a-zöäüß]+\b', fragen_text)
        for w in words:
            if w not in text and len(w) > 3 and w not in ['Warum', 'Was', 'Wer', 'Wie', 'Woher', 'Wohin', 'Welche', 'Welcher', 'Welches', 'Wann', 'Wieso', 'Welchen']:
                is_suspect = True
                break
                
    if is_suspect:
        final_suspects.append(data)

print(f'Total suspect texts: {len(final_suspects)}')
with open(os.path.join(os.path.dirname(__file__), 'suspects.json'), 'w', encoding='utf-8') as f:
    json.dump(final_suspects, f, ensure_ascii=False, indent=2)
