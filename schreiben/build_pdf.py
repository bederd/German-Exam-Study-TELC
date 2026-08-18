"""Generate a clean study PDF: 5 skeletons + possible questions."""
from fpdf import FPDF

OUT = r"C:\Users\Bedirhan\Desktop\schreiben\Schreiben_Calisma_Belgesi.pdf"

# Colors
NAVY = (28, 50, 92)
BLUE = (50, 100, 170)
GRAY_BG = (240, 240, 245)
GRAY_BORDER = (200, 200, 210)
DARK = (40, 40, 40)
ACCENT = (180, 50, 50)


class PDF(FPDF):
    def header(self):
        if self.page_no() == 1:
            return
        self.set_font("Calibri", "", 9)
        self.set_text_color(*BLUE)
        self.cell(0, 8, "Schreiben Çalışma Belgesi — İskeletler ve Olası Sorular",
                 align="R", new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(*GRAY_BORDER)
        self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
        self.ln(4)

    def footer(self):
        self.set_y(-15)
        self.set_font("Calibri", "", 9)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, f"Seite {self.page_no()}", align="C")

    # --- helpers ---
    def h1(self, text):
        self.set_font("Calibri", "B", 22)
        self.set_text_color(*NAVY)
        self.multi_cell(0, 10, text, new_x="LMARGIN", new_y="NEXT")
        self.ln(2)

    def h2(self, text):
        self.ln(3)
        self.set_font("Calibri", "B", 15)
        self.set_text_color(*NAVY)
        self.multi_cell(0, 8, text, new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(*BLUE)
        self.set_line_width(0.6)
        y = self.get_y()
        self.line(self.l_margin, y, self.l_margin + 40, y)
        self.set_line_width(0.2)
        self.ln(3)

    def h3(self, text):
        self.ln(2)
        self.set_font("Calibri", "B", 12)
        self.set_text_color(*BLUE)
        self.multi_cell(0, 7, text, new_x="LMARGIN", new_y="NEXT")
        self.ln(1)

    def para(self, text, size=11):
        self.set_font("Calibri", "", size)
        self.set_text_color(*DARK)
        self.multi_cell(0, 6, text, new_x="LMARGIN", new_y="NEXT")
        self.ln(1)

    def bullet(self, text, size=11, indent=6):
        self.set_font("Calibri", "", size)
        self.set_text_color(*DARK)
        x_start = self.get_x()
        self.cell(indent, 6, "•")
        self.multi_cell(0, 6, text, new_x="LMARGIN", new_y="NEXT")

    def numbered(self, n, text, size=11):
        self.set_font("Calibri", "", size)
        self.set_text_color(*DARK)
        # Bullet column
        self.set_font("Calibri", "B", size)
        self.set_text_color(*BLUE)
        self.cell(8, 6, f"{n}.")
        self.set_font("Calibri", "", size)
        self.set_text_color(*DARK)
        self.multi_cell(0, 6, text, new_x="LMARGIN", new_y="NEXT")

    def quote_box(self, text, size=11):
        # Light background block
        self.ln(1)
        self.set_font("Calibri", "I", size)
        self.set_text_color(*DARK)
        self.set_fill_color(*GRAY_BG)
        self.set_draw_color(*GRAY_BORDER)
        # We'll use multi_cell with fill
        x0 = self.get_x()
        self.set_x(x0 + 2)
        self.multi_cell(self.w - self.l_margin - self.r_margin - 4, 6,
                        text, border=0, fill=True,
                        new_x="LMARGIN", new_y="NEXT")
        self.ln(2)

    def info_line(self, label, value, size=10):
        self.set_font("Calibri", "B", size)
        self.set_text_color(*BLUE)
        w_label = self.get_string_width(label + " ") + 1
        self.cell(w_label, 6, label)
        self.set_font("Calibri", "", size)
        self.set_text_color(*DARK)
        self.multi_cell(0, 6, value, new_x="LMARGIN", new_y="NEXT")


# ===================== Build =====================
pdf = PDF(orientation="P", unit="mm", format="A4")
pdf.set_margins(20, 20, 20)
pdf.set_auto_page_break(auto=True, margin=18)

# Register Calibri (Unicode) with all variants
pdf.add_font("Calibri", "",  r"C:\Windows\Fonts\calibri.ttf")
pdf.add_font("Calibri", "B", r"C:\Windows\Fonts\calibrib.ttf")
pdf.add_font("Calibri", "I", r"C:\Windows\Fonts\calibrii.ttf")
pdf.add_font("Calibri", "BI", r"C:\Windows\Fonts\calibriz.ttf")

# ---------- Cover page ----------
pdf.add_page()
pdf.ln(20)
pdf.set_font("Calibri", "B", 28)
pdf.set_text_color(*NAVY)
pdf.multi_cell(0, 12, "Schreiben Çalışma Belgesi", new_x="LMARGIN", new_y="NEXT")
pdf.set_font("Calibri", "B", 16)
pdf.set_text_color(*BLUE)
pdf.multi_cell(0, 10, "5 İskelet ve Olası Sorular", new_x="LMARGIN", new_y="NEXT")
pdf.ln(8)
pdf.set_draw_color(*BLUE)
pdf.set_line_width(0.8)
pdf.line(pdf.l_margin, pdf.get_y(), pdf.l_margin + 60, pdf.get_y())
pdf.set_line_width(0.2)
pdf.ln(6)

pdf.set_font("Calibri", "", 12)
pdf.set_text_color(*DARK)
pdf.multi_cell(0, 7,
    "Bu belge, sınavda hangi tema gelirse gelsin tutarlı bir metin yazabilmek için "
    "hazırlanmış 5 ana iskeleti ve her tema için olası interview sorularını içerir. "
    "Tüm tahminler ders kitabı çalışmalarına dayanmaktadır.",
    new_x="LMARGIN", new_y="NEXT")
pdf.ln(6)

# Quick info card
pdf.set_fill_color(*GRAY_BG)
pdf.set_draw_color(*GRAY_BORDER)
pdf.rect(pdf.l_margin, pdf.get_y(), pdf.w - pdf.l_margin - pdf.r_margin, 70, "DF")
pdf.ln(3)
pdf.set_x(pdf.l_margin + 4)
pdf.set_font("Calibri", "B", 12)
pdf.set_text_color(*NAVY)
pdf.cell(0, 7, "Genel Sınav Kuralları (Tahmini)", new_x="LMARGIN", new_y="NEXT")
pdf.set_x(pdf.l_margin + 4)
pdf.set_font("Calibri", "I", 9.5)
pdf.set_text_color(120, 120, 120)
pdf.multi_cell(pdf.w - pdf.l_margin - pdf.r_margin - 8, 5,
    "Aşağıdaki kurallar ve yapı kelimeleri kesin değildir; ders kitabı "
    "çalışmalarına dayanan tahminlerdir.",
    new_x="LMARGIN", new_y="NEXT")
pdf.ln(1)
pdf.set_font("Calibri", "", 11)
pdf.set_text_color(*DARK)
rules = [
    "Ich-Form (1. tekil şahıs) — kişisel deneyim üslubu",
    "Giriş cümlesi: „In meinem Text geht es um …\"",
    "Tahmini yapı kelimelerinden en az 4'ü kullanılır: "
    "heute / früher / im Moment / in Zukunft / zurzeit / als Kind",
    "Akış: Giriş → Geçmiş → Şimdi → Görüş → Gelecek → Sonuç",
]
for r in rules:
    pdf.set_x(pdf.l_margin + 4)
    pdf.set_font("Calibri", "B", 10)
    pdf.set_text_color(*BLUE)
    pdf.cell(4, 6, "›")
    pdf.set_font("Calibri", "", 10)
    pdf.set_text_color(*DARK)
    pdf.multi_cell(0, 6, r, new_x="LMARGIN", new_y="NEXT")
pdf.ln(15)

# ---------- General skeleton ----------
pdf.add_page()
pdf.h1("Genel İskelet Kalıbı")
pdf.para(
    "Hangi tema gelirse gelsin altta gösterilen 6 adımlı yapı korunur. "
    "Sadece içerik kelimeleri tema ile birlikte değişir. "
    "Yapı kelimeleri ders kitabı çalışmalarına dayanan tahminlerdir."
)

skel = """[1] EINLEITUNGSSATZ  (giriş cümlesi)
    „In meinem Text geht es um das Thema ___."

[2] ALS KIND / FRÜHER  (geçmiş)
    „Als Kind habe ich ___ gemacht / gespielt / gegessen."
    „Früher war / wollte ich ___."

[3] HEUTE / IM MOMENT  (şu an)
    „Heute ___ ich ___."
    „Im Moment ___ ich ___, weil ___."

[4] MEINUNG  (görüş)
    „Ich denke, dass ___."
    „Meiner Meinung nach ___."

[5] IN ZUKUNFT  (gelecek)
    „In Zukunft möchte ich ___."

[6] SCHLUSSSATZ
    „Zusammenfassend kann ich sagen, dass ___."
"""
pdf.set_font("Calibri", "", 10.5)
pdf.set_fill_color(245, 247, 252)
pdf.set_text_color(*DARK)
pdf.set_draw_color(*GRAY_BORDER)
pdf.multi_cell(0, 5.5, skel, border=1, fill=True, new_x="LMARGIN", new_y="NEXT")

# ---------- Skeleton sections ----------
def add_skeleton(title_de, title_tr, questions, full_text, key_verbs, structure_words, grammar):
    pdf.add_page()
    pdf.h2(f"{title_de}")
    pdf.set_font("Calibri", "I", 11)
    pdf.set_text_color(120, 120, 120)
    pdf.cell(0, 6, title_tr, new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)

    pdf.h3("Olası 6 Soru")
    for i, q in enumerate(questions, 1):
        pdf.numbered(i, q)
    pdf.ln(2)

    pdf.h3("Örnek Metin")
    pdf.quote_box(full_text)

    pdf.h3("Kullanılan Anahtar Unsurlar")
    pdf.info_line("Anahtar fiiller:", key_verbs)
    pdf.info_line("Yapı kelimeleri:", structure_words)
    pdf.info_line("Dilbilgisi:", grammar)


# --- Skeleton 1: Lernen (REWRITTEN questions; sample text kept) ---
add_skeleton(
    "İSKELET 1 — Lernen und Weiterbildung",
    "Öğrenme ve Eğitim",
    [
        "Was haben Sie als Kind in der Schule am liebsten gelernt? "
        "Welche Lehrer waren wichtig für Sie?",
        "Womit beschäftigen Sie sich im Moment? "
        "Möchten Sie noch eine neue Fähigkeit erlernen?",
        "Worum geht es in Ihrem Text?  (Einleitungssatz)",
        "Glauben Sie, dass man auch im hohen Alter noch etwas Neues lernen kann?",
        "Haben Sie schon einmal eine Fremdsprache gelernt? "
        "Wie war diese Erfahrung für Sie?",
        "Welchen Beruf wollten Sie früher ergreifen? Warum?",
    ],
    "In meinem Text geht es um das Thema Lernen und Weiterbildung. "
    "Als Kind bin ich gern zur Schule gegangen. Meine Lieblingsfächer waren "
    "Mathematik und Sport, weil sie interessant waren. Früher war mein Traumberuf "
    "Arzt, aber später habe ich meine Meinung geändert. In der Schule habe ich "
    "Englisch gelernt und an der Universität lerne ich jetzt auch Deutsch. "
    "Der Sprachunterricht macht mir Spaß. Im Moment lerne ich Deutsch, weil ich "
    "nach Deutschland reisen möchte. In Zukunft möchte ich auch Spanisch lernen. "
    "Ich denke, dass ein Mensch in jedem Alter etwas lernen kann. Lernen ist sehr "
    "wichtig für das Leben. Zusammenfassend kann ich sagen, dass Bildung mir "
    "viel Freude bringt.",
    "gehen (bin gegangen), lernen (habe gelernt), möchten, denken, sagen, "
    "ändern (habe geändert), reisen, machen",
    "als Kind, früher, im Moment, in Zukunft  (4 von 6)",
    "Perfekt, weil×2, dass×2, möchte×3, kann",
)

# --- Skeleton 2: Reisen ---
add_skeleton(
    "İSKELET 2 — Reisen und Urlaub",
    "Seyahat ve Tatil",
    [
        "Reisen Sie gern? Wohin sind Sie schon gereist?",
        "Wohin möchten Sie in Zukunft reisen?",
        "Worum geht es in Ihrem Text?  (Einleitungssatz)",
        "Was ist für Sie beim Reisen am wichtigsten? Was meinen Sie?",
        "Sind Sie als Kind viel gereist? Mit wem?",
        "Reisen Sie lieber alleine oder mit der Familie?",
    ],
    "In meinem Text geht es um das Thema Reisen und Urlaub. Als Kind bin ich "
    "oft mit meiner Familie ans Meer gefahren. Wir haben viele schöne Tage am "
    "Strand verbracht. Früher hatte ich keine Lust auf lange Reisen, aber heute "
    "reise ich sehr gern. Im Moment plane ich eine Reise nach Deutschland, weil "
    "ich Berlin sehen möchte. Ich denke, dass Reisen sehr wichtig ist, denn man "
    "lernt neue Kulturen und Menschen kennen. Beim Reisen ist für mich das Essen "
    "am wichtigsten. Ich reise lieber mit Freunden, weil das mehr Spaß macht. "
    "In Zukunft möchte ich auch Italien und Spanien besuchen. Zusammenfassend "
    "kann ich sagen, dass Reisen mein größtes Hobby ist.",
    "fahren (bin gefahren), verbringen (haben verbracht), reisen, planen, "
    "sehen, kennenlernen, besuchen, machen",
    "als Kind, früher, heute, im Moment, in Zukunft  (5 von 6)",
    "Perfekt, weil×2, dass×2, möchte×2, denn",
)

# --- Skeleton 3: Arbeit ---
add_skeleton(
    "İSKELET 3 — Arbeit und Beruf",
    "İş ve Meslek",
    [
        "Was sind Sie von Beruf? Was möchten Sie werden?",
        "Was war früher Ihr Traumberuf?",
        "Worum geht es in Ihrem Text?  (Einleitungssatz)",
        "Welcher Beruf ist heute am wichtigsten? Was meinen Sie?",
        "Wo möchten Sie in Zukunft arbeiten?",
        "Was haben Ihre Eltern als Beruf gemacht?",
    ],
    "In meinem Text geht es um das Thema Arbeit und Beruf. Als Kind wollte ich "
    "Lehrer werden, weil ich Kinder gern habe. Mein Vater war früher Ingenieur "
    "und meine Mutter war Hausfrau. Im Moment bin ich Student und studiere an "
    "der Universität. Ich lerne viel, weil ich später einen guten Beruf haben "
    "möchte. Heute denke ich, dass Ärzte und Lehrer sehr wichtig für die "
    "Gesellschaft sind. Sie helfen anderen Menschen jeden Tag. In Zukunft "
    "möchte ich in einer großen Firma arbeiten. Ich würde gern viel Geld "
    "verdienen, aber die Arbeit muss auch interessant sein. Ich finde, dass "
    "Arbeit nicht nur Geld bedeutet. Zusammenfassend ist mir mein Beruf sehr "
    "wichtig.",
    "wollen, werden, sein, studieren, lernen, denken, helfen, arbeiten, "
    "verdienen, finden, bedeuten",
    "als Kind, früher, im Moment, heute, in Zukunft  (5 von 6)",
    "Präteritum (war/wollte), weil×2, dass×2, möchte×2, würde gern, muss",
)

# --- Skeleton 4: Freizeit ---
add_skeleton(
    "İSKELET 4 — Freizeit, Hobbys und Sport",
    "Boş Zaman, Hobiler ve Spor",
    [
        "Was sind Ihre Hobbys?",
        "Welchen Sport haben Sie als Kind gemacht?",
        "Worum geht es in Ihrem Text?  (Einleitungssatz)",
        "Wie wichtig ist Sport für die Gesundheit? Was meinen Sie?",
        "Was machen Sie gern in Ihrer Freizeit?",
        "Welches Hobby möchten Sie in Zukunft anfangen?",
    ],
    "In meinem Text geht es um das Thema Freizeit und Hobbys. Als Kind habe "
    "ich gern Fußball gespielt und bin oft mit Freunden ins Schwimmbad "
    "gegangen. Früher war Sport für mich sehr wichtig. Heute habe ich nicht "
    "so viel Zeit, aber ich mache trotzdem Sport. Im Moment gehe ich zweimal "
    "pro Woche ins Fitnessstudio, weil ich gesund bleiben möchte. In meiner "
    "Freizeit lese ich auch Bücher und höre Musik. Ich denke, dass Hobbys "
    "sehr wichtig sind, denn sie machen das Leben schöner. Sport ist auch "
    "gut für die Gesundheit. In Zukunft möchte ich Tennis lernen, weil es "
    "ein interessanter Sport ist. Zusammenfassend kann ich sagen, dass meine "
    "Freizeit mir viel Spaß macht.",
    "spielen (habe gespielt), gehen (bin gegangen), machen, lesen, hören, "
    "bleiben, lernen, denken",
    "als Kind, früher, heute, im Moment, in Zukunft  (5 von 6)",
    "Perfekt, weil×2, dass×2, möchte×2, denn, kann",
)

# --- Skeleton 5: Essen ---
add_skeleton(
    "İSKELET 5 — Essen und Kochen",
    "Yemek ve Pişirme",
    [
        "Was essen Sie gern? Was nicht?",
        "Können Sie kochen? Was haben Sie als Kind am liebsten gegessen?",
        "Worum geht es in Ihrem Text?  (Einleitungssatz)",
        "Ist gesundes Essen wichtig? Was meinen Sie?",
        "Wo essen Sie lieber: zu Hause oder im Restaurant?",
        "Welches Essen möchten Sie noch probieren?",
    ],
    "In meinem Text geht es um das Thema Essen und Kochen. Als Kind habe "
    "ich am liebsten Pizza und Pommes gegessen. Meine Mutter hat früher "
    "jeden Tag für die Familie gekocht. Heute koche ich auch oft selbst, "
    "weil ich gern neue Rezepte ausprobiere. Im Moment esse ich viel "
    "Gemüse und Obst, weil ich gesund leben möchte. Ich finde, dass "
    "gesundes Essen sehr wichtig ist. Man kann nicht ohne Essen leben. "
    "Ich esse lieber zu Hause, denn das ist billiger und gemütlicher. "
    "Manchmal gehe ich aber auch ins Restaurant. In Zukunft möchte ich "
    "italienisches und japanisches Essen probieren. Zusammenfassend kann "
    "ich sagen, dass Essen für mich nicht nur eine Notwendigkeit ist, "
    "sondern auch ein großes Vergnügen.",
    "essen (habe gegessen), kochen (hat gekocht), ausprobieren, leben, "
    "finden, gehen, probieren",
    "als Kind, früher, heute, im Moment, in Zukunft  (5 von 6)",
    "Perfekt, weil×2, dass×2, möchte×2, kann, denn",
)

# ---------- Backup themes ----------
pdf.add_page()
pdf.h2("Yedek Temalar")
pdf.para(
    "Sınavda 5 ana temadan farklı bir tema gelirse, aşağıdaki anahtar kelimeleri "
    "ve fiilleri kullanarak Genel İskelet Kalıbına (Bölüm 1) doldurulabilir."
)
pdf.ln(2)

backup = [
    ("Familie",        "Eltern, Geschwister, Großeltern, zusammen",
                       "leben, wohnen, helfen, lieben, verbringen"),
    ("Wohnen",         "Wohnung, Haus, Zimmer, Stadt, Dorf",
                       "wohnen, mieten, kaufen, möbliert sein, gefallen"),
    ("Gesundheit",     "Sport, Arzt, gesund, krank, Bewegung",
                       "sich fühlen, treiben, essen, schlafen, brauchen"),
    ("Mode / Einkaufen","Kleidung, Geschäft, Größe, Stil, Mode",
                       "kaufen, anziehen, tragen, passen, gefallen"),
    ("Technik / Medien","Handy, Internet, Computer, Social Media",
                       "benutzen, surfen, schreiben, telefonieren, sehen"),
    ("Stadt / Land",   "Stadt, Dorf, Verkehr, Natur, ruhig",
                       "wohnen, leben, gefallen, besuchen, vorziehen"),
]

# Table header
col_w = [38, 78, 64]
pdf.set_font("Calibri", "B", 10.5)
pdf.set_fill_color(*NAVY)
pdf.set_text_color(255, 255, 255)
headers = ["Tema", "Anahtar kelimeler", "Anahtar fiiller"]
for w, h in zip(col_w, headers):
    pdf.cell(w, 8, h, border=1, fill=True, align="L")
pdf.ln(8)

# Rows
pdf.set_text_color(*DARK)
fill = False
for theme, words, verbs in backup:
    row_h = 6
    # Calculate height based on longest cell
    pdf.set_font("Calibri", "B", 10)
    lines_a = pdf.multi_cell(col_w[0], row_h, theme, border=0, align="L",
                              dry_run=True, output="LINES")
    pdf.set_font("Calibri", "", 10)
    lines_b = pdf.multi_cell(col_w[1], row_h, words, border=0, align="L",
                              dry_run=True, output="LINES")
    lines_c = pdf.multi_cell(col_w[2], row_h, verbs, border=0, align="L",
                              dry_run=True, output="LINES")
    n = max(len(lines_a), len(lines_b), len(lines_c))
    h = row_h * n

    x = pdf.get_x()
    y = pdf.get_y()
    fill_color = (248, 248, 252) if fill else (255, 255, 255)
    pdf.set_fill_color(*fill_color)
    pdf.set_draw_color(*GRAY_BORDER)
    # Background + borders
    pdf.rect(x, y, sum(col_w), h, "DF")

    pdf.set_xy(x, y)
    pdf.set_font("Calibri", "B", 10)
    pdf.set_text_color(*NAVY)
    pdf.multi_cell(col_w[0], row_h, theme, border=0, align="L")

    pdf.set_xy(x + col_w[0], y)
    pdf.set_font("Calibri", "", 10)
    pdf.set_text_color(*DARK)
    pdf.multi_cell(col_w[1], row_h, words, border=0, align="L")

    pdf.set_xy(x + col_w[0] + col_w[1], y)
    pdf.multi_cell(col_w[2], row_h, verbs, border=0, align="L")

    pdf.set_y(y + h)
    fill = not fill

pdf.ln(6)

# Final note
pdf.set_fill_color(255, 248, 230)
pdf.set_draw_color(230, 200, 150)
y0 = pdf.get_y()
pdf.set_x(pdf.l_margin)
pdf.set_font("Calibri", "B", 10.5)
pdf.set_text_color(*ACCENT)
pdf.cell(0, 7, "Hızlı Hatırlatma", new_x="LMARGIN", new_y="NEXT")
pdf.set_font("Calibri", "", 10.5)
pdf.set_text_color(*DARK)
pdf.multi_cell(0, 6,
    "Yapı kelimeleri sırası: Als Kind → Früher → Heute / Im Moment → "
    "(Meinung) → In Zukunft. En az 4 tanesini metne yerleştir, "
    "ana cümlede fiil 2. pozisyonda, „weil/dass\" yan cümlelerinde fiil sonda.",
    new_x="LMARGIN", new_y="NEXT")

# Save
pdf.output(OUT)
print(f"OK: {OUT}")
