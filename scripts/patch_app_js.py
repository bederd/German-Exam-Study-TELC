import os

app_js_path = 'app/js/app.js'
with open(app_js_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Inject case 'hoeren-multi' in renderExercise
if "case 'hoeren-multi':" not in content:
    content = content.replace(
        "case 'hoeren-mc':\n        contentHtml = buildMC(ex); break;",
        "case 'hoeren-mc':\n        contentHtml = buildMC(ex); break;\n      case 'hoeren-multi':\n        contentHtml = buildHoerenMulti(ex); break;"
    )

# 2. Inject buildHoerenMulti and the logic
if "function buildHoerenMulti" not in content:
    hoeren_logic = """
  // --- Hören Multi Builder (Custom Audio Player & Question List) ---
  function buildHoerenMulti(ex) {
    // Reset audio states for new exercise
    window.DeutschFit.App._hoerenPlayCount = 0;
    window.DeutschFit.App._hoerenIsPlaying = false;

    let qsHtml = '<div class="df-hoeren-questions-list df-mt-lg">';
    ex.fragen.forEach((q, idx) => {
      let qBody = '';
      if (q.typ === 'mc') {
        const letters = ['a', 'b', 'c'];
        let options = '';
        if (q.optionen) {
          options = q.optionen.map((opt, i) => `
            <div class="df-option hoeren-opt hoeren-opt-${idx}" data-idx="${idx}" data-val="${letters[i]}" onclick="DeutschFit.App.selectHoerenOption(${idx}, '${letters[i]}', this)">
              <span class="df-option__letter">${letters[i]}</span>
              <span class="df-option__text">${opt.replace(/^[abc]\\)\\s*/, '')}</span>
            </div>
          `).join('');
        }
        qBody = `<div class="df-options">${options}</div>`;
      } else if (q.typ === 'rf') {
        qBody = `
          <div class="df-rf-options" style="display:grid; grid-template-columns: 1fr 1fr; gap: var(--space-sm);">
            <button class="df-rf-btn df-btn df-btn--secondary hoeren-rf-btn hoeren-rf-${idx}" data-idx="${idx}" data-val="richtig" onclick="DeutschFit.App.selectHoerenRF(${idx}, 'richtig', this)">Richtig</button>
            <button class="df-rf-btn df-btn df-btn--secondary hoeren-rf-btn hoeren-rf-${idx}" data-idx="${idx}" data-val="falsch" onclick="DeutschFit.App.selectHoerenRF(${idx}, 'falsch', this)">Falsch</button>
          </div>
        `;
      }
      
      qsHtml += `
        <div class="df-card df-mb-md hoeren-question-card" id="hoeren-q-${idx}" data-correct="${q.antwort}" data-typ="${q.typ}">
          <h4 class="df-mb-sm">${idx + 1}. ${q.frage || q.aussage}</h4>
          ${qBody}
          <div class="hoeren-explanation df-mt-sm" style="display:none; font-size: 14px; color: var(--text-secondary);">
            ${q.erklaerung ? '💡 ' + q.erklaerung : ''}
          </div>
        </div>
      `;
    });
    qsHtml += '</div>';

    return `
      <div class="hoeren-multi-container">
        <div class="df-card df-mb-md" style="position: sticky; top: 16px; z-index: 10; border-left: 4px solid var(--color-primary); background: var(--bg-card); box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
          <div class="df-flex df-items-center df-justify-between">
            <div>
              <h3 style="margin:0; font-size: 16px;">${ex.kontext}</h3>
              <p style="margin:4px 0 0 0; font-size:12px; color:var(--text-secondary);">Maksimum 2 kez dinleyebilirsiniz. Geri sarma kapalıdır.</p>
            </div>
            <div id="hoeren-limits" style="font-weight:bold; font-size:18px; color:var(--color-primary);">0 / 2</div>
          </div>
          
          <div class="df-mt-md df-flex df-items-center df-gap-md">
            <button id="hoeren-play-btn" class="df-btn df-btn--primary" onclick="DeutschFit.App.toggleHoerenAudio()" style="border-radius: 50%; width: 48px; height: 48px; padding: 0; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <span id="hoeren-play-icon" style="font-size:20px;">▶</span>
            </button>
            <div style="flex-grow:1; background: var(--bg-body); height: 8px; border-radius: 4px; overflow: hidden; position: relative;">
               <div id="hoeren-progress-bar" style="width: 0%; height: 100%; background: var(--color-primary); transition: width 0.1s linear;"></div>
            </div>
          </div>
          
          <!-- Gizli audio etiketi -->
          <audio id="hoeren-audio" src="${ex.audioSrc}" preload="auto"></audio>
        </div>

        ${qsHtml}
        
        <div class="df-mt-lg df-text-center">
           <button class="df-btn df-btn--primary df-btn--lg" id="hoeren-check-btn" onclick="DeutschFit.App.checkHoerenMulti()">Kontrol Et</button>
        </div>
      </div>
    `;
  }
"""
    # Insert it before `// --- MC Builder ---`
    content = content.replace('// --- MC Builder ---', hoeren_logic + '\n  // --- MC Builder ---')


if "DeutschFit.App.toggleHoerenAudio" not in content:
    handlers = """
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
  window.DeutschFit.App._hoerenAnswers = {};

  window.DeutschFit.App.selectHoerenOption = function(idx, val, el) {
    window.DeutschFit.App._hoerenAnswers[idx] = val;
    // Highlight selected
    const all = document.querySelectorAll('.hoeren-opt-' + idx);
    all.forEach(a => a.classList.remove('df-option--selected'));
    el.classList.add('df-option--selected');
  };

  window.DeutschFit.App.selectHoerenRF = function(idx, val, el) {
    window.DeutschFit.App._hoerenAnswers[idx] = val;
    // Highlight selected
    const all = document.querySelectorAll('.hoeren-rf-' + idx);
    all.forEach(a => {
      a.style.background = 'var(--bg-card)';
      a.style.color = 'var(--text-main)';
    });
    el.style.background = 'var(--color-primary)';
    el.style.color = 'white';
  };

  window.DeutschFit.App.checkHoerenMulti = function() {
    const ex = session.exercises[session.currentIndex];
    const totalQ = ex.fragen.length;
    let correctCount = 0;
    
    // Pause audio if playing
    const audio = document.getElementById('hoeren-audio');
    if (audio && !audio.paused) {
       audio.pause();
       document.getElementById('hoeren-play-icon').textContent = '▶';
    }

    // Check all questions
    ex.fragen.forEach((q, idx) => {
      const card = document.getElementById('hoeren-q-' + idx);
      const userAns = window.DeutschFit.App._hoerenAnswers[idx];
      const isCorrect = (userAns && userAns.toLowerCase() === q.antwort.toLowerCase());
      
      if (isCorrect) correctCount++;
      
      // Visual feedback
      if (q.typ === 'mc') {
        const opts = document.querySelectorAll('.hoeren-opt-' + idx);
        opts.forEach(opt => {
          opt.style.pointerEvents = 'none';
          if (opt.dataset.val.toLowerCase() === q.antwort.toLowerCase()) {
            opt.classList.add('df-option--correct');
          } else if (opt.dataset.val === userAns && !isCorrect) {
            opt.classList.add('df-shake');
            opt.style.background = 'var(--color-error)';
            opt.style.color = 'white';
          }
        });
      } else if (q.typ === 'rf') {
        const opts = document.querySelectorAll('.hoeren-rf-' + idx);
        opts.forEach(opt => {
          opt.style.pointerEvents = 'none';
          if (opt.dataset.val.toLowerCase() === q.antwort.toLowerCase()) {
            opt.style.background = 'var(--color-success)';
            opt.style.color = 'white';
          } else if (opt.dataset.val === userAns && !isCorrect) {
            opt.classList.add('df-shake');
            opt.style.background = 'var(--color-error)';
            opt.style.color = 'white';
          }
        });
      }
      
      const expl = card.querySelector('.hoeren-explanation');
      if (expl) expl.style.display = 'block';
    });

    document.getElementById('hoeren-check-btn').style.display = 'none';
    
    // Register results
    session.results.push({ correct: correctCount === totalQ, answer: window.DeutschFit.App._hoerenAnswers });
    
    // Reward XP for correct ones (custom reward outside standard if needed)
    if (correctCount > 0) {
       const xpPer = DeutschFit.Store.getXPForLevel(session.level, true);
       DeutschFit.Store.addXP(xpPer * correctCount);
    }
    
    document.getElementById('next-btn').classList.remove('df-hidden');
  };
"""
    content = content.replace('// ===== ANSWER HANDLERS =====', '// ===== ANSWER HANDLERS =====\n' + handlers)

with open(app_js_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Patch applied to app.js")
