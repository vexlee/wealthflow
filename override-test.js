const fs = require('fs');
const cssPath = 'src/app/globals.css';
let css = fs.readFileSync(cssPath, 'utf8');

const themeOverrides = `
  /* Theme Overrides for Creamy Beach */
  --color-white: oklch(0.99 0.005 80);
  
  /* Overriding Violet with Ocean Blue */
  --color-violet-50: oklch(0.97 0.02 210);
  --color-violet-100: oklch(0.93 0.04 210);
  --color-violet-200: oklch(0.88 0.06 210);
  --color-violet-300: oklch(0.82 0.08 210);
  --color-violet-400: oklch(0.74 0.10 210);
  --color-violet-500: oklch(0.65 0.12 210);
  --color-violet-600: oklch(0.58 0.12 210);
  --color-violet-700: oklch(0.50 0.12 210);
  --color-violet-800: oklch(0.42 0.12 210);
  --color-violet-900: oklch(0.35 0.12 210);
  --color-violet-950: oklch(0.25 0.12 210);

  /* Overriding Slate with Warm Sand / Deep Ocean tones */
  --color-slate-50: oklch(0.97 0.01 80);
  --color-slate-100: oklch(0.94 0.01 80);
  --color-slate-200: oklch(0.88 0.02 80);
  --color-slate-300: oklch(0.80 0.02 80);
  --color-slate-400: oklch(0.70 0.02 80);
  --color-slate-500: oklch(0.60 0.02 80);
  --color-slate-600: oklch(0.50 0.02 80);
  --color-slate-700: oklch(0.40 0.02 80);
  --color-slate-800: oklch(0.30 0.02 80);
  --color-slate-900: oklch(0.22 0.02 240);
  --color-slate-950: oklch(0.18 0.02 240);
`;

if (!css.includes('--color-white: oklch(0.99')) {
  css = css.replace('@theme inline {', '@theme inline {' + themeOverrides);
  fs.writeFileSync(cssPath, css);
  console.log('Overrides injected into globals.css');
} else {
  console.log('Already injected');
}
