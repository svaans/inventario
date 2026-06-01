# UI Style Guide

This project uses Tailwind CSS variables to maintain a consistent design language. Below are the key guidelines for building new components.

## Color Palette

All colors are defined using CSS variables in `src/index.css`. Use these variables via Tailwind's `hsl(var(--color))` utility.

| Variable | Description |
| --- | --- |
| `--background` | Page background |
| `--foreground` | Primary text color |
| `--primary` / `--primary-foreground` | Brand color and its contrast |
| `--secondary` / `--secondary-foreground` | Secondary surfaces |
| `--muted` / `--muted-foreground` | Muted text and backgrounds |
| `--accent` / `--accent-foreground` | Accent highlights |
| `--golden`, `--golden-dark` | Empanada theme highlight |
| `--brown`, `--brown-light` | Warm neutral colors |

Gradients and shadows are also exposed as variables such as `--gradient-primary` and `--shadow-golden` for consistent effects.

## Typography

Use Tailwind's font utilities (`font-sans`, `font-medium`, etc.) and keep headings semantically correct. Avoid hard‑coded font families; rely on the default sans-serif stack defined by Tailwind.

## Component Usage

Reusable components live under `src/components/ui`. Import them directly to maintain accessibility and consistent styling:

```tsx
import { Button } from '@/components/ui/button'

<Button variant="primary">Guardar</Button>
```

All icons are decorative by default and include `aria-hidden="true"`. When creating new components, ensure interactive elements are keyboard accessible and respect the existing color variables.