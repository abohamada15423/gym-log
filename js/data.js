// Built-in programs, exercise library, training systems and food presets.
// Classic script sharing the page's global scope; see README for load order.

/* ---------- WORKOUT SPLIT ---------- */
var SPLIT4 = [
  {
    id: "push", tag: "Day 1", name: "Push", ex: [
      ["Bench press", 4, "6", "Chest · Triceps", 120],
      ["Overhead press", 3, "8", "Shoulders · Triceps", 120],
      ["Incline dumbbell press", 3, "10", "Upper Chest", 90],
      ["Lateral raise", 4, "15", "Side Delts", 60],
      ["Triceps pushdown", 3, "12", "Triceps", 60],
      ["Overhead triceps extension", 3, "12", "Triceps Long Head", 60]
    ]
  },
  {
    id: "pull", tag: "Day 2", name: "Pull", ex: [
      ["Pull-ups", 3, "8", "Lats · Upper Back", 120],
      ["Barbell row", 4, "6–8", "Mid Back · Lats", 120],
      ["Lat pulldown", 3, "10", "Lats", 90],
      ["Cable row", 3, "10", "Mid Back", 90],
      ["Face pull", 3, "15", "Rear Delts · Rotators", 60],
      ["Barbell curl", 3, "10", "Biceps", 60],
      ["Hammer curl", 2, "12", "Brachialis", 60]
    ]
  },
  {
    id: "legs", tag: "Day 3", name: "Legs", ex: [
      ["Squat", 4, "6", "Quads · Glutes", 150],
      ["Romanian deadlift", 3, "8", "Hamstrings · Glutes", 120],
      ["Leg press", 3, "10", "Quads", 120],
      ["Leg curl", 3, "12", "Hamstrings", 90],
      ["Calf raise", 4, "12", "Calves", 60],
      ["Abs", 3, "15", "Core", 60]
    ]
  },
  {
    id: "upper", tag: "Day 4", name: "Upper", ex: [
      ["Dumbbell bench press", 3, "10", "Chest", 90],
      ["Chest-supported row", 3, "10", "Upper Back", 90],
      ["Seated shoulder press", 3, "10", "Shoulders", 90],
      ["Close-grip pulldown", 3, "12", "Lats", 90],
      ["Lateral raise", 3, "15", "Side Delts", 60],
      ["Curls", 2, "12", "Biceps", 60],
      ["Triceps pushdown", 2, "12", "Triceps", 60]
    ]
  }
];

/* ---------- EXERCISE LIBRARY: [name, group, detail muscle, sets, reps, rest] ---------- */
var GROUPS = ["Chest", "Back", "Shoulders", "Traps", "Biceps", "Triceps", "Forearms", "Legs", "Glutes", "Calves", "Core", "Cardio"];
var LIB = [
  // CHEST
  ["Bench press", "Chest", "Chest · Triceps", 4, "6", 120, "bench|bb"],
  ["Incline barbell press", "Chest", "Upper Chest", 3, "8", 120, "bench|bbi"],
  ["Decline bench press", "Chest", "Lower Chest", 3, "8", 120, "declinebench"],
  ["Dumbbell bench press", "Chest", "Chest", 3, "10", 90, "bench|db"],
  ["Incline dumbbell press", "Chest", "Upper Chest", 3, "10", 90, "bench|dbi"],
  ["Chest press machine", "Chest", "Chest", 3, "10", 90, "bench|bb"],
  ["Smith machine bench press", "Chest", "Chest", 3, "8", 90, "bench|bb"],
  ["Chest fly (cable)", "Chest", "Chest", 3, "12", 60, "fly|db"],
  ["Dumbbell fly", "Chest", "Chest", 3, "12", 60, "fly|db"],
  ["Incline dumbbell fly", "Chest", "Upper Chest", 3, "12", 60, "fly|db"],
  ["Cable crossover", "Chest", "Lower Chest", 3, "12", 60, "fly|db"],
  ["Pec deck", "Chest", "Chest", 3, "12", 60, "fly|db"],
  ["Dips", "Chest", "Chest · Triceps", 3, "10", 90, "dip"],
  ["Push-ups", "Chest", "Chest · Triceps", 3, "15", 60, "pushup"],
  ["Incline push-ups", "Chest", "Lower Chest", 3, "15", 60, "pushup"],
  ["Diamond push-ups", "Chest", "Triceps · Chest", 3, "12", 60, "pushup"],
  ["Dumbbell pullover", "Chest", "Chest · Lats", 3, "12", 60, "pullover"],
  // BACK
  ["Pull-ups", "Back", "Lats · Upper Back", 3, "8", 120, "pullup"],
  ["Chin-ups", "Back", "Lats · Biceps", 3, "8", 120, "pullup"],
  ["Wide-grip pull-ups", "Back", "Lats", 3, "8", 120, "pullup"],
  ["Neutral-grip pull-ups", "Back", "Lats · Biceps", 3, "8", 120, "pullup"],
  ["Assisted pull-ups", "Back", "Lats", 3, "10", 90, "pullup"],
  ["Barbell row", "Back", "Mid Back · Lats", 4, "6–8", 120, "row|bb"],
  ["Pendlay row", "Back", "Mid Back", 4, "6", 120, "row|bb"],
  ["Dumbbell row", "Back", "Lats · Mid Back", 3, "10", 90, "row|db"],
  ["Chest-supported row", "Back", "Upper Back", 3, "10", 90, "row|db"],
  ["T-bar row", "Back", "Mid Back", 3, "10", 90, "row|tbar"],
  ["Seal row", "Back", "Mid Back", 3, "10", 90, "row|bb"],
  ["Cable row", "Back", "Mid Back", 3, "10", 90, "seatrow"],
  ["Machine row", "Back", "Mid Back", 3, "10", 90, "seatrow"],
  ["Inverted row", "Back", "Mid Back · Biceps", 3, "10", 60, "invrow"],
  ["Lat pulldown", "Back", "Lats", 3, "10", 90, "pulldown"],
  ["Wide-grip pulldown", "Back", "Lats", 3, "10", 90, "pulldown"],
  ["Close-grip pulldown", "Back", "Lats", 3, "12", 90, "pulldown"],
  ["Straight-arm pulldown", "Back", "Lats", 3, "12", 60, "pulldown|st"],
  ["Deadlift", "Back", "Back · Hamstrings · Glutes", 3, "5", 180, "hinge|dl"],
  ["Rack pull", "Back", "Upper Back · Traps", 3, "6", 150, "hinge|dl"],
  ["Good morning", "Back", "Lower Back · Hamstrings", 3, "10", 90, "hinge|gm"],
  ["Back extension", "Back", "Lower Back", 3, "12", 60, "hyper"],
  // SHOULDERS
  ["Overhead press", "Shoulders", "Shoulders · Triceps", 3, "8", 120, "ohp|bb"],
  ["Push press", "Shoulders", "Shoulders · Legs", 3, "6", 120, "ohp|bb"],
  ["Behind-the-neck press", "Shoulders", "Shoulders", 3, "10", 90, "ohp|bb"],
  ["Seated shoulder press", "Shoulders", "Shoulders", 3, "10", 90, "ohp|seat"],
  ["Machine shoulder press", "Shoulders", "Shoulders", 3, "10", 90, "ohp|seat"],
  ["Dumbbell shoulder press", "Shoulders", "Shoulders", 3, "10", 90, "ohp|db"],
  ["Arnold press", "Shoulders", "Shoulders", 3, "10", 90, "ohp|db"],
  ["Lateral raise", "Shoulders", "Side Delts", 4, "15", 60, "lateral"],
  ["Cable lateral raise", "Shoulders", "Side Delts", 3, "15", 60, "lateral"],
  ["Machine lateral raise", "Shoulders", "Side Delts", 3, "15", 60, "lateral"],
  ["Front raise", "Shoulders", "Front Delts", 3, "12", 60, "fraise"],
  ["Plate front raise", "Shoulders", "Front Delts", 3, "12", 60, "fraise"],
  ["Face pull", "Shoulders", "Rear Delts · Rotators", 3, "15", 60, "facepull"],
  ["Rear delt fly", "Shoulders", "Rear Delts", 3, "15", 60, "reardelt"],
  ["Reverse pec deck", "Shoulders", "Rear Delts", 3, "15", 60, "reardelt"],
  ["Upright row", "Shoulders", "Delts · Traps", 3, "12", 60, "uprow"],
  // TRAPS
  ["Shrugs", "Traps", "Traps", 3, "12", 60, "shrug"],
  ["Dumbbell shrugs", "Traps", "Traps", 3, "12", 60, "shrug"],
  ["Barbell shrugs", "Traps", "Traps", 3, "10", 60, "shrug"],
  // BICEPS
  ["Barbell curl", "Biceps", "Biceps", 3, "10", 60, "curl|bb"],
  ["EZ-bar curl", "Biceps", "Biceps", 3, "10", 60, "curl|bb"],
  ["Dumbbell curl", "Biceps", "Biceps", 3, "10", 60, "curl|db"],
  ["Alternating dumbbell curl", "Biceps", "Biceps", 3, "10", 60, "curl|db"],
  ["Hammer curl", "Biceps", "Brachialis", 2, "12", 60, "curl|db"],
  ["Cross-body hammer curl", "Biceps", "Brachialis", 3, "12", 60, "curl|db"],
  ["Incline dumbbell curl", "Biceps", "Biceps Long Head", 3, "12", 60, "curl|inc"],
  ["Preacher curl", "Biceps", "Biceps", 3, "10", 60, "curl|preach"],
  ["Concentration curl", "Biceps", "Biceps Peak", 3, "12", 60, "curl|preach"],
  ["Spider curl", "Biceps", "Biceps Short Head", 3, "12", 60, "curl|preach"],
  ["Cable curl", "Biceps", "Biceps", 3, "12", 60, "curl|cable"],
  ["Zottman curl", "Biceps", "Biceps · Forearms", 3, "10", 60, "curl|db"],
  ["Curls", "Biceps", "Biceps", 2, "12", 60, "curl|db"],
  // TRICEPS
  ["Triceps pushdown", "Triceps", "Triceps", 3, "12", 60, "pushdown"],
  ["Rope pushdown", "Triceps", "Triceps", 3, "12", 60, "pushdown"],
  ["Reverse-grip pushdown", "Triceps", "Triceps", 3, "12", 60, "pushdown"],
  ["Overhead triceps extension", "Triceps", "Triceps Long Head", 3, "12", 60, "overhead|db"],
  ["Cable overhead extension", "Triceps", "Triceps Long Head", 3, "12", 60, "overhead|db"],
  ["Skull crushers", "Triceps", "Triceps", 3, "10", 60, "skull"],
  ["EZ-bar skull crushers", "Triceps", "Triceps", 3, "10", 60, "skull"],
  ["Close-grip bench press", "Triceps", "Triceps · Chest", 3, "8", 90, "bench|bb"],
  ["JM press", "Triceps", "Triceps", 3, "8", 90, "bench|bb"],
  ["Dumbbell kickback", "Triceps", "Triceps", 3, "12", 60, "kickback"],
  ["Bench dips", "Triceps", "Triceps", 3, "12", 60, "benchdip"],
  // FOREARMS
  ["Wrist curl", "Forearms", "Forearm Flexors", 3, "15", 45, "wrist"],
  ["Reverse wrist curl", "Forearms", "Forearm Extensors", 3, "15", 45, "wrist"],
  ["Reverse curl", "Forearms", "Brachioradialis", 3, "12", 60, "curl|bb"],
  // LEGS
  ["Squat", "Legs", "Quads · Glutes", 4, "6", 150, "squat|back"],
  ["Front squat", "Legs", "Quads", 3, "8", 120, "squat|front"],
  ["Goblet squat", "Legs", "Quads · Glutes", 3, "12", 90, "squat|goblet"],
  ["Bodyweight squat", "Legs", "Quads · Glutes", 3, "20", 60, "squat|bw"],
  ["Smith machine squat", "Legs", "Quads", 3, "10", 120, "squat|back"],
  ["Pause squat", "Legs", "Quads · Glutes", 3, "5", 150, "squat|back"],
  ["Hack squat", "Legs", "Quads", 3, "10", 120, "hack"],
  ["Leg press", "Legs", "Quads", 3, "10", 120, "legpress"],
  ["Single-leg press", "Legs", "Quads · Glutes", 3, "10", 90, "legpress"],
  ["Bulgarian split squat", "Legs", "Quads · Glutes", 3, "10", 90, "lunge|bulg"],
  ["Lunges", "Legs", "Quads · Glutes", 3, "10", 90, "lunge|bw"],
  ["Walking lunges", "Legs", "Quads · Glutes", 3, "12", 90, "lunge|db"],
  ["Reverse lunge", "Legs", "Glutes · Quads", 3, "10", 90, "lunge|db"],
  ["Step-ups", "Legs", "Quads · Glutes", 3, "10", 90, "stepup"],
  ["Romanian deadlift", "Legs", "Hamstrings · Glutes", 3, "8", 120, "hinge|rdl"],
  ["Stiff-leg deadlift", "Legs", "Hamstrings", 3, "10", 120, "hinge|rdl"],
  ["Single-leg RDL", "Legs", "Hamstrings · Glutes", 3, "10", 90, "sldl"],
  ["Sumo deadlift", "Legs", "Adductors · Glutes", 3, "5", 180, "hinge|dl"],
  ["Cable pull-through", "Legs", "Glutes · Hamstrings", 3, "12", 60, "pullthrough"],
  ["Leg extension", "Legs", "Quads", 3, "12", 60, "leg|ext"],
  ["Leg curl", "Legs", "Hamstrings", 3, "12", 90, "leg|lie"],
  ["Seated leg curl", "Legs", "Hamstrings", 3, "12", 90, "leg|seat"],
  // GLUTES
  ["Hip thrust", "Glutes", "Glutes", 3, "10", 90, "thrust"],
  ["Glute bridge", "Glutes", "Glutes", 3, "12", 60, "bridge"],
  ["Single-leg glute bridge", "Glutes", "Glutes", 3, "12", 60, "bridge"],
  // CALVES
  ["Calf raise", "Calves", "Calves", 4, "12", 60, "calf"],
  ["Standing calf raise", "Calves", "Gastrocnemius", 4, "12", 60, "calf"],
  ["Seated calf raise", "Calves", "Soleus", 3, "15", 60, "calf"],
  ["Leg press calf raise", "Calves", "Calves", 3, "15", 60, "calf"],
  // CORE
  ["Abs", "Core", "Core", 3, "15", 60, "crunch|crunch"],
  ["Crunches", "Core", "Abs", 3, "20", 45, "crunch|crunch"],
  ["Cable crunch", "Core", "Abs", 3, "12", 60, "crunch|crunch"],
  ["Bicycle crunch", "Core", "Abs · Obliques", 3, "20", 45, "bicycle"],
  ["Sit-ups", "Core", "Abs · Hip Flexors", 3, "15", 45, "crunch|situp"],
  ["Plank", "Core", "Core", 3, "45s", 60, "plank"],
  ["Side plank", "Core", "Obliques", 3, "30s", 45, "sideplank"],
  ["Hanging leg raise", "Core", "Lower Abs", 3, "12", 60, "hang"],
  ["Hanging knee raise", "Core", "Lower Abs", 3, "12", 60, "hang"],
  ["Lying leg raise", "Core", "Lower Abs", 3, "15", 45, "lyleg"],
  ["Mountain climbers", "Core", "Core · Cardio", 3, "30s", 45, "climber"],
  // CARDIO
  ["Treadmill run", "Cardio", "Cardio", 1, "20 min", 0, "run"],
  ["Stair climber", "Cardio", "Cardio · Legs", 1, "15 min", 0, "stairs"],
  ["Elliptical", "Cardio", "Cardio", 1, "20 min", 0, "elliptical"],
  ["Cycling", "Cardio", "Cardio · Legs", 1, "20 min", 0, "bike"],
  ["Rowing machine", "Cardio", "Cardio · Back", 1, "15 min", 0, "rower"]
];
var LIBMAP = {};
LIB.forEach(function (l) { LIBMAP[l[0]] = l; });
function ex(n, s, r) { var L = LIBMAP[n]; return [n, s != null ? s : L[3], r || L[4], L[2], L[5]]; }
function exFromLib(L) { return [L[0], L[3], L[4], L[2], L[5]]; }
function mkDays(spec) {
  return spec.map(function (d, i) {
    return { id: d[0], tag: "Day " + (i + 1), name: d[1], ex: d[2].map(function (a) { return ex(a[0], a[1], a[2]); }) };
  });
}

/* ---------- FAMOUS TRAINING SYSTEMS ---------- */
var PROGRAMS = [
  { id: "split4", name: "My Split: Push / Pull / Legs / Upper", freq: "4 days", desc: "Your current plan. Hypertrophy focus, every muscle hit about twice a week.", days: SPLIT4 },
  {
    id: "ppl3", name: "Push / Pull / Legs", freq: "3 days", desc: "Classic PPL. Run it 3 days a week, or twice through for 6 days.", days: mkDays([
      ["push", "Push", [["Bench press", 4, "6"], ["Overhead press"], ["Incline dumbbell press"], ["Lateral raise"], ["Triceps pushdown"], ["Overhead triceps extension"]]],
      ["pull", "Pull", [["Pull-ups"], ["Barbell row"], ["Lat pulldown"], ["Cable row"], ["Face pull"], ["Barbell curl"], ["Hammer curl"]]],
      ["legs", "Legs", [["Squat"], ["Romanian deadlift"], ["Leg press"], ["Leg curl"], ["Calf raise"], ["Abs"]]]
    ])
  },
  {
    id: "ul4", name: "Upper / Lower", freq: "4 days", desc: "Two upper and two lower days. Simple, balanced, easy to recover from.", days: mkDays([
      ["upper1", "Upper A", [["Bench press"], ["Barbell row"], ["Overhead press", 3, "8"], ["Lat pulldown"], ["Barbell curl", 2, "10"], ["Triceps pushdown", 2, "10"]]],
      ["lower1", "Lower A", [["Squat"], ["Romanian deadlift"], ["Leg press"], ["Leg curl"], ["Calf raise"], ["Abs"]]],
      ["upper2", "Upper B", [["Incline dumbbell press"], ["Chest-supported row"], ["Seated shoulder press"], ["Close-grip pulldown"], ["Lateral raise"], ["Hammer curl"], ["Overhead triceps extension"]]],
      ["lower2", "Lower B", [["Leg press", 4, "10"], ["Bulgarian split squat"], ["Hip thrust"], ["Leg extension"], ["Seated calf raise"], ["Hanging leg raise"]]]
    ])
  },
  {
    id: "fb3", name: "Full Body", freq: "3 days", desc: "Train everything three times a week. Great for beginners and busy schedules.", days: mkDays([
      ["fbA", "Full Body A", [["Squat", 3, "8"], ["Bench press", 3, "8"], ["Barbell row", 3, "8"], ["Lateral raise", 2, "15"], ["Plank"]]],
      ["fbB", "Full Body B", [["Romanian deadlift", 3, "8"], ["Overhead press", 3, "8"], ["Lat pulldown"], ["Dumbbell bench press", 2, "10"], ["Barbell curl", 2, "10"], ["Hanging leg raise", 2, "12"]]],
      ["fbC", "Full Body C", [["Leg press"], ["Incline dumbbell press"], ["Cable row"], ["Triceps pushdown", 2, "12"], ["Hammer curl", 2, "12"], ["Abs"]]]
    ])
  },
  {
    id: "bro5", name: "Bro Split", freq: "5 days", desc: "One muscle group per day with high volume. Chest, Back, Shoulders, Arms, Legs.", days: mkDays([
      ["chest", "Chest", [["Bench press"], ["Incline dumbbell press"], ["Chest fly (cable)"], ["Dips"], ["Pec deck", 2, "15"]]],
      ["back", "Back", [["Pull-ups"], ["Barbell row"], ["Lat pulldown"], ["Cable row"], ["Straight-arm pulldown"]]],
      ["shoulders", "Shoulders", [["Overhead press"], ["Lateral raise"], ["Rear delt fly"], ["Shrugs"], ["Face pull"]]],
      ["arms", "Arms", [["Barbell curl"], ["Skull crushers"], ["Incline dumbbell curl"], ["Triceps pushdown"], ["Hammer curl"], ["Overhead triceps extension"]]],
      ["legs", "Legs", [["Squat"], ["Romanian deadlift"], ["Leg press"], ["Leg extension"], ["Leg curl"], ["Calf raise"]]]
    ])
  },
  {
    id: "s5x5", name: "Strength 5×5", freq: "3 days", desc: "StrongLifts-style. Alternate A / B, 3 days a week, add weight every session.", days: mkDays([
      ["a", "Workout A", [["Squat", 5, "5"], ["Bench press", 5, "5"], ["Barbell row", 5, "5"]]],
      ["b", "Workout B", [["Squat", 5, "5"], ["Overhead press", 5, "5"], ["Deadlift", 1, "5"]]]
    ])
  }
];
var DAYS = SPLIT4;
var modalOnClose = null;
var NEW_DAY = function (n) { return { id: String(Date.now()) + Math.random().toString(36).slice(2, 5), tag: "Day " + n, name: "Day " + n, ex: [] }; };

var QUICK_FOODS = [
  { name: "Cottage Cheese + Sauce (200g)", kcal: 210, p: 28 },
  { name: "Chicken Breast Wrap", kcal: 480, p: 45 },
  { name: "3 Boiled/Scrambled Eggs", kcal: 215, p: 18 },
  { name: "Plain Greek/Baladi Yogurt", kcal: 130, p: 11 },
  { name: "Tuna Can (Drained)", kcal: 150, p: 32 },
  { name: "Whey / Protein Shake", kcal: 130, p: 25 }
];

var MEALS = [
  { name: "Breakfast", kcal: 850, p: 52, items: ["3 whole eggs plus 3 egg whites, scrambled", "1 cup foul with 1 tsp olive oil", "1 baladi loaf", "1 banana"] },
  { name: "Lunch", kcal: 830, p: 63, items: ["180 g grilled chicken breast (cooked weight)", "1½ cups cooked rice", "Big salad with 1 tbsp olive oil", "1 apple"] },
  { name: "Dinner", kcal: 870, p: 64, items: ["2 cans tuna in water, or 200 g grilled fish", "1 baladi loaf", "Tahini or olive oil salad", "1 cup plain yogurt", "Small handful of almonds (about 20 g)"] }
];

var BASE = { date: "2026-10-05", kg: 90.6, waist: null, fat: 25.2, note: "InBody" };
var GOAL_DEFAULTS = { kg: 81.0, kcal: 2550, protein: 180 };
