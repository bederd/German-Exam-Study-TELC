var DeutschFit = window.DeutschFit || {};

DeutschFit.App = (function () {
  let session = {
    exercises: [],
    currentIndex: 0,
    results: [],
    level: 'a1',
    type: null,
    earnedXP: 0,
    completed: false
  };

  // ===== INIT & ROUTING =====
  async function init() {
    try {
      await DeutschFit.Store.init();
      const cfgRes = await fetch('/api/config').catch(() => null);
      if (cfgRes && cfgRes.ok) {
        const cfg = await cfgRes.json();
        if (cfg.gemini_api_key) window.DeutschFit.App._serverApiKey = cfg.gemini_api_key;
      }
    } catch (e) {
      console.error('Store/Config initialization failed:', e);
      // Continue anyway - app can work without IndexedDB for basic features
    }

    // Wire up bottom nav clicks
    document.querySelectorAll('.df-nav__item').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = btn.getAttribute('data-page');
        if (page) navigate(page);
      });
    });

    window.addEventListener('hashchange', router);
    router();
  }

  function navigate(hash) {
    window.location.hash = hash;
  }

  function router() {
    const hash = window.location.hash.slice(1) || 'home';
    const [route, queryString] = hash.split('?');
    const params = new URLSearchParams(queryString || '');

    updateNav(route);
    session.level = DeutschFit.Store.getLevel();

    switch (route) {
      case 'home': renderHome(); break;
      case 'level-select': renderLevelSelect(); break;
      case 'module-select': renderModuleSelect(params.get('m')); break;
      case 'exercise': renderExercise(); break;
      case 'result': renderResult(); break;
      case 'settings': renderSettings(); break;
      case 'stats': renderStats(); break;
      case 'flashcards': renderFlashcards(); break;
      default: renderHome();
    }
  }

  function updateNav(route) {
    const map = { home: 'home', stats: 'stats', settings: 'settings', flashcards: 'flashcards' };
    const active = map[route] || 'home';
    document.querySelectorAll('.df-nav__item').forEach(el => {
      el.classList.toggle('df-nav__item--active', el.getAttribute('data-page') === active);
    });
  }

  // ===== HOME PAGE =====
  async function renderHome() {
    const level = session.level;
    const streak = DeutschFit.Store.getStreak();
    const xp = DeutschFit.Store.getXP();
    const rank = DeutschFit.Store.getRank(xp);
    const todayCount = await DeutschFit.Store.getTodayCount();
    const modules = DeutschFit.Engine.getModules(level);
    const xpProgress = rank.next ? Math.round(((xp - rank.min) / (rank.next - rank.min)) * 100) : 100;

    const html = `
      <div class="df-animate-in">
        <!-- Hero Card -->
        <div class="df-card df-mb-lg" style="background: ${DeutschFit.UI.getLevelGradient(level)}; border: none; color: white;">
          <div class="df-flex-between">
            <div>
              <span class="df-badge" style="background: rgba(255,255,255,0.2); color: white;">${DeutschFit.UI.getLevelName(level)}</span>
              <div class="df-streak df-mt-sm">
                <span class="df-streak__flame">🔥</span>
                <span class="df-streak__count" style="color: white;">${streak.count} Gün Serisi</span>
              </div>
            </div>
            <div class="df-text-center">
              <div style="font-size: 2rem;">${rank.emoji}</div>
              <div style="font-size: 0.75rem; opacity: 0.8;">${rank.name}</div>
            </div>
          </div>
          <div class="df-xp-bar df-mt-md">
            <div class="df-xp-bar__label" style="color: rgba(255,255,255,0.8);">
              <span>${xp} XP</span>
              <span>${rank.next ? rank.next + ' XP' : 'MAX'}</span>
            </div>
            <div class="df-progress" style="background: rgba(255,255,255,0.2);">
              <div class="df-progress__fill" style="width: ${xpProgress}%; background: rgba(255,255,255,0.9);"></div>
            </div>
          </div>
        </div>

        <!-- Quick Start -->
        <div class="df-mb-lg">
          <button class="df-btn df-btn--primary df-btn--lg df-btn--block" onclick="DeutschFit.App.startQuickExercise()">
            ⚡ Hızlı Alıştırma
          </button>
          <div class="df-text-muted df-mt-sm df-text-center">Bugün ${todayCount} alıştırma tamamladın.</div>
          <button class="df-btn df-btn--ghost df-btn--block df-mt-sm" onclick="window.location.hash='level-select'">
            Seviye Değiştir
          </button>
        </div>

        <!-- Module Cards -->
        <div class="df-grid-2 df-gap-md">
          ${modules.map((m, i) => `
            <div class="df-module-card df-card df-animate-in" style="animation-delay: ${i * 100}ms; cursor: pointer;" onclick="window.location.hash='module-select?m=${m.id}'">
              <div class="df-module-card__icon">${m.icon}</div>
              <div>
                <div class="df-module-card__title">${m.name}</div>
                <div class="df-module-card__desc">${m.desc}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    DeutschFit.UI.render('main-content', html);
  }

  // ===== LEVEL SELECT =====
  function renderLevelSelect() {
    const levels = [
      { id: 'a1', name: 'A1+', desc: 'Temel düzey — Günlük basit konuşmalar', xp: '10 XP/doğru' },
      { id: 'a2', name: 'A2+', desc: 'Orta öncesi — Günlük durumlar', xp: '15 XP/doğru' },
      { id: 'b1', name: 'B1+', desc: 'Orta düzey — TELC B1 sınav hazırlık', xp: '25 XP/doğru' }
    ];
    const current = session.level;

    const html = `
      <div class="df-animate-in">
        <div class="df-header df-mb-lg">
          <button class="df-header__back df-btn df-btn--ghost" onclick="window.location.hash='home'">←</button>
          <h1 class="df-header__title">Seviye Seç</h1>
        </div>
        <div class="df-flex-col df-gap-md">
          ${levels.map(l => `
            <div class="df-card df-card--${l.id} ${current === l.id ? 'df-card--glow-' + l.id : ''}"
                 style="cursor: pointer;" onclick="DeutschFit.App.setLevel('${l.id}')">
              <div class="df-flex-between">
                <div>
                  <h3 style="margin: 0 0 4px 0;">${l.name}</h3>
                  <p class="df-text-muted" style="margin: 0;">${l.desc}</p>
                </div>
                <div class="df-badge df-badge--${l.id}">${l.xp}</div>
              </div>
              ${current === l.id ? '<div class="df-text-muted df-mt-sm" style="font-size: 0.75rem;">✓ Aktif seviye</div>' : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
    DeutschFit.UI.render('main-content', html);
  }

  // ===== MODULE SELECT =====
  function renderModuleSelect(moduleId) {
    const modules = DeutschFit.Engine.getModules(session.level);
    const mod = modules.find(m => m.id === moduleId);
    if (!mod) return navigate('home');

    const isHoeren = moduleId === 'hoeren';

    const html = `
      <div class="df-animate-in">
        <div class="df-header df-mb-lg">
          <button class="df-header__back df-btn df-btn--ghost" onclick="window.location.hash='home'">←</button>
          <h1 class="df-header__title">${mod.icon} ${mod.name}</h1>
        </div>
        ${isHoeren ? '<div class="df-card df-mb-md" style="border-left: 3px solid var(--color-warning);"><span style="color: var(--color-warning);">⚠️</span> Ses dosyaları henüz eklenmedi. Metin olarak gösterilecek.</div>' : ''}
        <div class="df-flex-col df-gap-md">
          ${mod.types.map(t => `
            <div class="df-card" style="cursor: pointer;" onclick="DeutschFit.App.startExercise('${t.id}')">
              <div class="df-flex-between">
                <div>
                  <h3 style="margin: 0 0 4px 0;">${t.name}</h3>
                  <p class="df-text-muted" style="margin: 0;">${t.desc}</p>
                </div>
                <span style="font-size: 1.5rem; opacity: 0.5;">→</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    DeutschFit.UI.render('main-content', html);
  }

  // ===== SESSION MANAGEMENT =====
  window.DeutschFit.App = window.DeutschFit.App || {};

  window.DeutschFit.App.setLevel = function (level) {
    DeutschFit.Store.setLevel(level);
    session.level = level;
    DeutschFit.UI.showToast('Seviye: ' + DeutschFit.UI.getLevelName(level), 'success');
    navigate('home');
  };

  let isStarting = false;
  
  function showLoadingScreen(msg) {
    const loader = document.createElement('div');
    loader.id = 'df-loading-overlay';
    loader.innerHTML = `<div class="df-spinner" style="border: 4px solid rgba(255,255,255,0.3); border-top: 4px solid white; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite;"></div><p style="color:white; margin-top:20px; font-weight: 500;">${msg}</p>`;
    loader.style = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:9999; display:flex; flex-direction:column; align-items:center; justify-content:center; backdrop-filter: blur(4px);';
    // Add keyframe style dynamically if not exists
    if (!document.getElementById('df-spinner-style')) {
      const style = document.createElement('style');
      style.id = 'df-spinner-style';
      style.innerHTML = '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
      document.head.appendChild(style);
    }
    document.body.appendChild(loader);
  }
  
  function hideLoadingScreen() {
    const loader = document.getElementById('df-loading-overlay');
    if (loader) loader.remove();
  }

  window.DeutschFit.App.startQuickExercise = async function () {
    if (isStarting) return;
    initSession('quick', 4);
  };

  window.DeutschFit.App.startExercise = async function (typeId) {
    if (isStarting) return;
    initSession(typeId, null);
  };

  async function initSession(typeId, targetCount) {
    isStarting = true;
    session.type = typeId;
    session.targetCount = targetCount;
    session.answeredCount = 0;
    session.results = [];
    session.earnedXP = 0;
    session.completed = false;
    session.queue = [];
    session.currentExercise = null;
    
    if (session.timerInterval) clearInterval(session.timerInterval);
    if (typeId === 'quick') {
      session.startTime = Date.now();
      session.timeLimit = 15 * 60; // 15 minutes
      session.timeRemaining = session.timeLimit;
      session.timerInterval = setInterval(() => {
        if (!session.completed) {
          session.timeRemaining--;
          const timerEl = document.getElementById('session-timer');
          if (timerEl) {
            const m = Math.floor(session.timeRemaining / 60).toString().padStart(2, '0');
            const s = (session.timeRemaining % 60).toString().padStart(2, '0');
            timerEl.textContent = `${m}:${s}`;
            if (session.timeRemaining <= 60) {
              timerEl.classList.add('df-timer-display--warning');
            }
          }
          if (session.timeRemaining <= 0) {
            clearInterval(session.timerInterval);
            finishSession();
          }
        }
      }, 1000);
    }
    
    const success = await window.DeutschFit.App.loadNextQuestion();
    isStarting = false;
    
    if (!success) {
      DeutschFit.UI.showToast('Alıştırma bulunamadı veya hata oluştu.', 'error');
      return;
    }
    
    if (session.targetCount === null) {
      session.targetCount = session.queue.length + (session.currentExercise ? 1 : 0);
    }
    
    navigate('exercise');
  }

  window.DeutschFit.App.loadNextQuestion = async function() {
    if (session.queue.length > 0) {
      session.currentExercise = session.queue.shift();
      return true;
    }
    
    showLoadingScreen('Soru hazırlanıyor...');
    try {
      let typeId = session.type;
      let newExercises = [];
      if (typeId === 'quick') {
        newExercises = await DeutschFit.Engine.generateQuickExam(session.level);
      } else {
        newExercises = await DeutschFit.Engine.generateExercise(session.level, typeId, 1);
      }
      if (!newExercises || newExercises.length === 0) {
        return false;
      }
      
      session.queue.push(...newExercises);
      session.currentExercise = session.queue.shift();
      return true;
    } catch (e) {
      console.error(e);
      return false;
    } finally {
      hideLoadingScreen();
    }
  };

  // ===== EXERCISE PAGE =====
  function renderExercise() {
    if (!session.currentExercise) return navigate('home');
    if (session.answeredCount >= session.targetCount) {
      finishSession();
      return;
    }

    const ex = session.currentExercise;
    const progressHtml = DeutschFit.UI.createProgressBar(session.answeredCount + 1, session.targetCount);
    let contentHtml = '';

    switch (ex.type) {
      case 'mc':
      case 'hoeren-mc':
        contentHtml = buildMC(ex); break;
      case 'hoeren-multi':
        contentHtml = buildHoerenMulti(ex); break;
      case 'rf':
      case 'hoeren-rf':
        contentHtml = buildRF(ex, false); break;
      case 'rfn':
        contentHtml = buildRF(ex, true); break;
      case 'luecke':
      case 'konjugation':
        contentHtml = buildLuecke(ex); break;
      case 'satzstellung':
        contentHtml = buildSatz(ex); break;
      case 'text-luecke':
        contentHtml = buildTextLuecke(ex); break;
      case 'schreiben':
        contentHtml = buildSchreiben(ex); break;
      default:
        contentHtml = '<p>Bilinmeyen soru tipi.</p>';
    }

    const isLast = session.answeredCount >= session.targetCount - 1;

    const html = `
      <div class="df-animate-in df-exercise">
        <div class="df-header df-mb-md">
          <button class="df-header__back df-btn df-btn--ghost" onclick="if(confirm('Alıştırmadan çıkmak istediğine emin misin?')) window.location.hash='home'">✕</button>
          <h2 class="df-header__title" style="flex:1; text-align:center;">
            <span class="df-badge df-badge--${session.level}">${DeutschFit.UI.getLevelName(session.level)}</span>
          </h2>
          ${session.type === 'quick' ? `<div class="df-timer-display" id="session-timer">${Math.floor(session.timeRemaining / 60).toString().padStart(2, '0')}:${(session.timeRemaining % 60).toString().padStart(2, '0')}</div>` : ''}
        </div>
        ${progressHtml}
        <div class="df-mt-lg">${contentHtml}</div>
        <div id="explanation-area" class="df-mt-md"></div>
        <button id="next-btn" class="df-btn df-btn--primary df-btn--block df-mt-md df-hidden" onclick="DeutschFit.App.nextQuestion()">
          ${isLast ? 'Sonuçları Gör →' : 'Sonraki →'}
        </button>
      </div>
    `;
    DeutschFit.UI.render('main-content', html);
  }

  // --- MC Builder (Lesen MC, Hören MC) ---
  function buildMC(ex) {
    const letters = ['a', 'b', 'c'];
    return `
      ${buildPassage(ex)}
      <h3 class="df-question-text df-mt-md">${ex.question}</h3>
      <div class="df-options" id="opts">
        ${ex.options.map((opt, i) => `
          <div class="df-option" data-letter="${letters[i]}" onclick="DeutschFit.App.selectOption('${letters[i]}', this)">
            <span class="df-option__letter">${letters[i]}</span>
            <span class="df-option__text">${opt.replace(/^[abc]\)\s*/, '')}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  // --- RF / RFN Builder ---
  function buildRF(ex, isRFN) {
    const opts = isRFN
      ? [{ label: 'Richtig', val: 'richtig' }, { label: 'Falsch', val: 'falsch' }, { label: 'Nicht im Text', val: 'nicht im text' }]
      : [{ label: 'Richtig', val: 'richtig' }, { label: 'Falsch', val: 'falsch' }];

    return `
      ${buildPassage(ex)}
      <h3 class="df-question-text df-mt-md">${ex.question}</h3>
      <div class="df-rf-options" id="opts" style="display:grid; grid-template-columns: repeat(${isRFN ? 3 : 2}, 1fr); gap: var(--space-sm);">
        ${opts.map(o => `
          <button class="df-rf-btn df-btn df-btn--secondary" data-value="${o.val}"
            onclick="DeutschFit.App.selectRF('${o.val}', this)">${o.label}</button>
        `).join('')}
      </div>
    `;
  }

  // --- Lückentext / Konjugation Builder ---
  function buildLuecke(ex) {
    const letters = ['a', 'b', 'c'];
    const sentence = (ex.sentence || '').replace('___', '<span class="df-luecke-blank" id="luecke-blank">___</span>');

    return `
      ${ex.type === 'konjugation' ? `
        <div class="df-card df-mb-md" style="border-left: 3px solid ${DeutschFit.UI.getLevelColor(session.level)};">
          <div class="df-flex df-gap-md" style="flex-wrap: wrap;">
            <div><span class="df-text-muted">Fiil:</span> <strong>${ex.verb}</strong></div>
            <div><span class="df-text-muted">Şahıs:</span> <strong>${ex.person}</strong></div>
            <div><span class="df-text-muted">Zaman:</span> <strong>${ex.tense}</strong></div>
          </div>
        </div>
      ` : ''}
      ${ex.hint ? `<div class="df-text-muted df-mb-sm" style="font-size: 0.8rem;">💡 ${ex.hint}</div>` : ''}
      <div class="df-luecke-container df-mb-lg">
        <p class="df-luecke-sentence">${sentence}</p>
      </div>
      <div class="df-options" id="opts">
        ${ex.options.map((opt, i) => `
          <div class="df-option" data-letter="${letters[i]}" onclick="DeutschFit.App.selectOption('${letters[i]}', this)">
            <span class="df-option__letter">${letters[i]}</span>
            <span class="df-option__text">${opt.replace(/^[abc]\)\s*/, '')}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  // --- Satzstellung Builder ---
  function buildSatz(ex) {
    window.DeutschFit.App._satzState = [];
    window.DeutschFit.App._satzWords = [...ex.words];

    return `
      <h3 class="df-question-text">Kelimeleri doğru sıraya koy:</h3>
      <div class="df-sentence-builder df-mt-md">
        <div class="df-sentence-slots" id="satz-slots">
          <span class="df-text-muted" style="font-size: 0.85rem;">Kelimelere tıkla →</span>
        </div>
        <div class="df-word-bank" id="satz-bank">
          ${ex.words.map((w, i) => `
            <div class="df-word-chip" onclick="DeutschFit.App.toggleSatzWord(${i})" id="satz-w-${i}">${w}</div>
          `).join('')}
        </div>
        <button class="df-btn df-btn--primary df-btn--block df-mt-md" id="satz-check-btn" onclick="DeutschFit.App.checkSatz()">Kontrollieren</button>
      </div>
    `;
  }

  // --- Hoeren-Multi Builder ---
  function buildHoerenMulti(ex) {
    _hoerenAnswers = {}; // Soru yüklendiğinde cevapları sıfırla
    let questionsHtml = (ex.fragen || []).map((f, qIndex) => {
      let opts = '';
      if (f.typ === 'text' || f.typ === 'luecke') {
        opts = `<input type="text" id="hoeren-text-${qIndex}" class="df-input df-mt-sm" style="width: 100%;" placeholder="Cevabınızı buraya yazın..." oninput="DeutschFit.App.typeHoerenText(${qIndex}, this.value)">`;
      } else if (f.typ === 'rf' || f.typ === 'rfn') {
        const isRFN = f.typ === 'rfn';
        const rfOpts = isRFN 
          ? [{ label: 'Richtig', val: 'richtig' }, { label: 'Falsch', val: 'falsch' }, { label: 'Nicht im Text', val: 'nicht im text' }]
          : [{ label: 'Richtig', val: 'richtig' }, { label: 'Falsch', val: 'falsch' }];
        const rfGrid = isRFN ? 3 : 2;

        opts = `<div class="df-rf-options" style="display:grid; grid-template-columns: repeat(${rfGrid}, 1fr); gap: var(--space-sm);">` + 
          rfOpts.map(o => {
            let handler = `DeutschFit.App.selectHoerenRF(${qIndex}, '${o.val}', this)`;
            let optClass = `hoeren-rf-${qIndex}`;
            return `<button class="df-rf-btn df-btn df-btn--secondary ${optClass}" data-value="${o.val}" onclick="${handler}">${o.label}</button>`;
          }).join('') + `</div>`;
      } else {
        const letters = ['a', 'b', 'c', 'd', 'e'];
        opts = `<div class="df-options">` +
          (f.optionen || []).map((opt, oIndex) => {
            let handler = `DeutschFit.App.selectHoerenOption(${qIndex}, '${opt}', this)`;
            let optClass = `hoeren-opt-${qIndex}`;
            return `
            <div class="df-option ${optClass}" data-value="${opt}" onclick="${handler}">
              <span class="df-option__letter">${letters[oIndex] || ''}</span>
              <span class="df-option__text">${opt.replace(/^[abcde]\)\s*/, '')}</span>
            </div>
            `;
          }).join('') + `</div>`;
      }
      
      return `
        <div class="df-mb-lg" id="hoeren-q-${qIndex}">
          <h3 class="df-question-text df-mt-md">${qIndex + 1}. ${f.frage || f.aussage || ''}</h3>
          <div class="df-mt-sm">
            ${opts}
          </div>
          <div class="hoeren-explanation df-mt-md" style="display: none; padding: 10px; background: var(--bg-body); border-radius: 8px;">
            <strong>Açıklama:</strong> ${f.erklaerung || 'Açıklama bulunmuyor.'}
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="df-card df-mb-md">
        ${ex.audioSrc ? `<audio controls style="width:100%; margin-bottom: 15px;"><source src="${ex.audioSrc}" type="audio/mpeg"></audio>` : ''}
        ${ex.kontext ? `<p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 15px;">${ex.kontext}</p>` : ''}
        
        <div>
          ${questionsHtml}
        </div>
        <button id="hoeren-check-btn" class="df-btn df-btn--primary df-btn--block df-mt-md" onclick="DeutschFit.App.checkHoerenMulti()">Kontrol Et</button>
        <button id="next-btn" class="df-btn df-btn--secondary df-btn--block df-mt-md df-hidden" onclick="DeutschFit.App.nextQuestion()">Bitir (İleri)</button>
      </div>
    `;
  }

  // --- Text-Lücke Builder ---
  function buildTextLuecke(ex) {
    let parsedText = ex.text;
    
    // Her {1}, {2a} alanını bir input kutusu ile değiştirelim
    parsedText = parsedText.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, p1) => {
      return `<input type="text" class="df-luecke-input" id="luecke-input-${p1}" placeholder="" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">`;
    });

    return `
      <h3 class="df-question-text">${ex.instruction}</h3>
      <div class="df-word-bank-container df-mb-md">
        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 8px;">Fiil Havuzu (Uygun çekimle yazın):</div>
        <div class="df-word-bank df-flex df-gap-sm" style="flex-wrap: wrap;">
          ${(ex.wordBank || ex.word_bank || []).map(w => `<span class="df-word-chip df-word-chip--static">${w}</span>`).join('')}
        </div>
      </div>
      <div class="df-card df-text-luecke-card df-mb-md">
        <p style="line-height: 2;">${parsedText}</p>
      </div>
      <button class="df-btn df-btn--primary df-btn--block" id="eval-btn" onclick="DeutschFit.App.checkTextLuecke()">Kontrollieren</button>
    `;
  }


  // --- Schreiben Builder ---
  function buildSchreiben(ex) {
    return `
      <div class="df-writing-area">
        <div class="df-card df-mb-md" style="border-left: 3px solid ${DeutschFit.UI.getLevelColor(session.level)};">
          <h3 style="margin: 0 0 12px 0; font-size: 1.1rem; font-weight: 500; line-height: 1.5;">📝 ${ex.thema}</h3>
          ${(ex.kontext && ex.kontext !== ex.thema) ? `<p style="margin-bottom: 12px; color: var(--text-secondary); line-height: 1.5;">${ex.kontext}</p>` : ''}
          <ol class="df-writing-questions">
            ${ex.fragen.map(f => `<li>${f}</li>`).join('')}
          </ol>
        </div>
        <div class="df-card df-mb-md" style="border-left: 3px solid var(--color-info); ${!(ex.strukturwoerter && ex.strukturwoerter.length) ? 'display:none;' : ''}">
          <div style="font-size: 0.8rem; color: var(--text-secondary);">
            <strong>Yapı kelimeleri (min. 4 tane kullan):</strong><br>
            ${(ex.strukturwoerter || []).map(w => `<span class="df-badge" style="margin: 2px; background: var(--bg-surface-active);">${w}</span>`).join(' ')}
          </div>
        </div>
        <textarea class="df-writing-textarea" rows="10" placeholder="Buraya yazın... (min. ${ex.mindestwoerter || 50} kelime)"
          oninput="DeutschFit.App.updateWordCount(this.value)"></textarea>
        <div class="df-word-count df-word-count--low" id="word-count">0 / ${ex.mindestwoerter || 50} kelime</div>
        <div class="df-flex-col df-gap-sm df-mt-md">
          <button class="df-btn df-btn--primary df-btn--block" id="eval-gemini-btn" onclick="DeutschFit.App.evalSchreiben()">🤖 Yazımı Değerlendir (Gemini AI)</button>
          <button class="df-btn df-btn--ghost df-btn--block" onclick="DeutschFit.App.skipSchreiben()">Geç →</button>
        </div>
        <div id="schreiben-feedback" class="df-mt-md"></div>
      </div>
    `;
  }

  // --- Passage helper (shared by MC, RF) ---
  function buildPassage(ex) {
    let html = '';
    if (ex.passage) {
      html += `<div class="df-reading-passage">
        ${ex.passageTitle ? '<div style="font-weight:600; margin-bottom:8px;">' + ex.passageTitle + '</div>' : ''}
        ${ex.passage}
        ${ex.passageSource ? '<div class="df-reading-passage__source">' + ex.passageSource + '</div>' : ''}
      </div>`;
    }
    if (ex.audioText) {
      html += `<div class="df-reading-passage" style="border-left-color: var(--color-warning);">
        <div style="font-size: 0.75rem; color: var(--color-warning); margin-bottom: 8px;">
          🎧 Dinleme Metni ${ex.kontext ? '(' + ex.kontext + ')' : ''}
        </div>
        ${ex.audioText}
      </div>`;
    }
    return html;
  }

  // ===== ANSWER HANDLERS =====

  // ===== HÖREN MULTI HANDLERS =====
  window.DeutschFit.App.toggleHoerenAudio = function() {
    const audio = document.getElementById('hoeren-audio');
    const playBtn = document.getElementById('hoeren-play-btn');
    const playIcon = document.getElementById('hoeren-play-icon');
    const limits = document.getElementById('hoeren-limits');
    
    if (!audio) return;
    
    // Check if limit reached
    if (window.DeutschFit.App._hoerenPlayCount >= 2 && audio.paused && audio.currentTime === 0) {
      alert("Maksimum dinleme limitine (2) ulaştınız!");
      return;
    }

    if (audio.paused) {
      audio.play().then(() => {
        window.DeutschFit.App._hoerenIsPlaying = true;
        playIcon.textContent = '⏸';
      }).catch(e => console.error("Audio play blocked", e));
    } else {
      audio.pause();
      window.DeutschFit.App._hoerenIsPlaying = false;
      playIcon.textContent = '▶';
    }
    
    // One time setup for events
    if (!audio.dataset.eventsBound) {
      audio.dataset.eventsBound = "true";
      
      // Update progress bar
      audio.addEventListener('timeupdate', () => {
        const bar = document.getElementById('hoeren-progress-bar');
        if (bar && audio.duration) {
          bar.style.width = (audio.currentTime / audio.duration * 100) + '%';
        }
      });
      
      // Prevent Seeking (geri sarma)
      let lastTime = 0;
      audio.addEventListener('timeupdate', () => {
        if (!audio.seeking) {
           lastTime = audio.currentTime;
        }
      });
      audio.addEventListener('seeking', () => {
        const delta = audio.currentTime - lastTime;
        if (delta < 0) { // Geri sarmaya çalışıyor
           audio.currentTime = lastTime;
        }
      });
      
      // On end
      audio.addEventListener('ended', () => {
        window.DeutschFit.App._hoerenPlayCount++;
        limits.textContent = window.DeutschFit.App._hoerenPlayCount + ' / 2';
        playIcon.textContent = '▶';
        window.DeutschFit.App._hoerenIsPlaying = false;
        
        if (window.DeutschFit.App._hoerenPlayCount >= 2) {
          playBtn.style.opacity = '0.5';
          playBtn.style.pointerEvents = 'none';
        }
      });
    }
  };

  // State for user answers in hoeren-multi
  let _hoerenAnswers = {};

  window.DeutschFit.App.typeHoerenText = function(idx, val) {
    _hoerenAnswers[idx] = val;
  };

  window.DeutschFit.App.selectHoerenOption = function(idx, val, el) {
    _hoerenAnswers[idx] = val;
    // Highlight selected
    const all = document.querySelectorAll('.hoeren-opt-' + idx);
    all.forEach(a => {
      a.classList.remove('df-option--selected');
      const letter = a.querySelector('.df-option__letter');
      if (letter) {
        letter.style.background = '';
        letter.style.color = '';
      }
    });
    el.classList.add('df-option--selected');
    const letter = el.querySelector('.df-option__letter');
    if (letter) {
      letter.style.background = 'var(--color-info)';
      letter.style.color = 'white';
    }
  };

  window.DeutschFit.App.selectHoerenRF = function(idx, val, el) {
    _hoerenAnswers[idx] = val;
    // Highlight selected
    const all = document.querySelectorAll('.hoeren-rf-' + idx);
    all.forEach(a => {
      a.classList.remove('df-option--selected');
    });
    el.classList.add('df-option--selected');
  };

  window.DeutschFit.App.checkHoerenMulti = async function() {
    const ex = session.currentExercise;
    const totalQ = ex.fragen.length;
    let correctCount = 0;
    
    // Pause audio if playing
    const audio = document.getElementById('hoeren-audio');
    if (audio && !audio.paused) {
       audio.pause();
       document.getElementById('hoeren-play-icon').textContent = '▶';
    }

    const checkBtn = document.getElementById('hoeren-check-btn');
    if (checkBtn) {
        checkBtn.textContent = '⏳ Kontrol Ediliyor...';
        checkBtn.disabled = true;
    }

    // Check all questions
    for (let idx = 0; idx < ex.fragen.length; idx++) {
      const q = ex.fragen[idx];
      const card = document.getElementById('hoeren-q-' + idx);
      const userAns = _hoerenAnswers[idx] || '';
      let isCorrect = (userAns && userAns.trim().toLowerCase() === (q.antwort || '').trim().toLowerCase());
      
      // Use AI verification for text answers if not exact match
      if (!isCorrect && userAns.trim() && (q.typ === 'text' || q.typ === 'luecke')) {
          const verification = await DeutschFit.Gemini.verifyHoerenAnswer(userAns, q.antwort);
          if (verification && verification.is_correct) {
              isCorrect = true;
          } else if (verification && !verification.is_correct) {
              // We could show verification.reason in explanation, but keeping it simple for now
              if (card.querySelector('.hoeren-explanation')) {
                  card.querySelector('.hoeren-explanation').innerHTML += `<br><br><strong>Yapay Zeka Notu:</strong> ${verification.reason}`;
              }
          }
      }

      if (isCorrect) correctCount++;
      
      // Visual feedback
      if (q.typ === 'mc') {
        const opts = document.querySelectorAll('.hoeren-opt-' + idx);
        opts.forEach(opt => {
          opt.style.pointerEvents = 'none';
          if (opt.dataset.value.toLowerCase() === q.antwort.toLowerCase()) {
            opt.classList.add('df-option--correct');
          } else if (opt.dataset.value === userAns && !isCorrect) {
            opt.classList.add('df-shake');
            opt.style.background = 'var(--color-error)';
            opt.style.color = 'white';
          }
        });
      } else if (q.typ === 'rf' || q.typ === 'rfn') {
        const opts = document.querySelectorAll('.hoeren-rf-' + idx);
        opts.forEach(opt => {
          opt.style.pointerEvents = 'none';
          if (opt.dataset.value.toLowerCase() === q.antwort.toLowerCase()) {
            opt.style.background = 'var(--color-success)';
            opt.style.color = 'white';
          } else if (opt.dataset.value === userAns && !isCorrect) {
            opt.classList.add('df-shake');
            opt.style.background = 'var(--color-error)';
            opt.style.color = 'white';
          }
        });
      } else if (q.typ === 'text' || q.typ === 'luecke') {
        const inputEl = document.getElementById('hoeren-text-' + idx);
        if (inputEl) {
          inputEl.disabled = true;
          if (isCorrect) {
            inputEl.style.borderColor = 'var(--color-success)';
            inputEl.style.backgroundColor = 'rgba(76, 175, 80, 0.1)';
            if (DeutschFit.UI && DeutschFit.UI.animateCorrect) DeutschFit.UI.animateCorrect(inputEl);
          } else {
            inputEl.style.borderColor = 'var(--color-error)';
            inputEl.style.backgroundColor = 'rgba(244, 67, 54, 0.1)';
            inputEl.value = userAns + ' (Doğrusu: ' + q.antwort + ')';
            if (DeutschFit.UI && DeutschFit.UI.animateWrong) DeutschFit.UI.animateWrong(inputEl);
            else inputEl.classList.add('df-shake');
          }
        }
      }
      
      const expl = card.querySelector('.hoeren-explanation');
      if (expl) expl.style.display = 'block';
    }

    if (checkBtn) {
        checkBtn.style.display = 'none';
    }
    
    // Register results
    session.results.push({ correct: correctCount === totalQ, answer: _hoerenAnswers });
    
    // Reward XP for correct ones (custom reward outside standard if needed)
    if (correctCount > 0) {
       const xpPer = DeutschFit.Store.getXPForLevel(session.level, true);
       DeutschFit.Store.addXP(xpPer * correctCount);
    }
    
    document.getElementById('next-btn').classList.remove('df-hidden');
  };


  // MC + Lückentext + Konjugation (letter-based: a/b/c)
  window.DeutschFit.App.selectOption = function (letter, element) {
    const ex = session.currentExercise;
    const res = DeutschFit.Engine.checkAnswer(ex, letter);
    session.results.push({ correct: res.correct, answer: letter });

    // Disable all options
    const opts = document.getElementById('opts');
    if (opts) {
      Array.from(opts.children).forEach(c => {
        c.style.pointerEvents = 'none';
        c.classList.add('df-option--disabled');
      });
    }

    // Animate
    if (res.correct) {
      DeutschFit.UI.animateCorrect(element);
    } else {
      DeutschFit.UI.animateWrong(element);
      // Highlight the correct option by data-letter attribute
      if (opts) {
        const correctEl = opts.querySelector('[data-letter="' + res.correctAnswer + '"]');
        if (correctEl) correctEl.classList.add('df-option--correct');
      }
    }

    // Fill blank for lückentext/konjugation
    const blank = document.getElementById('luecke-blank');
    if (blank) {
      const correctOpt = ex.options.find(o => o.startsWith(res.correctAnswer + ')'));
      blank.textContent = correctOpt ? correctOpt.replace(/^[abc]\)\s*/, '') : res.correctAnswer;
      blank.classList.add('df-luecke-blank--filled');
      blank.style.color = res.correct ? 'var(--color-success)' : 'var(--color-error)';
    }

    showExplanation(res);
    document.getElementById('next-btn').classList.remove('df-hidden');
  };

  // Richtig / Falsch / Nicht im Text
  window.DeutschFit.App.selectRF = function (value, element) {
    const ex = session.currentExercise;
    const res = DeutschFit.Engine.checkAnswer(ex, value);
    session.results.push({ correct: res.correct, answer: value });

    // Disable all RF buttons
    const opts = document.getElementById('opts');
    if (opts) {
      Array.from(opts.children).forEach(c => {
        c.style.pointerEvents = 'none';
        c.style.opacity = '0.4';
      });
    }

    if (res.correct) {
      element.style.opacity = '1';
      element.style.background = 'var(--color-success)';
      element.style.color = 'white';
    } else {
      element.style.opacity = '1';
      element.style.background = 'var(--color-error)';
      element.style.color = 'white';
      element.classList.add('df-shake');
      // Show correct one
      if (opts) {
        const correctBtn = opts.querySelector('[data-value="' + res.correctAnswer + '"]');
        if (correctBtn) {
          correctBtn.style.opacity = '1';
          correctBtn.style.background = 'var(--color-success)';
          correctBtn.style.color = 'white';
        }
      }
    }

    showExplanation(res);
    document.getElementById('next-btn').classList.remove('df-hidden');
  };

  // Satzstellung
  window.DeutschFit.App.toggleSatzWord = function (index) {
    const state = window.DeutschFit.App._satzState;
    const pIdx = state.indexOf(index);
    if (pIdx > -1) {
      state.splice(pIdx, 1);
      document.getElementById('satz-w-' + index).classList.remove('df-word-chip--placed');
    } else {
      state.push(index);
      document.getElementById('satz-w-' + index).classList.add('df-word-chip--placed');
    }
    renderSatzSlots();
  };

  function renderSatzSlots() {
    const slots = document.getElementById('satz-slots');
    const state = window.DeutschFit.App._satzState;
    const words = window.DeutschFit.App._satzWords;
    if (state.length === 0) {
      slots.innerHTML = '<span class="df-text-muted" style="font-size: 0.85rem;">Kelimelere tıkla →</span>';
    } else {
      slots.innerHTML = state.map(idx =>
        '<div class="df-word-chip" style="background:' + DeutschFit.UI.getLevelColor(session.level) + '; color:white;" onclick="DeutschFit.App.toggleSatzWord(' + idx + ')">' + words[idx] + '</div>'
      ).join('');
    }
  }

  window.DeutschFit.App.checkSatz = function () {
    const words = window.DeutschFit.App._satzWords;
    const userWords = window.DeutschFit.App._satzState.map(i => words[i]);
    const ex = session.currentExercise;
    const res = DeutschFit.Engine.checkAnswer(ex, userWords);
    session.results.push({ correct: res.correct, answer: userWords });

    const slots = document.getElementById('satz-slots');
    const bank = document.getElementById('satz-bank');
    const checkBtn = document.getElementById('satz-check-btn');

    if (res.correct) {
      slots.innerHTML = '<div style="color: var(--color-success); font-weight: 600; padding: 8px;">✅ ' + (ex.correctSentence || ex.correctOrder.join(' ')) + '</div>';
    } else {
      slots.innerHTML = '<div style="padding: 8px;"><span style="color: var(--color-error);">❌ ' + userWords.join(' ') + '</span><br><br><strong style="color: var(--color-success);">Doğrusu: ' + (ex.correctSentence || ex.correctOrder.join(' ')) + '</strong></div>';
    }
    if (bank) bank.style.display = 'none';
    if (checkBtn) checkBtn.style.display = 'none';

    showExplanation(res);
    document.getElementById('next-btn').classList.remove('df-hidden');
  };

  // Schreiben handlers
  window.DeutschFit.App.updateWordCount = function (val) {
    const count = DeutschFit.UI.wordCount(val);
    const ex = session.currentExercise;
    const min = ex ? ex.mindestwoerter || 90 : 90;
    const el = document.getElementById('word-count');
    if (el) {
      el.textContent = count + ' / ' + min + ' kelime';
      el.className = 'df-word-count ' + (count >= min ? 'df-word-count--good' : count >= min * 0.5 ? 'df-word-count--ok' : 'df-word-count--low');
    }
  };

  window.DeutschFit.App.evalSchreiben = async function () {
    const ex = session.currentExercise;
    const textarea = document.querySelector('.df-writing-textarea');
    const text = textarea ? textarea.value : '';
    if (DeutschFit.UI.wordCount(text) < 10) {
      DeutschFit.UI.showToast('Lütfen en az birkaç cümle yazın.', 'error');
      return;
    }

    const btn = document.getElementById('eval-gemini-btn');
    if (btn) { btn.textContent = '⏳ Değerlendiriliyor...'; btn.disabled = true; }

    try {
      const response = await fetch('/api/evaluate-schreiben', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text,
          thema: ex.thema,
          kontext: ex.kontext,
          fragen: ex.fragen,
          typ: ex.typ || 'popquiz'
        })
      });
      
      const res = await response.json();
      
      if (btn) { btn.textContent = '🤖 Yazımı Değerlendir (Gemini AI)'; btn.disabled = false; }
      
      if (res.error) {
        DeutschFit.UI.showToast(res.error, 'error');
        return;
      }
      
      if (res.is_gibberish) {
        DeutschFit.UI.showToast(res.error_msg || 'Anlamsız metin tespit edildi.', 'error');
        return;
      }

      session.results.push({ correct: (res.total_score || 0) >= 60, score: res.total_score || 0, max: 100 });

      const fb = document.getElementById('schreiben-feedback');
      if (fb) {
        fb.innerHTML = `
          <div class="df-card df-animate-in" style="border-left: 3px solid var(--color-success);">
            <div class="df-flex-between df-mb-md">
              <h3 style="margin: 0;">Değerlendirme Sonucu</h3>
              <div class="df-flex df-gap-sm">
                <span class="df-badge" style="background: var(--bg-surface-active); color: var(--text-primary);">İçerik: ${res.content_score || 0}/40</span>
                <span class="df-badge" style="background: var(--bg-surface-active); color: var(--text-primary);">Gramer: ${res.grammar_score || 0}/60</span>
                <span class="df-badge" style="background: var(--color-success); color: white; font-size: 1rem; padding: 6px 14px;">Total: ${res.total_score || 0} / 100</span>
              </div>
            </div>
            
            <p style="font-size: 1.05rem; line-height: 1.5; color: var(--text-primary); margin-bottom: 16px;">
              ${res.feedback_summary || ''}
            </p>
            
            ${res.improved_text ? `
              <h4 style="color: var(--color-success); margin: 12px 0 6px;">✨ İyileştirilmiş Metin:</h4>
              <p style="background: var(--bg-surface-active); padding: 12px; border-radius: 8px; line-height: 1.6; border-left: 4px solid var(--color-success);">
                ${res.improved_text}
              </p>
            ` : ''}
            
            ${(res.errors && res.errors.length > 0) ? `
              <h4 style="color: var(--color-error); margin: 24px 0 12px;">🚨 Hatalar ve Açıklamalar:</h4>
              <div class="df-flex-col df-gap-sm">
                ${res.errors.map((e, idx) => `
                  <div class="df-card" style="padding: 12px; background: rgba(244, 67, 54, 0.05); border: 1px solid rgba(244, 67, 54, 0.2);">
                    <div class="df-flex-between df-mb-sm">
                      <strong style="color: var(--color-error); font-size: 0.9rem;">Hata ${idx + 1} (${e.error_type || 'Genel'})</strong>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 4px; font-size: 0.95rem; margin-bottom: 8px;">
                      <div><span style="color: var(--text-muted);">Yanlış:</span> <span style="text-decoration: line-through; color: var(--color-error);">${e.original_segment || ''}</span></div>
                      <div><span style="color: var(--text-muted);">Doğrusu:</span> <span style="color: var(--color-success); font-weight: 500;">${e.correction || ''}</span></div>
                    </div>
                    <div style="font-size: 0.9rem; color: var(--text-secondary); background: var(--bg-surface); padding: 8px; border-radius: 6px;">
                      💡 ${e.explanation || ''}
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : `
              <div class="df-mt-md df-p-md" style="background: rgba(76, 175, 80, 0.1); border-radius: 8px; text-align: center;">
                <span style="font-size: 1.5rem;">🎉</span><br>
                <strong style="color: var(--color-success);">Harika! Hiç gramer hatası bulunmadı.</strong>
              </div>
            `}
          </div>
        `;
      }
      document.getElementById('next-btn').classList.remove('df-hidden');
    } catch (e) {
      if (btn) { btn.textContent = '🤖 Yazımı Değerlendir (Gemini AI)'; btn.disabled = false; }
      DeutschFit.UI.showToast('Sunucuya bağlanılamadı.', 'error');
    }
  };



  window.DeutschFit.App.skipSchreiben = function () {
    session.results.push({ correct: true, skipped: true });
    DeutschFit.App.nextQuestion();
  };

  window.DeutschFit.App.nextQuestion = async function () {
    const isLast = session.answeredCount >= session.targetCount - 1;
    if (isLast) {
      finishSession();
      return;
    }
    
    session.answeredCount++;
    const success = await window.DeutschFit.App.loadNextQuestion();
    if (!success) {
      DeutschFit.UI.showToast('Sonraki soru yüklenemedi. Test bitiriliyor.', 'error');
      finishSession();
      return;
    }
    renderExercise();
  };

  // --- Explanation box ---
  function showExplanation(res) {
    const area = document.getElementById('explanation-area');
    if (!area) return;
    const icon = res.correct ? '✅ Doğru!' : '❌ Yanlış!';
    const borderColor = res.correct ? 'var(--color-success)' : 'var(--color-error)';
    area.innerHTML = `
      <div class="df-explanation" style="border-left-color: ${borderColor};">
        <strong>${icon}</strong>
        ${res.explanation ? '<br>' + res.explanation : ''}
        ${res.correctSentence ? '<br><br><strong>Doğru cümle:</strong> ' + res.correctSentence : ''}
      </div>
    `;
  }

  // ===== FINISH & RESULT =====
  async function finishSession() {
    if (session.completed) return navigate('result');
    session.completed = true;
    
    if (session.timerInterval) {
      clearInterval(session.timerInterval);
    }

    const correctCount = session.results.filter(r => r.correct).length;
    const total = session.targetCount;
    let earnedXP = 0;
    let timeBonusXP = 0;

    session.results.forEach(r => {
      if (r.correct) earnedXP += DeutschFit.Store.getXPForLevel(session.level, true);
    });

    // Bonus and Penalty
    if (session.type === 'quick') {
      earnedXP = Math.round(earnedXP * 1.5);
    } else {
      // Tekli modüller XP'ye daha az etki eder
      earnedXP = Math.round(earnedXP * 0.5);
      if (earnedXP < 1 && correctCount > 0) earnedXP = 1;
    }
    
    // Time Bonus for quick session
    if (session.type === 'quick' && session.startTime) {
      const elapsedSecs = Math.floor((Date.now() - session.startTime) / 1000);
      const maxTime = 15 * 60;
      if (elapsedSecs < maxTime && correctCount > 0) {
        // Bonus: correct ratio * saved time ratio * some multiplier (e.g. 50 max bonus)
        const savedSecs = maxTime - elapsedSecs;
        timeBonusXP = Math.floor((savedSecs / 30) * (correctCount / total));
        earnedXP += timeBonusXP;
      }
    }
    session.timeBonusXP = timeBonusXP;

    session.earnedXP = earnedXP;
    DeutschFit.Store.addXP(earnedXP);
    DeutschFit.Store.updateStreak();

    // Mark text as completed if this was a reading exercise
    if (session.targetCount > 0 && session.currentExercise.textId) {
      DeutschFit.Store.markTextCompleted(session.level, session.currentExercise.textId);
    }

    await DeutschFit.Store.saveResult({
      level: session.level,
      type: session.type,
      score: correctCount,
      total: total,
      date: new Date().toISOString()
    });

    navigate('result');
  }

  function renderResult() {
    const correctCount = session.results.filter(r => r.correct).length;
    const total = session.targetCount || 1;
    const pct = Math.round((correctCount / total) * 100);
    const earnedXP = session.earnedXP || 0;

    let emoji = '📚', message = 'Daha fazla çalışmaya devam!';
    if (pct === 100) { emoji = '🏆'; message = 'Mükemmel! Hatasız!'; }
    else if (pct >= 80) { emoji = '⭐'; message = 'Harika performans!'; }
    else if (pct >= 60) { emoji = '👍'; message = 'İyi gidiyorsun!'; }
    else if (pct >= 40) { emoji = '💪'; message = 'Biraz daha pratik yap!'; }

    const html = `
      <div class="df-animate-in df-text-center" style="padding-top: var(--space-xl);">
        <div class="df-result-emoji">${emoji}</div>
        <h2 style="margin: 0 0 8px 0;">${message}</h2>

        <div class="df-mb-lg">
          ${DeutschFit.UI.createCircularProgress(pct, correctCount + '/' + total)}
        </div>

        <div class="df-result-xp df-animate-slide-up df-mb-lg" style="display:flex; flex-direction:column; gap:4px;">
          <div>+${earnedXP} XP</div>
          ${session.timeBonusXP > 0 ? `<div style="font-size: 0.85rem; opacity: 0.9; margin-top: 4px;">⚡ Zaman Bonusu: +${session.timeBonusXP} XP</div>` : ''}
        </div>

        <div class="df-flex-col df-gap-sm" style="max-width: 300px; margin: 0 auto;">
          <button class="df-btn df-btn--primary df-btn--block df-btn--lg" onclick="DeutschFit.App.startExercise('${session.type || ''}')">➡️ Yeni Soruya Geç</button>
          <button class="df-btn df-btn--secondary df-btn--block" onclick="window.location.hash='home'">🏠 Ana Sayfa</button>
          <button class="df-btn df-btn--ghost df-btn--block" onclick="DeutschFit.App.startExercise('${session.type || ''}')">🔄 Tekrar Dene</button>
        </div>
      </div>
    `;
    DeutschFit.UI.render('main-content', html);

    if (pct >= 80) {
      triggerFireworks();
    }
  }

  // Havai fişek animasyonu fonksiyonu
  function triggerFireworks() {
    const duration = 3000;
    const end = Date.now() + duration;
    
    const colors = ['#3b82f6', '#eab308', '#10b981', '#ec4899'];
    
    (function frame() {
      // Create a particle
      const el = document.createElement('div');
      el.innerHTML = '✨';
      el.style.position = 'fixed';
      el.style.left = Math.random() * 100 + 'vw';
      el.style.top = '-10px';
      el.style.fontSize = (Math.random() * 20 + 10) + 'px';
      el.style.color = colors[Math.floor(Math.random() * colors.length)];
      el.style.zIndex = '9999';
      el.style.pointerEvents = 'none';
      el.style.transition = 'top 1.5s ease-in, opacity 1.5s, transform 1.5s';
      document.body.appendChild(el);
      
      // Animate
      setTimeout(() => {
        el.style.top = '100vh';
        el.style.opacity = '0';
        el.style.transform = `rotate(${Math.random() * 360}deg)`;
      }, 50);
      
      // Cleanup
      setTimeout(() => el.remove(), 1600);
      
      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
  }

  // ===== SETTINGS =====
  async function renderSettings() {
    const level = DeutschFit.Store.getLevel();
    const apiKey = DeutschFit.Store.getApiKey();
    
    // Dashboard verilerini çek
    const data = await DeutschFit.Engine.loadData(level);
    const totalTexte = data.lesen?._total || 0;
    const completedTexte = DeutschFit.Store.getCompletedTexts(level).length;
    const textProgress = totalTexte > 0 ? Math.round((completedTexte / totalTexte) * 100) : 0;

    const html = `
      <div class="df-animate-in">
        <div class="df-header df-mb-lg">
          <button class="df-header__back df-btn df-btn--ghost" onclick="window.location.hash='home'">←</button>
          <h1 class="df-header__title">⚙️ Ayarlar</h1>
        </div>

        <div class="df-card df-mb-md">
          <h3 style="margin: 0 0 12px 0;">Aktif Seviye</h3>
          <div class="df-flex df-gap-sm">
            ${['a1', 'a2', 'b1'].map(l => `
              <button class="df-btn ${level === l ? 'df-btn--primary' : 'df-btn--secondary'}"
                ${level === l ? 'style="background:' + DeutschFit.UI.getLevelGradient(l) + '; border:none;"' : ''}
                onclick="DeutschFit.App.setLevel('${l}')">${DeutschFit.UI.getLevelName(l)}</button>
            `).join('')}
          </div>
        </div>

        <div class="df-card df-mb-md">
          <h3 style="margin: 0 0 8px 0;">🤖 Gemini API Anahtarı</h3>
          <p class="df-text-muted" style="margin: 0 0 12px 0; font-size: 0.8rem;">Yazma egzersizlerinin otomatik değerlendirilmesi için gereklidir.</p>
          <input type="password" id="api-key"
            style="width:100%; padding:10px; border:1px solid rgba(255,255,255,0.15); border-radius:var(--radius-sm); background:var(--bg-secondary); color:var(--text-primary); font-family:inherit; box-sizing:border-box;"
            value="${apiKey}" placeholder="API anahtarını yapıştır..." />
          <div class="df-flex df-gap-sm df-mt-sm">
            <button class="df-btn df-btn--secondary" onclick="DeutschFit.App.saveApiKey()">💾 Kaydet</button>
            <button class="df-btn df-btn--ghost" onclick="var el=document.getElementById('api-key'); el.type = el.type==='password'?'text':'password';">👁️ Göster</button>
          </div>
        </div>

        <div class="df-card df-mb-md">
          <h3 style="margin: 0 0 8px 0;">📊 Veritabanı Kontrol Paneli</h3>
          <p class="df-text-muted" style="margin: 0 0 8px 0; font-size: 0.85rem;">Şu anki seviye (<strong>${level.toUpperCase()}</strong>) için veriler:</p>
          <div class="df-flex-between df-mb-sm">
            <span>Çözülen Okuma Metinleri</span>
            <strong>${completedTexte} / ${totalTexte}</strong>
          </div>
          <div class="df-progress" style="background: var(--bg-surface-active);">
            <div class="df-progress__fill" style="width: ${textProgress}%; background: var(--color-primary);"></div>
          </div>
        </div>

        <div class="df-card df-mb-md">
          <h3 style="margin: 0 0 8px 0;">ℹ️ Hakkında</h3>
          <p class="df-text-muted" style="margin: 0; font-size: 0.85rem;">
            DeutschFit v1.0 — TELC Sınav Hazırlık<br>
            Offline çalışır (Schreiben hariç)
          </p>
        </div>

        <button class="df-btn df-btn--danger df-btn--block" onclick="DeutschFit.App.resetData()">🗑️ Tüm Verileri Sıfırla</button>
      </div>
    `;
    DeutschFit.UI.render('main-content', html);
  }

  window.DeutschFit.App.saveApiKey = function () {
    DeutschFit.Store.setApiKey(document.getElementById('api-key').value.trim());
    DeutschFit.UI.showToast('API Anahtarı kaydedildi.', 'success');
  };

  window.DeutschFit.App.resetData = function () {
    if (confirm('Tüm veriler (XP, streak, geçmiş) silinecek. Emin misiniz?')) {
      localStorage.clear();
      indexedDB.deleteDatabase('deutschfit');
      DeutschFit.UI.showToast('Veriler sıfırlandı.', 'info');
      setTimeout(() => window.location.reload(), 500);
    }
  };

  // ===== STATS =====
  async function renderStats() {
    const stats = await DeutschFit.Store.getStats();
    const xp = DeutschFit.Store.getXP();
    const rank = DeutschFit.Store.getRank(xp);
    const streak = DeutschFit.Store.getStreak();
    const accuracy = stats.totalQuestions > 0 ? Math.round((stats.totalCorrect / stats.totalQuestions) * 100) : 0;

    const macroXP = 10000;
    const macroProgress = Math.min(100, Math.round((xp / macroXP) * 100));

    const html = `
      <div class="df-animate-in">
        <div class="df-header df-mb-lg">
          <button class="df-header__back df-btn df-btn--ghost" onclick="window.location.hash='home'">←</button>
          <h1 class="df-header__title">📊 İstatistikler</h1>
        </div>

        <!-- Makro A1 Hedefi -->
        <div class="df-macro-target df-mb-lg">
          <div class="df-macro-target__header">
            <div class="df-macro-target__icon">🎯</div>
            <div class="df-macro-target__info">
              <h3>Makro A1 Hedefi</h3>
              <p>Hedef: ${macroXP.toLocaleString('tr-TR')} XP</p>
            </div>
            <div class="df-macro-target__pct">${macroProgress}%</div>
          </div>
          <div class="df-macro-target__bar">
            <div class="df-macro-target__fill" style="width: ${macroProgress}%"></div>
          </div>
        </div>

        <div class="df-grid-2 df-gap-md df-mb-lg">
          <div class="df-stat-card df-card df-text-center">
            <div class="df-stat-card__value">${xp}</div>
            <div class="df-stat-card__label">Toplam XP</div>
          </div>
          <div class="df-stat-card df-card df-text-center">
            <div class="df-stat-card__value">${streak.count}🔥</div>
            <div class="df-stat-card__label">Gün Serisi</div>
          </div>
          <div class="df-stat-card df-card df-text-center">
            <div class="df-stat-card__value">${stats.totalExercises}</div>
            <div class="df-stat-card__label">Alıştırma</div>
          </div>
          <div class="df-stat-card df-card df-text-center">
            <div class="df-stat-card__value">%${accuracy}</div>
            <div class="df-stat-card__label">Doğruluk</div>
          </div>
        </div>

        <div class="df-card df-mb-md">
          <div class="df-flex-between">
            <span>Rütbe</span>
            <span>${rank.emoji} ${rank.name}</span>
          </div>
        </div>

        ${Object.keys(stats.byType).length > 0 ? `
          <div class="df-card df-mb-md">
            <h3 style="margin: 0 0 12px 0;">Modül Bazlı</h3>
            ${Object.entries(stats.byType).map(([type, data]) => {
              const pct = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
              return '<div class="df-flex-between df-mb-sm" style="padding:4px 0;"><span style="font-size:0.85rem;">' + type + '</span><span class="df-text-muted" style="font-size:0.85rem;">' + data.count + 'x | %' + pct + '</span></div>';
            }).join('')}
          </div>
        ` : ''}

        ${stats.recent && stats.recent.length > 0 ? `
          <div class="df-card">
            <h3 style="margin: 0 0 12px 0;">Son Alıştırmalar</h3>
            ${stats.recent.map(r =>
              '<div class="df-flex-between df-mb-sm" style="padding:4px 0; border-bottom:1px solid var(--bg-surface-active);"><div><span class="df-badge df-badge--' + (r.level||'b1') + '" style="font-size:0.6rem;">' + (r.level||'').toUpperCase() + '</span> <span style="font-size:0.8rem; margin-left:6px;">' + (r.type||'') + '</span></div><span style="font-size:0.85rem; color:' + (r.score===r.total ? 'var(--color-success)' : 'var(--text-secondary)') + ';">' + r.score + '/' + r.total + '</span></div>'
            ).join('')}
          </div>
        ` : '<div class="df-text-muted df-text-center">Henüz alıştırma yok.</div>'}
      </div>
    `;
    DeutschFit.UI.render('main-content', html);
  }

  // ===== WORD ANALYSIS (GLOBAL) =====
  let selectedWordForAnalysis = '';
  
  document.addEventListener('selectionchange', () => {
    const selection = window.getSelection();
    const tooltip = document.getElementById('selection-tooltip');
    
    if (selection && selection.toString().trim().length > 1) {
       // Sadece harflerden oluşan bir kelime mi kontrol et
       const text = selection.toString().trim();
       if (/^[a-zA-ZäöüßÄÖÜ]+$/.test(text)) {
           const range = selection.getRangeAt(0);
           const rect = range.getBoundingClientRect();
           
           tooltip.style.left = (rect.left + (rect.width / 2)) + 'px';
           tooltip.style.top = (rect.top - 40) + 'px';
           tooltip.classList.remove('df-hidden');
           selectedWordForAnalysis = text;
           return;
       }
    }
    tooltip.classList.add('df-hidden');
  });

  window.DeutschFit.App.triggerWordAnalysis = async function() {
    const tooltip = document.getElementById('selection-tooltip');
    tooltip.classList.add('df-hidden');
    window.getSelection().removeAllRanges();
    
    if (!selectedWordForAnalysis) return;
    
    const modal = document.getElementById('analysis-modal');
    const body = document.getElementById('analysis-modal-body');
    modal.classList.remove('df-hidden');
    body.innerHTML = '<div class="df-text-center df-p-lg">⏳ Kelime analiz ediliyor... (Flash Modeli)</div>';
    
    const result = await DeutschFit.Gemini.generateWordAnalysis(selectedWordForAnalysis);
    
    if (result.error) {
       body.innerHTML = `<div class="df-text-center df-p-lg df-text-error">Hata: ${result.message}</div>`;
       return;
    }
    
    const analysis = result.analysis;
    renderAnalysisOutput(analysis, body);
    
    // Save generated word instantly
    DeutschFit.Store.saveNewWord(analysis);
  };

  function renderAnalysisOutput(a, container) {
    let html = `<div class="df-flex-between df-mb-md">
      <h3 style="margin:0;">${a.type.toUpperCase()}: ${a.word}</h3>
    </div>`;
    
    html += `<div class="df-mb-sm"><strong>Türkçe:</strong> ${a.turkce || '-'}</div>`;
    html += `<div class="df-mb-md"><strong>İngilizce:</strong> ${a.ingilizce || '-'}</div>`;

    if (a.type.includes('isim')) {
        html += `<div class="df-mb-sm"><strong>Artikel:</strong> ${a.artikel || '-'} | <strong>Çoğul:</strong> ${a.plural || '-'}</div>`;
    } else if (a.type.includes('fiil')) {
        html += `<div class="df-mb-sm"><strong>Perfekt:</strong> ${a.perfekt || '-'} | <strong>Präteritum:</strong> ${a.praeteritum || '-'}</div>`;
        html += `<div class="df-mb-sm"><strong>Kasus:</strong> ${a.kasus || '-'} | <strong>Preposition:</strong> ${a.common_preposition || '-'}</div>`;
    } else if (a.type.includes('sıfat') || a.type.includes('zarf')) {
        html += `<div class="df-mb-sm"><strong>Komparativ:</strong> ${a.komparativ || '-'} | <strong>Superlativ:</strong> ${a.superlativ || '-'}</div>`;
    }

    if (a.examples && a.examples.length) {
        html += `<h4 class="df-mt-md">Örnekler</h4><ul style="padding-left: 20px;">`;
        a.examples.forEach(ex => {
            html += `<li class="df-mb-sm"><strong>${ex.sentence}</strong><br><span class="df-text-muted">${ex.translation}</span></li>`;
        });
        html += `</ul>`;
    }
    container.innerHTML = html;
  }

  window.DeutschFit.App.closeWordAnalysis = function() {
    document.getElementById('analysis-modal').classList.add('df-hidden');
  };

  // ===== FLASHCARDS (KELİME EGZERSİZİ) =====
  let flashcardDueList = [];
  let currentCardIndex = 0;
  
  async function renderFlashcards() {
     flashcardDueList = await DeutschFit.Store.getDueWords();
     currentCardIndex = 0;
     updateFlashcardUI();
  }

  window.DeutschFit.App.flipCard = function() {
     const w = flashcardDueList[currentCardIndex];
     let score = 0;
     
     const norm = (str) => (str || '').trim().toLowerCase().replace(/[^a-zäöüß]/g, '');
     const checkTurkce = (ans, correct) => {
         if (!ans || !correct) return false;
         return norm(correct).includes(norm(ans));
     };
     
     let answersHtml = '<div class="df-mt-md df-text-left" style="font-size:0.9rem; background:rgba(255,255,255,0.05); padding:10px; border-radius:8px; display:inline-block; text-align:left; min-width:80%;">';
     
     if (w.type.includes('isim')) {
         const i1 = document.getElementById('fc-input-1')?.value || '';
         const i2 = document.getElementById('fc-input-2')?.value || '';
         const i3 = document.getElementById('fc-input-3')?.value || '';
         const c1 = norm(i1) === norm(w.artikel);
         const c2 = norm(i2) === norm(w.plural);
         const c3 = checkTurkce(i3, w.turkce);
         const corrects = [c1, c2, c3].filter(Boolean).length;
         if (corrects === 3) score = 5;
         else if (corrects >= 1) score = 3;
         else score = 0;
         answersHtml += `<div style="margin-bottom:5px;"><strong>Artikel:</strong> Senin Cevabın: <span style="color:${c1 ? 'var(--color-success)' : 'var(--color-error)'}">${i1 || '-'}</span> | Doğrusu: <strong>${w.artikel || '-'}</strong></div>`;
         answersHtml += `<div style="margin-bottom:5px;"><strong>Çoğul:</strong> Senin Cevabın: <span style="color:${c2 ? 'var(--color-success)' : 'var(--color-error)'}">${i2 || '-'}</span> | Doğrusu: <strong>${w.plural || '-'}</strong></div>`;
         answersHtml += `<div><strong>Türkçesi:</strong> Senin Cevabın: <span style="color:${c3 ? 'var(--color-success)' : 'var(--color-error)'}">${i3 || '-'}</span> | Doğrusu: <strong>${w.turkce || '-'}</strong></div>`;
     } else if (w.type.includes('fiil')) {
         const i1 = document.getElementById('fc-input-1')?.value || '';
         const i2 = document.getElementById('fc-input-2')?.value || '';
         const i3 = document.getElementById('fc-input-3')?.value || '';
         const c1 = norm(i1) === norm(w.perfekt);
         const c2 = norm(i2) === norm(w.praeteritum);
         const c3 = checkTurkce(i3, w.turkce);
         const corrects = [c1, c2, c3].filter(Boolean).length;
         if (corrects === 3) score = 5;
         else if (corrects >= 1) score = 3;
         else score = 0;
         answersHtml += `<div style="margin-bottom:5px;"><strong>Perfekt:</strong> Senin Cevabın: <span style="color:${c1 ? 'var(--color-success)' : 'var(--color-error)'}">${i1 || '-'}</span> | Doğrusu: <strong>${w.perfekt || '-'}</strong></div>`;
         answersHtml += `<div style="margin-bottom:5px;"><strong>Präteritum:</strong> Senin Cevabın: <span style="color:${c2 ? 'var(--color-success)' : 'var(--color-error)'}">${i2 || '-'}</span> | Doğrusu: <strong>${w.praeteritum || '-'}</strong></div>`;
         answersHtml += `<div><strong>Türkçesi:</strong> Senin Cevabın: <span style="color:${c3 ? 'var(--color-success)' : 'var(--color-error)'}">${i3 || '-'}</span> | Doğrusu: <strong>${w.turkce || '-'}</strong></div>`;
     } else {
         const i1 = document.getElementById('fc-input-1')?.value || '';
         const c1 = checkTurkce(i1, w.turkce);
         if (c1) score = 5;
         else score = 0;
         answersHtml += `<div><strong>Türkçesi:</strong> Senin Cevabın: <span style="color:${c1 ? 'var(--color-success)' : 'var(--color-error)'}">${i1 || '-'}</span> | Doğrusu: <strong>${w.turkce || '-'}</strong></div>`;
     }
     answersHtml += '</div>';
     
     const feedbackEl = document.getElementById('fc-auto-feedback');
     if (feedbackEl) {
         if (score === 5) {
             feedbackEl.innerHTML = `<div class="df-text-success df-text-center" style="font-size: 1.2rem; font-weight: bold; margin-bottom: 15px;">Harika! Tamamen doğru bildin. (Puan: 5)</div>`;
         } else if (score === 3) {
             feedbackEl.innerHTML = `<div class="df-text-warning df-text-center" style="font-size: 1.2rem; font-weight: bold; margin-bottom: 15px;">Kısmen doğru. Biraz daha çalışmalısın. (Puan: 3)</div>`;
         } else {
             feedbackEl.innerHTML = `<div class="df-text-error df-text-center" style="font-size: 1.2rem; font-weight: bold; margin-bottom: 15px;">Yanlış. Doğrusunu öğrenelim! (Puan: 0)</div>`;
         }
         feedbackEl.innerHTML += `<div class="df-text-center">${answersHtml}</div>`;
     }
     
     const nextBtn = document.getElementById('fc-auto-next');
     if (nextBtn) {
         nextBtn.onclick = () => window.DeutschFit.App.nextFlashcard(score);
     }

     document.getElementById('flashcard-inner').classList.add('is-flipped');
  };

  window.DeutschFit.App.nextFlashcard = async function(quality, manualHours = null) {
     const word = flashcardDueList[currentCardIndex];
     
     // SRS güncellemesi
     const wordId = word.word.toLowerCase() + '_' + word.type;
     await DeutschFit.Store.updateWordProgress(wordId, quality, manualHours);
     
     currentCardIndex++;
     updateFlashcardUI();
  };

  function updateFlashcardUI() {
     if (currentCardIndex >= flashcardDueList.length) {
         const html = `
           <div class="df-animate-in df-text-center" style="padding-top: var(--space-xl);">
             <div style="font-size: 3rem;">🎉</div>
             <h2>Tebrikler!</h2>
             <p class="df-text-muted">Şu an için tekrar etmeniz gereken kelime kalmadı.</p>
             <div class="df-mt-xl df-flex-col df-gap-sm">
                <button class="df-btn df-btn--primary df-btn--block" onclick="window.location.hash='home'">Ana Ekrana Dön</button>
             </div>
           </div>
         `;
         DeutschFit.UI.render('main-content', html);
         return;
     }

     const w = flashcardDueList[currentCardIndex];
     
     let inputsHtml = '';
     if (w.type.includes('isim')) {
         inputsHtml = `
            <input type="text" id="fc-input-1" placeholder="Artikel (der/die/das)" class="df-fc-input">
            <input type="text" id="fc-input-2" placeholder="Çoğul (die ...)" class="df-fc-input">
            <input type="text" id="fc-input-3" placeholder="Türkçesi" class="df-fc-input">
         `;
     } else if (w.type.includes('fiil')) {
         inputsHtml = `
            <input type="text" id="fc-input-1" placeholder="Perfekt (ist/hat ...)" class="df-fc-input">
            <input type="text" id="fc-input-2" placeholder="Präteritum (ich ...)" class="df-fc-input">
            <input type="text" id="fc-input-3" placeholder="Türkçesi" class="df-fc-input">
         `;
     } else {
         inputsHtml = `
            <input type="text" id="fc-input-1" placeholder="Türkçesi" class="df-fc-input">
         `;
     }

     const html = `
       <div class="df-animate-in df-flex-col" style="height: 100%; min-height: 80vh;">
         <div class="df-header df-mb-lg">
           <button class="df-header__back df-btn df-btn--ghost" onclick="window.location.hash='home'">←</button>
           <h1 class="df-header__title">📇 Kelime Egzersizi</h1>
           <span class="df-badge df-badge--a1">${flashcardDueList.length - currentCardIndex} kelime kaldı</span>
         </div>
         
         <div class="df-flashcard-container">
           <div class="df-flashcard" id="flashcard-inner">
             
             <!-- FRONT -->
             <div class="df-flashcard-face df-flashcard-front df-glass">
                <div class="df-fc-type-badge">${w.type.toUpperCase()}</div>
                <h2 class="df-fc-word">${w.word}</h2>
                <div class="df-fc-inputs df-mt-lg">
                    ${inputsHtml}
                </div>
                <div class="df-mt-xl df-text-center">
                    <button class="df-btn df-btn--primary df-btn--lg" style="width: 200px;" onclick="DeutschFit.App.flipCard()">Çevir / Kontrol Et</button>
                </div>
             </div>
             
             <!-- BACK -->
             <div class="df-flashcard-face df-flashcard-back df-glass">
                <div class="df-fc-back-scroll">
                   <div style="font-size: 1.2rem; font-weight: 600; margin-bottom: 8px;">${w.type.toUpperCase()}: ${w.word}</div>
                   <div class="df-text-muted df-mb-md">${w.turkce || ''} / ${w.ingilizce || ''}</div>
                   
                   ${w.type.includes('isim') ? `<div><strong>Artikel:</strong> ${w.artikel} <br><strong>Çoğul:</strong> ${w.plural}<br><strong>Türkçesi:</strong> ${w.turkce || '-'}</div>` : ''}
                   ${w.type.includes('fiil') ? `<div><strong>Perfekt:</strong> ${w.perfekt} <br><strong>Präteritum:</strong> ${w.praeteritum}<br><strong>Kasus:</strong> ${w.kasus || '-'}</div>` : ''}
                   
                   ${w.examples && w.examples.length ? `<div class="df-mt-sm"><strong>Örnek:</strong><br><em>${w.examples[0].sentence}</em><br><span style="font-size:0.85em; opacity:0.8;">${w.examples[0].translation}</span></div>` : ''}
                </div>
                
                <div class="df-fc-actions df-mt-md">
                   <div id="fc-auto-feedback"></div>
                   <div class="df-text-center df-mt-sm">
                      <button id="fc-auto-next" class="df-btn df-btn--primary df-btn--lg" style="width: 200px;">Sonraki Kelime</button>
                   </div>
                </div>
             </div>
             
           </div>
         </div>
         
       </div>
     `;
     DeutschFit.UI.render('main-content', html);
  }

  window.DeutschFit.App.checkTextLuecke = function() {
    const session = window.DeutschFit.App._currentSession;
    if (!session) return;
    const ex = session.currentExercise;
    let correctCount = 0;
    const inputs = document.querySelectorAll('.df-luecke-input');
    
    inputs.forEach(input => {
      const idStr = input.id.replace('luecke-input-', '');
      const expected = (ex.answers && ex.answers[idStr]) ? ex.answers[idStr] : '';
      const val = input.value.trim().toLowerCase();
      
      if (expected && val === expected.toLowerCase()) {
        input.style.borderColor = 'var(--color-success)';
        input.style.backgroundColor = '#e8f5e9';
        correctCount++;
      } else {
        input.style.borderColor = 'var(--color-error)';
        input.style.backgroundColor = '#ffebee';
      }
      input.disabled = true;
    });

    const isAllCorrect = correctCount === Object.keys(ex.answers || {}).length;
    session.results.push({ correct: isAllCorrect, type: 'text-luecke' });
    
    const btn = document.getElementById('eval-btn');
    if (btn) btn.classList.add('df-hidden');
    
    document.getElementById('next-btn').classList.remove('df-hidden');
  };

  return { 
    init, 
    navigate,
    setLevel: window.DeutschFit.App.setLevel,
    startQuickExercise: window.DeutschFit.App.startQuickExercise,
    startExercise: window.DeutschFit.App.startExercise,
    selectOption: window.DeutschFit.App.selectOption,
    selectRF: window.DeutschFit.App.selectRF,
    toggleSatzWord: window.DeutschFit.App.toggleSatzWord,
    checkSatz: window.DeutschFit.App.checkSatz,
    checkTextLuecke: window.DeutschFit.App.checkTextLuecke,
    updateWordCount: window.DeutschFit.App.updateWordCount,
    evalSchreiben: window.DeutschFit.App.evalSchreiben,
    skipSchreiben: window.DeutschFit.App.skipSchreiben,
    nextQuestion: window.DeutschFit.App.nextQuestion,
    saveApiKey: window.DeutschFit.App.saveApiKey,
    resetData: window.DeutschFit.App.resetData,
    triggerWordAnalysis: window.DeutschFit.App.triggerWordAnalysis,
    closeWordAnalysis: window.DeutschFit.App.closeWordAnalysis,
    flipCard: window.DeutschFit.App.flipCard,
    nextFlashcard: window.DeutschFit.App.nextFlashcard,
    loadNextQuestion: window.DeutschFit.App.loadNextQuestion,
    toggleHoerenAudio: window.DeutschFit.App.toggleHoerenAudio,
    selectHoerenOption: window.DeutschFit.App.selectHoerenOption,
    selectHoerenRF: window.DeutschFit.App.selectHoerenRF,
    typeHoerenText: window.DeutschFit.App.typeHoerenText,
    checkHoerenMulti: window.DeutschFit.App.checkHoerenMulti,
    checkGrammar: window.DeutschFit.App.checkGrammar
  };
})();

// Boot
document.addEventListener('DOMContentLoaded', () => {
  DeutschFit.App.init();
});


