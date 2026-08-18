import json
import os

src = 'app/data/a1.json.bak'
dest = 'app/data/a1.json'

if not os.path.exists(src):
    print(f"Source file {src} not found.")
    exit(1)

data = json.load(open(src, 'r', encoding='utf-8'))

subagent_data = {
  "dialog_tasks": [
    {
      "kontext": "Frankfurt'ta bir otelde iki gece için bir tek kişilik oda rezervasyonu yapmak istiyorsunuz. Otele bir e-posta yazın.",
      "fragen": [
        "Schreiben Sie, wann Sie ankommen und abreisen.",
        "Fragen Sie nach dem Preis für ein Einzelzimmer.",
        "Fragen Sie, ob das Frühstück inklusive ist."
      ]
    },
    {
      "kontext": "Berlin'de tatildesiniz. Bir arkadaşınıza kısa bir kartpostal yazın.",
      "fragen": [
        "Schreiben Sie, wie das Wetter ist.",
        "Erzählen Sie, was Sie gestern gemacht haben.",
        "Schreiben Sie einen netten Gruß am Ende."
      ]
    },
    {
      "kontext": "İşe geç kalıyorsunuz çünkü tren rötar yaptı. İş arkadaşınıza bir SMS yazın.",
      "fragen": [
        "Entschuldigen Sie sich für die Verspätung.",
        "Erklären Sie das Problem mit dem Zug.",
        "Schreiben Sie, wann Sie im Büro ankommen."
      ]
    },
    {
      "kontext": "Bir arkadaşınız sizi Pazar günü kafeye davet etti ama hastasınız. Bir mesaj yazın.",
      "fragen": [
        "Bedanken Sie sich für die Einladung.",
        "Sagen Sie, dass Sie krank sind und nicht kommen können.",
        "Schlagen Sie vor, sich nächste Woche zu treffen."
      ]
    },
    {
      "kontext": "Bir dil okuluna Almanca A1 kursu hakkında bilgi almak için bir e-posta yazın.",
      "fragen": [
        "Sagen Sie, dass Sie Deutsch lernen möchten.",
        "Fragen Sie, wann der nächste A1-Kurs beginnt.",
        "Fragen Sie nach dem Preis für den Kurs."
      ]
    },
    {
      "kontext": "Çarşamba günü doktor randevunuz var ama çalışmanız gerekiyor. Randevuyu iptal etmek için bir e-posta yazın.",
      "fragen": [
        "Schreiben Sie, wann Ihr Termin ist.",
        "Entschuldigen Sie sich und sagen Sie, dass Sie arbeiten müssen.",
        "Bitten Sie um einen neuen Termin am Freitag."
      ]
    },
    {
      "kontext": "Doğum gününüzü kutluyorsunuz ve arkadaşlarınızı davet etmek için bir mesaj yazıyorsunuz.",
      "fragen": [
        "Sagen Sie, wann und wo die Party ist.",
        "Bitten Sie die Freunde, etwas zu trinken mitzubringen.",
        "Bitten Sie um eine schnelle Antwort."
      ]
    },
    {
      "kontext": "Yeni bir daireye taşınıyorsunuz ve bir arkadaşınızdan yardım istemek için mesaj yazıyorsunuz.",
      "fragen": [
        "Erklären Sie, dass Sie am Samstag umziehen.",
        "Fragen Sie, ob Ihr Freund Zeit hat, um zu helfen.",
        "Versprechen Sie Pizza und Getränke nach der Arbeit."
      ]
    },
    {
      "kontext": "İnternetten bir ceket aldınız ama çok küçük. Müşteri hizmetlerine bir e-posta yazın.",
      "fragen": [
        "Schreiben Sie, was Sie gekauft haben und Ihre Bestellnummer.",
        "Erklären Sie das Problem: Die Jacke ist zu klein.",
        "Fragen Sie, wie Sie die Jacke zurückschicken können."
      ]
    },
    {
      "kontext": "Arkadaşınız sizi tren istasyonundan alacak ama treniniz farklı bir perona geliyor. Ona bir mesaj yazın.",
      "fragen": [
        "Sagen Sie, dass Sie bald ankommen.",
        "Informieren Sie ihn, dass der Zug auf Gleis 4 ankommt.",
        "Sagen Sie, wo Sie genau warten werden (am Ausgang)."
      ]
    },
    {
      "kontext": "Ofise kahvaltı getiriyorsunuz. İş arkadaşlarınıza ne istediklerini soran bir mesaj yazın.",
      "fragen": [
        "Sagen Sie, dass Sie zum Café gehen.",
        "Fragen Sie, wer einen Kaffee oder ein Brötchen möchte.",
        "Schreiben Sie, wann Sie zurück sind."
      ]
    },
    {
      "kontext": "Bir arkadaşınızın doğum gününü unuttunuz. Özür dilemek için bir mesaj yazın.",
      "fragen": [
        "Entschuldigen Sie sich, dass Sie den Geburtstag vergessen haben.",
        "Gratulieren Sie nachträglich zum Geburtstag.",
        "Laden Sie die Person nächste Woche zum Essen ein."
      ]
    }
  ],
  "popquiz_tasks": [
    {
      "thema": "Meine Person",
      "kontext": "Kendinizi tanıtan kısa bir metin yazın. Aşağıdaki sorulara cevap verin:",
      "fragen": [
        "Wie heißen Sie und woher kommen Sie?",
        "Wo wohnen Sie jetzt?",
        "Welche Sprachen sprechen Sie?",
        "Was machen Sie in Ihrer Freizeit?"
      ]
    },
    {
      "thema": "Meine Familie",
      "kontext": "Ailenizi anlatan bir metin yazın. Aşağıdaki sorulara cevap verin:",
      "fragen": [
        "Wie groß ist Ihre Familie?",
        "Wo wohnen Ihre Eltern?",
        "Haben Sie Geschwister? Wie alt sind sie?",
        "Was machen Ihre Familienmitglieder von Beruf?"
      ]
    },
    {
      "thema": "Mein Heimatland",
      "kontext": "Ülkeniz hakkında bilgi veren bir metin yazın. Aşağıdaki sorulara cevap verin:",
      "fragen": [
        "Wie heißt Ihr Heimatland und wo liegt es?",
        "Was ist die Hauptstadt und wie viele Einwohner gibt es?",
        "Welche Sprachen spricht man dort?",
        "Welche Orte sind dort berühmt?"
      ]
    },
    {
      "thema": "Mein Urlaub",
      "kontext": "Son tatilinizi anlatan bir metin yazın. Aşağıdaki sorulara cevap verin:",
      "fragen": [
        "Wo waren Sie im letzten Urlaub?",
        "Mit wem sind Sie gereist?",
        "Wie war das Wetter und das Essen?",
        "Was haben Sie dort gemacht?"
      ]
    },
    {
      "thema": "Mein Alltag",
      "kontext": "Günlük rutininizi anlatan bir metin yazın. Aşağıdaki sorulara cevap verin:",
      "fragen": [
        "Wann stehen Sie morgens auf?",
        "Was essen Sie zum Frühstück?",
        "Wie lange arbeiten oder studieren Sie?",
        "Was machen Sie am Abend, bevor Sie schlafen?"
      ]
    },
    {
      "thema": "Meine Wohnung",
      "kontext": "Evinizi veya dairenizi anlatan bir metin yazın. Aşağıdaki sorulara cevap verin:",
      "fragen": [
        "Wo liegt Ihre Wohnung (in der Stadt oder auf dem Land)?",
        "Wie viele Zimmer hat die Wohnung?",
        "Was ist Ihr Lieblingszimmer und warum?",
        "Haben Sie einen Balkon oder einen Garten?"
      ]
    },
    {
      "thema": "Mein Beruf",
      "kontext": "İşinizi veya okul hayatınızı anlatan bir metin yazın. Aşağıdaki sorulara cevap verin:",
      "fragen": [
        "Was sind Sie von Beruf oder was studieren Sie?",
        "Wo arbeiten oder lernen Sie?",
        "Wie sind Ihre Arbeitszeiten?",
        "Was macht Ihnen an der Arbeit besonders viel Spaß?"
      ]
    },
    {
      "thema": "Mein Wochenende",
      "kontext": "Hafta sonunuzu nasıl geçirdiğinizi anlatan bir metin yazın. Aşağıdaki sorulara cevap verin:",
      "fragen": [
        "Wann stehen Sie am Wochenende auf?",
        "Mit wem verbringen Sie Ihr Wochenende?",
        "Welche Aktivitäten machen Sie meistens (Sport, Kino, etc.)?",
        "Gehen Sie am Sonntagabend früh ins Bett?"
      ]
    },
    {
      "thema": "Mein Lieblingsessen",
      "kontext": "En sevdiğiniz yemeği anlatan bir metin yazın. Aşağıdaki sorulara cevap verin:",
      "fragen": [
        "Was ist Ihr Lieblingsessen?",
        "Aus welchem Land kommt dieses Essen?",
        "Kochen Sie das Essen oft selbst oder gehen Sie ins Restaurant?",
        "Welche Zutaten braucht man dafür?"
      ]
    },
    {
      "thema": "Meine Stadt",
      "kontext": "Yaşadığınız şehri anlatan bir metin yazın. Aşağıdaki sorulara cevap verin:",
      "fragen": [
        "In welcher Stadt leben Sie und wie groß ist sie?",
        "Welche öffentlichen Verkehrsmittel gibt es dort?",
        "Welche Orte, Parks oder Gebäude finden Sie interessant?",
        "Was kann man in der Stadt am Wochenende machen?"
      ]
    },
    {
      "thema": "Meine Kleidung",
      "kontext": "Giyim tarzınızı ve alışveriş alışkanlıklarınızı anlatan bir metin yazın. Aşağıdaki sorulara cevap verin:",
      "fragen": [
        "Was tragen Sie gern im Sommer und was im Winter?",
        "Welche Farben mögen Sie bei Kleidung?",
        "Wo kaufen Sie Ihre Kleidung (im Internet oder im Geschäft)?",
        "Ist Mode für Sie wichtig?"
      ]
    },
    {
      "thema": "Jahreszeiten und Wetter",
      "kontext": "Ülkenizdeki mevsimleri ve hava durumunu anlatan bir metin yazın. Aşağıdaki sorulara cevap verin:",
      "fragen": [
        "Wie ist das Wetter im Winter in Ihrem Land?",
        "Was ist Ihre Lieblingsjahreszeit und warum?",
        "Was machen Sie gern, wenn es regnet?",
        "Welche Kleidung tragen Sie, wenn es kalt ist?"
      ]
    }
  ]
}

schreiben_themen = []
for t in subagent_data['dialog_tasks']:
    t['typ'] = 'dialog'
    t['thema'] = t.get('kontext', '')[:30] + '...'
    t['tipps'] = ['Kurze Sätze', 'Auf die Fragen antworten']
    t['mindestwoerter'] = 20
    schreiben_themen.append(t)

for t in subagent_data['popquiz_tasks']:
    t['typ'] = 'popquiz'
    t['tipps'] = ['Einleitungssatz schreiben', 'Auf alle Punkte eingehen']
    t['mindestwoerter'] = 50
    schreiben_themen.append(t)

data['schreiben'] = {'themen': schreiben_themen}

with open(dest, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print('A1 data created successfully.')
