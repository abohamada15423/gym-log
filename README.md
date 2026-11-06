# Gym Log

A mobile workout, body measurement, and meal tracker. Workout history and drafts are stored in this browser's local storage. Export backups from the Plan tab to move data between devices.

## Preview

Run `python -m http.server 8000` from this directory and open http://localhost:8000.

## Workout logging

1. Choose your training day and session date.
2. Enter weight and reps, or copy your previous workout. Use 0 kg for bodyweight sets.
3. Check each completed set to start its rest timer. Use Continue to jump to the next unfinished exercise.
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

## Tests

Run `npm ci`, then `npm test`. The tests exercise the app DOM with jsdom, including date persistence, completion and undo, partial workout saves, input validation, copying previous sets, keyboard cancellation, undoing removals, backup import, editable goals, progress charts, weight suggestions, workout history, food macros and backup reminders. Canvas rendering and visual layout require a browser check.
