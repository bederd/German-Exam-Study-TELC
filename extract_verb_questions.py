import re
import json

def extract_verb_questions(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    extracted_blocks = []
    
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        
        # Soru kökü (Trigger) arama
        # "Ergänzen Sie die Verben" veya "Setzen Sie die Verben ein" vb.
        if re.search(r'(?i)(Ergänzen Sie|Setzen Sie).*Verben', line):
            block = {
                'line_number': i + 1,
                'instruction': line,
                'raw_text': []
            }
            
            j = i + 1
            blank_found = False
            bullet_found = False
            
            # Sonraki 40 satırı tarayalım
            while j < len(lines) and (j - i) < 40:
                current_line = lines[j].strip()
                if not current_line:
                    j += 1
                    continue
                    
                block['raw_text'].append(current_line)
                
                # Madde imi (fiil listesi) kontrolü
                if '•' in current_line:
                    bullet_found = True
                
                # Boşluk kontrolü (Örn: "... (1)" veya "......... (2)" veya sadece "(3)")
                if re.search(r'\.{2,}\s*\(\d+\)', current_line) or re.search(r'\(\d+\)', current_line):
                    blank_found = True
                    
                # Eğer başka bir ana soruya geçiş yapıyorsa erken bitir
                # (örneğin "a Hören Sie", "b Lesen Sie" gibi yeni kısımlar) ama metin içinde de olabilir
                
                j += 1
                
            # Eğer metinde numaralandırılmış boşluklar varsa kaydet
            if blank_found:
                extracted_blocks.append(block)
                i = j - 1 # Bulunan bloğun sonundan devam et (iç içe olmasın)
                
        i += 1
        
    return extracted_blocks

if __name__ == "__main__":
    filepath = r"c:\Users\Bedirhan\Desktop\deutsch\a1_raw.txt"
    blocks = extract_verb_questions(filepath)
    
    print(f"Toplam {len(blocks)} adet potansiyel fiil yerleştirme bloğu bulundu.")
    
    out_path = r"c:\Users\Bedirhan\Desktop\deutsch\verb_blocks.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(blocks, f, ensure_ascii=False, indent=4)
        
    print(f"Sonuçlar {out_path} dosyasına kaydedildi.")
