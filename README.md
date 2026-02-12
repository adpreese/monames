# Monames

Monames is a local-only, browser-based Codenames-style game with optional Claude teammates. It runs entirely in the browser, storing settings in local storage and using the Anthropic API only when you ask Claude to play a role.

## Features

- **Codenames-style board** with 25-word layouts and red/blue/neutral/assassin roles.
- **Claude teammates** for spymaster or guesser roles using configurable personas.
- **Persona editor** to customize Claude prompts for each role.
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

## How it works

- **New game setup** lets you choose a word pack and assign each team role to either Human or a Claude persona.
- **Valid setups** require all Guessers to be Human and all Spymasters to be Claude, or vice versa.
- **Game state** tracks a 25-card board, starting team, current turn, last clue, remaining guesses, and endgame state.
- **Local storage** persists the theme, API key, custom packs, personas, and the active game state under `monames-state-v1`.

### Game flow

1. **Choose a word pack** with at least 25 words; the board is always 25 cards.
2. **Select roles** for each team (red/blue) and role (spymaster/guesser).
3. **Start the game** to generate a shuffled 25-word board with 9 cards for the starting team, 8 for the other team, 7 neutral, and 1 assassin.
4. **Play turns** until a team reveals all their cards or the assassin is revealed.

### Turn logic by setup

**When Spymasters are Claude and Guessers are Human**

- Use **Ask Claude** next to the spymaster role in the Game panel.
- The app captures a board screenshot with hidden teams for guessers (Claude spymaster sees team colors in the capture).
- Claude returns JSON of the form `{ "clue": "word", "count": 2, "notes": "" }`.
- The clue becomes the active clue, and remaining guesses are set to the clue count + 1.
- Human guessers reveal cards until they either:
  - Reveal a wrong team card,
  - Reveal the assassin, or
  - Use up the allowed number of guesses.
- The turn ends automatically when any of the above happens or manually via **End Turn**.

**When Guessers are Claude and Spymasters are Human**

- Human spymasters enter a **one-word clue** and **positive number** count.
- After the clue is submitted, Claude guessers automatically request a move.
- Claude returns JSON of the form `{ "reveal": ["word"], "endTurn": false, "notes": "" }`.
- The app reveals the listed words (case-insensitive) and evaluates win/loss conditions.
- Claude can end the turn by setting `endTurn: true`, otherwise the turn continues if the game is not over.

### Endgame

- Revealing the assassin ends the game immediately and the opposing team wins.
- A team wins when all its words are revealed.

### Claude play

- Provide your Claude API key in Settings, then use **Ask Claude** in the game panel.
- The app sends a JSON representation of the board, along with recent clues/guesses and the persona prompt, to Anthropic’s messages API.

## Project structure

- `src/App.jsx` — main game logic, routing, and state.
- `src/screens/` — setup and settings screens.
- `src/data/` — default word packs and personas.
- `src/styles.css` — styling for the UI.

## Notes

- Claude API access requires a valid Anthropic API key entered in Settings.
- The app is designed for local play; nothing is stored on a server.
