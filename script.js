/* ══════════════════════════════════════════════════════════
   ANLAM LAB — Core Script
   Neural Network Canvas · Navbar · Interactions
   ══════════════════════════════════════════════════════════ */
'use strict';

/* ─── Neural Canvas ─────────────────────────────────────────── */
class NeuralCanvas {
  constructor(id, cfg = {}) {
    this.canvas = document.getElementById(id);
    if (!this.canvas) return;
    this.ctx    = this.canvas.getContext('2d');
    this.cfg    = {
      count:      cfg.count      ?? 70,
      connDist:   cfg.connDist   ?? 140,
      speed:      cfg.speed      ?? 0.22,
      hubRatio:   cfg.hubRatio   ?? 0.18,
      mouseR:     cfg.mouseR     ?? 210,
      bg:         cfg.bg         ?? 'rgba(0, 24, 69, 0.18)',
      bgInit:     cfg.bgInit     ?? '#001845',
      /* Particle colors (on dark navy bg) */
      nodeColor:  cfg.nodeColor  ?? [160, 185, 255],   /* soft navy-blue-white */
      hubColor:   cfg.hubColor   ?? [200, 218, 255],
      cyanColor:  cfg.cyanColor  ?? [100, 210, 240],
    };
    this.mouse = { x: -9999, y: -9999 };
    this.particles = [];
    this._bound_resize  = this._resize.bind(this);
    this._bound_mouse   = this._mouse.bind(this);
    this._bound_tick    = this._tick.bind(this);
    this._init();
  }

  _init() {
    this._resize();
    window.addEventListener('resize',    this._bound_resize, { passive: true });
    window.addEventListener('mousemove', this._bound_mouse,  { passive: true });
    this._build();
    this.ctx.fillStyle = this.cfg.bgInit;
    this.ctx.fillRect(0, 0, this.W, this.H);
    requestAnimationFrame(this._bound_tick);
  }

  _resize() {
    const parent = this.canvas.parentElement;
    this.W = this.canvas.width  = parent ? parent.clientWidth  : window.innerWidth;
    this.H = this.canvas.height = parent ? parent.clientHeight : window.innerHeight;
  }

  _mouse(e) {
    const r = this.canvas.getBoundingClientRect();
    this.mouse.x = e.clientX - r.left;
    this.mouse.y = e.clientY - r.top;
  }

  _build() {
    const { count, hubRatio, speed } = this.cfg;
    this.particles = Array.from({ length: count }, () => {
      const isHub = Math.random() < hubRatio;
      return {
        x: Math.random() * this.W,
        y: Math.random() * this.H,
        vx: (Math.random() - 0.5) * speed,
        vy: (Math.random() - 0.5) * speed,
        r: isHub ? Math.random() * 1.8 + 1.6 : Math.random() * 1.0 + 0.5,
        phase: Math.random() * Math.PI * 2,
        phaseS: 0.010 + Math.random() * 0.016,
        isHub,
      };
    });
  }

  _connections() {
    const { ctx, particles, cfg } = this;
    const [nr, ng, nb] = cfg.nodeColor;
    const maxD = cfg.connDist;

    for (let i = 0; i < particles.length; i++) {
      const a = particles[i];
      for (let j = i + 1; j < particles.length; j++) {
        const b = particles[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > maxD * maxD) continue;
        const d = Math.sqrt(d2);
        const t = 1 - d / maxD;
        const op = Math.pow(t, 2.2) * 0.18;
        ctx.strokeStyle = `rgba(${nr},${ng},${nb},${op})`;
        ctx.lineWidth   = t * 0.5;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }

  _drawP(p) {
    const { ctx, cfg } = this;
    const pulse  = 0.55 + Math.sin(p.phase) * 0.35;
    let [r, g, b] = p.isHub ? cfg.hubColor : cfg.nodeColor;

    // Cyan hub glow intensifies near cursor to create a reactive focal point.
    let cyanMix = 0;
    if (p.isHub) {
      const mdx = this.mouse.x - p.x;
      const mdy = this.mouse.y - p.y;
      const md = Math.sqrt(mdx * mdx + mdy * mdy);
      const mouseInf = md < this.cfg.mouseR ? (1 - md / this.cfg.mouseR) : 0;
      cyanMix = 0.30 + mouseInf * 0.70;
      r = Math.round(r * (1 - cyanMix) + cfg.cyanColor[0] * cyanMix);
      g = Math.round(g * (1 - cyanMix) + cfg.cyanColor[1] * cyanMix);
      b = Math.round(b * (1 - cyanMix) + cfg.cyanColor[2] * cyanMix);
    }

    // Velocity-based streak for subtle motion blur.
    const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    if (speed > 0.018) {
      const inv = 1 / speed;
      const tx = p.vx * inv;
      const ty = p.vy * inv;
      const len = Math.min(p.isHub ? 26 : 14, speed * (p.isHub ? 96 : 70));
      const grad = ctx.createLinearGradient(p.x, p.y, p.x - tx * len, p.y - ty * len);
      const headA = p.isHub ? (0.26 + cyanMix * 0.10) : 0.12;
      const tailA = p.isHub ? 0.02 : 0.01;
      grad.addColorStop(0, `rgba(${r},${g},${b},${headA})`);
      grad.addColorStop(1, `rgba(${r},${g},${b},${tailA})`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = Math.max(1, p.r * (p.isHub ? 1.4 : 1.0));
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - tx * len, p.y - ty * len);
      ctx.stroke();
    }

    if (p.isHub) {
      const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 18);
      gr.addColorStop(0,   `rgba(${r},${g},${b},${pulse * (0.22 + cyanMix * 0.10)})`);
      gr.addColorStop(0.5, `rgba(${r},${g},${b},${pulse * (0.07 + cyanMix * 0.05)})`);
      gr.addColorStop(1,   `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 18, 0, Math.PI * 2);
      ctx.fill();
    }

    const alpha = p.isHub ? pulse * 0.88 : pulse * 0.6;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
    ctx.fill();
  }

  _update(p) {
    p.phase += p.phaseS;

    // Mouse pull
    const dx = this.mouse.x - p.x, dy = this.mouse.y - p.y;
    const md = Math.sqrt(dx * dx + dy * dy);
    if (md < this.cfg.mouseR && md > 0) {
      const f = (1 - md / this.cfg.mouseR) * 0.010;
      p.vx += (dx / md) * f;
      p.vy += (dy / md) * f;
    }

    // Damping + cap
    p.vx *= 0.993; p.vy *= 0.993;
    const sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    const max = this.cfg.speed * 2.8;
    if (sp > max) { p.vx *= max / sp; p.vy *= max / sp; }

    p.x += p.vx; p.y += p.vy;

    // Wrap at edges
    if (p.x < -20) p.x = this.W + 20;
    if (p.x > this.W + 20) p.x = -20;
    if (p.y < -20) p.y = this.H + 20;
    if (p.y > this.H + 20) p.y = -20;
  }

  _tick() {
    const { ctx, W, H } = this;
    ctx.fillStyle = this.cfg.bg;
    ctx.fillRect(0, 0, W, H);
    this._connections();
    for (const p of this.particles) { this._update(p); this._drawP(p); }
    requestAnimationFrame(this._bound_tick);
  }
}

/* ─── Navbar ────────────────────────────────────────────────── */
function initNav() {
  const nav = document.querySelector('.nav');
  if (!nav) return;
  // Nav is always white — just add subtle shadow on scroll
  const onScroll = () => {
    nav.style.boxShadow = window.scrollY > 10
      ? '0 1px 0 #E2E8F0, 0 4px 16px rgba(0,48,128,0.06)'
      : '0 1px 0 #E2E8F0, 0 2px 8px rgba(0,48,128,0.04)';
  };
  window.addEventListener('scroll', onScroll, { passive: true });
}

/* ─── Active nav link ───────────────────────────────────────── */
function setActive() {
  const page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a, .mobile-menu a').forEach(a => {
    const h = a.getAttribute('href') || '';
    if (h === page || (page === '' && h === 'index.html')) a.classList.add('active');
  });
}

/* ─── Hamburger menu ────────────────────────────────────────── */
function initHamburger() {
  const btn  = document.querySelector('.nav-hamburger');
  const menu = document.querySelector('.mobile-menu');
  if (!btn || !menu) return;
  btn.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    const [s1, s2, s3] = [...btn.querySelectorAll('span')];
    s2.style.opacity   = open ? '0' : '';
    s1.style.transform = open ? 'rotate(45deg) translate(4px, 4px)' : '';
    s3.style.transform = open ? 'rotate(-45deg) translate(4px, -4px)' : '';
  });
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    menu.classList.remove('open');
    btn.querySelectorAll('span').forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
  }));
}

/* ─── Scroll reveal ─────────────────────────────────────────── */
function initReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) {
        setTimeout(() => e.target.classList.add('in'), i * 60);
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.06, rootMargin: '0px 0px -28px 0px' });
  els.forEach(el => io.observe(el));
}

/* ─── Filter tabs ───────────────────────────────────────────── */
function initFilters() {
  document.querySelectorAll('.filter-bar').forEach(bar => {
    const btns = bar.querySelectorAll('.filter-btn');
    const pool = bar.nextElementSibling;
    if (!pool) return;
    btns.forEach(btn => btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const f = btn.dataset.filter;
      pool.querySelectorAll('[data-fk]').forEach(el => {
        el.style.display = f === 'all' || el.dataset.fk === f ? '' : 'none';
      });
    }));
  });
}

/* ─── Pub search ────────────────────────────────────────────── */
function initPubSearch() {
  const inp = document.getElementById('pubSearch');
  if (!inp) return;
  inp.addEventListener('input', () => {
    const q = inp.value.toLowerCase().trim();
    document.querySelectorAll('.pub-row').forEach(row => {
      row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  });
}

/* ─── Subtle math parallax ──────────────────────────────────── */
function initParallax() {
  const floats = document.querySelectorAll('.math-float');
  if (!floats.length) return;
  document.addEventListener('mousemove', e => {
    const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    const fx = (e.clientX - cx) / cx, fy = (e.clientY - cy) / cy;
    floats.forEach((el, i) => {
      const d = (i % 2 === 0 ? 1 : -1) * (4 + i * 2);
      el.style.transform = `translateX(${fx * d}px) translateY(${fy * d}px)`;
    });
  });
}

/* ─── Boot ──────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  setActive();
  initHamburger();
  initReveal();
  initFilters();
  initPubSearch();
  initParallax();

  // Hero canvas
  if (document.getElementById('neuralCanvas')) {
    new NeuralCanvas('neuralCanvas', {
      count:    Math.min(80, Math.floor((window.innerWidth * window.innerHeight) / 10500)),
      connDist: 145,
      speed:    0.20,
      hubColor: [186, 212, 255],
      cyanColor:[100, 210, 240],
    });
  }

  // Page canvas (sub-pages, lighter)
  if (document.getElementById('pageCanvas')) {
    new NeuralCanvas('pageCanvas', {
      count:    38,
      connDist: 115,
      speed:    0.14,
      hubRatio: 0.12,
      bg:       'rgba(0, 24, 69, 0.22)',
      bgInit:   '#00163a',
      hubColor: [176, 204, 248],
      cyanColor:[100, 210, 240],
    });
  }
});
