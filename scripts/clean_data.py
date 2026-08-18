import json
import re

def is_bad(t):
    text = t.get('text', '')
    if not text.strip(): return True
    if len(text.split()) < 15: return True
    # Look for lots of dots or underscores
    if re.search(r'\.{3,}', text) or re.search(r'_{3,}', text): return True
    # check if there are many list items like 1. 2. 3.
    list_items = len(re.findall(r'\b\d+\.', text))
    if list_items > 3: return True
    return False

def clean_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        lesen = data.get('lesen', {})
        texts_key = 'texts' if 'texts' in lesen else 'texte'
        if texts_key not in lesen:
            return
            
        original_texts = lesen[texts_key]
        good_texts = [t for t in original_texts if not is_bad(t)]
        
        lesen[texts_key] = good_texts
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            
        print(f"Cleaned {filepath}: {len(original_texts)} -> {len(good_texts)} (Removed {len(original_texts) - len(good_texts)})")
    except Exception as e:
        print(f"Error processing {filepath}: {e}")

if __name__ == "__main__":
    clean_file('app/data/a1.json')
