import markdown
import subprocess
import os
import sys
from pathlib import Path

BASE = Path(r"C:\Users\Bedirhan\Desktop\schreiben")
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

# Tema renkleri: her dosya için farklı renk paleti
THEMES = {
    "ezber-stratejisi": {
        "name": "Çalışma Stratejisi",
        "subtitle": "2 Gün, 4 Sınav Bölümü — Saat Saat Plan",
        "primary": "#6d28d9",      # violet-700
        "primary_light": "#ede9fe",  # violet-100
        "primary_soft": "#f5f3ff",   # violet-50
        "accent": "#a78bfa",          # violet-400
        "icon": "🧠",
    },
    "schreiben-calisma": {
        "name": "Schreiben Çalışma",
        "subtitle": "5 İskelet · Modüler Bloklar · Forumsbeitrag · Telefon",
        "primary": "#1d4ed8",      # blue-700
        "primary_light": "#dbeafe",  # blue-100
        "primary_soft": "#eff6ff",   # blue-50
        "accent": "#60a5fa",          # blue-400
        "icon": "✍️",
    },
    "fiil-yerlestirme": {
        "name": "Fiil Yerleştirme",
        "subtitle": "Lückentext · 7 Yapı · 25 Düzensiz Fiil · Alıştırmalar",
        "primary": "#047857",      # emerald-700
        "primary_light": "#d1fae5",  # emerald-100
        "primary_soft": "#ecfdf5",   # emerald-50
        "accent": "#34d399",          # emerald-400
        "icon": "🔧",
    },
    "lesen-hoeren-strateji": {
        "name": "Lesen + Hören Stratejisi",
        "subtitle": "Okuma · Dinleme · Karar Ağaçları · Anahtar Kelimeler",
        "primary": "#c2410c",      # orange-700
        "primary_light": "#ffedd5",  # orange-100
        "primary_soft": "#fff7ed",   # orange-50
        "accent": "#fb923c",          # orange-400
        "icon": "👂",
    },
}


def build_html(md_text: str, theme: dict) -> str:
    html_body = markdown.markdown(
        md_text,
        extensions=[
            "extra",        # tables, fenced code, abbreviations
            "sane_lists",
            "toc",
            "nl2br",
        ],
        output_format="html5",
    )

    css = f"""
    @page {{
      size: A4;
      margin: 18mm 16mm 20mm 16mm;
    }}

    * {{ box-sizing: border-box; }}

    html, body {{
      margin: 0;
      padding: 0;
      font-family: 'Segoe UI', 'Inter', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif;
      font-size: 10.8pt;
      line-height: 1.65;
      color: #1f2937;
      background: #ffffff;
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
    }}

    /* Kapak / başlık şeridi */
    .cover {{
      background: linear-gradient(135deg, {theme['primary']} 0%, {theme['accent']} 100%);
      color: #ffffff;
      padding: 28mm 14mm 20mm 14mm;
      margin: -18mm -16mm 10mm -16mm;
      border-radius: 0;
      page-break-after: avoid;
    }}
    .cover .icon {{
      font-size: 36pt;
      line-height: 1;
      margin-bottom: 8mm;
      filter: drop-shadow(0 2px 6px rgba(0,0,0,0.15));
    }}
    .cover h1.cover-title {{
      font-size: 28pt;
      margin: 0 0 4mm 0;
      padding: 0;
      border: none;
      color: #ffffff;
      font-weight: 800;
      letter-spacing: -0.5px;
    }}
    .cover .cover-sub {{
      font-size: 12pt;
      opacity: 0.92;
      font-weight: 400;
      max-width: 90%;
    }}
    .cover .cover-meta {{
      margin-top: 10mm;
      font-size: 9pt;
      opacity: 0.85;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }}

    /* Başlıklar */
    h1, h2, h3, h4, h5, h6 {{
      font-family: 'Segoe UI', 'Inter', sans-serif;
      color: #111827;
      page-break-after: avoid;
      page-break-inside: avoid;
    }}

    h1 {{
      font-size: 20pt;
      font-weight: 800;
      margin: 14mm 0 5mm 0;
      padding-bottom: 3mm;
      border-bottom: 3px solid {theme['primary']};
      color: {theme['primary']};
      letter-spacing: -0.3px;
    }}

    h2 {{
      font-size: 15pt;
      font-weight: 700;
      margin: 11mm 0 4mm 0;
      padding: 2mm 4mm 2mm 4mm;
      background: {theme['primary_light']};
      border-left: 4px solid {theme['primary']};
      color: {theme['primary']};
      border-radius: 0 4px 4px 0;
    }}

    h3 {{
      font-size: 12.5pt;
      font-weight: 700;
      margin: 8mm 0 3mm 0;
      color: {theme['primary']};
      padding-left: 3mm;
      border-left: 3px solid {theme['accent']};
    }}

    h4 {{
      font-size: 11.5pt;
      font-weight: 700;
      margin: 6mm 0 2mm 0;
      color: #374151;
    }}

    h5, h6 {{
      font-size: 11pt;
      font-weight: 600;
      margin: 5mm 0 2mm 0;
      color: #4b5563;
    }}

    p {{
      margin: 0 0 3mm 0;
      orphans: 3;
      widows: 3;
    }}

    /* Vurgu */
    strong, b {{
      color: #111827;
      font-weight: 700;
    }}
    em, i {{
      color: #4b5563;
    }}

    /* Linkler */
    a {{
      color: {theme['primary']};
      text-decoration: none;
      border-bottom: 1px dotted {theme['accent']};
    }}

    /* Kod */
    code {{
      font-family: 'Consolas', 'SF Mono', 'Monaco', monospace;
      font-size: 0.92em;
      background: {theme['primary_soft']};
      color: {theme['primary']};
      padding: 0.5mm 1.5mm;
      border-radius: 3px;
      border: 1px solid {theme['primary_light']};
    }}
    pre {{
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-left: 4px solid {theme['accent']};
      border-radius: 6px;
      padding: 4mm 5mm;
      margin: 4mm 0;
      overflow-x: auto;
      page-break-inside: avoid;
      font-size: 9.8pt;
      line-height: 1.55;
    }}
    pre code {{
      background: none;
      border: none;
      color: #1f2937;
      padding: 0;
      font-size: inherit;
    }}

    /* Blockquote */
    blockquote {{
      margin: 4mm 0;
      padding: 3mm 5mm;
      background: {theme['primary_soft']};
      border-left: 4px solid {theme['primary']};
      border-radius: 0 6px 6px 0;
      color: #374151;
      page-break-inside: avoid;
    }}
    blockquote p {{
      margin: 0 0 2mm 0;
    }}
    blockquote p:last-child {{
      margin-bottom: 0;
    }}
    blockquote strong {{
      color: {theme['primary']};
    }}

    /* Listeler */
    ul, ol {{
      margin: 2mm 0 4mm 0;
      padding-left: 7mm;
    }}
    li {{
      margin: 1.2mm 0;
    }}
    li::marker {{
      color: {theme['primary']};
      font-weight: 700;
    }}
    ul ul, ol ol, ul ol, ol ul {{
      margin: 1mm 0;
    }}

    /* Tablolar */
    table {{
      border-collapse: collapse;
      width: 100%;
      margin: 4mm 0;
      font-size: 9.8pt;
      page-break-inside: auto;
      border-radius: 6px;
      overflow: hidden;
      box-shadow: 0 0 0 1px #e5e7eb;
    }}
    thead {{
      display: table-header-group;
    }}
    tr {{
      page-break-inside: avoid;
    }}
    th {{
      background: {theme['primary']};
      color: #ffffff;
      font-weight: 700;
      text-align: left;
      padding: 2.5mm 3mm;
      border: 1px solid {theme['primary']};
      font-size: 9.5pt;
    }}
    td {{
      padding: 2.5mm 3mm;
      border: 1px solid #e5e7eb;
      vertical-align: top;
    }}
    tbody tr:nth-child(odd) {{
      background: {theme['primary_soft']};
    }}
    tbody tr:hover {{
      background: {theme['primary_light']};
    }}
    table code {{
      font-size: 0.88em;
      padding: 0.3mm 1mm;
    }}

    /* Yatay çizgi — bölüm ayırıcı */
    hr {{
      border: none;
      height: 0;
      margin: 8mm 0;
      border-top: 2px dashed {theme['primary_light']};
      page-break-after: auto;
    }}

    /* Dipnot benzeri small */
    small {{
      font-size: 9pt;
      color: #6b7280;
    }}

    /* Sayfa kırılma kontrolü */
    h1, h2 {{
      page-break-before: auto;
    }}
    table, pre, blockquote {{
      page-break-inside: avoid;
    }}

    /* Print iyileştirme */
    @media print {{
      body {{
        font-size: 10.5pt;
      }}
      a {{
        color: {theme['primary']};
      }}
    }}
    """

    return f"""<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<title>{theme['name']}</title>
<style>{css}</style>
</head>
<body>
<div class="cover">
  <div class="icon">{theme['icon']}</div>
  <h1 class="cover-title">{theme['name']}</h1>
  <div class="cover-sub">{theme['subtitle']}</div>
  <div class="cover-meta">Sınav: 29 Nisan 2026 · Hazırlık Notu</div>
</div>
{html_body}
</body>
</html>
"""


def convert(md_path: Path, html_path: Path, pdf_path: Path, theme: dict):
    md_text = md_path.read_text(encoding="utf-8")
    html = build_html(md_text, theme)
    html_path.write_text(html, encoding="utf-8")

    cmd = [
        CHROME,
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--no-pdf-header-footer",
        f"--print-to-pdf={pdf_path}",
        f"file:///{html_path.as_posix()}",
    ]
    print(f"  -> {pdf_path.name}")
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    if result.returncode != 0:
        print("STDERR:", result.stderr[-500:])
        raise RuntimeError(f"Chrome başarısız: {pdf_path.name}")


def main():
    out_html = BASE / "_html_temp"
    out_html.mkdir(exist_ok=True)

    for stem, theme in THEMES.items():
        md_path = BASE / f"{stem}.md"
        if not md_path.exists():
            print(f"ATLANDI: {md_path.name} bulunamadı")
            continue
        html_path = out_html / f"{stem}.html"
        pdf_path = BASE / f"{stem}.pdf"
        print(f"İşleniyor: {md_path.name}")
        convert(md_path, html_path, pdf_path, theme)

    print("\nBitti. PDFler:")
    for stem in THEMES:
        p = BASE / f"{stem}.pdf"
        if p.exists():
            size_kb = p.stat().st_size // 1024
            print(f"  {p.name}  ({size_kb} KB)")


if __name__ == "__main__":
    main()
