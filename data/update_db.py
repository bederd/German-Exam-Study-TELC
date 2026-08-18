import sqlite3

db_path = r'c:\Users\Bedirhan\Desktop\deutsch\data\deutschfit.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

updates = [
    (1, "Hotelreservierung in Frankfurt", "Sie möchten ein Einzelzimmer für zwei Nächte in einem Hotel in Frankfurt buchen. Schreiben Sie eine E-Mail an das Hotel."),
    (2, "Urlaub in Berlin", "Sie machen Urlaub in Berlin. Schreiben Sie eine kurze Postkarte an einen Freund."),
    (3, "Verspätung wegen Zug", "Sie kommen spät zur Arbeit, weil der Zug Verspätung hat. Schreiben Sie eine SMS an Ihren Kollegen."),
    (4, "Einladung ins Café absagen", "Ein Freund hat Sie am Sonntag ins Café eingeladen, aber Sie sind krank. Schreiben Sie eine Nachricht."),
    (5, "Informationen zum A1-Deutschkurs", "Schreiben Sie eine E-Mail an eine Sprachschule, um Informationen über den A1-Deutschkurs zu erhalten."),
    (6, "Arzttermin absagen", "Sie haben am Mittwoch einen Arzttermin, aber Sie müssen arbeiten. Schreiben Sie eine E-Mail, um den Termin abzusagen."),
    (7, "Einladung zum Geburtstag", "Sie feiern Ihren Geburtstag und schreiben eine Nachricht, um Ihre Freunde einzuladen."),
    (8, "Umzugshilfe", "Sie ziehen in eine neue Wohnung und schreiben eine Nachricht an einen Freund, um um Hilfe zu bitten."),
    (9, "Jacke zu klein", "Sie haben eine Jacke im Internet gekauft, aber sie ist zu klein. Schreiben Sie eine E-Mail an den Kundenservice."),
    (10, "Am Bahnhof abholen", "Ihr Freund holt Sie vom Bahnhof ab, aber Ihr Zug kommt auf einem anderen Gleis an. Schreiben Sie ihm eine Nachricht."),
    (11, "Frühstück im Büro", "Sie bringen Frühstück ins Büro mit. Schreiben Sie Ihren Kollegen eine Nachricht und fragen Sie, was sie möchten."),
    (12, "Geburtstag vergessen", "Sie haben den Geburtstag eines Freundes vergessen. Schreiben Sie eine Nachricht, um sich zu entschuldigen."),
    (13, "Meine Person", "Schreiben Sie einen kurzen Text über sich selbst. Beantworten Sie die folgenden Fragen:"),
    (14, "Meine Familie", "Schreiben Sie einen Text über Ihre Familie. Beantworten Sie die folgenden Fragen:"),
    (15, "Mein Heimatland", "Schreiben Sie einen Text über Ihr Heimatland. Beantworten Sie die folgenden Fragen:"),
    (16, "Mein Urlaub", "Schreiben Sie einen Text über Ihren letzten Urlaub. Beantworten Sie die folgenden Fragen:"),
    (17, "Mein Alltag", "Schreiben Sie einen Text über Ihren Alltag. Beantworten Sie die folgenden Fragen:"),
    (18, "Meine Wohnung", "Schreiben Sie einen Text über Ihre Wohnung oder Ihr Haus. Beantworten Sie die folgenden Fragen:"),
    (19, "Mein Beruf", "Schreiben Sie einen Text über Ihren Beruf oder Ihr Schulleben. Beantworten Sie die folgenden Fragen:"),
    (20, "Mein Wochenende", "Schreiben Sie einen Text darüber, wie Sie Ihr Wochenende verbringen. Beantworten Sie die folgenden Fragen:"),
    (21, "Mein Lieblingsessen", "Schreiben Sie einen Text über Ihr Lieblingsessen. Beantworten Sie die folgenden Fragen:"),
    (22, "Meine Stadt", "Schreiben Sie einen Text über Ihre Stadt. Beantworten Sie die folgenden Fragen:"),
    (23, "Meine Kleidung", "Schreiben Sie einen Text über Ihren Kleidungsstil und Ihre Einkaufsgewohnheiten. Beantworten Sie die folgenden Fragen:"),
    (24, "Jahreszeiten und Wetter", "Schreiben Sie einen Text über die Jahreszeiten und das Wetter in Ihrem Land. Beantworten Sie die folgenden Fragen:")
]

for record_id, thema, kontext in updates:
    cursor.execute('UPDATE schreiben_themen SET thema = ?, kontext = ? WHERE id = ?', (thema, kontext, record_id))

conn.commit()
conn.close()
print("DB updated successfully!")
