import json
import sqlite3
import os
import re

DB_PATH = os.path.join(os.path.dirname(__file__), 'data', 'deutschfit.db')
JSON_PATH = os.path.join(os.path.dirname(__file__), 'verb_blocks.json')

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS grammatik_text_luecke (
            id TEXT PRIMARY KEY,
            level TEXT,
            instruction TEXT,
            word_bank TEXT,
            text TEXT,
            answers TEXT
        )
    ''')
    
    with open(JSON_PATH.replace('verb_blocks.json', 'clean_verb_blocks.json'), 'r', encoding='utf-8') as f:
        blocks = json.load(f)
        
    for idx, block in enumerate(blocks):
        instruction = block.get('instruction', 'Ergänzen Sie die Verben in der richtigen Form.')
        word_bank = block.get('word_bank', [])
        text = block.get('text', '')
        answers = block.get('answers', {})
        
        # Clean up text to match UI placeholder expectations '{1}'
        # Subagents might have used '___ (1)', '(1)', or '{1}'
        text = re.sub(r'(?:___+)?\s*\(\s*(\d+)\s*\)', r'{\1}', text)
        text = re.sub(r'___+\s*\{\s*(\d+)\s*\}', r'{\1}', text)
        
        c.execute('''
            INSERT OR REPLACE INTO grammatik_text_luecke (id, level, instruction, word_bank, text, answers)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            f"verb_{idx+1}",
            "a1",
            instruction,
            json.dumps(word_bank, ensure_ascii=False),
            text,
            json.dumps(answers, ensure_ascii=False)
        ))
        
    conn.commit()
    conn.close()
    print(f"Successfully processed and inserted {len(blocks)} clean items into grammatik_text_luecke table.")

if __name__ == '__main__':
    init_db()
