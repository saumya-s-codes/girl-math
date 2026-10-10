# Someday

A small, calm savings tracker. Every time you skip a coffee, a drink or an add-to-cart, you log it as a save and a bouquet grows toward something you really want.

*Small choices → growth.*

- Pick a goal (with an optional link to the item).
- **Tap** a button to log your usual amount instantly (there's an Undo). **Press and hold** it until the ring fills (you feel a tick), then **let go** to open the detailed screen and slide to a different amount. Releasing first means a finger can never press anything on the new screen by accident. "Other" always opens the detailed screen. On that screen the slider runs from $0 up to what is left to reach your goal, and you can tap the amount bubble to type an exact number. Use **Edit** to rename the buttons, change their icons and set the usual amounts.
- The vase fills, flowers open, butterflies arrive. At 100% there is one quiet celebration.
- Tap "$… today" for your history: a seven-day chart (tap a bar to see that day's total and how many saves) and every save grouped by day.
- Forgot to log a save? On the history screen, tap **＋ Add a past save**, pick what it was, then check the date (it starts on yesterday; tap it to pick any earlier day). It's added to that day, and counts toward your goal if the goal had already started.
- Reached a goal? Tap **Claim** on its card and a **Bloomed!** screen celebrates with the full bouquet, a burst of confetti as it appears, a butterfly and petals that keep falling from the top of the screen, with a bold, glowing card that counts up how much you saved, an **Add new goal** button and a small **Back to tracker** link. Claimed goals are kept on the **Claimed** tab of the history screen, with the price, the day you claimed it and how many days it took.
- Your data stays on your device (browser `localStorage`). No account, no server.

It is a plain static site: HTML, CSS and vanilla JavaScript. No framework, no build dependencies beyond Python 3.

## Screens

Three screens:

- **Tracker** (opens by default after the first visit, with or without a goal; the very first time the app is opened it starts on **Goals**): the growing bouquet, the progress ruler and the save buttons. Tap a button to log it, press and hold for details. The "$… today" pill opens the Log, and the goal card opens Goals. With no goal set, the goal card is a translucent **Enter goal** button, and tapping any save button pops up "Add a goal to get started".
- **Log**: your history. A seven-day chart (tap a bar for that day), every save grouped by day, a button to add a past save, and a **Claimed** tab for goals you've reached.
- **Goals**: a little garden of flowers across the bottom of the screen, with butterflies, sparkles and petals drifting over it, and the card where you enter what you're saving for (name, price, optional link and icon), or change it. **My tracker ›** at the top right goes back to the tracker.

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
| `src/confetti.js` | The petal, leaf and sparkle burst that plays on every save. |
| `src/app.js` | The screens, saving, and layout. |
| `src/style.css`, `src/template.html` | Styles and the page shell. |

### Swapping the artwork

Sprites in `art.json` are looked up by name, for example `fl_pink_full`, `bf_purple_lw`, `pet0`, `spk1`. Keep the names, replace the images and their anchor points (`ax, ay` = base of the stem, `hx, hy` = centre of the head), then adjust `LAYOUT` in `src/progress.js` if sizes changed.

## Data safety

Your goals and saves live in the phone's own browser storage, under the name `not-today-babe-v3` (the app used to be called *Not Today, Babe*; the stored names keep that old prefix on purpose, because renaming them would make existing data look gone) (the `KEY` in `src/app.js`).

- **Never rename that key.** A new name looks like an empty app, so your data would seem to be gone (it would still be there under the old name). If a rename is ever really needed, copy the old data to the new name first and keep the old copy.
- **Two copies.** Every save also writes a second copy under `not-today-babe-backup`. If the main copy is missing or damaged, the app restores from the backup and says so.
- **Nothing unreadable is overwritten.** If a stored copy can't be read, the app sets it aside under a `not-today-babe-rescue-…` name before saving anything new.
- Publishing a new version (uploading the `docs` folder) never touches data stored on a phone, as long as the web address stays the same.

## Back up and restore

**Settings** (the gear on the Goals screen) has **Back up to a file** and **Restore from a file**.

- **Back up:** makes a small `.json` file with your goal, saves, claimed items and button names. On a phone it opens the share sheet, so choose *Save to Files*, AirDrop or email. On a computer it downloads. It shows the date of your last backup.
- **Restore:** pick a backup file. The app checks the file really is a backup, asks before replacing anything, and keeps what was on the phone aside (`not-today-babe-rescue-before-restore`) in case you change your mind.
- A new phone? Open the app, tap the gear on the first screen, and restore your file.

## Version

The version shown in **Settings** (the gear on the Goals screen) comes from the `VERSION` file at the top of the project. This build is **3.0**. To release a new number, edit that file (for example `3.1`) and run `python3 scripts/build.py`.

## Offline

The app registers a small service worker (`src/sw.js`, built into `docs/sw.js`) the first time it is opened from a real web address such as GitHub Pages. After that it opens instantly and works with no connection, and the font is kept too. Nothing is needed from you: `scripts/build.py` stamps every build with a new version, so after you rebuild and publish, people pick up the new version the next time they open the app and the old cached copy is deleted. It does nothing when the page is opened as a plain file or inside a preview.

## Accessibility

- Respects `prefers-reduced-motion`: flowers appear without growing, water changes with a short fade, butterflies rest, petals and sparkles are off.
- The slider can be used with the arrow keys, Home and End.

## Notes

- Saved data lives in this browser only, so a different phone or browser starts fresh.
- The font (Cormorant Garamond) loads from Google Fonts. Offline it falls back to Georgia.
- Links on the goal open in a new tab. Some embedded viewers block that, so the app copies the link instead.
- Add a `LICENSE` file before sharing publicly. The code and the artwork may need different licenses.
