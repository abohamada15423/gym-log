// Real demonstration photos (start and end position) for the built-in exercises.
// Source: Free Exercise DB, github.com/yuhonas/free-exercise-db, public domain (Unlicense).
// Files live in img/ex/<folder>-0.webp (start) and -1.webp (end).
var EX_PHOTOS = {
  "Abs": "Crunches",
  "Alternating dumbbell curl": "Dumbbell_Alternate_Bicep_Curl",
  "Arnold press": "Arnold_Dumbbell_Press",
  "Assisted pull-ups": "Band_Assisted_Pull-Up",
  "Back extension": "Hyperextensions_Back_Extensions",
  "Barbell curl": "Barbell_Curl",
  "Barbell row": "Bent_Over_Barbell_Row",
  "Barbell shrugs": "Barbell_Shrug",
  "Behind-the-neck press": "Push_Press_-_Behind_the_Neck",
  "Bench dips": "Bench_Dips",
  "Bench press": "Barbell_Bench_Press_-_Medium_Grip",
  "Bicycle crunch": "Air_Bike",
  "Bodyweight squat": "Bodyweight_Squat",
  "Bulgarian split squat": "Split_Squat_with_Dumbbells",
  "Cable crossover": "Cable_Crossover",
  "Cable crunch": "Cable_Crunch",
  "Cable curl": "Standing_Biceps_Cable_Curl",
  "Cable lateral raise": "Cable_Seated_Lateral_Raise",
  "Cable overhead extension": "Cable_Rope_Overhead_Triceps_Extension",
  "Cable pull-through": "Pull_Through",
  "Cable row": "Seated_Cable_Rows",
  "Calf raise": "Standing_Calf_Raises",
  "Chest fly (cable)": "Cable_Crossover",
  "Chest press machine": "Leverage_Chest_Press",
  "Chest-supported row": "Dumbbell_Incline_Row",
  "Chin-ups": "Chin-Up",
  "Close-grip bench press": "Close-Grip_Barbell_Bench_Press",
  "Close-grip pulldown": "Close-Grip_Front_Lat_Pulldown",
  "Concentration curl": "Concentration_Curls",
  "Cross-body hammer curl": "Cross_Body_Hammer_Curl",
  "Crunches": "Crunches",
  "Curls": "Dumbbell_Bicep_Curl",
  "Cycling": "Bicycling_Stationary",
  "Deadlift": "Barbell_Deadlift",
  "Decline bench press": "Decline_Barbell_Bench_Press",
  "Diamond push-ups": "Push-Ups_-_Close_Triceps_Position",
  "Dips": "Dips_-_Chest_Version",
  "Dumbbell bench press": "Dumbbell_Bench_Press",
  "Dumbbell curl": "Dumbbell_Bicep_Curl",
  "Dumbbell fly": "Dumbbell_Flyes",
  "Dumbbell kickback": "Tricep_Dumbbell_Kickback",
  "Dumbbell pullover": "Straight-Arm_Dumbbell_Pullover",
  "Dumbbell row": "One-Arm_Dumbbell_Row",
  "Dumbbell shoulder press": "Dumbbell_Shoulder_Press",
  "Dumbbell shrugs": "Dumbbell_Shrug",
  "EZ-bar curl": "EZ-Bar_Curl",
  "EZ-bar skull crushers": "EZ-Bar_Skullcrusher",
  "Elliptical": "Elliptical_Trainer",
  "Face pull": "Face_Pull",
  "Front raise": "Front_Dumbbell_Raise",
  "Front squat": "Front_Barbell_Squat",
  "Glute bridge": "Butt_Lift_Bridge",
  "Goblet squat": "Goblet_Squat",
  "Good morning": "Good_Morning",
  "Hack squat": "Hack_Squat",
  "Hammer curl": "Hammer_Curls",
  "Hanging knee raise": "Knee_Hip_Raise_On_Parallel_Bars",
  "Hanging leg raise": "Hanging_Leg_Raise",
  "Hip thrust": "Barbell_Hip_Thrust",
  "Incline barbell press": "Barbell_Incline_Bench_Press_-_Medium_Grip",
  "Incline dumbbell curl": "Incline_Dumbbell_Curl",
  "Incline dumbbell fly": "Incline_Dumbbell_Flyes",
  "Incline dumbbell press": "Incline_Dumbbell_Press",
  "Incline push-ups": "Incline_Push-Up",
  "Inverted row": "Inverted_Row",
  "JM press": "JM_Press",
  "Lat pulldown": "Wide-Grip_Lat_Pulldown",
  "Lateral raise": "Side_Lateral_Raise",
  "Leg curl": "Lying_Leg_Curls",
  "Leg extension": "Leg_Extensions",
  "Leg press": "Leg_Press",
  "Leg press calf raise": "Calf_Press_On_The_Leg_Press_Machine",
  "Lunges": "Dumbbell_Lunges",
  "Lying leg raise": "Flat_Bench_Lying_Leg_Raise",
  "Machine lateral raise": "Cable_Seated_Lateral_Raise",
  "Machine row": "Leverage_Iso_Row",
  "Machine shoulder press": "Machine_Shoulder_Military_Press",
  "Mountain climbers": "Mountain_Climbers",
  "Neutral-grip pull-ups": "V-Bar_Pullup",
  "Overhead press": "Standing_Military_Press",
  "Overhead triceps extension": "Standing_Dumbbell_Triceps_Extension",
  "Pause squat": "Barbell_Squat",
  "Pec deck": "Butterfly",
  "Pendlay row": "Bent_Over_Barbell_Row",
  "Plank": "Plank",
  "Plate front raise": "Front_Plate_Raise",
  "Preacher curl": "Preacher_Curl",
  "Pull-ups": "Pullups",
  "Push press": "Push_Press",
  "Push-ups": "Pushups",
  "Rack pull": "Rack_Pulls",
  "Rear delt fly": "Seated_Bent-Over_Rear_Delt_Raise",
  "Reverse curl": "Reverse_Barbell_Curl",
  "Reverse lunge": "Dumbbell_Rear_Lunge",
  "Reverse pec deck": "Reverse_Machine_Flyes",
  "Reverse wrist curl": "Seated_Dumbbell_Palms-Down_Wrist_Curl",
  "Reverse-grip pushdown": "Reverse_Grip_Triceps_Pushdown",
  "Romanian deadlift": "Romanian_Deadlift",
  "Rope pushdown": "Triceps_Pushdown_-_Rope_Attachment",
  "Rowing machine": "Rowing_Stationary",
  "Seal row": "Lying_Cambered_Barbell_Row",
  "Seated calf raise": "Seated_Calf_Raise",
  "Seated leg curl": "Seated_Leg_Curl",
  "Seated shoulder press": "Seated_Barbell_Military_Press",
  "Shrugs": "Barbell_Shrug",
  "Side plank": "Side_Bridge",
  "Single-leg RDL": "Kettlebell_One-Legged_Deadlift",
  "Single-leg glute bridge": "Single_Leg_Glute_Bridge",
  "Single-leg press": "Leg_Press",
  "Sit-ups": "Sit-Up",
  "Skull crushers": "Lying_Triceps_Press",
  "Smith machine bench press": "Smith_Machine_Bench_Press",
  "Smith machine squat": "Smith_Machine_Squat",
  "Spider curl": "Spider_Curl",
  "Squat": "Barbell_Squat",
  "Stair climber": "Stairmaster",
  "Standing calf raise": "Standing_Calf_Raises",
  "Step-ups": "Dumbbell_Step_Ups",
  "Stiff-leg deadlift": "Stiff-Legged_Barbell_Deadlift",
  "Straight-arm pulldown": "Straight-Arm_Pulldown",
  "Sumo deadlift": "Sumo_Deadlift",
  "T-bar row": "T-Bar_Row_with_Handle",
  "Treadmill run": "Running_Treadmill",
  "Triceps pushdown": "Triceps_Pushdown",
  "Upright row": "Upright_Barbell_Row",
  "Walking lunges": "Bodyweight_Walking_Lunge",
  "Wide-grip pull-ups": "Wide-Grip_Rear_Pull-Up",
  "Wide-grip pulldown": "Wide-Grip_Lat_Pulldown",
  "Wrist curl": "Seated_Dumbbell_Palms-Up_Wrist_Curl",
  "Zottman curl": "Zottman_Curl"
};
function exPhotos(name) {
  var f = EX_PHOTOS[name];
  return f ? ["img/ex/" + f + "-0.webp", "img/ex/" + f + "-1.webp"] : null;
}

// The exercise demonstration: start and end photos cross-fading in the rhythm of a rep.
// Tap to pause. Exercises without photos (your own) fall back to the drawn figure.
function exerciseDemo(name, scale) {
  var ph = exPhotos(name);
  if (!ph) {
    var c = h("canvas", {});
    var wrap = h("div", { class: "demo demo-drawn" }, [c]);
    drawBiomechanicalExercise(c, name, scale || 1.8);
    return wrap;
  }
  var a = h("img", { src: ph[0], alt: name + ", start position", decoding: "async" });
  var b = h("img", { src: ph[1], alt: name + ", end position", decoding: "async" });
  var box = h("button", { class: "demo", type: "button", "aria-pressed": "false", "aria-label": "Pause the " + name + " demonstration" }, [
    h("span", { class: "demo-frames" }, [a, b]),
    h("span", { class: "demo-phase", "aria-hidden": "true" }, [h("i", { class: "s" }), h("i", { class: "e" })]),
    h("span", { class: "demo-paused", "aria-hidden": "true", text: "Paused" })
  ]);
  box.onclick = function () {
    var paused = box.classList.toggle("paused");
    box.setAttribute("aria-pressed", String(paused));
    box.setAttribute("aria-label", (paused ? "Play the " : "Pause the ") + name + " demonstration");
  };
  return box;
}
