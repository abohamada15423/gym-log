# Gym Log

A mobile workout, body measurement, and meal tracker. Workout history and drafts are stored in this browser's local storage. Export backups from the Plan tab to move data between devices.

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

## Arabic

Choose **العربية** at the top of the Plan tab to switch the app to Arabic with a right-to-left layout. Choose **English** to switch back. Exercise names, food names and anything you type stay as written.

The app renders English, and `js/i18n.js` translates the page as it is drawn. To translate a new piece of text, add it to `AR_WORDS`. If the text contains numbers or names, add a pattern to `AR_RULES` instead.

## Code layout

There is no build step. `index.html` holds the page markup, `css/app.css` the styles, and `js/` the app as plain scripts that share one global scope. They load in this order, and later files can use anything defined in earlier ones:

| File | What it holds |
|---|---|
| `js/data.js` | Built-in programs, exercise library, training systems, food presets |
| `js/core.js` | App state, the `h()` DOM helper, date and number helpers, toast |
| `js/i18n.js` | Arabic translations and the right-to-left switch |
| `js/effects.js` | Undo, SVG charts, count-up numbers, confetti |
| `js/logic.js` | Storage, programs, theme, exercise history, suggestions, warm-ups, habits |
| `js/animation.js` | Canvas exercise animations |
| `js/timer.js` | Rest timer, sounds, notifications, wake lock |
| `js/dialogs.js` | Plate calculator, backup, warm-up, history, day editor, program picker |
| `js/train.js` · `js/body.js` · `js/meals.js` · `js/plan.js` | One file per tab (`js/muscles.js` holds the muscle map used on Body) |
| `js/focus.js` | Focus mode: full-screen, one set at a time |
| `js/app.js` | Rendering, tab switching, start-up and service worker registration |

When you add a file to `js/`, add a `<script>` tag for it in `index.html` and its name to `SCRIPTS` in `sw.js`, so it works offline.

## Tests

Run `npm ci`, then `npm test`. The tests exercise the app DOM with jsdom, including date persistence, completion and undo, partial workout saves, input validation, copying previous sets, keyboard cancellation, undoing removals, backup import, editable goals, progress charts, weight suggestions, workout history, food macros and backup reminders. Canvas rendering and visual layout require a browser check.
