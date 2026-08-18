"""
build_db.py — DeutschFit JSON → SQLite Migrasyon Scripti
Çalıştır: python build_db.py
"""
import json
import sqlite3
import os

DB_PATH = 'data/deutschfit.db'

def create_schema(conn):
    conn.executescript("""
    CREATE TABLE IF NOT EXISTS lesen_texts (
        id      TEXT PRIMARY KEY,
        level   TEXT NOT NULL,
        titel   TEXT,
        text    TEXT NOT NULL,
        quelle  TEXT
    );

    CREATE TABLE IF NOT EXISTS lesen_fragen (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        text_id     TEXT REFERENCES lesen_texts(id) ON DELETE CASCADE,
        typ         TEXT NOT NULL,
        frage       TEXT,
        aussage     TEXT,
        optionen    TEXT,
        antwort     TEXT NOT NULL,
        erklaerung  TEXT
    );

    CREATE TABLE IF NOT EXISTS grammatik_luecke (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        level       TEXT NOT NULL,
        satz        TEXT NOT NULL,
        optionen    TEXT,
        antwort     TEXT NOT NULL,
        erklaerung  TEXT,
        hinweis     TEXT
    );

    CREATE TABLE IF NOT EXISTS grammatik_konjugation (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        level       TEXT NOT NULL,
        verb        TEXT,
        person      TEXT,
        zeitform    TEXT,
        satz        TEXT NOT NULL,
        optionen    TEXT,
        antwort     TEXT NOT NULL,
        erklaerung  TEXT
    );

    CREATE TABLE IF NOT EXISTS grammatik_satzstellung (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        level       TEXT NOT NULL,
        satz        TEXT NOT NULL,
        woerter     TEXT,
        erklaerung  TEXT
    );

    CREATE TABLE IF NOT EXISTS hoeren_texte (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        level       TEXT NOT NULL,
        kontext     TEXT,
        text        TEXT NOT NULL,
        audio       TEXT
    );

    CREATE TABLE IF NOT EXISTS hoeren_fragen (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        text_id     INTEGER REFERENCES hoeren_texte(id) ON DELETE CASCADE,
        typ         TEXT NOT NULL,
        frage       TEXT,
        aussage     TEXT,
        optionen    TEXT,
        antwort     TEXT NOT NULL,
        erklaerung  TEXT
    );

    CREATE TABLE IF NOT EXISTS schreiben_themen (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        level           TEXT NOT NULL,
        typ             TEXT NOT NULL DEFAULT 'popquiz',
        thema           TEXT NOT NULL,
        kontext         TEXT,
        fragen          TEXT,
        mindestwoerter  INTEGER,
        tipps           TEXT
    );
    """)
    conn.commit()

def migrate_level(conn, level):
    filepath = f'app/data/{level}.json'
    if not os.path.exists(filepath):
        print(f'  [{level}] Dosya bulunamadı, atlanıyor.')
        return

    data = json.load(open(filepath, encoding='utf-8'))

    # --- LESEN ---
    lesen = data.get('lesen', {})
    texts = lesen.get('texts', lesen.get('texte', []))
    lesen_count = 0
    fragen_count = 0
    for t in texts:
        text_id = t.get('id') or f'{level}-{lesen_count}'
        conn.execute(
            "INSERT OR REPLACE INTO lesen_texts (id, level, titel, text, quelle) VALUES (?,?,?,?,?)",
            (text_id, level, t.get('titel'), t.get('text',''), t.get('quelle',''))
        )
        lesen_count += 1
        for f in t.get('fragen', []):
            opts = json.dumps(f.get('optionen'), ensure_ascii=False) if f.get('optionen') else None
            conn.execute(
                "INSERT INTO lesen_fragen (text_id, typ, frage, aussage, optionen, antwort, erklaerung) VALUES (?,?,?,?,?,?,?)",
                (text_id, f.get('typ',''), f.get('frage'), f.get('aussage'), opts, f.get('antwort',''), f.get('erklaerung',''))
            )
            fragen_count += 1
    print(f'  [{level}] Lesen: {lesen_count} metin, {fragen_count} soru')

    # --- GRAMMATIK ---
    grammatik = data.get('grammatik', {})

    luecke_items = grammatik.get('lueckentext', [])
    for item in luecke_items:
        opts = json.dumps(item.get('optionen'), ensure_ascii=False) if item.get('optionen') else None
        conn.execute(
            "INSERT INTO grammatik_luecke (level, satz, optionen, antwort, erklaerung, hinweis) VALUES (?,?,?,?,?,?)",
            (level, item.get('satz',''), opts, item.get('antwort',''), item.get('erklaerung',''), item.get('hinweis',''))
        )

    konj_items = grammatik.get('konjugation', [])
    for item in konj_items:
        opts = json.dumps(item.get('optionen'), ensure_ascii=False) if item.get('optionen') else None
        conn.execute(
            "INSERT INTO grammatik_konjugation (level, verb, person, zeitform, satz, optionen, antwort, erklaerung) VALUES (?,?,?,?,?,?,?,?)",
            (level, item.get('verb'), item.get('person'), item.get('zeitform'), item.get('satz',''), opts, item.get('antwort',''), item.get('erklaerung',''))
        )

    satz_items = grammatik.get('satzstellung', [])
    for item in satz_items:
        woerter = json.dumps(item.get('woerter'), ensure_ascii=False) if item.get('woerter') else None
        conn.execute(
            "INSERT INTO grammatik_satzstellung (level, satz, woerter, erklaerung) VALUES (?,?,?,?)",
            (level, item.get('satz',''), woerter, item.get('erklaerung',''))
        )

    if luecke_items or konj_items or satz_items:
        print(f'  [{level}] Grammatik: {len(luecke_items)} lücke, {len(konj_items)} konj, {len(satz_items)} satz')

    # --- HÖREN ---
    hoeren = data.get('hoeren', {})
    hoeren_texte = hoeren.get('texte', [])
    for ht in hoeren_texte:
        cur = conn.execute(
            "INSERT INTO hoeren_texte (level, kontext, text, audio) VALUES (?,?,?,?)",
            (level, ht.get('kontext',''), ht.get('text',''), ht.get('audio'))
        )
        ht_id = cur.lastrowid
        for f in ht.get('fragen', []):
            opts = json.dumps(f.get('optionen'), ensure_ascii=False) if f.get('optionen') else None
            conn.execute(
                "INSERT INTO hoeren_fragen (text_id, typ, frage, aussage, optionen, antwort, erklaerung) VALUES (?,?,?,?,?,?,?)",
                (ht_id, f.get('typ',''), f.get('frage'), f.get('aussage'), opts, f.get('antwort',''), f.get('erklaerung',''))
            )
    if hoeren_texte:
        print(f'  [{level}] Hören: {len(hoeren_texte)} metin')

    # --- SCHREIBEN ---
    schreiben = data.get('schreiben', {})
    themen = schreiben.get('themen', [])
    for th in themen:
        fragen_json = json.dumps(th.get('fragen'), ensure_ascii=False) if th.get('fragen') else None
        tipps_json  = json.dumps(th.get('tipps'),  ensure_ascii=False) if th.get('tipps')  else None
        conn.execute(
            "INSERT INTO schreiben_themen (level, typ, thema, kontext, fragen, mindestwoerter, tipps) VALUES (?,?,?,?,?,?,?)",
            (level, th.get('typ', 'popquiz'), th.get('thema',''), th.get('kontext', ''), fragen_json, th.get('mindestwoerter', 90), tipps_json)
        )
    if themen:
        print(f'  [{level}] Schreiben: {len(themen)} tema')

    conn.commit()

def main():
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
        print(f'Eski veritabanı silindi: {DB_PATH}')

    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")

    print('Şema oluşturuluyor...')
    create_schema(conn)

    print('\nVeriler taşınıyor...')
    for level in ['a1', 'a2', 'b1']:
        migrate_level(conn, level)

    conn.close()

    size = os.path.getsize(DB_PATH)
    print(f'\nTamamlandi! Veritabani: {DB_PATH} ({size // 1024} KB)')

if __name__ == '__main__':
    main()
