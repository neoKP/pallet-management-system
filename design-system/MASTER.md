# Neo Siam Logistics - Design System Master

## Project Overview
- **Product Type**: Logistics Dashboard / Inventory Management System
- **Industry**: Logistics & Supply Chain
- **Style**: Professional Industrial + Modern Dashboard
- **Stack**: React + TypeScript + TailwindCSS

---

## 1. Color Palette (Logistics/Industrial Theme)

### Primary Colors
```css
--primary-blue: #2563eb;      /* Trust, Reliability */
--primary-indigo: #4f46e5;    /* Premium, Analytics */
--primary-slate: #0f172a;     /* Professional, Industrial */
```

### Secondary Colors
```css
--success-emerald: #10b981;   /* Positive, Completed */
--warning-amber: #f59e0b;     /* Alerts, Pending */
--danger-red: #ef4444;        /* Critical, Errors */
--info-cyan: #06b6d4;         /* Information */
```

### Pallet Type Colors (Brand Identity)
```css
--loscam-red: #dc2626;        /* Loscam Red Pallets */
--loscam-yellow: #eab308;     /* Loscam Yellow Pallets */
--loscam-blue: #2563eb;       /* Loscam Blue Pallets */
--hiq-purple: #7c3aed;        /* HIQ Pallets */
--general-slate: #64748b;     /* General Pallets */
--plastic-teal: #14b8a6;      /* Plastic Circular */
```

### Background & Surface
```css
--bg-dark: #020617;           /* Dark mode background */
--bg-light: #f8fafc;          /* Light mode background */
--surface-white: #ffffff;     /* Cards, Modals */
--surface-glass: rgba(255, 255, 255, 0.85);
```

---

## 2. Typography

### Font Stack
```css
/* Primary - Thai Support */
font-family: 'Kanit', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

/* Display/Headlines */
font-family: 'Oswald', sans-serif;

/* Monospace/Data */
font-family: 'Orbitron', 'JetBrains Mono', monospace;
```

### Font Sizes (Responsive)
| Element | Mobile | Desktop | Weight |
|---------|--------|---------|--------|
| H1 | 1.875rem | 2.5rem | 800 |
| H2 | 1.5rem | 2rem | 700 |
| H3 | 1.25rem | 1.5rem | 700 |
| Body | 0.875rem | 1rem | 400 |
| Small | 0.75rem | 0.875rem | 400 |
| Caption | 0.625rem | 0.75rem | 500 |

### Line Height
- Body text: 1.6
- Headlines: 1.2
- Data/Numbers: 1.4

---

## 3. Spacing System (8px Grid)

```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
```

---

## 4. Border Radius

```css
--radius-sm: 0.375rem;    /* 6px - Buttons, Inputs */
--radius-md: 0.5rem;      /* 8px - Cards */
--radius-lg: 0.75rem;     /* 12px - Modals */
--radius-xl: 1rem;        /* 16px - Large Cards */
--radius-2xl: 1.5rem;     /* 24px - Hero Sections */
--radius-full: 9999px;    /* Pills, Avatars */
```

---

## 5. Shadows

```css
/* Light Mode */
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);

/* Glow Effects */
--shadow-blue-glow: 0 0 20px rgba(37, 99, 235, 0.3);
--shadow-purple-glow: 0 0 20px rgba(99, 102, 241, 0.4);
```

---

## 6. Component Patterns

### Cards (Bento Grid Style)
```css
.bento-card {
  background: white;
  border: 1px solid var(--slate-200);
  border-radius: var(--radius-xl);
  padding: var(--space-6);
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.bento-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 30px 60px -12px rgba(0, 0, 0, 0.1);
  border-color: rgba(59, 130, 246, 0.3);
}
```

### Glassmorphism
```css
.glass {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(226, 232, 240, 0.8);
}
```

### Buttons
```css
/* Primary */
.btn-primary {
  background: linear-gradient(135deg, #2563eb, #4f46e5);
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: var(--radius-lg);
  font-weight: 700;
  transition: all 0.2s;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-blue-glow);
}
```

---

## 7. Animation Guidelines

### Duration
- Micro-interactions: 150-200ms
- Page transitions: 300-500ms
- Complex animations: 500-800ms

### Easing
```css
--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
```

### Key Animations
```css
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

---

## 8. Accessibility Requirements

- **Color Contrast**: Minimum 4.5:1 for text
- **Touch Targets**: Minimum 44x44px
- **Focus States**: Visible focus rings (2px solid blue)
- **Reduced Motion**: Respect `prefers-reduced-motion`
- **ARIA Labels**: All icon-only buttons must have aria-label

---

## 9. Responsive Breakpoints

```css
/* Mobile First */
xs: 400px   /* Extra small phones */
sm: 640px   /* Small tablets */
md: 768px   /* Tablets */
lg: 1024px  /* Laptops */
xl: 1280px  /* Desktops */
2xl: 1536px /* Large screens */
```

---

## 10. Icon System

- **Library**: Lucide React
- **Size**: 16px (small), 20px (default), 24px (large)
- **Style**: Stroke width 2px
- **Color**: Inherit from parent or explicit color class

---

## 11. Chart Colors (Analytics)

```javascript
const CHART_COLORS = {
  primary: '#6366f1',    // Indigo
  secondary: '#8b5cf6',  // Purple
  accent: '#ec4899',     // Pink
  success: '#10b981',    // Emerald
  warning: '#f59e0b',    // Amber
  danger: '#ef4444',     // Red
  info: '#06b6d4',       // Cyan
  neutral: '#64748b',    // Slate
};
```

---

## 12. Anti-Patterns to Avoid

❌ **DO NOT**:
- Use emojis as icons (use Lucide SVG icons)
- Use generic fonts like Arial or system-ui alone
- Use scale transforms on hover that shift layout
- Use purple gradients on white (overused AI aesthetic)
- Mix different icon libraries
- Use color as the only indicator
- Forget cursor-pointer on clickable elements

✅ **DO**:
- Use consistent icon set (Lucide)
- Use Kanit for Thai text support
- Use transform: translateY for hover effects
- Provide visual feedback on all interactions
- Test both light and dark modes
- Use semantic HTML elements
