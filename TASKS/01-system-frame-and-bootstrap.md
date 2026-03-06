# Alien Landing Page — System Frame & Bootstrap

## Assumptions & Clarifications

- **Deployment target:** Static files served by lighttpd (lighty). No SSR, no server-side runtime required beyond static file serving. PHP is available but not used.
- **Domain:** cammckenzie.com — the landing page replaces the current root index. Blog remains at `/blog`, contact at `/contact`.
- **Build workflow:** Developer runs `npm run build`, uploads `dist/` contents to web server root. `data.json` lives alongside the built assets in the same directory and is fetched at runtime by the browser.
- **Item count:** Expected 5–20 entries in `data.json`. Performance optimisation for large datasets (100+ items) is explicitly NOT required.
- **Browser targets:** Modern evergreen browsers (Chrome, Firefox, Safari, Edge). No IE11. WebGL2 required.
- **Mobile:** Touch devices get the simplified fixed/orbit camera view by default. Desktop users get the full free-camera experience.
- **No authentication, no backend API, no database.** This is a purely static, client-side application.

---

## Problem Statement

Build a visually striking, interactive 3D landing page that serves as both a creative showcase and a functional link hub, loading its entries from a runtime `data.json` file.

---

## System Boundaries

**In scope:**
- Cinematic descent sequence (space → atmosphere → alien planet surface)
- Procedural alien terrain with bioluminescent aesthetic
- Seeded procedural structure generators (7 types: crystal, flora, mushroom, vortex, geometric, entity, architecture)
- Camera state machine with three modes: descent, free-cam (desktop), fixed/orbit (mobile + simplified)
- Free-cam controls: mouse look, WASD movement, click-to-blink teleport
- Runtime `data.json` loading with priority-driven visual prominence
- HTML overlay labels projected from 3D world positions
- Subtle HUD overlay during descent sequence
- Post-processing effects (bloom, atmospheric)
- Ambient and per-structure particle systems
- Responsive: desktop and mobile

**Out of scope:**
- The blog itself (`/blog`)
- The contact page (`/contact`)
- Any server-side logic
- Audio/sound design (can be added later)
- User accounts, analytics, cookies
- SEO beyond basic meta tags (the page is primarily a visual experience)

---

## Key Architectural Decisions

| Decision | Choice | Justification |
|----------|--------|---------------|
| Build tool | Vite | Fast dev server, clean static output, native TS/ES module support |
| 3D engine | Three.js (r128+) | Mature, well-documented, sufficient for procedural 3D scenes |
| Language | TypeScript | Type safety for complex 3D math and data structures |
| Styling | Vanilla CSS (minimal) | Only needed for HTML overlay labels and HUD — the page is 95% canvas |
| State management | Simple state machine class | Three camera modes + transitions. No framework needed. |
| Data loading | Fetch API at runtime | `data.json` is fetched from same directory, parsed, validated |
| Procedural generation | Seeded PRNG (mulberry32 or similar) | Deterministic structure shapes from seed values with micro-variation per frame |
| Structure diversity | Generator registry pattern | Each structure type is a generator function registered by name. `data.json` `type` field selects the generator. |
| Post-processing | Three.js EffectComposer | Bloom pass (UnrealBloomPass) + optional color grading |

---

## Technology Choices

- **Runtime:** Browser (client-side only)
- **Language:** TypeScript 5.x
- **Build:** Vite 5.x
- **3D Engine:** Three.js (latest stable, currently r160+)
- **Post-processing:** three/examples/jsm/postprocessing (EffectComposer, UnrealBloomPass, RenderPass)
- **Procedural RNG:** Custom seeded PRNG (mulberry32) — no external dependency
- **CSS:** Vanilla, scoped to overlay elements only
- **Package manager:** npm

---

## Top-Level Module Map

```
src/
├── main.ts                          — Entry point: init scene, load data, start loop
├── config.ts                        — All tuning constants (durations, colors, sizes)
├── types.ts                         — Shared TypeScript interfaces (DataEntry, CameraState, etc.)
│
├── data/
│   └── loader.ts                    — Fetch data.json, validate schema, apply defaults
│
├── scene/
│   ├── setup.ts                     — Renderer, scene, fog, lighting, resize handler
│   ├── sky.ts                       — Starfield particle system + nebula cloud layers
│   └── terrain.ts                   — Procedural terrain mesh with flattened landing zone
│
├── camera/
│   ├── state-machine.ts             — CameraState enum, transitions, escape key handling
│   ├── descent.ts                   — Descent animation: camera path, star warp, phase timing
│   ├── free-cam.ts                  — WASD + mouse look + click-to-blink teleport
│   └── fixed-cam.ts                 — Orbit camera with mouse parallax (mobile default)
│
├── structures/
│   ├── registry.ts                  — Maps type strings to generator functions
│   ├── base.ts                      — StructureGenerator interface + shared utilities (seeded RNG, color)
│   ├── placement.ts                 — Positions structures on terrain using priority + angular distribution
│   ├── particles.ts                 — Per-structure localised particle emitters
│   └── generators/
│       ├── crystal.ts               — Faceted crystal formation generator
│       ├── flora.ts                 — DNA-helix twisted tree / tendril plant generator
│       ├── mushroom.ts              — Bioluminescent mushroom cluster generator
│       ├── vortex.ts                — Energy vortex / spiral column generator
│       ├── geometric.ts             — Ringed orbital sphere / floating geometry generator
│       ├── entity.ts                — Jellyfish-like bioluminescent creature generator
│       └── architecture.ts          — Alien tower / monolith with data-glyph generator
│
├── hud/
│   └── descent-hud.ts              — Subtle HTML overlay with telemetry during descent
│
├── ui/
│   ├── labels.ts                    — HTML labels projected from 3D structure positions
│   └── mode-indicator.ts            — Current mode + hint text display
│
└── effects/
    ├── post-processing.ts           — EffectComposer setup (bloom, render pass)
    └── ambient-particles.ts         — Global floating neon dust particle system
```

```
public/
├── data.json                        — Runtime site entries (served as static file)
└── index.html                       — Shell HTML (canvas mount + overlay containers)
```

---

## Critical Constraints

These are system-wide rules that **every task must respect**:

1. **`data.json` is the single source of truth for all link entries.** No links are hardcoded in source code. If it's not in `data.json`, it does not appear on the page.

2. **The built output must be fully static.** `npm run build` produces files that can be served by any static file server (lighttpd, nginx, Apache) with zero server-side processing.

3. **`data.json` is loaded at runtime via `fetch()`, not imported at build time.** The whole point is that editing `data.json` does not require rebuilding.

4. **Structure generators must be deterministic given the same seed.** The seeded PRNG must produce identical base geometry for a given seed value. Per-frame micro-variation (animation, sway, glow pulse) is layered on top at render time, not baked into geometry.

5. **The camera state machine is the single authority on camera position and mode.** No module may directly set `camera.position` or `camera.rotation` outside the camera module. The state machine delegates to the active controller (descent/free/fixed).

6. **All tuning constants live in `config.ts`.** Durations, colors, sizes, speeds, distances — all in one file. No magic numbers in module code.

7. **Mobile detection happens once at startup and selects the initial camera mode.** Mobile users start in fixed-cam after descent. Desktop users start in free-cam after descent.

8. **Escape key is a toggle between free-cam and fixed-cam after descent completes.** During descent, Escape skips to the post-descent default mode.

---

## `data.json` Schema

```typescript
interface DataEntry {
  name: string;             // REQUIRED — display name
  url: string;              // REQUIRED — navigation target (relative path or absolute URL)
  priority: number;         // REQUIRED — 1-10, higher = more visually prominent
  description?: string;     // OPTIONAL — subtitle text shown on hover/focus
  type?: string;            // OPTIONAL — structure generator type (e.g., "crystal", "flora")
                            //            if omitted, derived from seed or assigned round-robin
  seed?: number;            // OPTIONAL — seed for procedural generation
                            //            if omitted, derived from hash of name string
}
```

Example `data.json`:
```json
[
  {
    "name": "Blog",
    "description": "Infrastructure, security & building things",
    "url": "/blog",
    "priority": 10,
    "type": "architecture",
    "seed": 42
  },
  {
    "name": "GitHub",
    "description": "Open source projects & contributions",
    "url": "https://github.com/camAtGitHub",
    "priority": 7,
    "type": "geometric",
    "seed": 77
  },
  {
    "name": "YT Channel Analyzer",
    "description": "Algorithmic analysis of YouTube channel performance",
    "url": "/tools/yt-analyzer",
    "priority": 6,
    "type": "vortex"
  },
  {
    "name": "JSON Explorer",
    "description": "Validate & explore nested JSON datasets",
    "url": "/tools/json-explorer",
    "priority": 5,
    "type": "crystal"
  },
  {
    "name": "Bookmark Merger",
    "description": "Cross-browser bookmark cleanup tool",
    "url": "/tools/bookmark-merger",
    "priority": 4,
    "type": "mushroom"
  },
  {
    "name": "Contact",
    "description": "Get in touch — no email required",
    "url": "/contact",
    "priority": 3,
    "type": "flora"
  }
]
```

---

---

# Project Bootstrap — Alien Landing Page

## What This Project Does

An interactive 3D landing page for cammckenzie.com that plays a cinematic descent sequence (flying through space and landing on a neon-lit alien planet), then presents navigable link entries from a runtime `data.json` file as procedurally generated alien structures (crystals, bioluminescent plants, energy vortices, etc.) on the planet surface. Desktop users explore in free-camera mode; mobile users get a guided orbit view. The page builds to static files via Vite and is served by lighttpd.

## Architecture in One Sentence

Single-page Vite+TypeScript+Three.js application with a camera state machine driving three modes (descent → free-cam → fixed-cam), procedural structure generators registered by type name, and a runtime-fetched `data.json` for all entry data.

## Key Files & Modules

| Path | What it is | Notes |
|------|-----------|-------|
| `src/main.ts` | Application entry point | Orchestrates init, data load, animation loop |
| `src/config.ts` | All tuning constants | Single source for colors, durations, sizes, speeds |
| `src/types.ts` | Shared TypeScript interfaces | DataEntry, CameraState, StructureInstance |
| `src/data/loader.ts` | Runtime data.json loader | Fetch + validate + apply defaults |
| `src/scene/` | Scene setup, sky, terrain | Foundation 3D environment |
| `src/camera/` | Camera state machine + 3 controllers | Descent, free-cam, fixed-cam |
| `src/structures/` | Procedural generator system | Registry pattern, 7 generator types, placement logic |
| `src/ui/` | HTML overlay labels + indicators | Projected from 3D positions |
| `src/effects/` | Post-processing + ambient particles | Bloom, floating neon dust |
| `public/data.json` | Site entries | Fetched at runtime, NOT imported at build time |

## System Invariants (Always True)

1. All link entries come from `data.json` fetched at runtime — zero hardcoded links in source.
2. Camera position/rotation is exclusively controlled by the active camera controller via the state machine — no direct camera manipulation elsewhere.
3. All magic numbers live in `config.ts` — module code references named constants only.
4. Structure generators are pure functions of `(seed, priority, type)` → deterministic base geometry. Animation is layered at render time.
5. The built output is static files only — no server-side runtime dependency.

## Out of Scope (Do Not Touch)

- `/blog` — separate existing site content, not part of this build
- `/contact` — separate existing page, not part of this build
- Server configuration — lighttpd config is managed separately
- `data.json` content — the build process does not modify or validate the production data file (a sample is provided for development)

## Current State

Greenfield project. Nothing is built yet. A visual prototype exists as a single HTML file (not part of this codebase) that validated the concept direction.
