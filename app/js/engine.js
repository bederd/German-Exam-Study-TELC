var DeutschFit = window.DeutschFit || {};

DeutschFit.Engine = (function() {
  const API_BASE = '/api';

  async function safeFetch(url, timeoutMs = 15000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      clearTimeout(timer);
      console.error(`Fetch failed for ${url}:`, e);
      return null;
    }
  }

  function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function getRandomItems(arr, count) {
    return shuffleArray(arr).slice(0, count);
  }

  // Available exercise types per level
  function getAvailableTypes(level) {
    return [
      { id: 'lesen-text',           name: 'Leseverstehen',  desc: 'Okuma — Metin ve Sorular',   icon: '📖', module: 'lesen' },
      { id: 'grammatik-luecke',     name: 'Lückentext',     desc: 'Fiil Yerleştirme',            icon: '📝', module: 'grammatik' },
      { id: 'grammatik-text-luecke',    name: 'Textlücke (Verben)',     desc: 'Fiil Yerleştirme (Metin)',    icon: '📝', module: 'grammatik' },
      { id: 'grammatik-satzstellung',name:'Satzstellung',   desc: 'Cümle Yapısı',                icon: '📝', module: 'grammatik' },
      { id: 'hoeren-mc',            name: 'Hörverstehen',   desc: 'Dinleme — Çoktan Seçmeli',   icon: '🎧', module: 'hoeren' },
      { id: 'schreiben-essay',      name: 'Schreiben',      desc: 'Yazma — Essay',               icon: '✍️', module: 'schreiben' },
    ];
  }

  // Get modules (grouped types)
  function getModules(level) {
    const types = getAvailableTypes(level);
    const modules = {};
    types.forEach(t => {
      if (!modules[t.module]) modules[t.module] = { types: [], icon: t.icon };
      modules[t.module].types.push(t);
    });
    return [
      { id: 'lesen',     name: 'Lesen',     desc: 'Okuma Anlama',       icon: '📖', types: modules.lesen?.types     || [] },
      { id: 'hoeren',    name: 'Hören',     desc: 'Dinleme Anlama',      icon: '🎧', types: modules.hoeren?.types    || [] },
      { id: 'grammatik', name: 'Grammatik', desc: 'Dilbilgisi & Fiiller',icon: '📝', types: modules.grammatik?.types || [] },
      { id: 'schreiben', name: 'Schreiben', desc: 'Yazma',               icon: '✍️', types: modules.schreiben?.types || [] },
    ];
  }

  // Generate exercises — now backed by API
  async function generateExercise(level, type, count = 5) {
    let exercises = [];

    switch (type) {
      case 'lesen-text': {
        const completed = DeutschFit.Store.getCompletedTexts(level);
        // Fetch a random text; retry once if it's already completed
        let text = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          const t = await safeFetch(`${API_BASE}/lesen/random?level=${level}`);
          if (!t) break;
          if (t && !completed.includes(t.id)) { text = t; break; }
          if (attempt === 2) text = t; // use last one even if completed
        }
        if (!text) return null;

        exercises = text.fragen.map(f => ({
          type:          f.typ,
          textId:        text.id,
          passage:       text.text,
          passageTitle:  text.titel,
          passageSource: text.quelle || '',
          question:      f.frage || f.aussage,
          options:       f.optionen || [],
          correctAnswer: f.antwort,
          explanation:   f.erklaerung || ''
        }));
        break;
      }

      case 'grammatik-luecke': {
        const items = await safeFetch(`${API_BASE}/grammatik?level=${level}&typ=luecke&count=${count}`);
        if (!items || !Array.isArray(items) || items.length === 0) return null;
        exercises = items.map(item => ({
          type:          'luecke',
          sentence:      item.satz,
          options:       item.optionen || [],
          correctAnswer: item.antwort,
          explanation:   item.erklaerung || '',
          hint:          item.hinweis   || ''
        }));
        break;
      }

      case 'grammatik-konjugation': {
        const items = await safeFetch(`${API_BASE}/grammatik?level=${level}&typ=konjugation&count=${count}`);
        if (!items || !Array.isArray(items) || items.length === 0) return null;
        exercises = items.map(item => ({
          type:          'konjugation',
          verb:          item.verb,
          person:        item.person,
          tense:         item.zeitform,
          sentence:      item.satz,
          options:       item.optionen || [],
          correctAnswer: item.antwort,
          explanation:   item.erklaerung || ''
        }));
        break;
      }

      case 'grammatik-satzstellung': {
        const items = await safeFetch(`${API_BASE}/grammatik?level=${level}&typ=satzstellung&count=${count}`);
        if (!items || !Array.isArray(items) || items.length === 0) return null;
        exercises = items.map(item => ({
          type:          'satzstellung',
          words:         shuffleArray(item.woerter || []),
          correctOrder:  item.woerter || [],
          correctSentence: item.satz,
          explanation:   item.erklaerung || ''
        }));
        break;
      }

      case 'grammatik-text-luecke': {
        const items = await safeFetch(`${API_BASE}/grammatik?level=${level}&typ=text-luecke&count=1`);
        if (!items || !Array.isArray(items) || items.length === 0) return null;
        exercises = items.map(item => ({
          type:          'text-luecke',
          id:            item.id,
          instruction:   item.instruction,
          wordBank:      item.word_bank || [],
          text:          item.text,
          answers:       item.answers || {}
        }));
        break;
      }

      case 'hoeren-mc': {
        const texte = await safeFetch(`${API_BASE}/hoeren?level=${level}&count=${count}`);
        if (!texte || !Array.isArray(texte) || texte.length === 0) return null;
        texte.forEach(t => {
          // Instead of flattening into individual questions, group them by text
          exercises.push({
            type:          'hoeren-multi',
            audioSrc:      t.audio || null,
            audioText:     t.text,
            kontext:       t.kontext,
            fragen:        t.fragen
          });
        });
        exercises = exercises.slice(0, count);
        break;
      }

      case 'schreiben-essay': {
        const thema = await safeFetch(`${API_BASE}/schreiben?level=${level}`);
        if (!thema) return null;
        exercises = [{
          type:           'schreiben',
          typ:            thema.typ || 'popquiz',
          kontext:        thema.kontext || '',
          thema:          thema.thema,
          fragen:         thema.fragen  || [],
          mindestwoerter: thema.mindestwoerter || 30,
          tipps:          thema.tipps   || [],
          strukturwoerter: level === 'b1' || level === 'a2' ? ['heute', 'früher', 'im Moment', 'in Zukunft', 'zurzeit', 'als Kind'] : []
        }];
        break;
      }
    }

    return exercises;
  }

  // Quick random exercise (excludes heavy types)
  async function generateQuickExercise(level) {
    const types = getAvailableTypes(level).filter(
      t => t.id !== 'schreiben-essay' && t.id !== 'hoeren-mc'
    );
    const randomType = types[Math.floor(Math.random() * types.length)];
    const exercises = await generateExercise(level, randomType.id, 5);
    return { type: randomType, exercises };
  }

  // Quick exam: 1 from each major module
  async function generateQuickExam(level) {
    const exam = [];
    const types = [
      { id: 'lesen-text', api: `${API_BASE}/lesen/random?level=${level}` },
      { id: 'hoeren-mc', api: `${API_BASE}/hoeren?level=${level}&count=5` },
      { id: 'grammatik-luecke', api: `${API_BASE}/grammatik?level=${level}&typ=luecke&count=5` },
      { id: 'schreiben-essay', api: `${API_BASE}/schreiben?level=${level}` }
    ];

    for (let t of types) {
      const completed = DeutschFit.Store.getCompletedExercises(level, t.id);
      let selectedItem = null;

      if (t.id === 'lesen-text' || t.id === 'schreiben-essay') {
        for (let attempt = 0; attempt < 3; attempt++) {
          const res = await safeFetch(t.api);
          if (res) {
            selectedItem = res;
            const itemId = res.id || res.thema;
            if (!completed.includes(itemId)) break;
          }
        }
      } else {
        const items = await safeFetch(t.api);
        if (items && Array.isArray(items) && items.length > 0) {
          const uncompleted = items.filter(item => !completed.includes(item.id));
          if (uncompleted.length > 0) {
            selectedItem = uncompleted[Math.floor(Math.random() * uncompleted.length)];
          } else {
            selectedItem = items[Math.floor(Math.random() * items.length)];
          }
        }
      }

      if (selectedItem) {
        if (t.id === 'lesen-text') {
          const f = selectedItem.fragen[Math.floor(Math.random() * selectedItem.fragen.length)];
          exam.push({
            type: f.typ,
            textId: selectedItem.id,
            passage: selectedItem.text,
            passageTitle: selectedItem.titel,
            passageSource: selectedItem.quelle || '',
            question: f.frage || f.aussage,
            options: f.optionen || [],
            correctAnswer: f.antwort,
            explanation: f.erklaerung || '',
            examType: t.id,
            itemId: selectedItem.id
          });
        } else if (t.id === 'hoeren-mc') {
          exam.push({
            type: 'hoeren-multi',
            audioSrc: selectedItem.audio || null,
            audioText: selectedItem.text,
            kontext: selectedItem.kontext,
            fragen: selectedItem.fragen,
            examType: t.id,
            itemId: selectedItem.id
          });
        } else if (t.id === 'grammatik-luecke') {
          exam.push({
            type: 'luecke',
            sentence: selectedItem.satz,
            options: selectedItem.optionen || [],
            correctAnswer: selectedItem.antwort,
            explanation: selectedItem.erklaerung || '',
            hint: selectedItem.hinweis || '',
            examType: t.id,
            itemId: selectedItem.id
          });
        } else if (t.id === 'schreiben-essay') {
          exam.push({
            type: 'schreiben',
            typ: selectedItem.typ || 'popquiz',
            kontext: selectedItem.kontext || '',
            thema: selectedItem.thema,
            fragen: selectedItem.fragen || [],
            mindestwoerter: selectedItem.mindestwoerter || 30,
            tipps: selectedItem.tipps || [],
            strukturwoerter: level === 'b1' || level === 'a2' ? ['heute', 'früher', 'im Moment', 'in Zukunft', 'zurzeit', 'als Kind'] : [],
            examType: t.id,
            itemId: selectedItem.id || selectedItem.thema
          });
        }
      }
    }
    
    return exam;
  }

  // DB stats for settings panel
  async function getDbStats(level) {
    return safeFetch(`${API_BASE}/stats?level=${level}`);
  }

  // Check an answer
  function checkAnswer(exercise, userAnswer) {
    let correct = false;
    switch (exercise.type) {
      case 'mc':
      case 'hoeren-mc':
      case 'luecke':
      case 'konjugation':
        correct = userAnswer === exercise.correctAnswer;
        break;
      case 'rf':
      case 'hoeren-rf':
        correct = userAnswer.toLowerCase() === exercise.correctAnswer.toLowerCase();
        break;
      case 'rfn':
        correct = userAnswer.toLowerCase() === exercise.correctAnswer.toLowerCase();
        break;
      case 'satzstellung': {
        const normUser    = (userAnswer || []).join(' ').replace(/[.,!?]/g, '').trim().toLowerCase();
        const normTarget  = (exercise.correctOrder || []).join(' ').replace(/[.,!?]/g, '').trim().toLowerCase();
        const normSentence= (exercise.correctSentence || '').replace(/[.,!?]/g, '').trim().toLowerCase();
        correct = (normUser === normTarget) || (normSentence.length > 0 && normUser === normSentence);
        break;
      }
    }
    return {
      correct,
      correctAnswer:  exercise.correctAnswer,
      explanation:    exercise.explanation    || '',
      correctSentence:exercise.correctSentence|| ''
    };
  }

  // Legacy loadData shim — settings panel uses this for text count
  async function loadData(level) {
    const stats = await getDbStats(level);
    if (!stats) return { lesen: { texte: [] } };
    // Return minimal shape so renderSettings still works
    return {
      lesen: { _total: stats.lesen_texts },
      _stats: stats
    };
  }

  return {
    loadData,
    generateExercise,
    generateQuickExercise,
    generateQuickExam,
    checkAnswer,
    getAvailableTypes,
    getModules,
    getDbStats,
    shuffleArray
  };
})();
