"""
save_word.py — Kelime analizini JSON veritabanına kaydeder
Kullanım (Python'dan import):
    from save_word import save_to_db
    save_to_db(result_dict)
"""

import json
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "woerter_db.json")


def save_to_db(result: dict) -> None:
    """Analiz sonucunu woerter_db.json'a ekler veya günceller."""
    with open(DB_PATH, 'r', encoding='utf-8') as f:
        db = json.load(f)

    word  = result.get("word", "").lower()
    wtype = result.get("type", "")

    # Aynı kelime+tür varsa güncelle, yoksa ekle
    existing_idx = None
    for i, entry in enumerate(db["words"]):
        if entry.get("word", "").lower() == word and entry.get("type") == wtype:
            existing_idx = i
            break

    entry = {
        **result,
        "last_updated": datetime.now().isoformat(timespec='seconds')
    }

    if existing_idx is not None:
        db["words"][existing_idx] = entry
    else:
        db["words"].append(entry)

    with open(DB_PATH, 'w', encoding='utf-8') as f:
        json.dump(db, f, ensure_ascii=False, indent=2)

    print(f"[DB] '{word}' ({wtype}) kaydedildi. Toplam: {len(db['words'])} kelime.")
