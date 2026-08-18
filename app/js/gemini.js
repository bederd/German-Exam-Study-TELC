var DeutschFit = window.DeutschFit || {};

DeutschFit.Gemini = (function() {
  const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
  const MODEL_FLASH = 'gemini-1.5-flash';
  const MODEL_PRO = 'gemini-1.5-pro';
  
  function isOnline() { return navigator.onLine; }
  function hasApiKey() { return !!(window.DeutschFit?.App?._serverApiKey || DeutschFit.Store.getApiKey()); }
  function getActiveApiKey() { return window.DeutschFit?.App?._serverApiKey || DeutschFit.Store.getApiKey(); }
  
  async function evaluateWriting(text, theme, level, fragen, typ='popquiz') {
    if (!isOnline()) return { error: 'offline', message: 'İnternet bağlantısı yok. Yazınız kaydedildi, online olunca tekrar deneyin.' };
    if (!hasApiKey()) return { error: 'no-key', message: 'Gemini API anahtarı ayarlanmamış. Lütfen .env dosyasını kontrol edin.' };
    
    const apiKey = getActiveApiKey();
    const taskDescription = typ === 'dialog' ? 
        'ein kurzer Kommunikationstext (z.B. SMS, E-Mail)' : 
        'ein kurzer Text über sich selbst (Vorstellung, Beschreibung)';

    const prompt = `Du bist ein strenger, aber sehr hilfreicher Deutschlehrer für das Niveau ${level.toUpperCase()}. Bewerte den folgenden Text eines Schülers.

Aufgabentyp: ${typ} (${taskDescription})
Thema/Kontext: ${theme}
Zu beantwortende Fragen/Punkte:
${fragen.map((f, i) => `${i+1}. ${f}`).join('\n')}

Text des Schülers:
"${text}"

Bewerte streng nach diesen 5 Kriterien (jeweils 0-5 Punkte, maximal 25 Punkte):
1. Aufgabenerfüllung & Kontext (Wurde das Thema exakt getroffen? Wurden ALLE gestellten Fragen beantwortet? Ist der Text beim Thema geblieben?)
2. Groß- und Kleinschreibung (Sind alle Nomen/Substantive sowie Satzanfänge strikt großgeschrieben? Dies ist im Deutschen extrem wichtig!)
3. Interpunktion & Rechtschreibung (Sind Punkte und Kommas richtig gesetzt? Gibt es Tipp- oder Rechtschreibfehler?)
4. Grammatik (Ist die Verbposition korrekt, besonders Position 2 im Hauptsatz? Stimmen die Artikel und Fälle?)
5. Wortschatz & Kohärenz (Ist der Wortschatz passend für ${level.toUpperCase()}? Ist der Text logisch und flüssig?)

WICHTIG: Ignoriere formelle Phrasen wie 'heute' oder 'im Moment', falls sie nicht passen. Konzentriere dich auf die echte Leistung des Schülers. Sei sehr aufmerksam bei Groß-/Kleinschreibung und Interpunktion.

Antworte NUR im folgenden JSON-Format (keine Markdown-Codeblöcke, nur rohes JSON):
{
  "punkte": { "aufgabe": X, "gross_klein": X, "interpunktion": X, "grammatik": X, "wortschatz": X },
  "gesamt": X,
  "max": 25,
  "feedback": "Dein pädagogisches, klares und detailliertes Feedback komplett auf Deutsch. (Worauf muss der Schüler besonders achten? Wurden alle Fragen beantwortet?)",
  "korrekturen": ["[Falscher Satz/Wort] -> [Korrekter Satz/Wort] (Erklärung komplett auf Deutsch)"],
  "tipps": ["Tipp 1 zur Verbesserung (komplett auf Deutsch)"]
}`;
    
    try {
      const response = await fetch(`${API_BASE}/${MODEL_FLASH}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 1024 }
        })
      });
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        return { error: 'api-error', message: `API Hatası: ${response.status} — ${errData?.error?.message || 'Bilinmeyen hata'}` };
      }
      
      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      // Parse JSON from response (handle potential markdown wrapping)
      let jsonStr = rawText;
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) jsonStr = jsonMatch[0];
      
      const result = JSON.parse(jsonStr);
      return { success: true, ...result };
    } catch (err) {
      return { error: 'parse-error', message: `Değerlendirme hatası: ${err.message}` };
    }
  }
  
  async function generateWordAnalysis(word) {
    if (!isOnline()) return { error: 'offline', message: 'İnternet bağlantısı yok.' };
    // API key check is now handled on the server (or optional if set in .env)
    
    try {
      const response = await fetch('/api/analyze-word', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: word, api_key: getActiveApiKey() })
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Sunucu Hatası: ${response.status}`);
      }
      
      return data;
    } catch (err) {
      return { error: 'api-error', message: err.message };
    }
  }

  async function verifyWordAnalysis(wordData) {
    if (!isOnline()) return { success: false, error: 'offline' };
    
    try {
      const response = await fetch('/api/verify-word', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wordData: wordData, api_key: getActiveApiKey() })
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Sunucu Hatası: ${response.status}`);
      }
      
      return data;
    } catch (err) {
      return { error: 'api-error', message: err.message };
    }
  }
  
  async function verifyHoerenAnswer(userAns, correctAns) {
    if (!isOnline()) return null;
    
    try {
      const response = await fetch('/api/evaluate-hoeren', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_ans: userAns, correct_ans: correctAns, api_key: getActiveApiKey() })
      });
      
      const data = await response.json();
      if (!response.ok) return null; // Fallback to exact match on error
      return data.evaluation;
    } catch (err) {
      return null;
    }
  }
  
  return { isOnline, hasApiKey, evaluateWriting, generateWordAnalysis, verifyWordAnalysis, verifyHoerenAnswer };
})();
