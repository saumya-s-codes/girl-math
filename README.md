# Not Today, Babe

A small, calm savings tracker. Every time you skip a coffee, a drink or an add-to-cart, you log it and a bouquet grows toward something you really want.

*Small choices → growth.*

- Pick a goal (with an optional link to the item).
- Tap a button when you skip something, then slide to the amount.
- The vase fills, flowers open, butterflies arrive. At 100% there is one quiet celebration.
- Your data stays on your device (browser `localStorage`). No account, no server.

It is a plain static site: HTML, CSS and vanilla JavaScript. No framework, no build dependencies beyond Python 3.

## Run it

Just open `docs/index.html` in a browser.

Or serve it (needed to try the install-to-home-screen manifest):

```bash
python3 -m http.server -d docs 8000
# then visit http://localhost:8000
```

Open it on your phone and choose **Share → Add to Home Screen** to use it like an app.

## Put it on GitHub Pages

1. Create a new repository on GitHub and upload everything in this folder (or `git init`, commit, and push).
2. In the repo go to **Settings → Pages**.
3. Under **Build and deployment** choose **Deploy from a branch**, branch `main`, folder **`/docs`**, and save.
4. After a minute your app is live at `https://<your-username>.github.io/<repo-name>/`.

`docs/` is already built and committed, so no workflow is needed.

## Changing things

The page in `docs/index.html` is generated. Edit the files in `src/`, then rebuild:

```bash
python3 scripts/build.py
```

| File | What it is |
| --- | --- |
| `src/art.json` | The artwork: every sprite (flowers, butterfly parts, petals, sparkles, water) as a small image, plus how butterflies are assembled. The only place that knows about the artwork. |
| `src/progress.js` | **Layout** (where each flower and leaf sits) and **progress** (what unlocks at which percentage). Change the story here. |
| `src/motion.js` | The shared clock, easing, tweens and flight paths. Knows nothing about flowers. |
| `src/components.js` | `Flower`, `Stem`, `Leaf`, `Petal`, `Sparkle`, `Butterfly`. Each takes `size, x, y, rotation, opacity, animationState, animationIntensity, delay, duration`. |
| `src/scene.js` | `Vase`, `Water`, `Bouquet`, `BotanicalScene`, `BotanicalProgress`, `ExpenseFlower`. |
| `src/app.js` | The screens, saving, and layout. |
| `src/style.css`, `src/template.html` | Styles and the page shell. |

### Swapping the artwork

Sprites in `art.json` are looked up by name, for example `fl_pink_full`, `bf_purple_lw`, `pet0`, `spk1`. Keep the names, replace the images and their anchor points (`ax, ay` = base of the stem, `hx, hy` = centre of the head), then adjust `LAYOUT` in `src/progress.js` if sizes changed.

### Motion lab

Open the app with `#demo` on the end of the address (or use the "Motion lab" link on the goal screen) to scrub savings from 0–100%, the expense flower from $0–$50, and try each butterfly state. It also has a "simulate reduced motion" switch.

## Accessibility

- Respects `prefers-reduced-motion`: flowers appear without growing, water changes with a short fade, butterflies rest, petals and sparkles are off.
- The slider can be used with the arrow keys, Home and End.

## Notes

- Saved data lives in this browser only, so a different phone or browser starts fresh.
- The font (Cormorant Garamond) loads from Google Fonts. Offline it falls back to Georgia.
- Links on the goal open in a new tab. Some embedded viewers block that, so the app copies the link instead.
- Add a `LICENSE` file before sharing publicly. The code and the artwork may need different licenses.
