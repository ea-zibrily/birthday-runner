# 🏃 Birthday Runner

A tiny endless runner game — pure HTML, CSS, and JavaScript. No build step, no dependencies, no framework. Just clone and deploy.

---

## 🎮 Play

- **Jump:** `Space` / `↑` / Tap
- **Duck:** `↓` / Hold or Swipe down
- Obstacles get faster the longer you survive. Beat your best score, saved locally in your browser.

## ✨ Features

- 🕹️ Canvas-based rendering with jump + duck mechanics
- 📱 Touch controls built for mobile, alongside keyboard support
- ⏱️ 3-2-1 countdown before each run starts
- 📈 Increasing difficulty over time
- 🏆 Best score saved via `localStorage`
- 🎵 Background music + jump sound effect, with a mute toggle
- 🪟 Glassmorphism "tough round" panel after 3 losses, with quick music controls and a restart button

## 📁 Project Structure

```
runner/
├── index.html          # Markup only
├── style.css            # All styling (HUD, overlays, glass panel)
├── game.js               # Game loop, physics, input, audio, UI logic
├── assets/
│   └── audio/
│       ├── bgm-theme.mp3    # Looped background music
│       ├── jump.wav         # Jump sound effect
│       └── break.wav         # Break/game over sound effect
│   └── images
└── README.md
```

## 🎵 Adding Your Own Audio

Drop your own files into `assets/audio/`, keeping the same filenames (or update the paths at the top of `game.js`):

| File | Format | Why |
|---|---|---|
| `bgm-theme.mp3` | MP3 | Best browser compatibility for longer, looped tracks |
| `jump.wav` | WAV | Uncompressed = zero decode latency, snappier for short SFX |
| `break.wav` | WAV | Uncompressed = zero decode latency, snappier for short SFX |

## 🚀 Deploy

No build step required — this is a static site.

**Vercel**
```bash
vercel deploy
```

**Netlify**
```bash
netlify deploy
```

Or just drag the `runner/` folder into the Vercel/Netlify dashboard, or connect the repo directly for auto-deploys on push.

## 🛠️ Local Development

Any static file server works:

```bash
npx serve .
# or
python3 -m http.server 8080
```

Then open `http://localhost:8080`.
