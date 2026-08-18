import sqlite3
import os
import time
import argparse
import google.generativeai as genai

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'deutschfit.db')

def setup_gemini(api_key):
    genai.configure(api_key=api_key)
    # Using gemini-1.5-flash for faster and cheaper processing
    model = genai.GenerativeModel('gemini-1.5-flash', generation_config={
        "temperature": 0.1,
    })
    return model

def process_texts(model, limit=None):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Get all reading texts
    texts = cursor.execute("SELECT id, text FROM lesen_texts").fetchall()
    
    total = len(texts)
    count = 0

    print(f"Toplam {total} metin analiz edilecek...\n")

    for t in texts:
        text_id = t['id']
        original_text = t['text']

        # Get the questions for context
        fragen = cursor.execute("SELECT frage, aussage FROM lesen_fragen WHERE text_id = ?", (text_id,)).fetchall()
        fragen_list = []
        for f in fragen:
            q = f['frage'] or f['aussage']
            if q:
                fragen_list.append(q)
        
        fragen_text = "\n".join(f"- {q}" for q in fragen_list)

        prompt = f"""
Sen bir Almanca dil uzmanısın. Görevin, bir okuma parçasındaki OCR (PDF'ten kopyalama) hatalarını düzeltmek ve metin bölündüğü için eksik kalan kişi adlarını (bağlamı) metnin başına eklemektir.

OKUMA PARÇASI:
{original_text}

BU PARÇAYA AİT SORULAR:
{fragen_text}

GÖREVLER:
1. OCR Hatalarını Düzelt: Parçadaki bozuk karakterleri düzelt (örn. '1 n Deutschland' -> 'In Deutschland', '~mas' -> 'Thomas', '1 ~~~mund' -> 'Dortmund', eksik harfler 'grte' -> 'größte', gereksiz boşluklar ve noktalama işaretleri 'z. B. ;' -> 'z. B.').
2. Bağlam Ekle: Eğer SORULAR kısmında bir kişi adı geçiyorsa (örn. Thomas, Felix, Jutta) ancak bu isim OKUMA PARÇASI içinde geçmiyorsa (örneğin parça 'Ich' veya 'Er' diye başlıyorsa), bu kişinin adını uygun bir şekilde parçanın en başına ekle (Örn: 'Thomas: Ich...' veya 'Über Thomas: Er...'). Eğer parça zaten anlaşılabiliyorsa veya eksik isim yoksa bağlam ekleme.
3. SADECE DÜZELTİLMİŞ METNİ DÖNDÜR. Ekstra açıklama, markdown veya not ekleme.
"""
        try:
            response = model.generate_content(prompt)
            corrected_text = response.text.strip()

            if corrected_text != original_text.strip():
                print(f"--- GÜNCELLENDİ: {text_id} ---")
                print(f"ESKİ: {original_text}")
                print(f"YENİ: {corrected_text}\n")
                
                # Update the database
                conn.execute("UPDATE lesen_texts SET text = ? WHERE id = ?", (corrected_text, text_id))
                conn.commit()
            
            count += 1
            if limit and count >= limit:
                break
                
            time.sleep(1) # Prevent rate limiting
            
        except Exception as e:
            print(f"Hata ({text_id}): {e}")

    conn.close()
    print("İşlem tamamlandı!")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fix OCR anomalies in texts using Gemini")
    parser.add_argument("--api-key", required=True, help="Gemini API Key")
    parser.add_argument("--limit", type=int, default=None, help="Process only N texts (for testing)")
    args = parser.parse_args()

    model = setup_gemini(args.api_key)
    process_texts(model, args.limit)
