# Alien Landing Page — Visual Reference & Aesthetic Guide

This document describes the target aesthetic for coding agents implementing structure generators and scene visuals. Reference images were provided by the project owner.

---

## Overall World Aesthetic

**Environment:** Dark alien planet surface under a star-filled sky with nebula color washes. Rocky, low-poly terrain (flat-shaded) with subtle neon wireframe overlay. The ground is dark (near-black with deep indigo/purple tones). All light comes from the structures and particles — the terrain itself is unlit and moody.

**Color Palette:**
- Background/terrain: `#020010` to `#0a0a1a` (deep space black to dark indigo)
- Neon accents: hot magenta `#ff00cc`, electric cyan `#00ffc8`, vivid orange `#ff6600`, bright blue `#00aaff`, neon yellow `#ffdd00`, hot pink `#ff0066`, lime green `#88ff00`
- Sky/fog: deep purple-black with nebula washes of green and magenta

**Key Visual Principles:**
1. **Dark ground, bright structures.** The contrast between the nearly-black terrain and the intensely glowing structures is the core aesthetic.
2. **Bioluminescence over illumination.** Structures glow from within (emissive materials), they don't reflect external light. Think deep-sea creatures, not spotlit objects.
3. **Particles everywhere.** Every structure emits floating motes, spores, energy dots. The ambient air has neon-colored dust. This makes the scene feel alive.
4. **Translucency and depth.** Many elements are semi-transparent — jellyfish domes, mushroom caps, energy vortex rings. Seeing inner structures through outer shells adds richness.
5. **Bloom is essential.** The UnrealBloomPass makes emissive surfaces bleed light into surrounding space. Without bloom, the neon look falls flat.

---

## Structure Type Visual Targets

### Crystal (`crystal`)
**Look:** Cluster of faceted prismatic columns growing from a shared base, like quartz geodes but neon. 3-8 columns of varying heights and tilt angles. Columns taper toward the top. Low polygon count on the cylinder (4-7 sides) gives faceted, gemstone appearance. Internal glow. Colors tend toward cyan, magenta, or blue.

**Key details:** Faceted surfaces (low-poly cylinders), slight tilt variation, clustered arrangement, tapered tops. The light comes from within each prism.

### Flora (`flora`)
**Look — Variant A (Twisted Tree):** Two trunk columns spiraling around each other in a DNA double-helix pattern. Bioluminescent — trunks glow from within. Top canopy is a cloud of small glowing spheres (like alien fruit or leaves). Colors tend toward green and cyan.

**Look — Variant B (Bulb Stalks):** 3-6 organic curved stalks rising from a root mass at the base. Each stalk curves outward and upward, topped with a large glowing translucent orb (like a balloon or seed pod). Thin tendrils connect between stalks. Colors tend toward warm pink/orange orbs on cyan stalks.

**Key details:** Organic curves (not straight lines), visible connection between base and canopy/bulbs, translucent bulbs with internal glow, thin decorative tendrils.

### Mushroom (`mushroom`)
**Look:** Large bioluminescent mushroom cluster. 1-3 dominant large mushrooms with thick stems and broad dome caps, surrounded by 2-5 smaller mushrooms at the base. Caps are translucent domes with visible gill patterns underneath. Floating spore dots above the caps. Colors tend toward vivid magenta and purple with cyan accents.

**Key details:** Dome-shaped caps (partial spheres, not full), gill lines visible on cap undersides, stem slightly wider at base, smaller mushrooms clustered around larger ones, floating spore geometry above.

### Vortex (`vortex`)
**Look:** A spiraling column of energy rising from a glowing pool on the ground. The column is made of stacked luminous rings that spiral upward, tapering as they rise. 2-4 thin orbit rings circle the column at different heights. The base has a flat glowing ring/pool effect. Colors are intensely bright with additive blending for the energy look.

**Key details:** Additive blending on column materials (looks like pure energy/light), spiral arrangement of ring elements, ground-level pool/crater, thin orbiting rings, column tapers toward top.

### Geometric (`geometric`)
**Look:** A faceted platonic solid (icosahedron, octahedron, or dodecahedron — NOT a smooth sphere) hovering above the ground with 1-3 tilted orbital rings. Surrounded by faint scattered dot-like aura particles. Internal warm glow. The rings orbit at different speeds and angles. Colors tend toward warm gold/orange center with cool cyan/blue rings.

**Key details:** Faceted body (NOT smooth), floating above ground (local Y offset), orbital rings at different tilt angles, aura dot cloud, each ring rotates independently.

### Entity (`entity`)
**Look:** A massive glowing jellyfish-like creature hovering well above the ground. Translucent dome/bell body (you can see through it to an inner glowing core). Long trailing tendrils hanging below the dome, swaying organically. Vein-like line patterns on the dome surface. NOT humanoid in any way. Colors tend toward warm pink/yellow dome with cool cyan tendrils.

**Key details:** High translucency on dome (opacity ≤ 0.5), visible inner core through dome, segmented tendrils that animate independently (wave motion), significant hover height, breathing animation (dome scales slightly on Y axis), organic and abstract — no face, no limbs.

### Architecture (`architecture`)
**Look:** An alien tower/monolith. Dark structural body with bright glowing panels/windows. Three sub-variants: stepped tower (stacked diminishing blocks), monolith slab (tall rectangular with protruding elements), or spired cathedral (central spire with flanking smaller spires). Cascading stream of light/data glyphs down one face (animated abstract dots scrolling downward). Foundation platform at base. Colors: dark structure body with bright neon window panels.

**Key details:** Dark body (low emissive) contrasting with bright panels, data cascade animation (scrolling abstract dots/dashes on one face), does NOT rotate (buildings are static), only light effects animate, monumental scale relative to other structures.

---

## Ground-Level Ambient Details

The terrain area between structures has:
- **Floating neon dust particles:** Small colored dots drifting gently in the air, using the neon color palette with vertex colors. Slow sinusoidal movement.
- **Per-structure particle emitters:** Each structure emits its own localized particles — spores rising from mushrooms, energy motes from vortices, stardust from geometric objects, etc. These rise upward and recycle.
- **Subtle terrain wireframe:** The neon green wireframe overlay on the terrain at very low opacity (6%) gives a sci-fi grid feel to the ground without being visually dominant.

---

## Descent Sequence Visual Targets

**Phase 1 — Space (0-30%):** Stars streaking past vertically (warp speed effect). Deep black background. Stars are white/slightly colored points.

**Phase 2 — Atmosphere (30-70%):** Stars fade as camera passes through colored nebula planes (magenta, cyan, green). Fog begins to appear. Colors wash across the view.

**Phase 3 — Approach (70-100%):** Planet surface comes into view. Terrain wireframe visible. Structures begin to glow in the distance. Camera settles to landing position. Stars mostly hidden by fog.

**HUD during descent:** Very subtle geometric lines and countdown numbers. Monospace font, neon green at max 20-40% opacity. Corner bracket framing lines, altitude counter, velocity indicator. Abstract and decorative, not functional cockpit instruments.
