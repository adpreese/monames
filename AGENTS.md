# AGENTS.md

## Repo overview

Monames is a Vite + React app that implements a local-only Codenames-style game with optional Claude teammates. Game state, settings, word packs, and personas are persisted in `localStorage`.

## Common commands

- `npm install`
- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run lint`

## Structure

- `src/App.jsx` — routing, game flow, Claude integration, local storage persistence.
- `src/screens/` — setup and settings UI components.
- `src/data/` — default word packs and personas.
- `src/styles.css` — global styles.

## Claude integration

- The UI captures a board screenshot and sends it to Anthropic’s messages API.
- Claude API key is entered in Settings and stored locally.
- Claude responses are expected to be JSON, parsed and applied to the game state.
