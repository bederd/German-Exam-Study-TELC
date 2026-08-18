import json
import re

def fix_text(text, questions):
    replacements = [
        (r'1 n Deutschland', 'In Deutschland'),
        (r'~mas', 'Thomas'),
        (r'1 ~~~mund', 'Dortmund'),
        (r'grte', 'größte'),
        (r'Universitt', 'Universität'),
        (r'Univer ität', 'Universität'),
        (r'Univer itäten', 'Universitäten'),
        (r'z\. B\. ;', 'z. B.'),
        (r'Meiler Paul KJee', 'Maler Paul Klee'),
        (r'D\nas Zentrum', 'Das Zentrum'),
        (r'liegr', 'liegt'),
        (r'\]11', 'In'),
        (r'J ahre', 'Jahre'),
        (r'J ah r', 'Jahr'),
        (r'pri ate', 'private'),
        (r'öO', '60'),
        (r'F\nrankfurt', 'Frankfurt'),
        (r'~c h e', 'Deutsche'),
        (r'„Ma inhauan“', '„Mainhattan“'),
        (r'„Ma inhauan\"', '„Mainhattan\"'),
        (r'Bankfurt \'·', 'Bankfurt\"'),
        (r',·iele', 'viele'),
        (r'~age 11', 'sagen'),
        (r'Pas-\n\' agiere', 'Passagiere'),
        (r'Fran kfurt', 'Frankfurt'),
        (r'start.en', 'starten'),
        (r'1 ~~0 \'\' \n-\n•', '•'),
        (r'~', ''),
        (r'  +', ' ')
    ]
    for old, new in replacements:
        text = re.sub(old, new, text)

    names_in_q = set()
    for q in questions:
        words = re.findall(r'\b[A-Z][a-z]+\b', q)
        names_in_q.update(words)
    
    if text.startswith('Er '):
        for name in ['Peter', 'Thomas', 'Felix', 'Andreas']:
            if name in names_in_q:
                text = f'Über {name}: ' + text
                break
    elif text.startswith('Ich '):
        for name in ['Peter', 'Thomas', 'Felix', 'Andreas', 'Fanny', 'Conrad', 'Petra', 'Lucie']:
            if name in names_in_q:
                text = f'{name}: ' + text
                break
    elif text.startswith('Sie '):
        for name in ['Lucie', 'Sarah', 'Fanny', 'Petra']:
            if name in names_in_q:
                text = f'Über {name}: ' + text
                break
                
    return text

with open(r'c:\Users\Bedirhan\Desktop\deutsch\scripts\batch_2.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

final_data = [{'id': item['id'], 'text': fix_text(item['text'], item.get('fragen', []))} for item in data]

with open(r'c:\Users\Bedirhan\Desktop\deutsch\scripts\batch_2_fixed.json', 'w', encoding='utf-8') as f:
    json.dump(final_data, f, ensure_ascii=False, indent=2)
