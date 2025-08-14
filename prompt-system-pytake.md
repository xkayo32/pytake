# PyTake Design System - Prompt Completo

## CONFIGURAÇÃO DE DESIGN SYSTEM

### Paleta de Cores com Tema Dual (Light/Dark)
```css
/* Tema Light */
:root {
  --primary: 142 86% 45%;              /* #25D366 - WhatsApp Green */
  --primary-dark: 175 48% 35%;         /* #128C7E - WhatsApp Teal */
  --primary-foreground: 0 0% 100%;     /* White */
  
  --background: 0 0% 100%;             /* White */
  --surface: 210 40% 98%;              /* #F8FAFC - Slate 50 */
  --surface-secondary: 220 14% 96%;    /* #F1F5F9 - Slate 100 */
  
  --foreground: 222 84% 5%;            /* #0C0D12 - Almost Black */
  --foreground-secondary: 215 25% 27%; /* #374151 - Dark Gray */
  --foreground-tertiary: 215 16% 47%;  /* #6B7280 - Medium Gray */
  --foreground-disabled: 220 9% 66%;   /* #9CA3AF - Light Gray */
  
  --border: 220 13% 91%;               /* #E2E8F0 - Slate 200 */
  --accent: 221 83% 53%;               /* #3B82F6 - Blue 500 */
  --success: 142 76% 36%;              /* #16A34A - Green 600 */
  --warning: 38 92% 50%;               /* #EAB308 - Yellow 500 */
  --destructive: 0 84% 60%;            /* #EF4444 - Red 500 */
}

/* Tema Dark */
[data-theme="dark"] {
  --background: 222 84% 5%;            /* #0C0D12 - Almost Black */
  --surface: 215 28% 13%;              /* #1A202C - Dark Surface */
  --surface-secondary: 215 25% 17%;    /* #2D3748 - Secondary Dark */
  
  --foreground: 210 40% 98%;           /* #F8FAFC - Light Text */
  --foreground-secondary: 215 20% 65%; /* #94A3B8 - Secondary Light */
  --foreground-tertiary: 215 16% 47%;  /* #6B7280 - Tertiary Light */
  --foreground-disabled: 220 9% 46%;   /* #6B7280 - Disabled Dark */
  
  --border: 215 28% 17%;               /* #2D3748 - Dark Border */
  --accent: 213 93% 68%;               /* #60A5FA - Blue 400 */
  --success: 142 86% 45%;              /* #22C55E - Green 500 */
  --primary: 142 86% 45%;              /* Maintain WhatsApp green */
  --primary-dark: 175 48% 35%;
}
```

### Tipografia PyTake
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

:root {
  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  
  /* Hierarquia tipográfica */
  --text-xs: 0.75rem;     /* 12px */
  --text-sm: 0.875rem;    /* 14px */
  --text-base: 1rem;      /* 16px */
  --text-lg: 1.125rem;    /* 18px */
  --text-xl: 1.25rem;     /* 20px */
  --text-2xl: 1.5rem;     /* 24px */
  --text-3xl: 1.875rem;   /* 30px */
  --text-4xl: 2.25rem;    /* 36px */
  --text-5xl: 3rem;       /* 48px */
  
  /* Pesos de fonte */
  --font-light: 300;
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
  --font-extrabold: 800;
}
```

### Sistema de Espaçamento e Layout
```css
:root {
  /* Espaçamento baseado em 4px */
  --space-0: 0;
  --space-1: 0.25rem;    /* 4px */
  --space-2: 0.5rem;     /* 8px */
  --space-3: 0.75rem;    /* 12px */
  --space-4: 1rem;       /* 16px */
  --space-5: 1.25rem;    /* 20px */
  --space-6: 1.5rem;     /* 24px */
  --space-8: 2rem;       /* 32px */
  --space-10: 2.5rem;    /* 40px */
  --space-12: 3rem;      /* 48px */
  --space-16: 4rem;      /* 64px */
  --space-20: 5rem;      /* 80px */
  --space-24: 6rem;      /* 96px */
  
  /* Border radius */
  --radius-sm: 0.25rem;   /* 4px */
  --radius: 0.5rem;       /* 8px */
  --radius-md: 0.75rem;   /* 12px */
  --radius-lg: 1rem;      /* 16px */
  --radius-xl: 1.5rem;    /* 24px */
  --radius-full: 9999px;
  
  /* Sombras */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
  
  /* Container */
  --container-max-width: 1200px;
  --container-padding: var(--space-5);
}

/* Breakpoints */
@media (min-width: 640px) {
  :root {
    --container-padding: var(--space-6);
  }
}
@media (min-width: 1024px) {
  :root {
    --container-padding: var(--space-8);
  }
}
```

## COMPONENTES OBRIGATÓRIOS

### 1. Toggle de Tema Dark/Light
```html
<button 
  id="theme-toggle" 
  class="theme-toggle"
  aria-label="Alternar tema escuro/claro"
  type="button"
>
  <div class="theme-toggle-track">
    <div class="theme-toggle-thumb">
      <svg class="theme-icon sun-icon" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd"/>
      </svg>
      <svg class="theme-icon moon-icon" viewBox="0 0 20 20" fill="currentColor">
        <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/>
      </svg>
    </div>
  </div>
</button>

<style>
.theme-toggle {
  position: relative;
  width: 60px;
  height: 32px;
  background: transparent;
  border: 1px solid hsl(var(--border));
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all 0.3s ease;
}

.theme-toggle:hover {
  border-color: hsl(var(--primary));
}

.theme-toggle-track {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: var(--radius-full);
  background: hsl(var(--surface));
  transition: all 0.3s ease;
}

.theme-toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 26px;
  height: 26px;
  border-radius: var(--radius-full);
  background: hsl(var(--primary));
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  box-shadow: var(--shadow-sm);
}

.theme-icon {
  width: 14px;
  height: 14px;
  color: white;
  transition: all 0.3s ease;
}

.sun-icon {
  opacity: 1;
}

.moon-icon {
  opacity: 0;
  position: absolute;
}

[data-theme="dark"] .theme-toggle-thumb {
  transform: translateX(28px);
}

[data-theme="dark"] .sun-icon {
  opacity: 0;
}

[data-theme="dark"] .moon-icon {
  opacity: 1;
}
</style>

<script>
const themeToggle = document.getElementById('theme-toggle');
const html = document.documentElement;

// Carregar tema salvo
const savedTheme = localStorage.getItem('theme') || 'light';
html.setAttribute('data-theme', savedTheme);

themeToggle.addEventListener('click', () => {
  const currentTheme = html.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  html.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
});
</script>
```

### 2. Sistema de Botões
```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius);
  font-family: var(--font-family);
  font-size: var(--text-base);
  font-weight: var(--font-medium);
  text-decoration: none;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

/* Botão Primário */
.btn-primary {
  background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-dark)));
  color: hsl(var(--primary-foreground));
  box-shadow: var(--shadow);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
  filter: brightness(1.05);
}

.btn-primary:active {
  transform: translateY(0);
  box-shadow: var(--shadow);
}

/* Botão Secundário */
.btn-secondary {
  background: transparent;
  color: hsl(var(--foreground));
  border: 1px solid hsl(var(--border));
}

.btn-secondary:hover {
  background: hsl(var(--surface));
  border-color: hsl(var(--primary));
  transform: translateY(-1px);
}

/* Botão Ghost */
.btn-ghost {
  background: transparent;
  color: hsl(var(--foreground-secondary));
}

.btn-ghost:hover {
  background: hsl(var(--surface));
  color: hsl(var(--foreground));
}

/* Estados de Loading */
.btn-loading {
  color: transparent;
}

.btn-loading::after {
  content: '';
  position: absolute;
  width: 16px;
  height: 16px;
  top: 50%;
  left: 50%;
  margin-left: -8px;
  margin-top: -8px;
  border-radius: 50%;
  border: 2px solid transparent;
  border-top-color: currentColor;
  animation: button-loading-spinner 1s ease infinite;
}

@keyframes button-loading-spinner {
  from {
    transform: rotate(0turn);
  }
  to {
    transform: rotate(1turn);
  }
}

/* Tamanhos */
.btn-sm {
  padding: var(--space-2) var(--space-4);
  font-size: var(--text-sm);
}

.btn-lg {
  padding: var(--space-4) var(--space-8);
  font-size: var(--text-lg);
}
```

### 3. Sistema de Cards
```css
.card {
  background: hsl(var(--surface));
  border: 1px solid hsl(var(--border));
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  box-shadow: var(--shadow-sm);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-xl);
  border-color: hsl(var(--primary) / 0.3);
}

.card-header {
  margin-bottom: var(--space-4);
}

.card-title {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: hsl(var(--foreground));
  margin: 0 0 var(--space-2) 0;
}

.card-description {
  color: hsl(var(--foreground-secondary));
  font-size: var(--text-sm);
  line-height: 1.5;
  margin: 0;
}

.card-content {
  margin-bottom: var(--space-4);
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
}

/* Card com gradiente */
.card-gradient {
  background: linear-gradient(135deg, 
    hsl(var(--primary) / 0.05), 
    hsl(var(--primary-dark) / 0.05)
  );
  border-color: hsl(var(--primary) / 0.2);
}

/* Card de feature */
.feature-card {
  text-align: center;
  padding: var(--space-8);
}

.feature-icon {
  width: 48px;
  height: 48px;
  margin: 0 auto var(--space-4);
  background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-dark)));
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}
```

### 4. Formulários e Inputs
```css
.form-group {
  margin-bottom: var(--space-5);
}

.form-label {
  display: block;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: hsl(var(--foreground));
  margin-bottom: var(--space-2);
}

.form-input {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
  border-radius: var(--radius);
  font-size: var(--text-base);
  color: hsl(var(--foreground));
  transition: all 0.3s ease;
}

.form-input::placeholder {
  color: hsl(var(--foreground-tertiary));
}

.form-input:focus {
  outline: none;
  border-color: hsl(var(--primary));
  box-shadow: 0 0 0 3px hsl(var(--primary) / 0.1);
}

.form-input:invalid {
  border-color: hsl(var(--destructive));
}

.form-input:invalid:focus {
  box-shadow: 0 0 0 3px hsl(var(--destructive) / 0.1);
}

/* Input com ícone */
.input-group {
  position: relative;
}

.input-icon {
  position: absolute;
  left: var(--space-3);
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  color: hsl(var(--foreground-tertiary));
  pointer-events: none;
}

.input-group .form-input {
  padding-left: var(--space-10);
}

/* Textarea */
.form-textarea {
  min-height: 100px;
  resize: vertical;
}

/* Checkbox e Radio */
.form-checkbox,
.form-radio {
  appearance: none;
  width: 20px;
  height: 20px;
  border: 1px solid hsl(var(--border));
  background: hsl(var(--background));
  margin-right: var(--space-2);
  cursor: pointer;
  transition: all 0.3s ease;
}

.form-checkbox {
  border-radius: var(--radius-sm);
}

.form-radio {
  border-radius: var(--radius-full);
}

.form-checkbox:checked,
.form-radio:checked {
  background: hsl(var(--primary));
  border-color: hsl(var(--primary));
}

.form-checkbox:checked::after {
  content: '✓';
  display: block;
  text-align: center;
  color: white;
  font-size: 12px;
  line-height: 18px;
}

.form-radio:checked::after {
  content: '';
  width: 8px;
  height: 8px;
  background: white;
  border-radius: var(--radius-full);
  display: block;
  margin: 5px auto;
}
```

## ANIMAÇÕES E MICROINTERAÇÕES

### Animações Base
```css
/* Utilitários de animação */
.fade-in {
  opacity: 0;
  animation: fadeIn 0.6s ease forwards;
}

.slide-up {
  opacity: 0;
  transform: translateY(20px);
  animation: slideUp 0.6s ease forwards;
}

.float {
  animation: float 3s ease-in-out infinite;
}

.gradient-text {
  background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-dark)));
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-size: 200% auto;
  animation: gradientMove 3s ease-in-out infinite;
}

@keyframes fadeIn {
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
}

@keyframes gradientMove {
  0%, 100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

/* Intersection Observer para animações */
.animate-on-scroll {
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.8s ease;
}

.animate-on-scroll.in-view {
  opacity: 1;
  transform: translateY(0);
}
```

### JavaScript para Animações
```javascript
// Intersection Observer para animações no scroll
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
    }
  });
}, observerOptions);

// Observar elementos com classe animate-on-scroll
document.querySelectorAll('.animate-on-scroll').forEach(el => {
  observer.observe(el);
});

// Smooth scroll para links âncora
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});
```

## ESTRUTURAS DE PÁGINA

### Header Padrão
```html
<header class="header">
  <div class="container">
    <div class="header-content">
      <div class="logo">
        <svg class="logo-icon" viewBox="0 0 24 24" fill="currentColor">
          <!-- Logo SVG -->
        </svg>
        <span class="logo-text">PyTake</span>
      </div>
      
      <nav class="nav">
        <a href="#features" class="nav-link">Recursos</a>
        <a href="#pricing" class="nav-link">Preços</a>
        <a href="#about" class="nav-link">Sobre</a>
        <a href="#contact" class="nav-link">Contato</a>
      </nav>
      
      <div class="header-actions">
        <button id="theme-toggle" class="theme-toggle" aria-label="Toggle theme">
          <!-- Theme toggle content -->
        </button>
        <a href="/login" class="btn btn-ghost">Entrar</a>
        <a href="/register" class="btn btn-primary">Começar Grátis</a>
      </div>
      
      <button class="mobile-menu-toggle" aria-label="Toggle menu">
        <span></span>
        <span></span>
        <span></span>
      </button>
    </div>
  </div>
</header>
```

### Hero Section
```html
<section class="hero">
  <div class="container">
    <div class="hero-content">
      <div class="hero-text">
        <h1 class="hero-title gradient-text animate-on-scroll">
          Automação WhatsApp que Impulsiona Vendas
        </h1>
        <p class="hero-description animate-on-scroll">
          Conecte-se com seus clientes, automatize conversas e aumente suas vendas com a plataforma mais completa de WhatsApp Business do Brasil.
        </p>
        <div class="hero-actions animate-on-scroll">
          <a href="/register" class="btn btn-primary btn-lg">
            Começar Grátis
            <svg class="icon" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/>
            </svg>
          </a>
          <a href="#demo" class="btn btn-secondary btn-lg">Ver Demo</a>
        </div>
        <div class="hero-stats animate-on-scroll">
          <div class="stat">
            <span class="stat-number">10k+</span>
            <span class="stat-label">Empresas</span>
          </div>
          <div class="stat">
            <span class="stat-number">1M+</span>
            <span class="stat-label">Mensagens</span>
          </div>
          <div class="stat">
            <span class="stat-number">99%</span>
            <span class="stat-label">Uptime</span>
          </div>
        </div>
      </div>
      
      <div class="hero-visual animate-on-scroll">
        <div class="mockup float">
          <!-- Dashboard mockup ou ilustração -->
        </div>
      </div>
    </div>
  </div>
</section>
```

## VERSÃO SIMPLIFICADA

```
Crie interface PyTake seguindo:

CORES: WhatsApp Green (#25D366) primária, teal (#128C7E) secundária. Tema dark/light com toggle funcional. Background light: white/slate-50, dark: slate-900/slate-800. Texto hierárquico.

COMPONENTES: Toggle tema 60x32px com ícones sol/lua. Botões com gradient, hover elevation (-2px), loading spinner. Cards hover (-4px) com shadow-xl. Inputs focus ring colorido.

LAYOUT: Container 1200px, padding responsivo, grid mobile-first. Font Inter, border-radius 8-16px, espaçamento 4px base.

ANIMAÇÕES: Transições 0.3s, fadeIn+slideUp entrada, float para ilustrações, gradient-text para títulos, intersection observer scroll.

REQUISITOS: 100% responsivo, localStorage tema, smooth scroll, WCAG AA, variáveis CSS, estados loading/hover/focus.

HTML/CSS/JS completo funcional.
```

Este sistema mantém a consistência do PyTake e pode ser usado para gerar qualquer interface seguindo o mesmo padrão visual!