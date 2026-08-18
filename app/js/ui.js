var DeutschFit = window.DeutschFit || {};

DeutschFit.UI = (function() {
  function render(containerId, html) {
    const el = document.getElementById(containerId);
    if (el) {
      el.innerHTML = html;
      // Trigger animations on .df-animate-in elements
      requestAnimationFrame(() => {
        el.querySelectorAll('.df-animate-in').forEach((child, i) => {
          child.style.animationDelay = `${i * 80}ms`;
        });
      });
    }
  }
  
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `df-toast df-toast--${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
  
  function animateCorrect(element) {
    element.classList.add('df-option--correct');
    element.classList.add('df-pulse-green');
  }
  
  function animateWrong(element) {
    element.classList.add('df-option--wrong');
    element.classList.add('df-shake');
  }
  
  function animateConfetti() {
    const colors = ['#f97316', '#22c55e', '#3b82f6', '#8b5cf6', '#ef4444', '#f59e0b'];
    const container = document.getElementById('app');
    for (let i = 0; i < 50; i++) {
      const piece = document.createElement('div');
      piece.className = 'df-confetti-piece';
      piece.style.left = Math.random() * 100 + 'vw';
      piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDuration = (Math.random() * 2 + 1.5) + 's';
      piece.style.animationDelay = Math.random() * 0.5 + 's';
      piece.style.width = (Math.random() * 8 + 5) + 'px';
      piece.style.height = (Math.random() * 8 + 5) + 'px';
      piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
      if (container) container.appendChild(piece);
      setTimeout(() => piece.remove(), 4000);
    }
  }
  
  function createProgressBar(current, total) {
    const pct = total > 0 ? (current / total * 100) : 0;
    return `<div class="df-exercise__progress">
      <div class="df-exercise__question-number">${current} / ${total}</div>
      <div class="df-progress"><div class="df-progress__fill" style="width:${pct}%"></div></div>
    </div>`;
  }
  
  function createCircularProgress(percentage, label) {
    const r = 52;
    const c = 2 * Math.PI * r;
    const offset = c - (percentage / 100) * c;
    return `<div class="df-circular-progress">
      <svg viewBox="0 0 120 120">
        <circle class="circle-bg" cx="60" cy="60" r="${r}" />
        <circle class="circle-progress" cx="60" cy="60" r="${r}" 
          stroke-dasharray="${c}" stroke-dashoffset="${offset}" 
          transform="rotate(-90 60 60)" />
      </svg>
      <div class="df-circular-progress__value">${label || Math.round(percentage) + '%'}</div>
    </div>`;
  }
  
  function getLevelColor(level) {
    return { a1: 'var(--color-a1)', a2: 'var(--color-a2)', b1: 'var(--color-b1)' }[level] || 'var(--color-b1)';
  }
  
  function getLevelGradient(level) {
    return { a1: 'var(--gradient-a1)', a2: 'var(--gradient-a2)', b1: 'var(--gradient-b1)' }[level] || 'var(--gradient-b1)';
  }
  
  function getLevelName(level) {
    return { a1: 'A1+', a2: 'A2+', b1: 'B1+' }[level] || level.toUpperCase();
  }
  
  function wordCount(text) {
    return text.trim().split(/\s+/).filter(w => w.length > 0).length;
  }
  
  return { render, showToast, animateCorrect, animateWrong, animateConfetti, createProgressBar, createCircularProgress, getLevelColor, getLevelGradient, getLevelName, wordCount };
})();
