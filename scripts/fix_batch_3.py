import json

with open(r'c:\Users\Bedirhan\Desktop\deutsch\scripts\batch_3.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

for item in data:
    text = item['text']
    
    # Apply common fixes
    text = text.replace('fü r', 'für')
    text = text.replace('gern e.', 'gerne.')
    text = text.replace('1 n Deutschland', 'In Deutschland')
    text = text.replace('z. B. ;', 'z. B.')
    text = text.replace('MarLipan', 'Marzipan')
    text = text.replace('179 1', '1791')
    text = text.replace('J ahr', 'Jahr')
    text = text.replace('G\nummibärchen', 'Gummibärchen')
    text = text.replace('au · Bonn', 'aus Bonn')
    text = text.replace('incl weich', 'sind weich')
    text = text.replace('T heodor', 'Theodor')
    text = text.replace('Firme11 nmd', 'Firmen rund')
    text = text.replace('Tisc;h', 'Tisch')
    text = text.replace('vi ele', 'viele')
    text = text.replace('Durch-\nschn itt', 'Durchschnitt')
    
    # Specific fixes based on IDs
    if item['id'] == '57-3':
        text = 'Um 11.00 Uhr fährt Martina in die Stadt. Dort kauft sie ein. Sie kauft gern Schuhe. Danach geht sie oft mit Freunden in ein Restaurant. Um 23.00 Uhr geht Martina ins Bett.'
    elif item['id'] == '64-1':
        text = 'georg.hansel@gmail.com\nSie möchten kochen lernen? Machen Sie einen Kurs! Vier Wochen, samstags und sonntags von 10 bis 12 Uhr. www.kochkurse-hannover.de\nSie brauchen Deutsch und Englisch für den Beruf? Unterricht in kleinen Gruppen am Wochenende. Kontakt: 0341/6 45 73 82\nwww.sprachen-lernen-beruf.de\nIm September beginnt unser neues Kursprogramm. Yoga,'
    elif item['id'] == '64-2':
        text = 'Fitness und Pilates. Kleine Gruppen. Montag bis Freitag. 10 bis 12 Uhr. www.studio-aktiv-berlin.de\nSpektrum Deutsch ▪ A1+'
    elif item['id'] == '75-3':
        text = text.replace('1<.ann', 'kann').replace('1<.ostet', 'kostet').replace('ma.n', 'man').replace('r.,bendessen', 'abendessen').replace('nt geöffnet? ·st das Restaura', 'ist das Restaurant geöffnet?').replace('. 7', 'Essen?')
    
    item['text'] = text

with open(r'c:\Users\Bedirhan\Desktop\deutsch\scripts\batch_3_fixed.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Done")
