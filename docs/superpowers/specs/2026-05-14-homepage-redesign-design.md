# Homepage Redesign Design

## Purpose

Redesign the homepage from a scroll-driven globe-to-directory demo into a cinematic threshold for Robert Williams' personal site. The new homepage should feel minimalist, sophisticated, and authored: an off-white civic-industrial world with architectural sketch illustration, light art deco rhythm, and a restrained personal thesis.

The homepage should not read as a startup landing page, a portfolio grid, or a resume. It should feel like the entrance to a personal publication and index: distinctive first, legible after entry.

## Current Context

The current homepage in `src/app/page.tsx` is a fixed-viewport client component. It uses wheel and touch input to drive a `scrollProgress` value, which animates `ParticleField` from a particle globe into a skyline and reveals a directory late in the interaction.

This gives the page a memorable cinematic quality, but it also hides navigation behind an interaction that visitors have to discover. The site has also grown beyond the current directory model: writings may become more important, and built systems like Monitor and AI Stack should not necessarily dominate the homepage.

Production build currently passes. Lint is red because of existing React hook lint issues in Three.js mutation code and a few state-in-effect patterns. The redesign should avoid adding new lint debt and should retire the homepage's dependency on the current `ParticleField`.

## Visual Direction

Use an off-white background with moderate blue and gray-blue linework. The illustration language should combine:

- Louis Kahn / Frank Lloyd Wright architectural study drawings.
- Recognizable city and industrial forms.
- Italian futurist and art deco energy, used as rhythm and motion rather than heavy ornament.
- Minimalist composition with confident negative space.

The central visual should be a custom drawn panorama of national growth: city, industry, energy, transport, and infrastructure in one clean civic-industrial scene. It should be recognizable, but artistic and architectural, not literal clip art.

Avoid glossy 3D, dense particle fields, gradients as the main visual identity, patriotic symbols, startup SaaS aesthetics, and overly decorative deco styling.

## Homepage Experience

The homepage opens as a cinematic threshold:

- Off-white canvas.
- Large bold architectural panorama.
- Robert Williams name placed calmly within the composition.
- A small, visible "Enter" cue.
- Minimal or no biography on the first viewport.

The visitor enters deliberately by clicking or tapping the Enter cue. The page should not rely on hidden scroll hijacking. After Enter, the homepage transitions into a normal scrollable page. The entry illustration should recede, shift, or soften rather than disappear completely.

Reduced-motion users should get a simple fade or instant reveal instead of a theatrical transition.

## Post-Enter Structure

After Enter, the homepage becomes a continuous scroll:

1. A short authored note: one concise paragraph that establishes the lens of the site. It should read like an opening plaque, not a biography.
2. A compact primary index: Writings, About, and Work, with Work linking to `/projects`.
3. A latest writing module using the existing writings content helpers.
4. Low-emphasis secondary links for systems or experiments, including Monitor and AI Stack if included at all.
5. A small footer with the name, year, and secondary navigation only.

Writings should be easy to find because writing may become more important. Monitor and AI Stack should remain reachable but should not be presented as hero proof points unless the content strategy changes later.

## Illustration Continuity

The visual theme should continue after Enter. The entry panorama is the boldest moment; post-enter sections should use quieter architectural vignettes:

- Marginal line drawings.
- Section marks inspired by the panorama.
- Low-contrast industrial, energy, city, or transport fragments.
- Decorative structure that supports reading rather than competing with it.

Use section vignettes for the first implementation. Do not use a persistent panorama background in the first pass, because it is more likely to compete with reading.

## Components

The homepage should be rebuilt around smaller components:

- `HomePageExperience`: client wrapper for Enter state, transition, and reduced-motion behavior.
- `EntryPanorama`: custom SVG/React illustration for the first viewport.
- `HomeIntro`: name, Enter cue, and first-viewport composition.
- `HomeIndex`: short note, compact links, latest writing, and secondary links.
- `HomeIllustrationVignette`: reusable small drawing fragments for post-enter sections.

The implementation should favor static SVG and CSS over Three.js/canvas for the homepage. This will better match the sketch direction, improve load behavior, simplify accessibility, and reduce lint friction.

## Data Flow

Use existing writing helpers for the latest writing module:

- `getPublishedWritings()`
- `formatWritingDate()`

Create or revise homepage-specific link data rather than blindly reusing the current `directorySections` labels. The primary homepage index should be content-strategy-driven, not forced to mirror every existing route.

Initial primary links:

- Writings
- About
- Work, linking to `/projects`

Initial secondary links:

- Monitor
- AI Stack

The secondary links should be visually quieter and easy to remove or reorder.

## Accessibility

The Enter cue must be a real button with a clear accessible name. Keyboard users should be able to activate it and then reach the revealed content naturally.

When Enter is activated, focus should move to the post-enter content heading or the revealed index. If JavaScript fails, the page should still expose the main content or provide a normal link to the index section.

Respect `prefers-reduced-motion`. The illustration should remain legible on mobile, and text must not overlap the drawing in cramped viewports.

## Error Handling

The homepage should have no network-dependent rendering path. If there is no published writing, the latest writing module should be hidden or replaced by a quiet archive link.

The illustration should not depend on browser APIs beyond standard SVG/CSS. This avoids the runtime fragility of canvas/Three.js on the homepage.

## Testing And Verification

Run:

- `npm run build`
- `npm run lint`

Visually verify:

- Desktop first viewport.
- Mobile first viewport.
- Enter transition.
- Post-enter scroll.
- Reduced-motion behavior.
- Light/off-white palette and linework contrast.

Confirm that the homepage no longer depends on `ParticleField`, and that removing it from the root route does not affect other pages.

## Out Of Scope

This redesign does not redesign Monitor, AI Stack, Writings, Projects, About, or Susan. It also does not decide a permanent writing strategy or whether Monitor/AI Stack should eventually become prominent homepage features.

The current untracked AI Stack tour work is unrelated and should not be modified as part of the homepage redesign.
