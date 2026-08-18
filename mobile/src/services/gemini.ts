import { GoogleGenerativeAI } from '@google/generative-ai';
import NetInfo from '@react-native-community/netinfo';

export const GeminiService = {
  async evaluateSchreiben(data: {
    thema: string;
    kontext: string;
    fragen: string[];
    text: string;
    typ: string;
  }, apiKey: string) {
    const activeKey = apiKey || process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || 'AQ.Ab8RN6Kr-zf3QYgrMDZYfA2fXYnnwl6__CnmXNgcULwO505b3w';
    if (!activeKey) {
      return { error: 'API anahtarı eksik. Lütfen ayarlardan Gemini API anahtarınızı girin.' };
    }

    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      return { error: 'İnternet bağlantısı yok. Lütfen internete bağlanıp tekrar deneyin.' };
    }

    try {
      const genAI = new GoogleGenerativeAI(activeKey);
      
      const systemInstruction = 
        "You are an expert, deterministic German Language Assessment API and Pedagogical Engine. Your sole purpose is to evaluate A1/A2 level German texts written by students based on a specific prompt, rigorously enforce grammatical rules like a strict rule-engine, and output a deeply pedagogical evaluation exclusively in a pure, unformatted JSON structure.\n\n" +
        "DO NOT behave like a conversational AI. DO NOT output any markdown (such as ```json). DO NOT output any introductory or concluding text. Your entire response must be a single, valid, parseable JSON object.\n\n" +
        "### EVALUATION FRAMEWORK & SCORING WEIGHTS\n" +
        "The total score is exactly 100. It is divided into two distinct traits:\n" +
        "1. Content & Task Fulfillment (Aufgabenerfüllung) - Max 40 Points.\n" +
        "2. Grammar & Structural Accuracy (Grammatik) - Max 60 Points.\n\n" +
        "### STEP 1: GIBBERISH & VALIDITY CHECK (CRITICAL INITIAL GATE)\n" +
        "Before assessing, analyze the provided `student_text`.\n" +
        "- If the text is keyboard smashing (e.g., \"asdfgh\"), random letters, entirely in a language other than German, or completely incomprehensible to the point where no linguistic analysis is possible:\n" +
        "  - Immediately set total score to 0.\n" +
        "  - Set Content score to 0.\n" +
        "  - Set Grammar score to 0.\n" +
        "  - Add an error object indicating the text is invalid/gibberish.\n" +
        "  - Output the JSON and STOP.\n\n" +
        "### STEP 2: CONTENT EVALUATION (40 Points)\n" +
        "Evaluate how well the `student_text` addresses the `assignment_prompt`.\n" +
        "- 40/40: All parts of the assignment prompt are addressed logically and contextually.\n" +
        "- Deduct points proportionally for missing information or off-topic sentences.\n" +
        "- If the text is completely unrelated to the `assignment_prompt`, set Content score to 0.\n\n" +
        "### STEP 3: DETERMINISTIC GRAMMAR EVALUATION (60 Points)\n" +
        "Act as a deterministic rule-based engine. Scan the text meticulously for the following specific A1/A2 CEFR grammatical rules. Deduct points from the 60 Grammar points for each error found. DO NOT penalize the student for not using advanced B1+ structures. Evaluate based on simplicity and correctness.\n\n" +
        "CRITICAL RULES TO ENFORCE:\n" +
        "1. Noun Capitalization (Großschreibung): Check every single word. If it is a noun (Substantiv), it MUST begin with a capital letter.\n" +
        "2. V2 Rule (Verb-Zweit-Stellung): In declarative main clauses (Hauptsätze), the finite (conjugated) verb MUST be exactly in the second topological position. Check for inversion errors (e.g., \"Heute ich gehe...\" is WRONG, must be \"Heute gehe ich...\").\n" +
        "3. Separable Verbs (Trennbare Verben): Identify if a separable verb is used. The finite base verb must be in position 2, and the separable prefix MUST be at the very end of the clause.\n" +
        "4. Article and Case Agreement (Kasus: Nominativ, Akkusativ, Dativ): Check the valency of every verb and preposition. \n" +
        "   - Does the preposition require Dativ? (e.g., mit, nach, bei). Check if the article matches the gender, number, and required case.\n" +
        "   - Does the verb require Akkusativ? Check the direct object.\n" +
        "   - Check Subject-Verb agreement (Personalendung).\n\n" +
        "### STEP 4: PEDAGOGICAL FEEDBACK GENERATION\n" +
        "For every error detected, you must explain not just what is wrong, but WHY it is wrong in a supportive, pedagogical tone in Turkish. \n" +
        "- Example explanation: \"Almancada isimlerin ilk harfi her zaman büyük yazılmalıdır. Bu yüzden 'auto' kelimesi 'Auto' şeklinde yazılmalıdır.\"\n" +
        "- Example explanation: \"Zaman zarfı (Heute) cümlenin başına geldiğinde, Almancada V2 kuralı gereği çekimli fiil ikinci sırada kalmalıdır. Bu nedenle 'Heute ich spiele' yerine 'Heute spiele ich' demelisin.\"\n\n" +
        "### STEP 5: OUTPUT GENERATION (STRICT JSON SCHEMA)\n" +
        "Construct your response matching this exact JSON structure and nothing else.\n\n" +
        "{\n" +
        "  \"total_score\": <integer 0-100>,\n" +
        "  \"content_score\": <integer 0-40>,\n" +
        "  \"grammar_score\": <integer 0-60>,\n" +
        "  \"feedback_summary\": \"<string: A brief, encouraging overall summary of the student's performance in Turkish>\",\n" +
        "  \"improved_text\": \"<string: The fully corrected version of the student's text, maintaining their original meaning but fixing all grammatical and orthographic errors>\",\n" +
        "  \"errors\": [\n" +
        "    {\n" +
        "      \"error_type\": \"<string: e.g., 'Großschreibung', 'V2-Regel', 'Kasus', 'Wortschatz'>\",\n" +
        "      \"original_segment\": \"<string: the exact wrong word or phrase from the student text>\",\n" +
        "      \"correction\": \"<string: the corrected word or phrase>\",\n" +
        "      \"explanation\": \"<string: pedagogical explanation in Turkish of WHY this is an error and what the rule is>\"\n" +
        "    }\n" +
        "  ]\n" +
        "}\n\n" +
        "If there are no errors, the \"errors\" array must be empty `[]`. Do not invent errors to reach a certain number. If the student made only 1 or 2 errors, just list those. You are NOT required to provide exactly 3 errors.\n" +
        "Ensure the JSON is properly escaped. \n" +
        "OUTPUT ONLY VALID JSON.";

      const model = genAI.getGenerativeModel({ 
        model: 'gemini-3.6-flash',
        systemInstruction,
      });

      let assignmentPrompt = `Aufgabentyp: ${data.typ}\nThema: ${data.thema}\nKontext/Situation: ${data.kontext}\nZu beantwortende Punkte/Fragen:\n`;
      data.fragen.forEach(f => {
        assignmentPrompt += `- ${f}\n`;
      });
      const prompt = `assignment_prompt:\n${assignmentPrompt}\n\nstudent_text:\n"${data.text}"`;

      const promptPromise = model.generateContent(prompt);
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('İstek zaman aşımına uğradı. Lütfen tekrar deneyin.')), 60000)
      );
      
      const result = await Promise.race([promptPromise, timeoutPromise]) as any;
      let textResp = result.response.text();
      
      if (textResp.startsWith('```')) {
        const lines = textResp.split('\n');
        textResp = lines.slice(1, -1).join('\n');
      }

      const jsonMatch = textResp.indexOf('{');
      if (jsonMatch !== -1) {
        const lastJsonMatch = textResp.lastIndexOf('}');
        if (lastJsonMatch !== -1) {
          textResp = textResp.substring(jsonMatch, lastJsonMatch + 1);
        }
      }

      return JSON.parse(textResp);
    } catch (e: any) {
      return { error: e.message || 'Bilinmeyen bir hata oluştu.' };
    }
  },

  async analyzeWord(word: string, apiKey: string) {
    const activeKey = apiKey || process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || 'AQ.Ab8RN6Kr-zf3QYgrMDZYfA2fXYnnwl6__CnmXNgcULwO505b3w';
    if (!activeKey) return { error: 'API anahtarı eksik.' };
    
    try {
      const genAI = new GoogleGenerativeAI(activeKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
      
      const prompt = `Sen bir Almanca kelime analiz uzmanısın. Aşağıdaki kelimeyi analiz et: "${word}"
Eğer isimse: artikel, plural, turkce, ingilizce, örnek cümleler (en fazla 2 kısa örnek).
Eğer fiilse: conjugation (ich, du, er_sie_es, wir, ihr, sie_Sie), perfekt, praeteritum, kasus, common_preposition (varsa), regelmaessig, turkce, ingilizce, örnek cümleler (en fazla 2 kısa örnek).
Eğer sıfat/zarf ise: turkce, ingilizce, komparativ, superlativ, örnek cümleler (en fazla 2 kısa örnek).
Eğer edat (preposition) ise: turkce, ingilizce, kasus (akk/dat/wechsel), örnek cümleler (en fazla 2 kısa örnek).

Her bir kelime türü için, "type" alanını (isim, fiil, sıfat, preposition) mutlaka belirt.
Örnek cümleleri sen üret. Her örneğin "sentence" ve "translation" kısımları olsun.

SADECE JSON FORMATINDA ÇIKTI VER.`;

      const result = await model.generateContent(prompt);
      let textResp = result.response.text();
      
      if (textResp.startsWith('```')) {
        const lines = textResp.split('\n');
        textResp = lines.slice(1, -1).join('\n');
      }
      
      const jsonMatch = textResp.indexOf('{');
      if (jsonMatch !== -1) {
        const lastJsonMatch = textResp.lastIndexOf('}');
        if (lastJsonMatch !== -1) {
          textResp = textResp.substring(jsonMatch, lastJsonMatch + 1);
        }
      }

      const analysis = JSON.parse(textResp);
      return { success: true, analysis: { ...analysis, word } };
    } catch (e: any) {
      if (e.message?.includes('429')) {
        return { error: 'API istek limiti aşıldı (Rate Limit). Lütfen biraz bekleyip tekrar deneyin.' };
      }
      return { error: e.message || 'Bilinmeyen bir hata oluştu.' };
    }
  },

  async verifyWord(wordData: any, apiKey: string) {
    const activeKey = apiKey || process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || 'AQ.Ab8RN6Kr-zf3QYgrMDZYfA2fXYnnwl6__CnmXNgcULwO505b3w';
    if (!activeKey) return { error: 'API anahtarı eksik.' };
    
    try {
      const genAI = new GoogleGenerativeAI(activeKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
      
      const prompt = `Lütfen aşağıdaki Almanca kelime analizini dilbilgisi hatalarına karşı kontrol et ve hataları düzelterek aynı JSON formatında geri döndür. Örnek cümlelerin gramerini ve çevirilerini özellikle kontrol et:\n\n${JSON.stringify(wordData, null, 2)}\n\nSADECE JSON FORMATINDA CEVAP VER.`;

      const result = await model.generateContent(prompt);
      let textResp = result.response.text();
      
      if (textResp.startsWith('```')) {
        const lines = textResp.split('\n');
        textResp = lines.slice(1, -1).join('\n');
      }
      
      const jsonMatch = textResp.indexOf('{');
      if (jsonMatch !== -1) {
        const lastJsonMatch = textResp.lastIndexOf('}');
        if (lastJsonMatch !== -1) {
          textResp = textResp.substring(jsonMatch, lastJsonMatch + 1);
        }
      }

      return { success: true, analysis: JSON.parse(textResp) };
    } catch (e: any) {
      if (e.message?.includes('429')) {
        return { error: 'API istek limiti aşıldı (Rate Limit). Lütfen biraz bekleyip tekrar deneyin.' };
      }
      return { error: e.message || 'Bilinmeyen bir hata oluştu.' };
    }
  },

  async evaluateHoeren(userAns: string, correctAns: string, apiKey: string) {
    const activeKey = apiKey || process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || 'AQ.Ab8RN6Kr-zf3QYgrMDZYfA2fXYnnwl6__CnmXNgcULwO505b3w';
    if (!activeKey) return { error: 'API anahtarı eksik.' };
    
    try {
      const genAI = new GoogleGenerativeAI(activeKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
      
      const prompt = `Sen bir Almanca öğretmenisin. Bir dinleme sınavında öğrencinin verdiği cevap ile beklenen doğru cevabı anlamsal olarak karşılaştıracaksın.
Öğrencinin dilbilgisi kurallarına uyması ve cümlenin tamamen aynı anlama gelmesi önemlidir (Örn: 'Anna' yerine 'sie' kullanılması bağlama göre doğru kabul edilebilir). Eğer anlam ve gramer doğruysa cevabı doğru kabul et. Ufak harf/yazım hatalarını affedebilirsin.

Beklenen Doğru Cevap: "${correctAns}"
Öğrencinin Verdiği Cevap: "${userAns}"

Lütfen SADECE geçerli bir JSON objesi döndür (Markdown code block olmadan). Format:
{"is_correct": true, "reason": "kısa Türkçe açıklama"}`;

      const result = await model.generateContent(prompt);
      let textResp = result.response.text();
      
      if (textResp.startsWith('```')) {
        const lines = textResp.split('\n');
        textResp = lines.slice(1, -1).join('\n');
      }
      
      const jsonMatch = textResp.indexOf('{');
      if (jsonMatch !== -1) {
        const lastJsonMatch = textResp.lastIndexOf('}');
        if (lastJsonMatch !== -1) {
          textResp = textResp.substring(jsonMatch, lastJsonMatch + 1);
        }
      }

      return { success: true, evaluation: JSON.parse(textResp) };
    } catch (e: any) {
      if (e.message?.includes('429')) {
        return { error: 'API istek limiti aşıldı (Rate Limit). Lütfen biraz bekleyip tekrar deneyin.' };
      }
      return { error: e.message || 'Bilinmeyen bir hata oluştu.' };
    }
  }
};
