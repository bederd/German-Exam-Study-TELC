import json

with open('data/horen_a1.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

qs = [
  # 0
  [
    {
      "type": "write_sentence",
      "question": "ich • mit dem Chef • sprechen • müssen",
      "options": [],
      "answer": ""
    },
    {
      "type": "write_sentence",
      "question": "Frau Klein • noch • frisches Gemüse • kaufen • müssen",
      "options": [],
      "answer": ""
    },
    {
      "type": "write_sentence",
      "question": "Sie • die Fahrkarte • am Automaten • kaufen • müssen",
      "options": [],
      "answer": ""
    }
  ],
  # 1
  [
    {
      "type": "true_false",
      "question": "Sabine war pünktlich am Flughafen.",
      "options": ["Richtig", "Falsch"],
      "answer": "Falsch"
    },
    {
      "type": "multiple_choice",
      "question": "Womit ist Sabine zum Flughafen gefahren?",
      "options": ["Mit dem Bus", "Mit dem Auto", "Mit dem Zug"],
      "answer": "Mit dem Auto"
    },
    {
      "type": "write_sentence",
      "question": "Was hat Otto vor der Besprechung gemacht?",
      "options": [],
      "answer": "Er hat die Technik kontrolliert."
    }
  ],
  # 2
  [
    {
      "type": "write_sentence",
      "question": "Die Teilnehmer schwimmen bei der Veranstaltung _____ im Rhein.",
      "options": [],
      "answer": ""
    },
    {
      "type": "write_sentence",
      "question": "Das Schwimmen findet seit _____ statt, immer am ersten _____ nach den Schulferien.",
      "options": [],
      "answer": ""
    },
    {
      "type": "write_sentence",
      "question": "Im heißen Sommer 2003 haben rund _____ teilgenommen.",
      "options": [],
      "answer": ""
    }
  ],
  # 3
  [
    {
      "type": "true_false",
      "question": "Andreas möchte Bilder von Claude Monet sehen. Er sucht das Kunstmuseum.",
      "options": ["Richtig", "Falsch"],
      "answer": "Richtig"
    },
    {
      "type": "multiple_choice",
      "question": "Andreas möchte Schokoladenkuchen essen. Welchen Ort sucht er?",
      "options": ["Das Cafe", "Die Bank", "Das Kino"],
      "answer": "Das Cafe"
    },
    {
      "type": "write_sentence",
      "question": "Andreas möchte in Frankfurt übernachten. Was sucht er?",
      "options": [],
      "answer": "Er sucht das Hotel."
    }
  ],
  # 4
  [
    {
      "type": "true_false",
      "question": "Martina fährt mit dem Auto ins Büro.",
      "options": ["Richtig", "Falsch"],
      "answer": "Falsch"
    },
    {
      "type": "multiple_choice",
      "question": "Was macht Martina nach dem Frühstück?",
      "options": ["Sie liest ein Buch.", "Sie macht Gymnastik.", "Sie schreibt E-Mails."],
      "answer": "Sie macht Gymnastik."
    },
    {
      "type": "write_sentence",
      "question": "Wann fängt die Teambesprechung an?",
      "options": [],
      "answer": "Die Teambesprechung fängt um 11.00 Uhr an."
    }
  ],
  # 5
  [
    {
      "type": "true_false",
      "question": "Andreas sucht die Apotheke, um Medikamente zu kaufen.",
      "options": ["Richtig", "Falsch"],
      "answer": "Richtig"
    },
    {
      "type": "multiple_choice",
      "question": "Was möchte Andreas im Restaurant tun?",
      "options": ["Geld abheben", "Ein Schnitzel essen", "Ein Auto parken"],
      "answer": "Ein Schnitzel essen"
    },
    {
      "type": "write_sentence",
      "question": "Was macht Andreas in der Touristeninformation?",
      "options": [],
      "answer": "Er sucht Informationen über Frankfurt."
    }
  ],
  # 6
  [
    {
      "type": "true_false",
      "question": "Viele Deutsche essen mittags in der Kantine.",
      "options": ["Richtig", "Falsch"],
      "answer": "Richtig"
    },
    {
      "type": "multiple_choice",
      "question": "Was essen die Deutschen am liebsten in der Kantine?",
      "options": ["Schnitzel mit Pommes frites", "Currywurst oder Pizza", "Brot mit Käse oder Wurst"],
      "answer": "Currywurst oder Pizza"
    },
    {
      "type": "write_sentence",
      "question": "Was essen viele Leute abends?",
      "options": [],
      "answer": "Viele Leute essen abends Brot mit Käse oder Wurst."
    }
  ],
  # 7
  [
    {
      "type": "true_false",
      "question": "Die Schokolade kommt ursprünglich aus der Schweiz.",
      "options": ["Richtig", "Falsch"],
      "answer": "Falsch"
    },
    {
      "type": "multiple_choice",
      "question": "Wer hat die Mozartkugel erfunden?",
      "options": ["Wolfgang Amadeus Mozart", "Paul Fürst", "Ein Schweizer Konditor"],
      "answer": "Paul Fürst"
    },
    {
      "type": "write_sentence",
      "question": "Wie viel Schokolade essen die Schweizer pro Person im Jahr?",
      "options": [],
      "answer": "Die Schweizer essen rund 12 kg Schokolade pro Person im Jahr."
    }
  ]
]

for i in range(8):
    data[i]['fragen'] = qs[i]

with open('data/horen_a1.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print('Successfully updated horen_a1.json with generated and extracted questions.')
