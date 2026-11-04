# Gym Log

A mobile workout, body measurement, and meal tracker. Workout history and drafts are stored in this browser's local storage. Export backups from the Plan tab to move data between devices.

## Preview

Run `python -m http.server 8000` from this directory and open http://localhost:8000.

## Workout logging

1. Choose your training day and session date.
2. Enter weight and reps, or copy your previous workout. Use 0 kg for bodyweight sets.
3. Check each completed set to start its rest timer. Use Continue to jump to the next unfinished exercise.
4. Select Finish workout to review your session, then Save workout. Only checked sets are included. Keep training returns to the draft.

## Tests

Run `npm ci`, then `npm test`. The tests exercise the app DOM with jsdom, including date persistence, completion and undo, partial workout saves, input validation, copying previous sets, and keyboard cancellation. Canvas rendering and visual layout require a browser check.
