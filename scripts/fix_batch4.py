import json
import re

with open(r'c:\Users\Bedirhan\Desktop\deutsch\scripts\batch_4.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Cleaning logic for texts
for item in data:
    text = item['text']
    
    # Global OCR fixes
    text = text.replace('\n', ' ')
    text = re.sub(r'\s+', ' ', text)
    text = text.replace('J ~rgen', 'Jürgen')
    text = text.replace('1 ~~~mund', 'Dortmund')
    text = text.replace('~mas', 'Thomas')
    text = text.replace('zu- CD sammen', 'zusammen')
    text = text.replace('r::-;_vira', 'Elvira')
    text = text.replace('V 1 Hochsc~ule', 'Hochschule')
    
    text = text.replace('zu- 1iick', 'zurück')
    text = text.replace('1iick', 'zurück')
    
    text = text.replace('mit. der', 'mit der')
    text = text.replace('02" 2 . ', '')
    text = text.replace('3 17 einhundertdreiunddreißig l 133 Spektrum Deutsch ▪ A1+', '')
    text = text.replace('D D', '')
    text = text.replace('richtig falsch', '')
    
    # fix space in words
    text = text.replace('zu r', 'zur')
    text = text.replace('Urla ub', 'Urlaub')
    text = text.replace('fah - ren', 'fahren')
    text = text.replace('fah ren', 'fahren')
    text = text.replace('fü r', 'für')
    text = text.replace('Intercity- oder', 'Intercity- oder') # just standard
    
    # Fix hyphenation if separated by space, but careful with "Hin- und" or "Intercity- oder"
    # Actually, the original text had:
    # "Urlaubs- reisen"
    # "öffentli- che"
    # "Großstäd- ten"
    # "Stra- ßenbahn"
    # "fah - ren" -> "fah - ren"
    # Let's fix those hyphenations manually:
    text = text.replace('- ', '')
    # Now restore some necessary ones:
    text = text.replace('Hinund', 'Hin- und')
    text = text.replace('Intercityoder', 'Intercity- oder')
    text = text.replace('EurocityZügen', 'Eurocity-Zügen')
    
    # Specific context prepending based on id
    if item['id'] == '94-2':
        text = 'Jürgen: ' + text
    elif item['id'] == '94-3':
        text = 'Thomas: ' + text
    elif item['id'] == '94-4':
        text = 'Thomas: ' + text
    elif item['id'] == '94-5':
        text = 'Elvira: ' + text
    elif item['id'] == '97-2':
        text = 'Mathias: ' + text
        
    text = re.sub(r'\s+', ' ', text).strip()
    text = text.replace(' .', '.')
    
    item['text'] = text

# write output
with open(r'c:\Users\Bedirhan\Desktop\deutsch\scripts\batch_4_fixed.json', 'w', encoding='utf-8') as f:
    json.dump([{'id': i['id'], 'text': i['text']} for i in data], f, ensure_ascii=False, indent=2)
