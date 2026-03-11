# Ruslie Spring — Company Profile Website

A modern, animated company profile built with **Next.js 14**, **TypeScript**, **Tailwind CSS**, and **Framer Motion**.

## Color Palette
- **Primary Navy:** `#021d47`
- **White / Light sections:** `#ffffff`, `#f5f7fa`
- **Silver accents:** `#c0c8d8`, `#8899b4`
- **Steel text:** `#334155`, `#64748b`

## Sections
1. **Hero** — Animated spring SVG, parallax scroll, dot-grid background
2. **About** — Company story, stats, feature cards (white section)
3. **Products** — 6 spring types grid (navy section)
4. **Gallery** — 9 photo placeholders with hover overlay + lightbox (white section)
5. **Capabilities** — Technical specs table, industry tags (light grey section)
6. **Contact** — Quote request form with success state (navy section)

## Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Run development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 3. Build for production
```bash
npm run build
npm start
```

## Adding Gallery Photos

The gallery section (`components/Gallery.tsx`) has 9 placeholder slots.

To replace a placeholder with a real photo:
1. Add your image to the `/public/` folder (e.g. `spring-01.jpg`)
2. In `Gallery.tsx`, replace the placeholder div with:

```tsx
import Image from "next/image";

// Inside the gallery card, replace the center placeholder div with:
<Image
  src="/spring-01.jpg"
  alt="Compression Spring — Automotive Grade"
  fill
  className="object-cover"
/>
```

## Project Structure

```
ruslie-spring/
├── app/
│   ├── globals.css        # Global styles + font imports
│   ├── layout.tsx         # Root layout with metadata
│   └── page.tsx           # Main page (composes all sections)
├── components/
│   ├── Navbar.tsx         # Fixed navigation with mobile menu
│   ├── Hero.tsx           # Hero section with parallax
│   ├── About.tsx          # About + stats section
│   ├── Products.tsx       # Product catalog grid
│   ├── Gallery.tsx        # Photo gallery with lightbox
│   ├── Capabilities.tsx   # Technical specs + industries
│   ├── Contact.tsx        # Contact form
│   ├── Footer.tsx         # Footer
│   └── SpringSVG.tsx      # Animated spring SVG component
├── public/                # Place your spring photos here
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```
