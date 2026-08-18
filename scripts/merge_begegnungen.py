import json

with open('data/begegnungen_transcripts.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

# Questions from T0 (Item 0)
q0 = [
  {
    "type": "true_false",
    "question": "Franziska ist 35 Jahre alt.",
    "options": [
      "Richtig",
      "Falsch"
    ],
    "answer": "Falsch"
  },
  {
    "type": "multiple_choice",
    "question": "Was ist Peter von Beruf?",
    "options": [
      "Lehrer",
      "Informatiker",
      "Arzt"
    ],
    "answer": "Informatiker"
  },
  {
    "type": "write_sentence",
    "question": "Welche Sprache lernt Peter jetzt?",
    "options": [],
    "answer": "Er lernt jetzt Japanisch."
  }
]

# Questions from T1 (Item 1)
q1 = [
  {
    "type": "true_false",
    "question": "In der Übung wird das Land 'Deutschland' genannt.",
    "options": [
      "Richtig",
      "Falsch"
    ],
    "answer": "Falsch"
  },
  {
    "type": "multiple_choice",
    "question": "Welches Land wird im Text genannt?",
    "options": [
      "Österreich",
      "Italien",
      "Australien"
    ],
    "answer": "Italien"
  },
  {
    "type": "write_sentence",
    "question": "Schreiben Sie den Satz für das Land 'Japan'.",
    "options": [],
    "answer": "Ich komme aus Japan."
  }
]

# Questions from T2 (Item 2)
q2 = [
  {
    "type": "true_false",
    "question": "Pablo Picasso kommt aus Spanien.",
    "options": [
      "Richtig",
      "Falsch"
    ],
    "answer": "Richtig"
  },
  {
    "type": "multiple_choice",
    "question": "Woher kommt Clara Schumann?",
    "options": [
      "aus Italien",
      "aus Deutschland",
      "aus Schweden"
    ],
    "answer": "aus Deutschland"
  },
  {
    "type": "write_sentence",
    "question": "Woher kommt Haruki Murakami?",
    "options": [],
    "answer": "Er kommt aus Japan."
  }
]

d[0]['fragen'] = q0
d[1]['fragen'] = q1
d[2]['fragen'] = q2

# Extract kapitel and aufgabe from transcript if possible
import re
for item in d:
    m = re.search(r'Kapitel\s+(\d+)\s*(?:,|Übung|Aufgabe)?\s*A\s*(\d+)', item['text'], re.IGNORECASE)
    if m:
        item['kapitel'] = int(m.group(1))
        item['aufgabe'] = m.group(2)
        item['titel'] = f"Kapitel {item['kapitel']} Aufgabe A{item['aufgabe']}"

with open('data/begegnungen_a1.json', 'w', encoding='utf-8') as f:
    json.dump(d, f, ensure_ascii=False, indent=2)

print('Done')
