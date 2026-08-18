var DeutschFit = window.DeutschFit || {};

DeutschFit.Store = (function() {
  const DB_NAME = 'deutschfit';
  const DB_VERSION = 1;
  let db = null;
  
  // IndexedDB initialization
  async function init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('results')) {
          const store = db.createObjectStore('results', { keyPath: 'id', autoIncrement: true });
          store.createIndex('date', 'date');
          store.createIndex('level', 'level');
          store.createIndex('type', 'type');
        }
        if (!db.objectStoreNames.contains('words_srs')) {
          const wordsStore = db.createObjectStore('words_srs', { keyPath: 'wordId' });
          wordsStore.createIndex('next_review', 'next_review');
        }
      };
      request.onsuccess = (e) => { db = e.target.result; resolve(); };
      request.onerror = (e) => reject(e);
    });
  }
  
  // LocalStorage helpers
  function getSetting(key, defaultVal) { 
    const val = localStorage.getItem('df_' + key);
    return val !== null ? JSON.parse(val) : defaultVal;
  }
  function setSetting(key, value) { localStorage.setItem('df_' + key, JSON.stringify(value)); }
  
  function getLevel() { return getSetting('level', 'a1'); }
  function setLevel(level) { setSetting('level', level); }
  function getApiKey() { return getSetting('apiKey', ''); }
  function setApiKey(key) { setSetting('apiKey', key); }
  
  // Completed texts tracking
  function getCompletedTexts(level) { 
    return getSetting('completed_texts_' + level, []); 
  }
  function markTextCompleted(level, textId) {
    const arr = getCompletedTexts(level);
    if (!arr.includes(textId)) {
      arr.push(textId);
      setSetting('completed_texts_' + level, arr);
    }
  }

  // Completed exercises tracking (generic)
  function getCompletedExercises(level, type) {
    return getSetting('completed_' + type + '_' + level, []);
  }
  function markExerciseCompleted(level, type, id) {
    if (!id) return;
    const arr = getCompletedExercises(level, type);
    if (!arr.includes(id)) {
      arr.push(id);
      setSetting('completed_' + type + '_' + level, arr);
    }
  }
  
  // XP System - difficulty-based scoring:
  // A1: base 10 XP per correct, A2: base 15 XP, B1: base 25 XP
  function getXP() { return getSetting('xp', 0); }
  function addXP(points) { 
    const current = getXP();
    setSetting('xp', current + points);
    return current + points;
  }
  
  function getXPForLevel(level, correct) {
    const base = { a1: 10, a2: 15, b1: 25 };
    return correct ? (base[level] || 10) : 0;
  }
  
  // Rank based on total XP
  function getRank(xp) {
    if (xp >= 1000) return { name: 'Meister', emoji: '🏆', next: null, min: 1000 };
    if (xp >= 600) return { name: 'Experte', emoji: '⭐', next: 1000, min: 600 };
    if (xp >= 300) return { name: 'Fortgeschritten', emoji: '🎯', next: 600, min: 300 };
    if (xp >= 100) return { name: 'Lernender', emoji: '📚', next: 300, min: 100 };
    return { name: 'Anfänger', emoji: '🌱', next: 100, min: 0 };
  }
  
  // Streak system
  function getStreak() {
    const data = getSetting('streak', { count: 0, lastDate: null });
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    if (data.lastDate === today) return data;
    if (data.lastDate === yesterday) return data; // streak intact but not yet exercised today
    if (data.lastDate !== today && data.lastDate !== yesterday) {
      // streak broken
      return { count: 0, lastDate: data.lastDate };
    }
    return data;
  }
  
  function updateStreak() {
    const data = getStreak();
    const today = new Date().toISOString().split('T')[0];
    if (data.lastDate === today) return data; // already updated today
    const newCount = (data.lastDate === new Date(Date.now() - 86400000).toISOString().split('T')[0]) ? data.count + 1 : 1;
    const newData = { count: newCount, lastDate: today };
    setSetting('streak', newData);
    return newData;
  }
  
  // Save exercise result to IndexedDB
  async function saveResult(result) {
    // result: { level, type, score, total, date, details[] }
    if (!db) await init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('results', 'readwrite');
      tx.objectStore('results').add({
        ...result,
        date: result.date || new Date().toISOString()
      });
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e);
    });
  }
  
  // Get today's completed exercise count
  async function getTodayCount() {
    if (!db) await init();
    return new Promise((resolve) => {
      const tx = db.transaction('results', 'readonly');
      const store = tx.objectStore('results');
      let count = 0;
      const today = new Date().toISOString().split('T')[0];
      store.openCursor().onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          if (cursor.value.date && cursor.value.date.startsWith(today)) count++;
          cursor.continue();
        } else {
          resolve(count);
        }
      };
    });
  }

  // Get stats for a specific level (or all)
  async function getStats(level) {
    if (!db) await init();
    return new Promise((resolve) => {
      const tx = db.transaction('results', 'readonly');
      const store = tx.objectStore('results');
      const results = [];
      store.openCursor().onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          if (!level || cursor.value.level === level) results.push(cursor.value);
          cursor.continue();
        } else {
          const totalExercises = results.length;
          const totalCorrect = results.reduce((sum, r) => sum + r.score, 0);
          const totalQuestions = results.reduce((sum, r) => sum + r.total, 0);
          const byType = {};
          results.forEach(r => {
            if (!byType[r.type]) byType[r.type] = { count: 0, correct: 0, total: 0 };
            byType[r.type].count++;
            byType[r.type].correct += r.score;
            byType[r.type].total += r.total;
          });
          resolve({ totalExercises, totalCorrect, totalQuestions, byType, recent: results.slice(-10).reverse() });
        }
      };
    });
  }
  
  // ─── Word Analysis & Spaced Repetition (SRS) ───
  let cachedWords = null;
  
  async function fetchWords() {
    try {
      const res = await fetch('/api/words');
      const data = await res.json();
      cachedWords = data.words || [];
      return cachedWords;
    } catch (e) {
      console.error('Failed to fetch words:', e);
      return cachedWords || [];
    }
  }

  async function saveNewWord(wordData) {
    try {
      const res = await fetch('/api/words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wordData)
      });
      const data = await res.json();
      if (data.success) {
        if (cachedWords) {
          const idx = cachedWords.findIndex(w => w.word.toLowerCase() === wordData.word.toLowerCase() && w.type === wordData.type);
          if (idx >= 0) cachedWords[idx] = data.word;
          else cachedWords.push(data.word);
        }
      }
      return data;
    } catch (e) {
      console.error('Failed to save word:', e);
      return { success: false, error: e.message };
    }
  }

  // Get SRS data for a word
  async function getWordSRS(wordId) {
    if (!db) await init();
    return new Promise((resolve) => {
      const tx = db.transaction('words_srs', 'readonly');
      const req = tx.objectStore('words_srs').get(wordId);
      req.onsuccess = () => resolve(req.result || {
        wordId,
        interval: 0,
        ease_factor: 2.5,
        next_review: 0 // 0 means due immediately
      });
      req.onerror = () => resolve(null);
    });
  }

  // Update SRS data based on user performance (quality: 0-5)
  // 5: perfect, 4: good, 3: hard, 2: wrong but remembered, 1: wrong, 0: blank
  async function updateWordProgress(wordId, quality, manualHours = null) {
    const srs = await getWordSRS(wordId);
    
    if (manualHours !== null) {
       srs.interval = manualHours * 60 * 60 * 1000;
       srs.next_review = Date.now() + srs.interval;
    } else {
       if (quality >= 3) {
           if (srs.interval === 0) srs.interval = 1 * 24 * 60 * 60 * 1000; // 1 day
           else if (srs.interval === 1 * 24 * 60 * 60 * 1000) srs.interval = 6 * 24 * 60 * 60 * 1000;
           else srs.interval = Math.round(srs.interval * srs.ease_factor);
       } else {
           srs.interval = 0; // Reset
       }
       srs.ease_factor = srs.ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
       if (srs.ease_factor < 1.3) srs.ease_factor = 1.3;
       srs.next_review = quality >= 3 ? Date.now() + srs.interval : Date.now() + 5 * 60 * 1000; // 5 mins if wrong
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction('words_srs', 'readwrite');
      tx.objectStore('words_srs').put(srs);
      tx.oncomplete = () => resolve(srs);
      tx.onerror = (e) => reject(e);
    });
  }

  async function getDueWords() {
    const words = cachedWords || await fetchWords();
    if (!words.length) return [];
    
    if (!db) await init();
    return new Promise((resolve) => {
      const tx = db.transaction('words_srs', 'readonly');
      const store = tx.objectStore('words_srs');
      const srsData = {};
      
      store.openCursor().onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          srsData[cursor.key] = cursor.value;
          cursor.continue();
        } else {
          const now = Date.now();
          const due = words.filter(w => {
            const wordId = w.word.toLowerCase() + '_' + w.type;
            const data = srsData[wordId];
            if (!data) return true; // never reviewed
            return data.next_review <= now;
          });
          
          // Sort by how overdue they are
          due.sort((a, b) => {
            const idA = a.word.toLowerCase() + '_' + a.type;
            const idB = b.word.toLowerCase() + '_' + b.type;
            const tA = srsData[idA] ? srsData[idA].next_review : 0;
            const tB = srsData[idB] ? srsData[idB].next_review : 0;
            return tA - tB;
          });
          resolve(due);
        }
      };
    });
  }
  
  return { init, getSetting, setSetting, getLevel, setLevel, getApiKey, setApiKey, getCompletedTexts, markTextCompleted, getCompletedExercises, markExerciseCompleted, getXP, addXP, getXPForLevel, getRank, getStreak, updateStreak, saveResult, getStats, getTodayCount, fetchWords, saveNewWord, updateWordProgress, getDueWords };
})();

window.DeutschFit = DeutschFit;
