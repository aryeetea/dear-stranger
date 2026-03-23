# Dear Stranger Project Report

Last updated: March 23, 2026

## Overview

This document records the major product and code changes currently implemented in the project, along with notes about persistence, database impact, and the status of the recommended feature roadmap.

## Current Product Shape

Dear Stranger currently includes:

- entry, login, signup, onboarding, loading, generating, and universe flows
- Soul Mirror onboarding with guided and direct creation paths
- AI avatar generation after hub creation
- personalized hub styling and palette selection
- the Universe map with other hubs, shooting stars, and profile cards
- Scribe for composing letters
- Observatory for reading, organizing, and revisiting letters
- Profile editing for hub identity and relics

## Implemented Work

### 1. Auth, session, and routing flow

- returning users with a saved hub identity are routed directly into the universe
- users without a completed hub are routed into onboarding instead of being dropped into a broken intermediate state
- draft hubs are ensured for signed-in users when needed
- guest behavior is preserved and gated where appropriate

### 2. Soul Mirror and onboarding

- onboarding supports both guided and direct creation modes
- onboarding resume state is preserved on recoverable errors
- hub style and hub palette are selected during onboarding and saved
- direct avatar-description mode is supported
- fallback bio and ask-about content are applied when needed

### 3. Avatar generation flow

- avatar generation runs through `/api/generate-avatar`
- avatar generation happens after hub creation so the user can enter the universe without blocking on image generation
- generated avatars are uploaded to storage and then saved back to the user hub
- timeouts and error handling are in place around generation and persistence

### 4. Universe map and hub identity

- multiple hub visual styles are implemented:
  - `portal`
  - `lantern`
  - `ruin`
  - `hourglass`
  - `telescope`
  - `greenhouse`
  - `cathedral`
  - `lotus`
- multiple hub palettes are implemented:
  - `gilded`
  - `rose`
  - `tide`
  - `violet`
  - `ember`
  - `jade`
  - `pearl`
  - `midnight`
- profile cards show hub bio and ask-about content
- your own hub can display selected relics
- mobile map controls include touch interaction and zoom buttons

### 5. Scribe improvements

- multi-page letters are supported
- multiple writing fonts are supported
- paper selection is supported
- stamp selection is supported
- subject is required before sending
- envelope preview and send/release animation are implemented

### 6. Passage system

This feature was originally introduced as `letter rituals` and was later renamed in the UI to `Passage`.

- users can choose a passage for a letter in Scribe
- passages currently include:
  - `Comet Release`
  - `At Dawn`
  - `Moon Tide`
  - `Candlewake`
  - `Storm Carried`
  - `Petal Drift`
- passage data is persisted with the letter itself using encoded metadata in the `subject` field
- passage information is displayed again in the Observatory when viewing letters

### 7. Stationery and envelope finery

- additional paper styles were added:
  - `Moonveil Vellum`
  - `Marbled Tide`
- envelope lining customization was added
- wax seal customization was added
- envelope finery is previewed in the composer and in the seal/release animation
- wax and lining metadata persist with each letter and are visible again in the Observatory

### 8. Observatory improvements

- letters are rendered with page-aware previews and full page-aware reading
- saved `paper_id`, `font_id`, passage, wax, and lining are reflected when reading letters
- letters can be assigned to private shelves
- default shelves currently include:
  - `Comfort`
  - `Haunting`
  - `Home`
  - `Reply Later`
  - `Keepsakes`
- shelves can be filtered inside the Observatory

### 9. Hub relics

- users can select up to 3 relics in Profile
- relics currently include symbolic objects such as:
  - `Silver Key`
  - `Pressed Flower`
  - `Moon Lantern`
  - `Star Map`
  - `Old Watch`
  - `Mirror Shard`
- relics are shown on the user’s own hub profile card in the universe

### 10. Constellations

- users can save other hubs into a private `Constellations` list
- saved hubs are accessible from a constellation panel on the map
- clicking a saved hub in the panel re-centers the map and opens that hub’s profile
- saved hubs get subtle extra visual treatment on the map

### 11. Return paths

- the map now computes reciprocal correspondence paths from actual letter exchange data
- if two hubs have exchanged letters in both directions, a glowing return path can appear between them
- the profile card explains when a return path already exists with that hub

### 12. Universe letters and shooting stars

- universe letters are still part of the ambient shooting-star system
- sending a letter to the universe now immediately dispatches a shooting-star event from the sender’s own hub
- this means universe letters no longer feel instant or invisible at send time
- older universe letters can still appear later through the ambient universe-letter star cycle

### 13. Cleanup and project hygiene

- the unused `app/api/generate-bio/route.ts` route was removed
- Gemini remains in use for Soul Mirror question flow
- OpenAI remains in use for avatar generation
- the empty `app/api/delete-account` folder currently does nothing and has no route file inside it

### 14. Seasonal universe moods

- the universe now has a seasonal mood layer that changes by time of year
- current mood messaging appears directly on the map
- mood-specific atmospheric tinting is applied over the star field
- the current seasonal set includes:
  - `Blossom Season`
  - `Solstice`
  - `Harvest Night`
  - `Winterlight`
  - `Storm Season`

### 15. Anonymous prompts from the universe

- the map now includes a `From the Universe` prompt card
- prompts can be cycled without leaving the map
- a prompt can open the Scribe with a prefilled subject and opening body line
- prompts are designed specifically for writing into the universe rather than to a named hub

### 16. Database-backed sync path for recommendations

- the app now supports Supabase-backed syncing for:
  - hub relics
  - private shelves
  - constellations
- local storage remains as a fallback so the app still works before the SQL is applied
- once the recommended SQL is added in Supabase, these features become cross-device for signed-in users without more code changes

## Persistence and Data Notes

### Stored in the database already

- hubs
- letters
- hub name, bio, ask-about
- avatar URL
- hub style
- hub palette / backdrop id
- letters sent count
- regen count
- letter paper id
- letter font id
- universe-letter flag

### Persisted without schema changes

The following are currently persisted by encoding metadata into the existing letter `subject` field:

- passage
- wax seal
- envelope lining

### Stored locally in browser storage as fallback

The following still save locally right away, and now also support optional Supabase syncing when the matching tables exist:

- private shelves
- hub relics
- constellations

## Database Impact So Far

No mandatory migration has been required for the feature work listed above.

That is because:

- letter passage, wax, and lining use encoded subject metadata
- existing hub columns already supported hub style and backdrop updates
- shelves, relics, and constellations still have local fallback behavior

Optional Supabase SQL is now included in:

- `SUPABASE_RECOMMENDED_FEATURES.sql`

## Current Recommended Feature Track

### Completed from the recommendation track

- `Passage`
- `Private Shelves`
- `Hub Relics`
- `More stationery / wax / envelope customization`
- `Constellations`
- `Return Paths`

### Completed from the extended recommendation track

- `Anonymous prompts from the universe`
- `Seasonal universe moods`
- `Private shelves syncing across devices`
- `Hub relic persistence in the database`
- `Constellations syncing across devices`

## Suggested Future Database Work

If the optional sync features should be enabled in production, run the SQL in:

- `SUPABASE_RECOMMENDED_FEATURES.sql`

This adds:

- `hub_relics`
- `letter_shelf_assignments`
- `constellation_hubs`
- a `letter_shelf_assignments` table
- a `constellations` table
- optional dedicated letter metadata columns for passage, wax, and lining instead of encoding them in `subject`

## Verification Status

Recent feature additions were repeatedly verified with:

- `npm run build`

The app currently builds successfully with the implemented feature set described in this report.
