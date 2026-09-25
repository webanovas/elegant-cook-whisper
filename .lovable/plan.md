# CookNotes Floating Gallery Overhaul

## Goal
Rework the full CookNotes experience into the selected artisanal floating gallery: warm cream and terracotta, expressive Cormorant Garamond headings, clean Karla body copy, spacious floating surfaces, and a curated masonry recipe collection.

## What will change
- Replace the aged-paper visual system with the selected warm cream, butter-stone, terracotta, and espresso tokens.
- Update typography, shadows, borders, focus states, motion, and tactile press feedback globally.
- Redesign the home screen around a compact editorial header, calm utility controls, collection pride, and image-led masonry recipe cards.
- Restyle import, search, filters, AI matching, achievements, empty states, and deletion confirmation without changing their behavior.
- Carry the same visual language into recipe details, personal notes, chef consultation, and full-screen cooking mode.
- Apply the shared surface and control styling to the remaining supporting screens so the app feels consistent.
- Preserve local-only recipe storage, language behavior, Android/PWA behavior, wake lock, and every existing workflow.

## Validation
- Check the app at mobile and desktop sizes for clipping, overlap, readable controls, and coherent masonry flow.
- Exercise primary interactions: filters, expanded panels, long-press deletion, recipe navigation, and cooking mode.
- Confirm all content routes retain unique social and search metadata and the preview builds cleanly.

## Technical details
- Use semantic tokens in the global Tailwind v4 stylesheet; no hardcoded component colors.
- Load Cormorant Garamond and Karla from the document head.
- Keep Motion for React transitions gentle and respect reduced-motion preferences.
