import json

# Questions from the 7 subagents
q9 = [
  {"type": "true_false", "question": "Susanne arbeitet als Managerin bei BASF.", "options": ["Richtig", "Falsch"], "answer": "Richtig"},
  {"type": "multiple_choice", "question": "Wie alt ist Maximilian?", "options": ["Vier Jahre alt", "Acht Jahre alt", "Zehn Jahre alt"], "answer": "Vier Jahre alt"},
  {"type": "write_sentence", "question": "Was studiert Martin in Bremen?", "options": [], "answer": "Er studiert Informatik in Bremen."}
]

q10 = [
  {"type": "true_false", "question": "Die Schweiz hat vier Amtssprachen.", "options": ["Richtig", "Falsch"], "answer": "Richtig"},
  {"type": "multiple_choice", "question": "Wie viele Einwohner hat Österreich?", "options": ["8,5 Millionen", "8,7 Millionen", "82,7 Millionen"], "answer": "8,7 Millionen"},
  {"type": "write_sentence", "question": "Was ist die Hauptstadt der Schweiz?", "options": [], "answer": "Die Hauptstadt der Schweiz ist Bern."}
]

q11 = [
  {"type": "true_false", "question": "Sandra studiert in Hamburg Medizin.", "options": ["Richtig", "Falsch"], "answer": "Richtig"},
  {"type": "multiple_choice", "question": "Was macht Franziska in ihrer Freizeit?", "options": ["Sie spielt Fußball.", "Sie hört gern Musik.", "Sie schreibt Gedichte."], "answer": "Sie hört gern Musik."},
  {"type": "write_sentence", "question": "Wo arbeitet Paolo und als was?", "options": [], "answer": "Paolo arbeitet als Ingenieur bei Siemens in München."}
]

q13 = [
  {"type": "true_false", "question": "Herr Heinemann arbeitet schon lange in diesem Büro.", "options": ["Richtig", "Falsch"], "answer": "Falsch"},
  {"type": "multiple_choice", "question": "Was möchte Herr Heinemann später mit Frau Herzberg machen?", "options": ["Zusammen Kaffee trinken", "Das Büro aufräumen", "Einen Computer kaufen"], "answer": "Zusammen Kaffee trinken"},
  {"type": "write_sentence", "question": "Welchen Beruf hat Frau Herzberg?", "options": [], "answer": "Sie arbeitet als Sekretärin."}
]

q15 = [
  {"type": "true_false", "question": "Die Kaffeemaschine in dem Büro ist kaputt.", "options": ["Richtig", "Falsch"], "answer": "Falsch"},
  {"type": "multiple_choice", "question": "Wo arbeitet die Person, die viele Studenten hat?", "options": ["In einer Schule", "An der Universität", "Bei einer Zeitung"], "answer": "An der Universität"},
  {"type": "write_sentence", "question": "Wo sind die Brille und der Schlüssel?", "options": [], "answer": "Die Brille und der Schlüssel sind auf dem Schreibtisch."}
]

q16 = [
  {"type": "true_false", "question": "Der Verwaltungsleiter heißt Paul Fischer.", "options": ["Richtig", "Falsch"], "answer": "Richtig"},
  {"type": "multiple_choice", "question": "Wo essen die Mitarbeiterinnen und Mitarbeiter?", "options": ["In der Mensa", "In der Kantine", "In der Cafeteria"], "answer": "In der Kantine"},
  {"type": "write_sentence", "question": "Wo können die Studentinnen und Studenten Sprachkurse besuchen?", "options": [], "answer": "Im Sprachenzentrum können die Studentinnen und Studenten Sprachkurse besuchen."}
]

q18 = [
  {"type": "true_false", "question": "Herr Heinemann fährt am Wochenende nach München, um im Universitätsorchester zu spielen.", "options": ["Richtig", "Falsch"], "answer": "Richtig"},
  {"type": "multiple_choice", "question": "Welches Instrument spielt Frau Herzberg?", "options": ["Klavier", "Gitarre", "Geige"], "answer": "Gitarre"},
  {"type": "write_sentence", "question": "Woher kommt der Mann von Frau Herzberg?", "options": [], "answer": "Er kommt aus England."}
]

# Load Begegnungen batch
with open('data/begegnungen_transcripts_batch.json', 'r', encoding='utf-8') as f:
    batch = json.load(f)

# Insert questions
batch[9]['fragen'] = q9
batch[10]['fragen'] = q10
batch[11]['fragen'] = q11
batch[13]['fragen'] = q13
batch[15]['fragen'] = q15
batch[16]['fragen'] = q16
batch[18]['fragen'] = q18

import re
# Keep only valid items and extract kapitel/aufgabe
valid_items = []
for i in [9, 10, 11, 13, 15, 16, 18]:
    item = batch[i]
    m = re.search(r'Kapitel\s+(\d+)\s*(?:,|Übung|Aufgabe)?\s*([A-Za-z]+\s*\d+)', item['text'], re.IGNORECASE)
    if m:
        item['kapitel'] = int(m.group(1))
        item['aufgabe'] = m.group(2).strip()
        item['titel'] = f"Kapitel {item['kapitel']} Aufgabe {item['aufgabe']}"
    # Standardize source
    item['source'] = 'Begegnungen_A1'
    item['typ'] = 'horen'
    valid_items.append(item)

# Load existing 8 Spektrum items
with open('data/horen_a1.json', 'r', encoding='utf-8') as f:
    spektrum_data = json.load(f)

for item in spektrum_data:
    item['source'] = 'Spektrum_A1'

# Combine both
final_data = spektrum_data + valid_items
print(f"Total exercises: {len(final_data)}")

with open('data/horen_a1.json', 'w', encoding='utf-8') as f:
    json.dump(final_data, f, ensure_ascii=False, indent=2)
    
print("Successfully saved to data/horen_a1.json")
