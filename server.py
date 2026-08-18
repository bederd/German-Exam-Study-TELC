"""
DeutschFit Server — REST API + Static File Server
Calistir: python server.py
Adres:    http://localhost:8080
"""
import http.server
import threading
import signal
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError
import json
import os
import random
import sqlite3
import urllib.parse
from http import HTTPStatus
import warnings
import traceback


warnings.filterwarnings("ignore", category=FutureWarning, module="google.*")
warnings.filterwarnings("ignore", category=DeprecationWarning, module="google.*")

DB_PATH = os.path.join(os.path.dirname(__file__), 'data', 'deutschfit.db')
WORDS_DB_PATH = os.path.join(os.path.dirname(__file__), 'woerter_db.json')
SERVE_DIR = os.path.join(os.path.dirname(__file__), 'app')
PORT = 8080

def load_env():
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    if os.path.exists(env_path):
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'): continue
                if '=' in line:
                    k, v = line.split('=', 1)
                    os.environ[k.strip()] = v.strip()

load_env()

_words_file_lock = threading.Lock()


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


# ─── API Handlers ────────────────────────────────────────────────────────────

def api_lesen_random(level):
    """Rastgele bir okuma metni + sorularini dondur."""
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM lesen_texts WHERE level=? ORDER BY RANDOM() LIMIT 1", (level,)
    ).fetchone()
    if not row:
        conn.close()
        return None
    text_id = row['id']
    fragen = conn.execute(
        "SELECT * FROM lesen_fragen WHERE text_id=?", (text_id,)
    ).fetchall()
    result = {
        'id': row['id'],
        'level': row['level'],
        'titel': row['titel'],
        'text': row['text'],
        'quelle': row['quelle'],
        'fragen': [dict(f) for f in fragen]
    }
    # Parse optionen JSON strings back to arrays
    for f in result['fragen']:
        if f.get('optionen'):
            try:
                f['optionen'] = json.loads(f['optionen'])
            except Exception:
                pass
    conn.close()
    return result


def api_lesen_all(level):
    """Seviyedeki tum metin ID'lerini dondur (tamamlanmis kontrolu icin)."""
    conn = get_db()
    rows = conn.execute(
        "SELECT id FROM lesen_texts WHERE level=?", (level,)
    ).fetchall()
    conn.close()
    return [r['id'] for r in rows]


def api_grammatik(level, typ, count=5):
    """Rastgele grammatik sorulari dondur."""
    conn = get_db()
    table_map = {
        'luecke': ('grammatik_luecke', ['id','level','satz','optionen','antwort','erklaerung','hinweis']),
        'konjugation': ('grammatik_konjugation', ['id','level','verb','person','zeitform','satz','optionen','antwort','erklaerung']),
        'satzstellung': ('grammatik_satzstellung', ['id','level','satz','woerter','erklaerung']),
        'text-luecke': ('grammatik_text_luecke', ['id','level','instruction','word_bank','text','answers']),
    }
    if typ not in table_map:
        conn.close()
        return []
    table, _ = table_map[typ]
    rows = conn.execute(
        f"SELECT * FROM {table} WHERE level=? ORDER BY RANDOM() LIMIT ?", (level, count)
    ).fetchall()
    result = [dict(r) for r in rows]
    for r in result:
        for field in ('optionen', 'woerter', 'word_bank', 'answers'):
            if r.get(field):
                try:
                    r[field] = json.loads(r[field])
                except Exception:
                    pass
    conn.close()
    return result


def api_hoeren(level, count=3):
    """Rastgele dinleme metinleri + sorulari dondur."""
    conn = get_db()
    texts = conn.execute(
        "SELECT * FROM hoeren_texte WHERE level=? ORDER BY RANDOM() LIMIT ?", (level, count)
    ).fetchall()
    result = []
    for t in texts:
        fragen = conn.execute(
            "SELECT * FROM hoeren_fragen WHERE text_id=?", (t['id'],)
        ).fetchall()
        entry = dict(t)
        entry['fragen'] = []
        for f in fragen:
            fd = dict(f)
            if fd.get('optionen'):
                try:
                    fd['optionen'] = json.loads(fd['optionen'])
                except Exception:
                    pass
            entry['fragen'].append(fd)
        result.append(entry)
    conn.close()
    return result


def api_schreiben(level):
    """Rastgele bir yazma temasiyla ilgili bilgileri dondur."""
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM schreiben_themen WHERE level=? ORDER BY RANDOM() LIMIT 1", (level,)
    ).fetchone()
    if not row:
        conn.close()
        return None
    result = dict(row)
    for field in ('fragen', 'tipps'):
        if result.get(field):
            try:
                result[field] = json.loads(result[field])
            except Exception:
                pass
    conn.close()
    return result


def api_stats(level):
    """Temel veritabani istatistikleri."""
    conn = get_db()
    lesen_count = conn.execute(
        "SELECT COUNT(*) as c FROM lesen_texts WHERE level=?", (level,)
    ).fetchone()['c']
    fragen_count = conn.execute(
        "SELECT COUNT(*) as c FROM lesen_fragen f JOIN lesen_texts t ON f.text_id=t.id WHERE t.level=?", (level,)
    ).fetchone()['c']
    grammatik_count = conn.execute(
        "SELECT (SELECT COUNT(*) FROM grammatik_luecke WHERE level=?) + "
        "(SELECT COUNT(*) FROM grammatik_konjugation WHERE level=?) + "
        "(SELECT COUNT(*) FROM grammatik_satzstellung WHERE level=?) as c",
        (level, level, level)
    ).fetchone()['c']
    conn.close()
    return {
        'level': level,
        'lesen_texts': lesen_count,
        'lesen_fragen': fragen_count,
        'grammatik_total': grammatik_count,
    }


# ─── API Handlers ────────────────────────────────────────────────────────────
from google import genai
from google.genai import types

def _call_gemini(client, prompt, system_instruction, response_mime_type=None):
    config_args = {}
    if system_instruction:
        config_args["system_instruction"] = system_instruction
    if response_mime_type:
        config_args["response_mime_type"] = response_mime_type
        
    response = client.models.generate_content(
        model='gemini-3.6-flash',
        contents=prompt,
        config=types.GenerateContentConfig(**config_args) if config_args else None,
    )
    return response.text

def api_evaluate_schreiben(data, api_key):
    """Gemini API kullanarak yazma görevini değerlendir."""
    api_key = api_key or os.environ.get('GEMINI_API_KEY')
    if not api_key:
        return {"error": "API anahtarı eksik. Lütfen .env dosyasına veya ayarlara Gemini API anahtarınızı girin."}
    
    try:
        client = genai.Client(api_key=api_key)
        
        system_instruction = (
            "You are an expert, deterministic German Language Assessment API and Pedagogical Engine. Your sole purpose is to evaluate A1/A2 level German texts written by students based on a specific prompt, rigorously enforce grammatical rules like a strict rule-engine, and output a deeply pedagogical evaluation exclusively in a pure, unformatted JSON structure.\n\n"
            "DO NOT behave like a conversational AI. DO NOT output any markdown (such as ```json). DO NOT output any introductory or concluding text. Your entire response must be a single, valid, parseable JSON object.\n\n"
            "### EVALUATION FRAMEWORK & SCORING WEIGHTS\n"
            "The total score is exactly 100. It is divided into two distinct traits:\n"
            "1. Content & Task Fulfillment (Aufgabenerfüllung) - Max 40 Points.\n"
            "2. Grammar & Structural Accuracy (Grammatik) - Max 60 Points.\n\n"
            "### STEP 1: GIBBERISH & VALIDITY CHECK (CRITICAL INITIAL GATE)\n"
            "Before assessing, analyze the provided `student_text`.\n"
            "- If the text is keyboard smashing (e.g., \"asdfgh\"), random letters, entirely in a language other than German, or completely incomprehensible to the point where no linguistic analysis is possible:\n"
            "  - Immediately set total score to 0.\n"
            "  - Set Content score to 0.\n"
            "  - Set Grammar score to 0.\n"
            "  - Add an error object indicating the text is invalid/gibberish.\n"
            "  - Output the JSON and STOP.\n\n"
            "### STEP 2: CONTENT EVALUATION (40 Points)\n"
            "Evaluate how well the `student_text` addresses the `assignment_prompt`.\n"
            "- 40/40: All parts of the assignment prompt are addressed logically and contextually.\n"
            "- Deduct points proportionally for missing information or off-topic sentences.\n"
            "- If the text is completely unrelated to the `assignment_prompt`, set Content score to 0.\n\n"
            "### STEP 3: DETERMINISTIC GRAMMAR EVALUATION (60 Points)\n"
            "Act as a deterministic rule-based engine. Scan the text meticulously for the following specific A1/A2 CEFR grammatical rules. Deduct points from the 60 Grammar points for each error found. DO NOT penalize the student for not using advanced B1+ structures. Evaluate based on simplicity and correctness.\n\n"
            "CRITICAL RULES TO ENFORCE:\n"
            "1. Noun Capitalization (Großschreibung): Check every single word. If it is a noun (Substantiv), it MUST begin with a capital letter.\n"
            "2. V2 Rule (Verb-Zweit-Stellung): In declarative main clauses (Hauptsätze), the finite (conjugated) verb MUST be exactly in the second topological position. Check for inversion errors (e.g., \"Heute ich gehe...\" is WRONG, must be \"Heute gehe ich...\").\n"
            "3. Separable Verbs (Trennbare Verben): Identify if a separable verb is used. The finite base verb must be in position 2, and the separable prefix MUST be at the very end of the clause.\n"
            "4. Article and Case Agreement (Kasus: Nominativ, Akkusativ, Dativ): Check the valency of every verb and preposition. \n"
            "   - Does the preposition require Dativ? (e.g., mit, nach, bei). Check if the article matches the gender, number, and required case.\n"
            "   - Does the verb require Akkusativ? Check the direct object.\n"
            "   - Check Subject-Verb agreement (Personalendung).\n\n"
            "### STEP 4: PEDAGOGICAL FEEDBACK GENERATION\n"
            "For every error detected, you must explain not just what is wrong, but WHY it is wrong in a supportive, pedagogical tone in Turkish. \n"
            "- Example explanation: \"Almancada isimlerin ilk harfi her zaman büyük yazılmalıdır. Bu yüzden 'auto' kelimesi 'Auto' şeklinde yazılmalıdır.\"\n"
            "- Example explanation: \"Zaman zarfı (Heute) cümlenin başına geldiğinde, Almancada V2 kuralı gereği çekimli fiil ikinci sırada kalmalıdır. Bu nedenle 'Heute ich spiele' yerine 'Heute spiele ich' demelisin.\"\n\n"
            "### STEP 5: OUTPUT GENERATION (STRICT JSON SCHEMA)\n"
            "Construct your response matching this exact JSON structure and nothing else.\n\n"
            "{\n"
            "  \"total_score\": <integer 0-100>,\n"
            "  \"content_score\": <integer 0-40>,\n"
            "  \"grammar_score\": <integer 0-60>,\n"
            "  \"feedback_summary\": \"<string: A brief, encouraging overall summary of the student's performance in Turkish>\",\n"
            "  \"improved_text\": \"<string: The fully corrected version of the student's text, maintaining their original meaning but fixing all grammatical and orthographic errors>\",\n"
            "  \"errors\": [\n"
            "    {\n"
            "      \"error_type\": \"<string: e.g., 'Großschreibung', 'V2-Regel', 'Kasus', 'Wortschatz'>\",\n"
            "      \"original_segment\": \"<string: the exact wrong word or phrase from the student text>\",\n"
            "      \"correction\": \"<string: the corrected word or phrase>\",\n"
            "      \"explanation\": \"<string: pedagogical explanation in Turkish of WHY this is an error and what the rule is>\"\n"
            "    }\n"
            "  ]\n"
            "}\n\n"
            "If there are no errors, the \"errors\" array must be empty `[]`. Do not invent errors to reach a certain number. If the student made only 1 or 2 errors, just list those. You are NOT required to provide exactly 3 errors.\n"
            "Ensure the JSON is properly escaped. \n"
            "OUTPUT ONLY VALID JSON."
        )
        
        thema = data.get('thema', '')
        kontext = data.get('kontext', '')
        fragen = data.get('fragen', [])
        user_text = data.get('text', '')
        typ = data.get('typ', 'popquiz')
        
        assignment_prompt = f"Aufgabentyp: {typ}\nThema: {thema}\nKontext/Situation: {kontext}\nZu beantwortende Punkte/Fragen:\n"
        for f in fragen:
            assignment_prompt += f"- {f}\n"
            
        prompt = f"assignment_prompt:\n{assignment_prompt}\n\nstudent_text:\n\"{user_text}\""
        
        with ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(_call_gemini, client, prompt, system_instruction, "application/json")
            try:
                text_resp = future.result(timeout=60)
            except FuturesTimeoutError:
                return {"error": "İstek zaman aşımına uğradı. Lütfen tekrar deneyin."}
                
        # Markdown backticks temizle
        if text_resp.startswith("```"):
            lines = text_resp.split("\n")
            text_resp = "\n".join(lines[1:-1])
            
        # Optional extra clean for any leading/trailing garbage
        jsonMatch = text_resp.find("{")
        if jsonMatch != -1:
             text_resp = text_resp[jsonMatch:]
             lastJsonMatch = text_resp.rfind("}")
             if lastJsonMatch != -1:
                 text_resp = text_resp[:lastJsonMatch+1]
        
        result_json = json.loads(text_resp)
        return result_json
        
    except Exception as e:
        return {"error": str(e)}

def api_analyze_word(data, api_key):
    """Gemini API kullanarak kelime analizini yap."""
    api_key = api_key or os.environ.get('GEMINI_API_KEY')
    if not api_key:
        return {"error": "API anahtarı eksik."}

    word = data.get('word', '')
    prompt = f"""Sen bir Almanca kelime analiz uzmanısın. Aşağıdaki kelimeyi analiz et: "{word}"
Eğer isimse: artikel, plural, turkce, ingilizce, örnek cümleler (en fazla 2 kısa örnek).
Eğer fiilse: conjugation (ich, du, er_sie_es, wir, ihr, sie_Sie), perfekt, praeteritum, kasus, common_preposition (varsa), regelmaessig, turkce, ingilizce, örnek cümleler (en fazla 2 kısa örnek).
Eğer sıfat/zarf ise: turkce, ingilizce, komparativ, superlativ, örnek cümleler (en fazla 2 kısa örnek).
Eğer edat (preposition) ise: turkce, ingilizce, kasus (akk/dat/wechsel), örnek cümleler (en fazla 2 kısa örnek).

Her bir kelime türü için, "type" alanını (isim, fiil, sıfat, preposition) mutlaka belirt.
Örnek cümleleri sen üret. Her örneğin "sentence" ve "translation" kısımları olsun.

SADECE JSON FORMATINDA ÇIKTI VER."""
    
    try:
        client = genai.Client(api_key=api_key)
        with ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(_call_gemini, client, prompt, "", "application/json")
            try:
                text_resp = future.result(timeout=60)
            except FuturesTimeoutError:
                return {"error": "İstek zaman aşımına uğradı."}
        
        # Markdown backticks temizle
        if text_resp.startswith("```"):
            lines = text_resp.split("\n")
            text_resp = "\n".join(lines[1:-1])
            
        jsonMatch = text_resp.find("{")
        if jsonMatch != -1:
             text_resp = text_resp[jsonMatch:]
             lastJsonMatch = text_resp.rfind("}")
             if lastJsonMatch != -1:
                 text_resp = text_resp[:lastJsonMatch+1]

        result_json = json.loads(text_resp)
        result_json['word'] = word
        return {"success": True, "analysis": result_json}
    except json.JSONDecodeError:
        return {"error": "Geçersiz JSON formatı alındı."}
    except Exception as e:
        if "429" in str(e):
            return {"error": "API istek limiti aşıldı (Rate Limit). Lütfen biraz bekleyip tekrar deneyin."}
        return {"error": str(e)}

def api_verify_word(data, api_key):
    """Gemini API kullanarak kelime analizini doğrula."""
    api_key = api_key or os.environ.get('GEMINI_API_KEY')
    if not api_key:
        return {"error": "API anahtarı eksik."}

    word_data = data.get('wordData', {})
    prompt = f"""Lütfen aşağıdaki Almanca kelime analizini dilbilgisi hatalarına karşı kontrol et ve hataları düzelterek aynı JSON formatında geri döndür. Örnek cümlelerin gramerini ve çevirilerini özellikle kontrol et:

{json.dumps(word_data, indent=2, ensure_ascii=False)}

SADECE JSON FORMATINDA CEVAP VER."""

    try:
        client = genai.Client(api_key=api_key)
        with ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(_call_gemini, client, prompt, "", "application/json")
            try:
                text_resp = future.result(timeout=60)
            except FuturesTimeoutError:
                return {"error": "İstek zaman aşımına uğradı."}
        
        # Markdown backticks temizle
        if text_resp.startswith("```"):
            lines = text_resp.split("\n")
            text_resp = "\n".join(lines[1:-1])
            
        jsonMatch = text_resp.find("{")
        if jsonMatch != -1:
             text_resp = text_resp[jsonMatch:]
             lastJsonMatch = text_resp.rfind("}")
             if lastJsonMatch != -1:
                 text_resp = text_resp[:lastJsonMatch+1]

        result_json = json.loads(text_resp)
        return {"success": True, "analysis": result_json}
    except json.JSONDecodeError:
        return {"error": "Geçersiz JSON formatı alındı."}
    except Exception as e:
        if "429" in str(e):
            return {"error": "API istek limiti aşıldı (Rate Limit). Lütfen biraz bekleyip tekrar deneyin."}
        return {"error": str(e)}

def api_evaluate_hoeren(data, api_key):
    """Gemini API kullanarak dinleme metni açık uçlu cevaplarını değerlendir."""
    api_key = api_key or os.environ.get('GEMINI_API_KEY')
    if not api_key:
        return {"error": "API anahtarı eksik."}

    user_ans = data.get('user_ans', '')
    correct_ans = data.get('correct_ans', '')
    
    prompt = f"""Sen bir Almanca öğretmenisin. Bir dinleme sınavında öğrencinin verdiği cevap ile beklenen doğru cevabı anlamsal olarak karşılaştıracaksın.
Öğrencinin dilbilgisi kurallarına uyması ve cümlenin tamamen aynı anlama gelmesi önemlidir (Örn: 'Anna' yerine 'sie' kullanılması bağlama göre doğru kabul edilebilir). Eğer anlam ve gramer doğruysa cevabı doğru kabul et. Ufak harf/yazım hatalarını affedebilirsin.

Beklenen Doğru Cevap: "{correct_ans}"
Öğrencinin Verdiği Cevap: "{user_ans}"

Lütfen SADECE geçerli bir JSON objesi döndür (Markdown code block olmadan). Format:
{{"is_correct": true, "reason": "kısa Türkçe açıklama"}}"""
    
    try:
        client = genai.Client(api_key=api_key)
        with ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(_call_gemini, client, prompt, "", "application/json")
            try:
                text_resp = future.result(timeout=60)
            except FuturesTimeoutError:
                return {"error": "İstek zaman aşımına uğradı."}
        
        if text_resp.startswith("```"):
            lines = text_resp.split("\n")
            text_resp = "\n".join(lines[1:-1])
            
        jsonMatch = text_resp.find("{")
        if jsonMatch != -1:
             text_resp = text_resp[jsonMatch:]
             lastJsonMatch = text_resp.rfind("}")
             if lastJsonMatch != -1:
                 text_resp = text_resp[:lastJsonMatch+1]

        result_json = json.loads(text_resp)
        return {"success": True, "evaluation": result_json}
    except json.JSONDecodeError:
        return {"error": "Geçersiz JSON formatı alındı."}
    except Exception as e:
        if "429" in str(e):
            return {"error": "API istek limiti aşıldı (Rate Limit). Lütfen biraz bekleyip tekrar deneyin."}
        return {"error": str(e)}

def api_words_get():
    """Tum kelimeleri getir."""
    try:
        with open(WORDS_DB_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {"words": []}

def api_words_post(new_word):
    """Yeni bir kelime kaydet veya guncelle."""
    with _words_file_lock:
        try:
            with open(WORDS_DB_PATH, 'r', encoding='utf-8') as f:
                db = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            db = {"words": []}
        
        word_text = new_word.get("word", "").lower()
        wtype = new_word.get("type", "")
        
        existing_idx = None
        for i, entry in enumerate(db.get("words", [])):
            if entry.get("word", "").lower() == word_text and entry.get("type") == wtype:
                existing_idx = i
                break
                
        from datetime import datetime
        new_word["last_updated"] = datetime.now().isoformat(timespec='seconds')
        
        if existing_idx is not None:
            db["words"][existing_idx] = new_word
        else:
            if "words" not in db:
                db["words"] = []
            db["words"].append(new_word)
            
        with open(WORDS_DB_PATH, 'w', encoding='utf-8') as f:
            json.dump(db, f, ensure_ascii=False, indent=2)
            
    return {"success": True, "message": "Word saved", "word": new_word}

# ─── HTTP Handler ─────────────────────────────────────────────────────────────

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=SERVE_DIR, **kwargs)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def do_GET(self):
        try:
            parsed = urllib.parse.urlparse(self.path)
            path = parsed.path
            params = urllib.parse.parse_qs(parsed.query)

            def param(key, default=None):
                return params.get(key, [default])[0]

            print(f"[{self.address_string()}] GET {path}")

            # ── API routes ──
            if path.startswith('/api/'):
                if path == '/api/config':
                    self._send_json({"gemini_api_key": os.environ.get('GEMINI_API_KEY', '')})
                    return

                level = param('level', 'a1')
                data = None

                if path == '/api/lesen/random':
                    data = api_lesen_random(level)
                elif path == '/api/lesen/all':
                    data = api_lesen_all(level)
                elif path == '/api/grammatik':
                    typ = param('typ', 'luecke')
                    count = int(param('count', '5'))
                    data = api_grammatik(level, typ, count)
                elif path == '/api/hoeren':
                    count = int(param('count', '3'))
                    data = api_hoeren(level, count)
                elif path == '/api/schreiben':
                    data = api_schreiben(level)
                elif path == '/api/stats':
                    data = api_stats(level)
                elif path == '/api/words':
                    data = api_words_get()
                else:
                    self._send_json({'error': 'Not found'}, 404)
                    return

                self._send_json(data)
                return
            
            # Handle old /app/ URLs by redirecting to root
            if path.startswith('/app'):
                new_path = path[4:] if len(path) > 4 else '/'
                if not new_path.startswith('/'):
                    new_path = '/' + new_path
                self.send_response(301)
                self.send_header('Location', new_path)
                self.end_headers()
                return
            
            # Static files
            super().do_GET()
            
        except Exception as e:
            print(f"Server Error on GET: {e}")
            self._send_json({'error': 'Internal server error'}, 500)

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        
        if path == '/api/words':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            try:
                new_word = json.loads(body)
                result = api_words_post(new_word)
                self._send_json(result)
            except Exception as e:
                self._send_json({'error': str(e)}, 500)
            return
            
        if path == '/api/evaluate-schreiben':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data)
                api_key = data.get('api_key')
                result = api_evaluate_schreiben(data, api_key)
                if "error" in result:
                    self._send_json(result, status=400)
                else:
                    self._send_json(result, status=200)
            except json.JSONDecodeError:
                self._send_json({"error": "Invalid JSON"}, status=400)
            except Exception as e:
                self._send_json({"error": str(e)}, status=500)
            return

        if path == '/api/analyze-word':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data)
                api_key = data.get('api_key')
                result = api_analyze_word(data, api_key)
                if "error" in result:
                    self._send_json(result, status=400)
                else:
                    self._send_json(result, status=200)
            except json.JSONDecodeError:
                self._send_json({"error": "Invalid JSON"}, status=400)
            except Exception as e:
                self._send_json({"error": str(e)}, status=500)
            return

        if path == '/api/verify-word':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data)
                api_key = data.get('api_key')
                result = api_verify_word(data, api_key)
                if "error" in result:
                    self._send_json(result, status=400)
                else:
                    self._send_json(result, status=200)
            except json.JSONDecodeError:
                self._send_json({"error": "Invalid JSON"}, status=400)
            except Exception as e:
                self._send_json({"error": str(e)}, status=500)
            return

        if path == '/api/evaluate-hoeren':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data)
                api_key = data.get('api_key')
                result = api_evaluate_hoeren(data, api_key)
                if "error" in result:
                    self._send_json(result, status=400)
                else:
                    self._send_json(result, status=200)
            except json.JSONDecodeError:
                self._send_json({"error": "Invalid JSON"}, status=400)
            except Exception as e:
                self._send_json({"error": str(e)}, status=500)
            return

        self._send_json({'error': 'Not found'}, 404)

    def _send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(body)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, format, *args):
        print(f'  {self.address_string()} {format % args}')


if __name__ == '__main__':
    os.chdir(os.path.dirname(__file__))
    print(f'DeutschFit sunucu basliyor: http://localhost:{PORT}/')
    print(f'Veritabani: {DB_PATH}')
    http.server.HTTPServer.allow_reuse_address = True
    server = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), Handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nSunucu durduruldu.')
