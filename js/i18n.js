// Arabic translation layer. The app renders English; while Arabic is on, a MutationObserver
// rewrites text and labels as they are inserted, before the browser paints.
// Exercise names, food names and anything you type stay as written.

var AR_WORDS = {
  // tabs, header, rest timer
  "Train": "التمرين", "Body": "الجسم", "Meals": "الوجبات", "Plan": "الخطة", "Gym Log": "سجل الجيم", "Gym Log Pro": "سجل الجيم برو", "PRO": "برو",
  "Ready": "جاهز", "Saved ✓": "تم الحفظ ✓", "Storage Error": "خطأ في الحفظ", "Rest": "راحة", "Skip": "تخطي", "GO!": "انطلق!",
  "Toggle Dark/Light Mode": "تبديل الوضع الليلي", "Workout actions": "إجراءات التمرين",
  // train tab
  "Your training split": "جدول تمرينك", "Swipe to switch →": "اسحب للتبديل ←", "Up next": "التالي", "Saved draft": "مسودة محفوظة",
  "Workout date and program": "تاريخ التمرين والبرنامج", "Session date": "تاريخ الحصة",
  "✎ Edit exercises": "✎ تعديل التمارين", "⇄ Change system": "⇄ تغيير النظام", "Your exercises": "تمارينك",
  "Enter your weight and reps, then check off each set.": "أدخل الوزن والتكرارات، ثم علّم على كل مجموعة.",
  "Session progress": "تقدم الحصة", "kg volume": "كجم حجم", "Ready when you are": "جاهز وقتما تكون جاهزًا",
  "Your progress is saved on this device": "تقدّمك محفوظ على هذا الجهاز", "Finish workout": "إنهاء التمرين",
  "↺ Fill last": "↺ املأ آخر مرة", "＋ Set last weight": "＋ حدد آخر وزن", "🔥 Warm-up": "🔥 إحماء", "Edit": "تعديل",
  "No previous weight recorded yet": "لا يوجد وزن سابق مسجل بعد", "＋ Set Last Weight You Lifted": "＋ حدد آخر وزن رفعته",
  "KG": "كجم", "REPS": "تكرار", "LAST / Δ": "السابق / Δ", "＋ Add set": "＋ إضافة مجموعة", "− Remove set": "− حذف مجموعة",
  "📝 Add a note": "📝 أضف ملاحظة", "📝 Note (saved)": "📝 ملاحظة (محفوظة)", "Grip, seat setting, how it felt…": "القبضة، وضع المقعد، كيف كان الإحساس…",
  "✓ Exercise complete": "✓ اكتمل التمرين", "Tap for HD Form & Plate Calculator": "اضغط لعرض الأداء وحاسبة الأقراص",
  "＋ Add exercises to this day": "＋ أضف تمارين لهذا اليوم", "This day has no exercises yet. Pick them from the library.": "لا توجد تمارين في هذا اليوم بعد. اخترها من المكتبة.",
  "Daily habits": "العادات اليومية", "Daily habits": "العادات اليومية", "Recent workouts": "التمارين الأخيرة", "No completed sessions yet.": "لا توجد حصص مكتملة بعد.",
  "Remove": "حذف", "Undo": "تراجع", "Restored": "تمت الاستعادة", "Close": "إغلاق", "✕": "✕", "Edit": "تعديل", "Done": "تم", "All": "الكل",
  "WORKOUT SUMMARY": "ملخص التمرين", "Keep training": "مواصلة التمرين", "Save workout": "حفظ التمرين",
  "Every set complete. Ready to save your workout?": "اكتملت كل المجموعات. هل تريد حفظ التمرين؟",
  "Workout notes": "ملاحظات التمرين", "Workout notes (optional): energy, sleep, anything to remember": "ملاحظات التمرين (اختياري): الطاقة، النوم، أي شيء تريد تذكّره",
  "Session saved! Great work 💪": "تم حفظ الحصة! عمل رائع 💪", "Log at least one set first": "سجّل مجموعة واحدة على الأقل أولًا",
  "Keep your workouts safe": "احفظ تمارينك", "Backup reminder": "تذكير بالنسخ الاحتياطي", "Remind me later": "ذكّرني لاحقًا", "Back up now": "انسخ الآن",
  "You haven't backed up yet.": "لم تنشئ نسخة احتياطية بعد.", "They only live on this phone.": "إنها محفوظة على هذا الهاتف فقط.",
  "Stay at": "ابقَ على", "Warm-up": "إحماء", "Working weight (kg)": "وزن العمل (كجم)", "Working weight in kg": "وزن العمل بالكيلوجرام",
  "Empty bar": "البار فارغ", "Bar only": "البار فقط", "Enter your working weight to see warm-up sets.": "أدخل وزن العمل لعرض مجموعات الإحماء.",
  "This weight is light enough to start straight away. A few easy reps are plenty.": "هذا الوزن خفيف بما يكفي لتبدأ مباشرة. بعض التكرارات السهلة تكفي.",
  "Est. 1RM": "أقصى تكرار تقديري", "Per side, 20 kg bar": "لكل جانب (بار 20 كجم)",
  "Your progress chart appears here after you log this exercise in two workouts.": "يظهر مخطط تقدّمك هنا بعد تسجيل هذا التمرين في حصتين.",
  "Log this exercise in one more workout to see your progress chart.": "سجّل هذا التمرين في حصة أخرى لعرض مخطط تقدّمك.",
  "Save last weight": "حفظ آخر وزن", "Last Weight (KG)": "آخر وزن (كجم)", "Last Reps": "آخر تكرارات",
  "Set the last weight & reps you lifted for this exercise so it appears as your reference in every set:": "حدد آخر وزن وتكرارات رفعتها في هذا التمرين ليظهر كمرجع في كل مجموعة:",
  "Workout history": "سجل التمارين", "Workouts": "التمارين", "Total volume": "الحجم الكلي", "Remove workout": "حذف التمرين", "Workout details": "تفاصيل التمرين",
  // programs & editors
  "Training program": "برنامج التدريب", "Edit my program": "تعديل برنامجي", "My Program": "برنامجي", "⎘ Customize active": "⎘ تخصيص النشط",
  "＋ Build from scratch": "＋ ابدأ من الصفر", "Your own program. Days and exercises are fully editable.": "برنامجك الخاص. الأيام والتمارين قابلة للتعديل بالكامل.",
  "Program name": "اسم البرنامج", "＋ Add training day": "＋ إضافة يوم تدريب", "Edit Day": "تعديل اليوم", "Day name": "اسم اليوم",
  "＋ Add exercises from library": "＋ أضف تمارين من المكتبة", "Exercise library": "مكتبة التمارين", "Search exercises…": "ابحث عن تمرين…",
  "Your own exercise": "تمرين خاص بك", "Exercise name": "اسم التمرين", "＋ Create & add": "＋ إنشاء وإضافة", "＋ Add": "＋ إضافة", "✓ Added": "✓ تمت الإضافة",
  "Sets": "المجموعات", "Reps": "التكرارات", "Muscle": "العضلة", "exercises": "تمارين", "sets": "مجموعات",
  "Copied to “My Program” — now editable": "تم النسخ إلى «برنامجي» — قابل للتعديل الآن", "You are already editing My Program": "أنت تعدّل برنامجي بالفعل",
  "Keep at least one day": "اترك يومًا واحدًا على الأقل", "Keep at least one set": "اترك مجموعة واحدة على الأقل", "Enter a name": "أدخل اسمًا",
  "Push": "دفع", "Pull": "سحب", "Legs": "أرجل", "Upper": "علوي", "Lower": "سفلي", "Full Body": "الجسم كامل", "Bro Split": "تقسيمة العضلة باليوم",
  "Strength 5×5": "قوة 5×5", "Upper A": "علوي أ", "Upper B": "علوي ب", "Lower A": "سفلي أ", "Lower B": "سفلي ب", "Workout A": "تمرين أ", "Workout B": "تمرين ب",
  "Full Body A": "الجسم كامل أ", "Full Body B": "الجسم كامل ب", "Full Body C": "الجسم كامل ج", "My Split": "تقسيمتي", "old": "قديم",
  "Your current plan. Hypertrophy focus, every muscle hit about twice a week.": "خطتك الحالية. تركيز على التضخيم، وكل عضلة تتمرن مرتين تقريبًا في الأسبوع.",
  "Classic PPL. Run it 3 days a week, or twice through for 6 days.": "دفع/سحب/أرجل الكلاسيكي. 3 أيام في الأسبوع، أو مرتين لتصبح 6 أيام.",
  "Two upper and two lower days. Simple, balanced, easy to recover from.": "يومان للجزء العلوي ويومان للسفلي. بسيط ومتوازن وسهل الاستشفاء.",
  "Train everything three times a week. Great for beginners and busy schedules.": "تمرين الجسم كله ثلاث مرات أسبوعيًا. ممتاز للمبتدئين وأصحاب الجداول المزدحمة.",
  "One muscle group per day with high volume. Chest, Back, Shoulders, Arms, Legs.": "مجموعة عضلية واحدة يوميًا بحجم عالٍ. صدر، ظهر، أكتاف، ذراعين، أرجل.",
  "StrongLifts-style. Alternate A / B, 3 days a week, add weight every session.": "بأسلوب سترونج ليفتس. بدّل بين أ / ب، 3 أيام أسبوعيًا، وزِد الوزن كل حصة.",
  // body tab
  "This week": "هذا الأسبوع", "This week": "هذا الأسبوع", "Last week": "الأسبوع الماضي", "Against last week": "مقارنة بالأسبوع الماضي",
  "Volume": "الحجم", "Avg protein": "متوسط البروتين", "Avg weight": "متوسط الوزن", "same": "نفسه",
  "Training calendar": "تقويم التمرين", "Previous month": "الشهر السابق", "Next month": "الشهر التالي", "Previous week": "الأسبوع السابق", "Next week": "الأسبوع التالي",
  "week streak": "أسابيع متتالية", "all time": "الإجمالي", "Personal records": "الأرقام القياسية", "NEW": "جديد",
  "Your best lifts appear here after your first workout.": "تظهر أفضل رفعاتك هنا بعد أول تمرين.",
  "Muscle balance": "توازن العضلات", "Front view muscle map": "خريطة العضلات من الأمام", "Back view muscle map": "خريطة العضلات من الخلف",
  "No sets logged": "لا توجد مجموعات مسجلة", "No sessions yet. Finish a workout on the Train tab and the muscles you hit will light up here.": "لا توجد حصص بعد. أنهِ تمرينًا من تبويب التمرين وستضيء العضلات التي دربتها هنا.",
  "Dashed band = 10–20 sets per week. Primary sets count 1, secondary sets 0.5. Tap a muscle for the exercises behind it.": "النطاق المتقطع = 10–20 مجموعة أسبوعيًا. المجموعة الأساسية تُحسب 1 والثانوية 0.5. اضغط على عضلة لترى تمارينها.",
  "Counts saved sessions only, not a workout in progress. Primary sets count 1, secondary sets count 0.5.": "تُحسب الحصص المحفوظة فقط، وليس التمرين الجاري. المجموعة الأساسية تُحسب 1 والثانوية 0.5.",
  "Current Weight": "الوزن الحالي", "Target Goal": "الهدف", "Total Change": "التغير الكلي", "To Goal": "حتى الهدف", "Reached!": "تم الوصول!",
  "Trends": "الاتجاهات", "Measurement to chart": "القياس المعروض", "Log a check-in": "تسجيل قياس", "Date": "التاريخ", "Save check-in": "حفظ القياس",
  "More measurements: chest, arms, thighs, hips, body fat": "قياسات أخرى: الصدر، الذراعين، الفخذين، الورك، نسبة الدهون",
  "History": "السجل", "Check-in": "قياس", "Check-in saved": "تم حفظ القياس", "InBody": "إن بودي", "Enter at least one measurement": "أدخل قياسًا واحدًا على الأقل",
  "Weight": "الوزن", "Waist": "الخصر", "Chest": "الصدر", "Arms": "الذراعين", "Thighs": "الفخذين", "Hips": "الورك", "Body fat": "نسبة الدهون", "Bodyweight": "وزن الجسم",
  "Weight (kg)": "الوزن (كجم)", "Waist (cm)": "الخصر (سم)", "Chest (cm)": "الصدر (سم)", "Arms (cm)": "الذراعين (سم)", "Thighs (cm)": "الفخذين (سم)", "Hips (cm)": "الورك (سم)", "Body fat (%)": "نسبة الدهون (%)",
  "e.g. 88.5": "مثال 88.5", "cm": "سم", "kg": "كجم",
  // meals tab
  "Calories": "السعرات", "Protein": "البروتين", "Carbs": "الكربوهيدرات", "Fat": "الدهون", "My Foods": "أطعمتي",
  "Quick add": "إضافة سريعة", "Add a food": "إضافة طعام", "Food": "الطعام", "Food name": "اسم الطعام",
  "Protein (g)": "البروتين (جم)", "Carbs (g)": "الكربوهيدرات (جم)", "Fat (g)": "الدهون (جم)", "auto": "تلقائي", "g": "جم", "kcal": "سعرة",
  "Save to My Foods for one-tap adding": "احفظ في أطعمتي للإضافة بضغطة واحدة", "Leave calories empty to work them out from the macros.": "اترك السعرات فارغة لحسابها من العناصر الغذائية.",
  "Add food": "إضافة الطعام", "Nothing logged today yet.": "لم يُسجَّل شيء اليوم بعد.", "Enter calories or macros": "أدخل السعرات أو العناصر الغذائية",
  "Macros can't be negative": "لا يمكن أن تكون القيم سالبة", "Name the food to save it": "سمِّ الطعام لحفظه",
  "Breakfast": "الفطار", "Lunch": "الغداء", "Dinner": "العشاء",
  // plan tab
  "Your goals": "أهدافك", "Daily calories (kcal)": "السعرات اليومية (سعرة)", "Daily protein (g)": "البروتين اليومي (جم)", "Goal weight (kg)": "الوزن المستهدف (كجم)",
  "Starting weight": "وزن البداية", "Changes save straight away and update the Body and Meals tabs.": "تُحفظ التغييرات فورًا وتُحدّث تبويبي الجسم والوجبات.",
  "No habits. Add one below.": "لا توجد عادات. أضف واحدة بالأسفل.", "New habit": "عادة جديدة", "Icon (optional)": "أيقونة (اختياري)", "Type": "النوع",
  "Yes / no": "نعم / لا", "Amount": "كمية", "Daily goal": "الهدف اليومي", "Per tap": "لكل ضغطة", "Unit": "الوحدة", "Add habit": "إضافة عادة",
  "Yes / no each day": "نعم / لا كل يوم", "e.g. Stretch 10 min": "مثال: إطالة 10 دقائق", "e.g. 8": "مثال 8", "e.g. hrs": "مثال: ساعة",
  "Name the habit": "سمِّ العادة", "Enter a daily goal above 0": "أدخل هدفًا يوميًا أكبر من 0", "Creatine 5g": "كرياتين 5 جم", "Water": "الماء",
  "Alerts and screen": "التنبيهات والشاشة", "Rest-end alert": "تنبيه انتهاء الراحة", "Notification + sound when rest finishes": "إشعار وصوت عند انتهاء الراحة",
  "Keep screen on while resting": "إبقاء الشاشة مضاءة أثناء الراحة", "Stops the phone locking during the rest timer": "يمنع قفل الهاتف أثناء مؤقت الراحة",
  "Not supported on this device": "غير مدعوم على هذا الجهاز", "Rest alerts off": "تم إيقاف تنبيهات الراحة",
  "On iPhone the alert arrives while the app is open or just backgrounded. Keeping the screen on during rest is the most reliable way to hear the beep.": "على الآيفون يصل التنبيه والتطبيق مفتوح أو في الخلفية للتو. إبقاء الشاشة مضاءة أثناء الراحة هو أضمن طريقة لسماع التنبيه.",
  "iPhone: add the app to Home Screen first, then enable": "آيفون: أضف التطبيق إلى الشاشة الرئيسية أولًا ثم فعّل التنبيه",
  "Blocked — allow it in iPhone Settings → Notifications": "محظور — اسمح به من إعدادات الآيفون ← الإشعارات",
  "Backup": "النسخ الاحتياطي", "⬇ Export Backup (JSON)": "⬇ تصدير نسخة احتياطية (JSON)",
  "⬆ Import Backup (JSON)": "⬆ استيراد نسخة احتياطية (JSON)", "No backup yet. Your data only lives on this device.": "لا توجد نسخة احتياطية بعد. بياناتك محفوظة على هذا الجهاز فقط.",
  "Backup saved ✓": "تم حفظ النسخة ✓", "Backup restored!": "تمت استعادة النسخة!", "Invalid backup file": "ملف نسخة غير صالح", "That file isn't a Gym Log backup": "هذا الملف ليس نسخة احتياطية من سجل الجيم",
  "How to progress": "كيف تتقدّم", "Stop each set 1–2 reps before failure.": "توقف في كل مجموعة قبل الفشل بتكرار أو اثنين.",
  "When you hit the top of the rep range on every set, add 2.5 kg next session.": "عندما تصل لأعلى نطاق التكرارات في كل المجموعات، زِد 2.5 كجم في الحصة التالية.",
  "Start set": "ابدأ المجموعة", "Finish workout": "إنهاء التمرين", "Pick a weight": "اختر الوزن", "Next set": "المجموعة التالية",
  "Every set is logged. Save the workout to keep it.": "سُجّلت كل المجموعات. احفظ التمرين للاحتفاظ به.", "This day has no exercises yet.": "لا توجد تمارين في هذا اليوم بعد.",
  "Nothing lifted yet today.": "لم ترفع شيئًا اليوم بعد.", "Empty 20 kg bar": "بار فارغ 20 كجم", "Dumbbell": "دمبل",
  "Language": "اللغة · Language", "Paused": "متوقف", "Finish": "إنهاء", "Let's train": "يلا نتمرن", "Progress": "التقدّم", "Your plan": "خطتك", "Exercises": "التمارين",
  "sets done": "مجموعات مكتملة", "SET": "مجموعة", "reps": "تكرار", "All sets done 💪": "اكتملت كل المجموعات 💪", "Skip": "تخطي", "Focus": "تركيز", "Start focus mode": "بدء وضع التركيز", "Focus mode": "وضع التركيز", "Exit focus mode": "الخروج من وضع التركيز",
  "All sets done": "اكتملت كل المجموعات", "Back to workout": "العودة للتمرين", "Up next": "التالي", "Skip rest": "تخطي الراحة", "Done ✓": "تم ✓",
  "Undo this set": "تراجع عن هذه المجموعة", "‹ Previous set": "‹ المجموعة السابقة", "Skip set ›": "تخطي المجموعة ›", "Weight (kg)": "الوزن (كجم)",
  "Add exercises to this day first": "أضف تمارين لهذا اليوم أولًا", "−15s": "−15ث", "+15s": "+15ث", "Your reference": "المرجع الخاص بك", "Tap a set to copy it": "اضغط على مجموعة لنسخها",
  "Switch to dark mode": "التبديل إلى الوضع الليلي", "Switch to light mode": "التبديل إلى الوضع النهاري", "Daily calories": "السعرات اليومية", "Daily protein": "البروتين اليومي", "Goal weight": "الوزن المستهدف",
  "Last week": "الأسبوع الماضي", "Enter a weight of 0 or more and a whole rep count above 0": "أدخل وزنًا 0 أو أكثر وعدد تكرارات صحيحًا أكبر من 0",
  "Enter valid kg & reps": "أدخل وزنًا وتكرارات صحيحة", "Undo this set before replacing its values": "ألغِ هذه المجموعة قبل تغيير قيمها",
  "Undo the last set before removing it": "ألغِ آخر مجموعة قبل حذفها", "Time for your next set": "حان وقت مجموعتك التالية", "Rest alerts are on ✓": "تنبيهات الراحة مفعّلة ✓",
  // muscles
  "Upper Chest": "أعلى الصدر", "Lower Chest": "أسفل الصدر", "Back": "الظهر", "Lats": "المجنصات", "Upper Back": "أعلى الظهر", "Mid Back": "وسط الظهر", "Lower Back": "أسفل الظهر",
  "Lats / upper back": "المجنصات / أعلى الظهر", "Traps": "الترابيس", "Shoulders": "الأكتاف", "Delts": "الدالية", "Front Delts": "الكتف الأمامي", "Side Delts": "الكتف الجانبي",
  "Rear Delts": "الكتف الخلفي", "Front delts": "الكتف الأمامي", "Side delts": "الكتف الجانبي", "Rear delts": "الكتف الخلفي", "Rotators": "العضلات الدوّارة",
  "Biceps": "البايسبس", "Biceps Long Head": "الرأس الطويل للبايسبس", "Biceps Short Head": "الرأس القصير للبايسبس", "Biceps Peak": "قمة البايسبس", "Brachialis": "العضدية",
  "Triceps": "الترايسبس", "Triceps Long Head": "الرأس الطويل للترايسبس", "Forearms": "الساعد", "Brachioradialis": "العضدية الكعبرية",
  "Forearm Flexors": "مثنيات الساعد", "Forearm Extensors": "باسطات الساعد", "Abs": "البطن", "Abs / core": "البطن / الجذع", "Lower Abs": "أسفل البطن", "Obliques": "الجوانب",
  "Core": "الجذع", "Hip Flexors": "مثنيات الورك", "Quads": "الفخذ الأمامي", "Hamstrings": "الفخذ الخلفي", "Glutes": "الأرداف", "Adductors": "العضلات الضامّة",
  "Calves": "السمانة", "Gastrocnemius": "عضلة السمانة", "Soleus": "النعلية", "Cardio": "كارديو", "Upper Chest · Triceps": "أعلى الصدر · الترايسبس",
  "none": "لا شيء", "low": "قليل", "almost": "قريب", "optimal": "مثالي", "high": "مرتفع",
  // quick foods
  "Cottage Cheese + Sauce (200g)": "جبن قريش + صوص (200 جم)", "Chicken Breast Wrap": "راب صدور فراخ", "3 Boiled/Scrambled Eggs": "3 بيضات مسلوقة/أومليت",
  "Plain Greek/Baladi Yogurt": "زبادي يوناني/بلدي سادة", "Tuna Can (Drained)": "علبة تونة (مصفّاة)", "Whey / Protein Shake": "واي / شيك بروتين"
};

var AR_DOW = { Sat: "السبت", Sun: "الأحد", Mon: "الاثنين", Tue: "الثلاثاء", Wed: "الأربعاء", Thu: "الخميس", Fri: "الجمعة" };
var AR_DOW2 = { Sa: "سبت", Su: "أحد", Mo: "اثن", Tu: "ثلا", We: "أرب", Th: "خمي", Fr: "جمع" };
var AR_MON = { Jan: "يناير", Feb: "فبراير", Mar: "مارس", Apr: "أبريل", May: "مايو", Jun: "يونيو", Jul: "يوليو", Aug: "أغسطس", Sep: "سبتمبر", Oct: "أكتوبر", Nov: "نوفمبر", Dec: "ديسمبر" };
var MON_RE = "(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)";

function arDate(s) {
  return s.replace(new RegExp("\\b(Sat|Sun|Mon|Tue|Wed|Thu|Fri) (\\d{1,2}) " + MON_RE + "\\b", "g"), function (_, d, n, m) { return AR_DOW[d] + " " + n + " " + AR_MON[m]; })
    .replace(new RegExp("\\b(\\d{1,2}) " + MON_RE + "\\b", "g"), function (_, n, m) { return n + " " + AR_MON[m]; })
    .replace(new RegExp("\\b" + MON_RE + " (\\d{4})\\b", "g"), function (_, m, y) { return AR_MON[m] + " " + y; });
}
// A word or phrase from the dictionary, or the text unchanged (exercise names, foods, numbers).
function trWord(s) { return AR_WORDS[s] || s; }
var AR_MON_N = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
// 2026-11-06 -> 6 نوفمبر 2026 (ISO dates are hard to read and can display reversed in right-to-left text)
function arIso(s) { return s.replace(/\b(\d{4})-(\d\d)-(\d\d)\b/g, function (_, y, m, d) { return (+d) + " " + AR_MON_N[+m - 1] + " " + y; }); }
function unitAr(u) { return u === "kg" ? "كجم" : u === "cm" ? "سم" : u === "g" ? "جم" : u === "reps" ? "تكرار" : u === "kcal" ? "سعرة" : u; }

// [pattern, replacement]. Replacements get the match groups; trWord() keeps unknown names as they are.
var AR_RULES = [
  [/^(\d+) of (\d+) sets complete$/, function (m) { return "المجموعات المكتملة: " + m[1] + " من " + m[2]; }],
  [/^(\d+) \/ (\d+) sets$/, function (m) { return m[1] + " / " + m[2] + " مجموعات"; }],
  [/^(\d+)% complete$/, function (m) { return "مكتمل " + m[1] + "%"; }],
  [/^(\d+) exercises · (\d+) working sets$/, function (m) { return "تمارين: " + m[1] + " · مجموعات عمل: " + m[2]; }],
  [/^My Split: (.+)$/, function (m) { return "تقسيمتي: " + m[1].split(" / ").map(T).join(" / "); }],
  [/^Last time, (.+)$/, function (m) { return "آخر مرة، " + arDate(m[1]); }],
  [/^Since (.+)$/, function (m) { return "منذ " + arDate(m[1]); }],
  [/^Exercise (\d+) of (\d+) · (.+)$/, function (m) { return "التمرين " + m[1] + " من " + m[2] + " · " + T(m[3]); }],
  [/^Set (\d+) of (\d+) · target (.+) reps$/, function (m) { return "المجموعة " + m[1] + " من " + m[2] + " · الهدف " + m[3] + " تكرارات"; }],
  [/^Set (\d+) of (\d+)(?: · (.+) kg × (\d+))?$/, function (m) { return "المجموعة " + m[1] + " من " + m[2] + (m[3] ? " · " + m[3] + " كجم × " + m[4] : ""); }],
  [/^Last time: (.+) kg × (\d+)$/, function (m) { return "آخر مرة: " + m[1] + " كجم × " + m[2]; }],
  [/^(\d+) sets · (.+) kg volume$/, function (m) { return m[1] + " مجموعات · حجم " + m[2] + " كجم"; }],
  [/^(Less|More) (weight|reps)$/, function (m) { return (m[1] === "Less" ? "إنقاص " : "زيادة ") + (m[2] === "weight" ? "الوزن" : "التكرارات"); }],
  [/^Today · Day (\d+) of (\d+)$/, function (m) { return "اليوم · اليوم " + m[1] + " من " + m[2]; }],
  [/^(\d+) exercises · (\d+) sets · ~(\d+) min$/, function (m) { return m[1] + " تمارين · " + m[2] + " مجموعات · ~" + m[3] + " دقيقة"; }],
  [/^(\d+) \/ (\d+) sets done$/, function (m) { return "المكتمل " + m[1] + " / " + m[2] + " مجموعات"; }],
  [/^Rest (\d+:\d\d) left$/, function (m) { return "راحة · متبقي " + m[1]; }],
  [/^Set (\d+) · (.+)$/, function (m) { return "المجموعة " + m[1] + " · " + m[2]; }],
  [/^Go to (.+)$/, function (m) { return "انتقل إلى " + m[1]; }],
  [/^Form and plate calculator for (.+)$/, function (m) { return "الأداء وحاسبة الأقراص لـ " + m[1]; }],
  [/^last (.+) × (\d+)$/, function (m) { return "آخر مرة " + m[1] + " × " + m[2]; }],
  [/^(.+), set (\d+) of (\d+)\.$/, function (m) { return m[1] + "، المجموعة " + m[2] + " من " + m[3] + "."; }],
  [/^Last time (.+) × (\d+)\.$/, function (m) { return "آخر مرة " + m[1] + " × " + m[2] + "."; }],
  [/^Best (.+) × (\d+)\.$/, function (m) { return "الأفضل " + m[1] + " × " + m[2] + "."; }],
  [/^(\d+) sets of (.+)\.$/, function (m) { return m[1] + " مجموعات × " + m[2] + "."; }],
  [/^(.+) kg lifted today\.$/, function (m) { return "رفعت " + m[1] + " كجم اليوم."; }],
  [/^(\d+) weeks? in a row\.$/, function (m) { return m[1] + " أسابيع متتالية."; }],
  [/^(\d+) of (\d+) sets done$/, function (m) { return "المكتمل " + m[1] + " من " + m[2] + " مجموعات"; }],
  [/^Set (\d+) of (\d+)$/, function (m) { return "المجموعة " + m[1] + " من " + m[2]; }],
  [/^Bar loaded with (.+) kg on each side$/, function (m) { return "البار محمّل بـ " + m[1] + " كجم على كل جانب"; }],
  [/^(.+), (start|end) position$/, function (m) { return m[1] + "، وضع " + (m[2] === "start" ? "البداية" : "النهاية"); }],
  [/^Pause the (.+) demonstration$/, function (m) { return "إيقاف عرض " + m[1] + " مؤقتًا"; }],
  [/^Play the (.+) demonstration$/, function (m) { return "تشغيل عرض " + m[1]; }],
  [/^Continue: (.+) →$/, function (m) { return "تابع: " + m[1] + " ←"; }],
  [/^Complete (.+), set (\d+)$/, function (m) { return "إكمال " + m[1] + "، المجموعة " + m[2]; }],
  [/^Undo (.+), set (\d+)$/, function (m) { return "تراجع عن " + m[1] + "، المجموعة " + m[2]; }],
  [/^(.+), set (\d+), reps$/, function (m) { return m[1] + "، المجموعة " + m[2] + "، التكرارات"; }],
  [/^(.+), set (\d+), weight in kilograms$/, function (m) { return m[1] + "، المجموعة " + m[2] + "، الوزن بالكيلوجرام"; }],
  [/^(Expand|Collapse) (.+)$/, function (m) { return (m[1] === "Expand" ? "فتح " : "طي ") + m[2]; }],
  [/^Note for (.+)$/, function (m) { return "ملاحظة لـ " + m[1]; }],
  [/^PR: (.+)$/, function (m) { return "الرقم القياسي: " + m[1]; }],
  [/^prev (.+)$/, function (m) { return "السابق " + m[1]; }],
  [/^Tap to fill (.+)$/, function (m) { return "اضغط لملء " + m[1]; }],
  [/^⚡ LAST LIFTED \($/, function () { return "⚡ آخر رفع ("; }],
  [/^\) — Tap any set to copy:$/, function () { return ") — اضغط أي مجموعة لنسخها:"; }],
  [/^▲ Next: (.+) kg × (\d+)$/, function (m) { return "▲ التالي: " + m[1] + " كجم × " + m[2]; }],
  [/^Use (.+) kg$/, function (m) { return "استخدم " + m[1] + " كجم"; }],
  [/^Stay at (.+) kg$/, function (m) { return "ابقَ على " + m[1] + " كجم"; }],
  [/^You hit (\d+)\+ reps on all (\d+) sets last time$/, function (m) { return "وصلت إلى " + m[1] + "+ تكرارات في كل المجموعات (" + m[2] + ") آخر مرة"; }],
  [/^Get (\d+) reps on all (\d+) sets, then add 2\.5 kg$/, function (m) { return "حقق " + m[1] + " تكرارات في كل المجموعات (" + m[2] + ")، ثم زِد 2.5 كجم"; }],
  [/^(.+)\. Rest about a minute between warm-up sets and keep them easy\.$/, function (m) { return m[1] + ". استرح دقيقة تقريبًا بين مجموعات الإحماء واجعلها سهلة."; }],
  [/^(.+) kg · working sets$/, function (m) { return m[1] + " كجم · مجموعات العمل"; }],
  [/^(.+) a side$/, function (m) { return m[1] + " لكل جانب"; }],
  [/^(.+): (\d+) sets? today$/, function (m) { return m[1] + ": " + m[2] + " مجموعات اليوم"; }],
  [/^You've completed (\d+) of (\d+) sets\. Only checked sets will be saved\.$/, function (m) { return "أكملت " + m[1] + " من " + m[2] + " مجموعات. سيتم حفظ المجموعات المعلّمة فقط."; }],
  [/^View all (\d+) workouts?$/, function (m) { return "عرض كل التمارين (" + m[1] + ")"; }],
  [/^View all (\d+) records$/, function (m) { return "عرض كل الأرقام (" + m[1] + ")"; }],
  [/^Show (.+) on (\d{4}-\d\d-\d\d)$/, function (m) { return "عرض " + trWord(m[1]) + " بتاريخ " + m[2]; }],
  [/^Back up your (\d+) workouts$/, function (m) { return "انسخ تمارينك (" + m[1] + ")"; }],
  [/^Your last backup was (\d+) days ago\. They only live on this phone\.$/, function (m) { return "آخر نسخة احتياطية كانت منذ " + m[1] + " يوم. تمارينك محفوظة على هذا الهاتف فقط."; }],
  [/^You haven't backed up yet\. They only live on this phone\.$/, function () { return "لم تنشئ نسخة احتياطية بعد. تمارينك محفوظة على هذا الهاتف فقط."; }],
  [/^Last backup: (.+) \((\d+) workouts\)\.$/, function (m) { return "آخر نسخة: " + arDate(m[1]) + " (" + m[2] + " تمارين)."; }],
  [/^(.+) removed$/, function (m) { return "تم حذف " + T(m[1]); }],
  [/^(.+) added$/, function (m) { return "تمت إضافة " + T(m[1]); }],
  [/^(.+) added to your daily habits$/, function (m) { return "تمت إضافة " + m[1] + " إلى عاداتك اليومية"; }],
  [/^Added (.+)$/, function (m) { return "تمت إضافة " + m[1]; }],
  [/^Switched to (.+)$/, function (m) { return "تم التبديل إلى " + T(m[1]); }],
  [/^Filled last weights for (.+)$/, function (m) { return "تم ملء آخر أوزان لـ " + m[1]; }],
  [/^(.+): (.+) kg × (\d+) filled$/, function (m) { return m[1] + ": تم ملء " + m[2] + " كجم × " + m[3]; }],
  [/^Copied (.+) to Set (\d+)$/, function (m) { return "تم نسخ " + m[1] + " إلى المجموعة " + m[2]; }],
  [/^Saved (.+): (.+)$/, function (m) { return "تم حفظ " + m[1] + ": " + m[2]; }],
  [/^New PR 🏆 (.+)$/, function (m) { return "رقم قياسي جديد 🏆 " + m[1]; }],
  [/^Check the (.+) value$/, function (m) { return "راجع قيمة " + trWord(m[1].replace(/^./, function (c) { return c.toUpperCase(); })); }],
  [/^(.+) must be (.+) (\w+)$/, function (m) { return T(m[1]) + " يجب أن يكون بين " + m[2] + " " + unitAr(m[3]); }],
  [/^(.+) set to (.+) (\w+)$/, function (m) { return "تم ضبط " + T(m[1]) + " على " + m[2] + " " + unitAr(m[3]); }],
  [/^Done today ✓ · (\d)\/7 days$/, function (m) { return "تم اليوم ✓ · " + m[1] + "/7 أيام"; }],
  [/^Tap when done · (\d)\/7 days$/, function (m) { return "اضغط عند الإنجاز · " + m[1] + "/7 أيام"; }],
  [/^\+(.+) a tap · (\d)\/7 days$/, function (m) { return "+" + m[1] + " لكل ضغطة · " + m[2] + "/7 أيام"; }],
  [/^Subtract (.+) from (.+)$/, function (m) { return "اطرح " + m[1] + " من " + trWord(m[2]); }],
  [/^(.+): (.+) \/ (.+)$/, function (m) { return trWord(m[1]) + ": " + m[2] + " / " + m[3]; }],
  [/^(.+): (.+) of (.+)\. Add (.+)$/, function (m) { return trWord(m[1]) + ": " + m[2] + " من " + m[3] + ". أضف " + m[4]; }],
  [/^Goal (.+) a day, (.+) per tap$/, function (m) { return "الهدف " + m[1] + " يوميًا، " + m[2] + " لكل ضغطة"; }],
  [/^Goal (.+)$/, function (m) { return "الهدف " + m[1]; }],
  [/^(\d+(?:\.\d+)?) (left of|over) (\d+)$/, function (m) { return m[1] + (m[2] === "left of" ? " متبقٍ من " : " زيادة عن ") + m[3]; }],
  [/^(.+) (to lose|to gain)$/, function (m) { return m[1] + (m[2] === "to lose" ? " للخسارة" : " للزيادة"); }],
  [/^([+−-]?[\d.]+) (kg|cm|reps|%) overall$/, function (m) { return m[1] + " " + unitAr(m[2]) + " إجمالًا"; }],
  [/^Best est\. 1RM · (\d+) sessions$/, function (m) { return "أفضل أقصى تكرار تقديري · " + m[1] + " حصص"; }],
  [/^Best set \(reps\) · (\d+) sessions$/, function (m) { return "أفضل مجموعة (تكرارات) · " + m[1] + " حصص"; }],
  [/^est\. 1RM (\d+) kg$/, function (m) { return "أقصى تكرار تقديري " + m[1] + " كجم"; }],
  [/^(\d+) reps$/, function (m) { return m[1] + " تكرارات"; }],
  [/^This week · from (.+)$/, function (m) { return "هذا الأسبوع · من " + arDate(m[1]); }],
  [/^workouts in (\w+)$/, function (m) { return "تمارين في " + (AR_MON[m[1]] || m[1]); }],
  [/^(.+), trained$/, function (m) { return arDate(m[1]) + "، يوم تمرين"; }],
  [/^(\d+) weeks ago$/, function (m) { return "منذ " + m[1] + " أسابيع"; }],
  [/^(\d+) sets · (.+) kg$/, function (m) { return m[1] + " مجموعات · " + m[2] + " كجم"; }],
  [/^(.+) · (\d+) exercises · (\d+) sets$/, function (m) { return arDate(m[1]) + " · " + m[2] + " تمارين · " + m[3] + " مجموعات"; }],
  [/^(.+): (\d+(?:\.\d)?) sets, (none|low|almost|optimal|high)(\. Tap for details)?$/, function (m) { return trWord(m[1]) + ": " + m[2] + " مجموعات، " + trWord(m[3]) + (m[4] ? ". اضغط للتفاصيل" : ""); }],
  [/^(\d+(?:[–-]\d+)?\+?) · (none|low|almost|optimal|high)$/, function (m) { return m[1] + " · " + trWord(m[2]); }],
  [/^Below target: (.+)$/, function (m) { return "أقل من الهدف: " + m[1].replace(/([A-Za-z][A-Za-z /]+?) −(\d+)/g, function (_, n, v) { return trWord(n) + " −" + v; }).replace(/ sets/, " مجموعات").replace(/\(\+(\d+) more\)/, "(+$1 أخرى)"); }],
  [/^Active, (\d+) days$/, function (m) { return "نشط، " + m[1] + " أيام"; }],
  [/^(\d+) days$/, function (m) { return m[1] + " أيام"; }],
  [/^Day (\d+)$/, function (m) { return "اليوم " + m[1]; }],
  [/^Day (\d+) · (\d+) exercises$/, function (m) { return "اليوم " + m[1] + " · " + m[2] + " تمارين"; }],
  [/^Starting point \((.+)\): (.+)\.$/, function (m) { return "نقطة البداية (" + m[1] + "): " + m[2].replace("body fat", "دهون").replace(/ kg/g, " كجم") + "."; }],
  [/^Aim to (lose|gain) (.+) kg per week toward your (.+) kg goal\.$/, function (m) { return "استهدف " + (m[1] === "lose" ? "خسارة " : "زيادة ") + m[2] + " كجم أسبوعيًا نحو هدفك " + m[3] + " كجم."; }],
  [/^Log at least two (.+) entries to see your trend\.$/, function (m) { return "سجّل قياسين على الأقل لـ" + trWord(m[1].replace(/^./, function (c) { return c.toUpperCase(); })) + " لعرض الاتجاه."; }],
  [/^(.+) from (.+) (kg|cm|%) on (\S+) to (.+) (kg|cm|%) on (\S+)(, goal (.+) kg)?$/, function (m) { return T(m[1]) + " من " + m[2] + " " + unitAr(m[3]) + " في " + m[4] + " إلى " + m[5] + " " + unitAr(m[6]) + " في " + m[7] + (m[8] ? "، الهدف " + m[9] + " كجم" : ""); }],
  [/^(.+) (Best est\. 1RM|Best set \(reps\)) from (.+) to (.+) (kg|reps)$/, function (m) { return m[1] + " " + T(m[2] + " · 1 sessions").split(" · ")[0] + " من " + m[3] + " إلى " + m[4] + " " + unitAr(m[5]); }],
  [/^([^\w\s]+) (.+)$/, function (m) { return AR_WORDS[m[2]] ? m[1] + " " + AR_WORDS[m[2]] : null; }],
  [/^([^·]+) (\d+(?:\.\d+)?) (kg|cm)$/, function (m) { return trWord(m[1]) + " " + m[2] + " " + unitAr(m[3]); }],
  [/^([^·]+) (\d+(?:\.\d+)?)%$/, function (m) { return trWord(m[1]) + " " + m[2] + "%"; }],
  [/^(\d+(?:\.\d+)?)g (protein|carbs|fat)$/, function (m) { return m[1] + " جم " + trWord(m[2].replace(/^./, function (c) { return c.toUpperCase(); })); }],
  [/^(\d+(?:\.\d+)?)g (P|C|F)$/, function (m) { return m[1] + " جم " + ({ P: "بروتين", C: "كربوهيدرات", F: "دهون" })[m[2]]; }],
  [/^(\d+) (kcal)$/, function (m) { return m[1] + " سعرة"; }],
  [/^Replace your current “(.+)” with a blank program\?$/, function (m) { return "استبدال «" + m[1] + "» ببرنامج فارغ؟"; }],
  [/^Delete (.+)\?$/, function (m) { return "حذف " + trWord(m[1]) + "؟"; }],
  [/^Delete (.+) from My Foods$/, function (m) { return "حذف " + m[1] + " من أطعمتي"; }],
  [/^Replace everything on this device with this backup\?/, function (m, s) {
    var n = s.match(/Backup: (\d+) workouts?, (\d+) check-ins?/), d = s.match(/This device: (\d+) workouts, (\d+) check-ins/);
    return "استبدال كل البيانات على هذا الجهاز بهذه النسخة؟\n\nالنسخة: " + (n ? n[1] + " تمارين، " + n[2] + " قياسات" : "") + ".\nهذا الجهاز: " + (d ? d[1] + " تمارين، " + d[2] + " قياسات" : "") + ".\n\nصدّر نسخة أولًا إن أردت الاحتفاظ بما هنا.";
  }],
  [/^\+ (.+) \((\d+(?:\.\d+)?)g P\)$/, function (m) { return "+ " + trWord(m[1]) + " (" + m[2] + " جم بروتين)"; }],
  [/^Rest over — GO! 💪$/, function () { return "انتهت الراحة — انطلق! 💪"; }],
  [/^Next set: (.+)$/, function (m) { return "المجموعة التالية: " + m[1]; }],
  // general patterns last, so specific rules above win
  [/^(.+), set (\d+)$/, function (m) { return m[1] + "، المجموعة " + m[2]; }]
];

// Translate one string. Leading/trailing spaces are kept.
function T(s) {
  if (s && !/[A-Za-z]/.test(s) && /\d{4}-\d\d-\d\d/.test(s)) return arIso(s);
  if (!s || !/[A-Za-z]/.test(s)) return s;
  var lead = s.match(/^\s*/)[0], trail = s.match(/\s*$/)[0], core = s.trim();
  if (!core) return s;
  var out = AR_WORDS[core];
  if (out == null) {
    for (var i = 0; i < AR_RULES.length && out == null; i++) {
      var m = AR_RULES[i][0].exec(core);
      if (m) out = AR_RULES[i][1](m, core);
    }
  }
  if (out == null && / · /.test(core)) {
    var parts = core.split(" · ");
    if (parts.length > 1) out = parts.map(T).join(" · ");
  }
  if (out == null && / \/ /.test(core)) out = core.split(" / ").map(function (p) { return trWord(p); }).join(" / ");
  if (out == null) {
    var dt = arDate(core);
    if (dt !== core) out = dt;
    else if (AR_DOW2[core]) out = AR_DOW2[core];
  }
  if (out == null) out = core;
  // units written next to numbers anywhere in the result, e.g. "40kg × 6"
  out = out.replace(/(\d)\s?kg\b/g, "$1 كجم").replace(/(\d)\s?cm\b/g, "$1 سم").replace(/(\d) g\b/g, "$1 جم");
  out = arIso(out);
  return out === core ? s : lead + out + trail;
}

var i18nObserver = null, I18N_ATTRS = ["placeholder", "aria-label", "title"];
function trNode(n) {
  if (n.nodeType === 3) {
    var p = n.parentNode;
    if (!p || p.nodeName === "SCRIPT" || p.nodeName === "STYLE" || p.nodeName === "TEXTAREA") return;
    if (n.__en === undefined || (n.nodeValue !== n.__ar)) { n.__en = n.nodeValue; n.__ar = T(n.nodeValue); }
    if (n.nodeValue !== n.__ar) n.nodeValue = n.__ar;
    return;
  }
  if (n.nodeType !== 1) return;
  if (n.classList && n.classList.contains("lang-switch")) return;
  if (n.nodeName === "INPUT" && (n.type === "button" || n.type === "submit") && n.value) n.value = T(n.value);
  I18N_ATTRS.forEach(function (a) {
    var v = n.getAttribute(a); if (!v) return;
    var key = "__en_" + a;
    if (n[key] === undefined || v !== n[key + "_ar"]) { n[key] = v; n[key + "_ar"] = T(v); }
    if (v !== n[key + "_ar"]) n.setAttribute(a, n[key + "_ar"]);
  });
  for (var c = n.firstChild; c; c = c.nextSibling) trNode(c);
}
// Put back the English that was replaced, so switching language does not need a reload.
function untrNode(n) {
  if (n.nodeType === 3) { if (n.__en !== undefined && n.nodeValue === n.__ar) n.nodeValue = n.__en; n.__en = undefined; return; }
  if (n.nodeType !== 1) return;
  I18N_ATTRS.forEach(function (a) { var key = "__en_" + a; if (n[key] !== undefined && n.getAttribute(a) === n[key + "_ar"]) n.setAttribute(a, n[key]); n[key] = undefined; });
  for (var c = n.firstChild; c; c = c.nextSibling) untrNode(c);
}
var nativeConfirm = window.confirm ? window.confirm.bind(window) : null;
function applyLang() {
  var ar = state.lang === "ar", root = document.documentElement;
  root.setAttribute("lang", ar ? "ar" : "en");
  root.setAttribute("dir", ar ? "rtl" : "ltr");
  if (i18nObserver) { i18nObserver.disconnect(); i18nObserver = null; }
  if (!ar) { untrNode(document.body); document.title = "Gym Log Pro"; return; }
  document.title = T("Gym Log Pro");
  trNode(document.body);
  if (typeof MutationObserver !== "undefined") {
    i18nObserver = new MutationObserver(function (list) {
      list.forEach(function (m) {
        if (m.type === "childList") m.addedNodes.forEach(trNode);
        else if (m.type === "characterData") trNode(m.target);
        else if (m.type === "attributes") trNode(m.target);
      });
    });
    i18nObserver.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: I18N_ATTRS });
  }
}
// confirm() dialogs and notifications are not in the page, so translate their text directly.
window.confirm = function (msg) { return nativeConfirm ? nativeConfirm(state.lang === "ar" ? T(String(msg)) : msg) : false; };
function trText(s) { return state.lang === "ar" ? T(s) : s; }
