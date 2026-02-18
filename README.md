# Monames

Monames is a local-only, browser-based Codenames-style game with optional AI teammates. It runs entirely in the browser, storing settings in local storage and using the Anthropic/etc API only when you ask AI to play a role.

## Features

- **Codenames-style board** with 25-word layouts and red/blue/neutral/assassin roles.
- **AI teammates** for spymaster or guesser roles using configurable personas.
- **Persona editor** to customize AI prompts for each role.
- **Custom word packs** created inline or uploaded via CSV.
- **Local persistence** of settings, packs, and game state via `localStorage`.

## Getting started

```bash
npm install
npm run dev
```

Open the local dev server URL shown in your terminal.

### Other scripts

```bash
npm run build
npm run preview
npm run lint
```
