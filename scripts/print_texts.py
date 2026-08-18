import json

with open('data/begegnungen_transcripts_batch.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

indices = [9, 10, 11, 13, 15, 16, 18]
for i in indices:
    print(f'=== TEXT {i} ===')
    print(d[i]['text'])
