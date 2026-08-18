import json
import os
import shutil
import sqlite3

JSON_FILE = 'data/horen_a1.json'
AUDIO_SRC_DIR = 'HÖREN'
AUDIO_DEST_DIR = 'app/audio/a1'
DB_PATH = 'data/deutschfit.db'

def find_audio_file(filename):
    for root, dirs, files in os.walk(AUDIO_SRC_DIR):
        if filename in files:
            return os.path.join(root, filename)
    return None

def main():
    if not os.path.exists(AUDIO_DEST_DIR):
        os.makedirs(AUDIO_DEST_DIR)
        
    with open(JSON_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    # Check if table exists
    cur.execute("SELECT count(name) FROM sqlite_master WHERE type='table' AND name='hoeren_texte'")
    if cur.fetchone()[0] == 0:
        print("hoeren_texte table does not exist!")
        return
        
    # We will clear existing 'hoeren_texte' for level='a1' if we want a fresh start, 
    # but the user said "entegre edelim". Let's delete existing a1 hoeren to prevent duplicates.
    cur.execute("DELETE FROM hoeren_texte WHERE level='a1'")
    conn.commit()

    copied_count = 0
    for ex in data:
        audio_file = ex.get('audio_file')
        src_path = find_audio_file(audio_file)
        if src_path:
            dest_path = os.path.join(AUDIO_DEST_DIR, audio_file)
            if not os.path.exists(dest_path):
                shutil.copy2(src_path, dest_path)
            copied_count += 1
            
            # DB Web path
            web_audio_path = f'/audio/a1/{audio_file}'
        else:
            print(f"Warning: Audio {audio_file} not found!")
            web_audio_path = None
            
        # Insert into hoeren_texte
        cur.execute("""
            INSERT INTO hoeren_texte (level, kontext, text, audio) 
            VALUES (?, ?, ?, ?)
        """, ('a1', ex.get('titel', 'Dinleme'), ex.get('text', ''), web_audio_path))
        
        text_id = cur.lastrowid
        
        # Insert fragen
        for q in ex.get('fragen', []):
            typ = q.get('type')
            frage_str = q.get('question')
            antwort = q.get('answer')
            optionen = json.dumps(q.get('options', []), ensure_ascii=False) if q.get('options') else None
            
            db_typ = ''
            aussage = None
            if typ == 'multiple_choice':
                db_typ = 'mc'
            elif typ == 'true_false':
                db_typ = 'rf'
                aussage = frage_str
                frage_str = None
            elif typ == 'write_sentence':
                db_typ = 'mc' # We will treat write_sentence as mc for now, wait, the DB schema might not have write_sentence. But we can just store it as 'text'. Let's store as 'text'
                db_typ = 'text'
            
            cur.execute("""
                INSERT INTO hoeren_fragen (text_id, typ, frage, aussage, optionen, antwort, erklaerung)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (text_id, db_typ, frage_str, aussage, optionen, antwort, ''))

    conn.commit()
    conn.close()
    
    print(f"Migration complete. Inserted {len(data)} exercises.")
    print(f"Copied {copied_count} audio files to {AUDIO_DEST_DIR}.")

if __name__ == '__main__':
    main()
