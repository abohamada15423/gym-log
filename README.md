# Gym Log

A mobile workout, body measurement, and meal tracker. Everything is saved on the phone first, so it works offline in the gym. Signing in (optional) also saves it to your account, keeps your phones in step and lets your coach follow along. Without an account, export backups from the Plan tab to move data between devices.

## Roadmap

The plan to turn this into an app for a coach and their clients (accounts, sync, coach dashboard, programs and meal plans from the coach) is in [docs/coach-plan.md](docs/coach-plan.md), with a ready-to-use prompt for each phase.

## Design

Dark, built from gym materials: rubber-mat charcoal background, iron surfaces, chalk-white text and one lime accent. Lime only marks something done, next or live. Plate colours follow the competition code (red 25, blue 20, yellow 15, green 10, white 5) and appear only in plate graphics. Headings and numbers use Big Shoulders Display and text uses Archivo, with IBM Plex Sans Arabic for Arabic. There are no all-caps labels.

The Train tab opens with the bar loaded for your next set. Below it, a tally shows one mark per set. Only the exercise you're working on is raised as a panel.

All colours are tokens at the top of `css/app.css`. The design is dark only.

## Preview

Run `python -m http.server 8000` from this directory and open http://localhost:8000.

## Workout logging

1. Choose your training day and session date.
2. Enter weight and reps, or copy your previous workout. Use 0 kg for bodyweight sets.
3. Check each completed set to start its rest timer. Use Continue to jump to the next unfinished exercise.
   Or tap **◎ Focus** for a full-screen view of one set at a time: big − / + buttons for weight and reps, **Done** starts a rest countdown, and the next set comes up when rest ends. It edits the same workout, and ✕ or Escape returns to the normal view.
4. Select Finish workout to review your session, then Save workout. Only checked sets are included. Keep training returns to the draft.

## Progress and goals

- Tap an exercise name or its animation to see the plate calculator and a chart of your best estimated 1RM per workout (best reps for bodyweight exercises).
- The Body tab charts your weigh-ins against your goal weight.
- Set your goal weight, daily calories and daily protein on the Plan tab.
- Removing a workout, check-in or food shows an Undo button for a few seconds. Importing a backup asks before replacing what's on the device.
- After you hit the top of the rep range on every set, the exercise suggests adding 2.5 kg next time, with a button to fill it in. Otherwise it tells you to stay at the same weight.
- Tap a recent session, or View all, to see every workout by month with its sets.
- Custom foods can include carbs and fat. Leave calories blank to calculate them from the macros, and tick "Save to My Foods" to reuse the food with one tap.
- Once you have 3 or more workouts, the Train tab reminds you to back up if you haven't, or if it has been 14+ days and you've logged new workouts. On phones that support it, Back up opens the share sheet so you can save the file to Files or send it.

## Accounts and sync

Tap the round button at the top right, or **Sign in or create account** on the Plan tab. Accounts use email and password; a new account confirms its email once. Everything stays usable without an account.

- Each save goes to the phone first. With an account, what changed uploads a moment later. Offline, it waits and uploads when the connection is back. The header says which: *Saved online ✓*, *Saved on this phone ✓*, or *Offline · will upload later*.
- Changes from your other phones arrive when the app opens, comes back to the front, or every few minutes. If the same thing was edited in two places, the newest edit wins.
- The first sign-in on a phone that already has data asks whether to add it to the account or keep it on the phone only.
- **Join your coach** with the 12-character code they give you, or by opening their invite link (`…/gym-log/?invite=CODE`). Your coach's name shows in the header. A program from your coach becomes your active program, and their meal plan sets your daily calories and protein.
- Account settings: sync now, leave your coach, export your data, privacy policy ([privacy.html](privacy.html)), sign out (optionally clearing the phone) and delete the account.

How it works is in [docs/coach-plan.md](docs/coach-plan.md) (section 5) and at the top of `js/sync.js`. The database is in [supabase/](supabase/README.md).

## Arabic

Choose **العربية** at the top of the Plan tab to switch the app to Arabic with a right-to-left layout. Choose **English** to switch back. Exercise names, food names and anything you type stay as written.

The app renders English, and `js/i18n.js` translates the page as it is drawn. To translate a new piece of text, add it to `AR_WORDS`. If the text contains numbers or names, add a pattern to `AR_RULES` instead.

## Code layout

There is no build step. `index.html` holds the page markup, `css/app.css` the styles, and `js/` the app as plain scripts that share one global scope. They load in this order, and later files can use anything defined in earlier ones:

| File | What it holds |
|---|---|
| `js/data.js` | Built-in programs, exercise library, training systems, food presets |
| `js/core.js` | App state, the `h()` DOM helper, date and number helpers, toast |
| `js/config.js` | The Supabase project's address and public key |
| `js/sync.js` | Accounts and sync: change detection, outbox, upload, download, coach programs. Loads `js/vendor/supabase.js` only when an account is used |
| `js/i18n.js` | Arabic translations and the right-to-left switch |
| `js/effects.js` | Undo, SVG charts, count-up numbers, confetti |
| `js/logic.js` | Storage, programs, theme, exercise history, suggestions, warm-ups, habits |
| `js/animation.js` | Canvas exercise animations |
| `js/timer.js` | Rest timer, sounds, notifications, wake lock |
| `js/dialogs.js` | Plate calculator, backup, warm-up, history, day editor, program picker |
| `js/train.js` · `js/body.js` · `js/meals.js` · `js/plan.js` | One file per tab (`js/muscles.js` holds the muscle map used on Body) |
| `js/focus.js` | Focus mode: full-screen, one set at a time |
| `js/account.js` | Sign-in and account screens, the header's sync status and coach, the Plan tab's Account card |
| `js/app.js` | Rendering, tab switching, start-up and service worker registration |

When you add a file to `js/`, add a `<script>` tag for it in `index.html` and its name to `SCRIPTS` in `sw.js`, so it works offline.

`js/vendor/supabase.js` is the browser build of `@supabase/supabase-js`, copied from `node_modules` so the app serves it itself and the service worker keeps it for offline use. To update it, change the version in `package.json`, then run `npm install` and `npm run vendor`. A test checks the copy matches the pinned version.

## Tests

Run `npm ci`, then `npm test`. The tests exercise the app DOM with jsdom, including date persistence, completion and undo, partial workout saves, input validation, copying previous sets, keyboard cancellation, undoing removals, backup import, editable goals, progress charts, weight suggestions, workout history, food macros and backup reminders. Canvas rendering and visual layout require a browser check.

`tests/sync.test.cjs` runs accounts and sync against a fake server that follows the database's last-write-wins rules: the first upload, a second phone with the same data, offline changes, conflicts in both directions, the pull overlap, settings and habits, refused records, keeping data on the phone, coach programs and meal plans, backups on a signed-in phone, joining a coach, signing out, deleting the account, and the Arabic screens.

`npm run test:db` checks the database for the coach version: it runs the Supabase migration on a throwaway local PostgreSQL and tests every permission rule. It needs PostgreSQL 14+ installed and skips otherwise. See [supabase/README.md](supabase/README.md) for the project setup.
