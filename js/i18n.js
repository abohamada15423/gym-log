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
  "Upper Chest": "أعلى الصدر", "Lower Chest": "أسفل الصدر", "Back": "الظهر", "Lats": "المجانص", "Upper Back": "أعلى الظهر", "Mid Back": "وسط الظهر", "Lower Back": "أسفل الظهر",
  "Lats / upper back": "المجانص / أعلى الظهر", "Traps": "الترابيس", "Shoulders": "الأكتاف", "Delts": "الدالية", "Front Delts": "الكتف الأمامي", "Side Delts": "الكتف الجانبي",
  "Rear Delts": "الكتف الخلفي", "Front delts": "الكتف الأمامي", "Side delts": "الكتف الجانبي", "Rear delts": "الكتف الخلفي", "Rotators": "العضلات الدوّارة",
  "Biceps": "البايسبس", "Biceps Long Head": "الرأس الطويل للبايسبس", "Biceps Short Head": "الرأس القصير للبايسبس", "Biceps Peak": "قمة البايسبس", "Brachialis": "العضدية",
  "Triceps": "الترايسبس", "Triceps Long Head": "الرأس الطويل للترايسبس", "Forearms": "الساعد", "Brachioradialis": "العضدية الكعبرية",
  "Forearm Flexors": "مثنيات الساعد", "Forearm Extensors": "باسطات الساعد", "Abs": "البطن", "Abs / core": "البطن / الجذع", "Lower Abs": "أسفل البطن", "Obliques": "الجوانب",
  "Core": "الجذع", "Hip Flexors": "مثنيات الورك", "Quads": "الفخذ الأمامي", "Hamstrings": "الفخذ الخلفي", "Glutes": "الأرداف", "Adductors": "العضلات الضامّة",
  "Calves": "السمانة", "Gastrocnemius": "عضلة السمانة", "Soleus": "النعلية", "Cardio": "كارديو", "Upper Chest · Triceps": "أعلى الصدر · الترايسبس",
  "none": "لا شيء", "low": "قليل", "almost": "قريب", "optimal": "مثالي", "high": "مرتفع",
  // quick foods
  "Cottage Cheese + Sauce (200g)": "جبن قريش + صوص (200 جم)", "Chicken Breast Wrap": "راب صدور فراخ", "3 Boiled/Scrambled Eggs": "3 بيضات مسلوقة/أومليت",
  "Plain Greek/Baladi Yogurt": "زبادي يوناني/بلدي سادة", "Tuna Can (Drained)": "علبة تونة (مصفّاة)", "Whey / Protein Shake": "واي / شيك بروتين",
  // account and sync (js/account.js, js/sync.js)
  "Account": "الحساب", "Account and sync": "الحساب والمزامنة", "Sign in": "تسجيل الدخول", "Create account": "إنشاء حساب",
  "Sign in or create account": "تسجيل الدخول أو إنشاء حساب", "Your account": "حسابك", "Account settings": "إعدادات الحساب",
  "Email": "البريد الإلكتروني", "Password": "كلمة المرور", "Name": "الاسم", "New password": "كلمة المرور الجديدة",
  "At least 8 characters": "8 أحرف على الأقل", "Forgot password?": "نسيت كلمة المرور؟", "Cancel": "إلغاء", "Choose": "اختر",
  "Saved on this phone ✓": "محفوظ على هذا الهاتف ✓", "Syncing…": "جارٍ المزامنة…", "Saved online ✓": "محفوظ أونلاين ✓",
  "Offline": "غير متصل", "Offline · will upload later": "غير متصل · سيُرفع عند عودة الإنترنت", "Sign in to sync": "سجّل الدخول للمزامنة",
  "Sync problem": "مشكلة في المزامنة", "Choose where this phone's data goes": "اختر مكان بيانات هذا الهاتف", "Not synced yet": "لم تتم المزامنة بعد",
  "Save your log online": "احفظ سجلك أونلاين",
  "Use it on more than one phone, and let your coach follow your training and meals.": "استخدمه على أكثر من هاتف، ودع الكابتن يتابع تمارينك ووجباتك.",
  "Signed in": "مسجّل الدخول", "Coach account": "حساب كابتن", "Your coach": "الكابتن", "Coach": "الكابتن",
  "Sign in to save your log online and share it with your coach.": "سجّل الدخول لتحفظ سجلك أونلاين وتشاركه مع الكابتن.",
  "Your coach invited you. Sign in or create an account to join.": "دعاك الكابتن. سجّل الدخول أو أنشئ حسابًا للانضمام.",
  "I agree to the": "أوافق على", "privacy policy": "سياسة الخصوصية", "Privacy policy": "سياسة الخصوصية",
  ", and to my coach seeing my workouts, meals and body measurements once I join them.": "، وعلى أن يرى الكابتن تماريني ووجباتي وقياسات جسمي بعد انضمامي إليه.",
  "Enter a valid email": "أدخل بريدًا إلكترونيًا صحيحًا", "Enter your password": "أدخل كلمة المرور", "Enter your name": "أدخل اسمك",
  "Password must be at least 8 characters": "يجب ألا تقل كلمة المرور عن 8 أحرف", "Tick the box to agree first": "علّم على مربع الموافقة أولًا",
  "Signed in ✓": "تم تسجيل الدخول ✓", "Account created ✓": "تم إنشاء الحساب ✓", "Signed out": "تم تسجيل الخروج",
  "Wrong email or password": "البريد الإلكتروني أو كلمة المرور غير صحيحة",
  "Confirm your email first. Check your inbox for the link.": "أكّد بريدك الإلكتروني أولًا. ستجد الرابط في بريدك.",
  "This email already has an account. Sign in instead.": "هذا البريد له حساب بالفعل. سجّل الدخول بدلًا من ذلك.",
  "Too many emails were sent. Try again in an hour.": "أُرسل عدد كبير من الرسائل. حاول مرة أخرى بعد ساعة.",
  "Too many tries. Wait a few minutes and try again.": "محاولات كثيرة. انتظر بضع دقائق ثم حاول مرة أخرى.",
  "That password is too easy to guess. Choose another.": "كلمة المرور هذه سهلة التخمين. اختر غيرها.",
  "Choose a password you haven't used here before": "اختر كلمة مرور لم تستخدمها هنا من قبل",
  "New accounts are switched off for now": "إنشاء الحسابات متوقف حاليًا",
  "No connection. Check your internet and try again.": "لا يوجد اتصال. تحقق من الإنترنت وحاول مرة أخرى.",
  "Something went wrong. Try again.": "حدث خطأ. حاول مرة أخرى.", "Sign in again first": "سجّل الدخول مرة أخرى أولًا", "Sign in first": "سجّل الدخول أولًا",
  "Check your email": "تحقق من بريدك", "Reset your password": "إعادة تعيين كلمة المرور", "Choose a new password": "اختر كلمة مرور جديدة",
  "Open it to confirm your email. It can open in any browser. Then come back here and sign in with your email and password.": "افتحه لتأكيد بريدك، ويمكن فتحه في أي متصفح. بعدها ارجع إلى هنا وسجّل الدخول ببريدك وكلمة المرور.",
  "Send it again": "أرسله مرة أخرى", "Sent ✓ Check your inbox": "تم الإرسال ✓ تحقق من بريدك", "Back to sign in": "العودة لتسجيل الدخول",
  "We'll email you a link to choose a new password.": "سنرسل إلى بريدك رابطًا لاختيار كلمة مرور جديدة.", "Send reset link": "إرسال رابط إعادة التعيين",
  "If it opens in another browser, choose the new password there, then sign in here with it.": "إذا فُتح الرابط في متصفح آخر، فاختر كلمة المرور الجديدة هناك، ثم سجّل الدخول بها هنا.",
  "Choose a new password for your account.": "اختر كلمة مرور جديدة لحسابك.", "Save new password": "حفظ كلمة المرور الجديدة", "Password changed ✓": "تم تغيير كلمة المرور ✓",
  "Email confirmed ✓ You're signed in": "تم تأكيد بريدك ✓ أنت مسجّل الدخول الآن",
  "This link has expired. Sign in, or ask for a new link.": "انتهت صلاحية هذا الرابط. سجّل الدخول أو اطلب رابطًا جديدًا.",
  "That link didn't work. Try signing in.": "هذا الرابط لم يعمل. جرّب تسجيل الدخول.",
  "Add this phone's data?": "إضافة بيانات هذا الهاتف؟", "This phone already has:": "على هذا الهاتف بالفعل:",
  "1 workout": "تمرين واحد", "1 food": "أكلة واحدة", "1 check-in": "قياس واحد", "1 day of habits": "يوم عادات واحد",
  "Add it to your account to keep it safe online and see it on your other phones. Your coach sees what's in your account.": "أضفها إلى حسابك لتبقى محفوظة أونلاين وتراها على هواتفك الأخرى. الكابتن يرى ما في حسابك.",
  "Add to my account": "أضفها إلى حسابي", "Keep it on this phone only": "أبقها على هذا الهاتف فقط", "Uploading your data…": "جارٍ رفع بياناتك…",
  "Sync now": "مزامنة الآن", "Up to date ✓": "كل شيء محدّث ✓", "Sign in again": "سجّل الدخول مرة أخرى",
  "Add this phone's data to my account": "أضف بيانات هذا الهاتف إلى حسابي",
  "Some items were refused by the server. Edit them and they'll be sent again.": "رفض الخادم بعض العناصر. عدّلها وستُرسل مرة أخرى.",
  "Your coach sees your workouts, meals, check-ins and habits.": "يرى الكابتن تمارينك ووجباتك وقياساتك وعاداتك.",
  "Leave coach": "ترك الكابتن", "Leave your coach? They won't see your new workouts, meals or check-ins.": "ترك الكابتن؟ لن يرى تمارينك ووجباتك وقياساتك الجديدة.",
  "You left your coach": "تركت الكابتن",
  "This is a coach account. Your coaching dashboard comes in a later update.": "هذا حساب كابتن. لوحة المتابعة تأتي في تحديث قادم.",
  "Enter the code your coach gave you.": "أدخل الكود الذي أعطاك إياه الكابتن.", "Invite code": "كود الدعوة", "Join": "انضمام",
  "Join your coach": "انضم إلى الكابتن", "The code has 12 letters and numbers": "الكود 12 حرفًا ورقمًا", "You joined your coach ✓": "انضممت إلى الكابتن ✓",
  "Your coach invited you. Join to share your training and meals with them.": "دعاك الكابتن. انضم لتشاركه تمارينك ووجباتك.",
  "This code is wrong or has expired": "الكود غير صحيح أو انتهت صلاحيته",
  "You already have a coach. Leave them before joining another.": "لديك كابتن بالفعل. اتركه قبل الانضمام إلى كابتن آخر.",
  "Coaches cannot join as clients": "لا يمكن للكابتن الانضمام كمتدرب", "Not allowed": "غير مسموح",
  "Your data": "بياناتك", "Export my data": "تصدير بياناتي", "Sign out": "تسجيل الخروج", "Sign out?": "تسجيل الخروج؟", "Delete account": "حذف الحساب",
  "Your data stays in your account. Sign in again any time to get it back.": "تبقى بياناتك في حسابك. سجّل الدخول في أي وقت لتستعيدها.",
  "1 change isn't uploaded yet": "تعديل واحد لم يُرفع بعد",
  "Connect to the internet first, or keep the data on this phone.": "اتصل بالإنترنت أولًا، أو أبقِ البيانات على هذا الهاتف.",
  "Also remove my data from this phone": "احذف بياناتي من هذا الهاتف أيضًا",
  "Delete your account?": "حذف حسابك؟",
  "This permanently deletes your account and everything in it: workouts, meals, check-ins, habits and photos. Your coach won't see them any more.": "سيُحذف حسابك نهائيًا مع كل ما فيه: التمارين والوجبات والقياسات والعادات والصور، ولن يراها الكابتن بعد ذلك.",
  "It can't be undone. Export your data first if you want a copy.": "لا يمكن التراجع عن ذلك. صدّر بياناتك أولًا إن أردت نسخة منها.",
  "I understand this can't be undone": "أفهم أنه لا يمكن التراجع عن ذلك", "Delete my account": "احذف حسابي", "Account deleted": "تم حذف الحساب",
  "You need to be online to delete your account": "يجب أن تكون متصلًا بالإنترنت لحذف حسابك",
  "1 change waiting to upload": "تعديل واحد في انتظار الرفع", "1 item couldn't upload": "عنصر واحد لم يُرفع", "1 item kept on this phone only": "عنصر واحد على هذا الهاتف فقط",
  "Set by your coach": "حدّده الكابتن", "From your coach": "من الكابتن", "Coach's program": "برنامج الكابتن", "Meal plan": "نظام الأكل",
  "Your data is also saved in your account.": "بياناتك محفوظة أيضًا في حسابك.", "Backup added to your account": "تمت إضافة النسخة إلى حسابك",
  "Open the coach dashboard": "افتح لوحة الكابتن", "front": "أمام", "back": "خلف", "Nothing below target": "لا شيء أقل من الهدف", "Every major muscle is on target — well balanced.": "كل العضلات الأساسية على الهدف، توازن ممتاز.", "This is a coach account.": "هذا حساب كابتن.",
  // coach dashboard (coach.html, js/coach.js)
  "Gym Log Coach": "سجل الجيم للكابتن", "Loading…": "جارٍ التحميل…", "Couldn't load your clients": "تعذّر تحميل المتدربين", "Try again": "حاول مرة أخرى",
  "Coach sign-in": "دخول الكابتن", "Use the account you made in the Gym Log app. The app's owner turns it into a coach account.": "استخدم الحساب الذي أنشأته في تطبيق سجل الجيم، وصاحب التطبيق يحوّله إلى حساب كابتن.",
  "Enter your email and password": "أدخل بريدك وكلمة المرور", "Open the app": "افتح التطبيق", "to create an account or reset your password.": "لإنشاء حساب أو إعادة تعيين كلمة المرور.",
  "This page is for coaches": "هذه الصفحة للكباتن",
  "Clients": "المتدربون", "Invite a client": "ادعُ متدربًا", "No clients yet.": "لا يوجد متدربون بعد.", "Everyone is on track.": "الكل على المسار الصحيح.",
  "1 client needs you today.": "متدرب واحد يحتاجك اليوم.",
  "Invite your first client. They open the link on their phone, create an account and join you. Their workouts, meals and check-ins show up here.": "ادعُ أول متدرب. يفتح الرابط على هاتفه وينشئ حسابًا وينضم إليك، وتظهر هنا تمارينه ووجباته وقياساته.",
  "Needs you": "يحتاجونك", "On track": "على المسار", "Paused": "متوقف مؤقتًا", "You can still see their log. They don't get flags while paused.": "ما زلت ترى سجلهم، ولا تظهر لهم تنبيهات أثناء الإيقاف.",
  "Client": "المتدرب", "Last 7 days": "آخر 7 أيام", "Protein, daily average": "البروتين، متوسط يومي", "Flags": "تنبيهات",
  "Active today": "نشِط اليوم", "Active yesterday": "نشِط أمس", "No activity yet": "لا نشاط بعد", "No meals logged": "لا وجبات مسجّلة", "No weigh-ins": "لا أوزان مسجّلة",
  "No workout yet": "لا تمارين بعد", "No check-in yet": "لا قياسات بعد", "Protein under 80% for 3 days": "البروتين أقل من 80% لمدة 3 أيام",
  "Weight moving away from the goal for 2 weeks": "الوزن يبتعد عن الهدف منذ أسبوعين", "1 workout": "تمرين واحد",
  "Resume": "استئناف", "Pause": "إيقاف مؤقت", "Remove client": "إزالة المتدرب", "‹ All clients": "‹ كل المتدربين",
  "Summary": "ملخص", "Notes": "ملاحظات", "Needs attention": "يحتاج انتباهك", "Your program for them": "برنامجك له",
  "No workouts logged yet.": "لا تمارين مسجّلة بعد.", "Their note": "ملاحظته",
  "Targets from your meal plan.": "الأهداف من نظام الأكل الذي وضعته.", "Targets the client set.": "الأهداف التي حددها المتدرب.",
  "No targets yet. They come from your meal plan, or the client's own goals.": "لا أهداف بعد. تأتي من نظام الأكل الذي تضعه أو من أهداف المتدرب نفسه.",
  "No meals logged in the last 4 months.": "لا وجبات مسجّلة في آخر 4 أشهر.", "No check-ins yet.": "لا قياسات بعد.", "Check-ins": "القياسات", "One check-in so far": "قياس واحد حتى الآن",
  "Injuries, goals, what you agreed, how they're doing…": "الإصابات، الأهداف، ما اتفقتما عليه، حاله…", "Only you see these notes.": "أنت فقط ترى هذه الملاحظات.",
  "Saving…": "جارٍ الحفظ…", "Saved. Only you see these notes.": "تم الحفظ. أنت فقط ترى هذه الملاحظات.",
  "Send this link. Your client opens it on their phone, creates an account and joins you. Or they type the code in the app.": "أرسل هذا الرابط. يفتحه المتدرب على هاتفه وينشئ حسابًا وينضم إليك، أو يكتب الكود في التطبيق.",
  "Copy link": "نسخ الرابط", "Link copied": "تم نسخ الرابط", "Share": "مشاركة", "It works once and expires in 7 days.": "يعمل مرة واحدة وتنتهي صلاحيته بعد 7 أيام.",
  "Make an invite code": "أنشئ كود دعوة", "Each code works for one client, once, for 7 days.": "كل كود لمتدرب واحد، مرة واحدة، لمدة 7 أيام.",
  "Loading your open codes…": "جارٍ تحميل أكوادك المفتوحة…", "Open codes": "الأكواد المفتوحة", "Withdraw": "سحب", "Code withdrawn": "تم سحب الكود", "Expires in 1 day": "ينتهي بعد يوم واحد",
  // programs and meal plans the coach writes (phase 3)
  "Program": "البرنامج", "Templates": "القوالب", "Dashboard": "اللوحة", "Start from": "ابدأ من", "A blank program": "برنامج فارغ", "A blank meal plan": "نظام أكل فارغ",
  "Built-in programs": "البرامج الجاهزة في التطبيق", "The app's example meals": "وجبات التطبيق النموذجية", "Your templates": "قوالبك",
  "Write the program": "اكتب البرنامج", "Write the meal plan": "اكتب نظام الأكل", "Send a different program": "أرسل برنامجًا آخر", "Send a different meal plan": "أرسل نظام أكل آخر",
  "Write a program": "اكتب برنامجًا", "Write a meal plan": "اكتب نظام أكل", "Save template": "حفظ القالب", "Save as template": "حفظ كقالب",
  "Edit day": "تعديل اليوم", "Move up": "تحريك لأعلى", "1 exercise": "تمرين واحد", "No exercises yet.": "لا تمارين بعد.", "＋ Add a training day": "＋ إضافة يوم تمرين",
  "Edit their program": "تعديل برنامجه", "New program": "برنامج جديد", "Edit the template": "تعديل القالب", "New program template": "قالب برنامج جديد",
  "e.g. Strength block": "مثال: مرحلة القوة", "Name the program first": "اكتب اسم البرنامج أولًا", "Add at least one exercise": "أضف تمرينًا واحدًا على الأقل",
  "Saved as a template": "تم الحفظ كقالب", "Template saved": "تم حفظ القالب", "Edit program": "تعديل البرنامج", "Stop this program": "إيقاف هذا البرنامج", "Program stopped": "تم إيقاف البرنامج",
  "No program from you yet.": "لا يوجد برنامج منك بعد.", "Discard your changes?": "تجاهل التعديلات؟",
  "Calories a day": "السعرات في اليوم", "e.g. Lean bulk": "مثال: تضخيم نظيف", "e.g. Breakfast": "مثال: الفطار", "One food per line, e.g. 3 eggs": "طعام في كل سطر، مثال: 3 بيضات",
  "Meal": "الوجبة", "What's in it": "مكوناتها", "＋ Add a meal": "＋ إضافة وجبة", "Edit their meal plan": "تعديل نظام أكله", "New meal plan": "نظام أكل جديد",
  "New meal plan template": "قالب نظام أكل جديد", "Meal plan name": "اسم نظام الأكل", "Daily targets": "الأهداف اليومية",
  "Calories and protein replace the client's own goals in the app.": "السعرات والبروتين يحلّان محل أهداف المتدرب نفسه في التطبيق.",
  "Meals show up in the client's Meals tab, ready to log with one tap.": "تظهر الوجبات في تبويب الوجبات عند المتدرب، جاهزة للتسجيل بضغطة.",
  "Name the meal plan first": "اكتب اسم نظام الأكل أولًا", "Name every meal": "اكتب اسم كل وجبة", "Add a target or a meal": "أضف هدفًا أو وجبة",
  "Edit meal plan": "تعديل نظام الأكل", "Stop this meal plan": "إيقاف نظام الأكل هذا", "Meal plan stopped": "تم إيقاف نظام الأكل",
  "No meal plan from you yet. The app uses their own goals.": "لا يوجد نظام أكل منك بعد، والتطبيق يستخدم أهدافه هو.",
  "Write a program or meal plan once, then start from it on any client's page.": "اكتب البرنامج أو نظام الأكل مرة واحدة، وابدأ منه في صفحة أي متدرب.",
  "Programs": "البرامج", "Meal plans": "أنظمة الأكل", "Delete": "حذف", "Template deleted": "تم حذف القالب", "1 day": "يوم واحد", "1 meal": "وجبة واحدة",
  "No program templates yet.": "لا قوالب برامج بعد.", "No meal plan templates yet.": "لا قوالب أنظمة أكل بعد.",
  "Program from your coach": "برنامج من الكابتن", "+ Add": "+ إضافة", "Your coach updated your program": "الكابتن حدّث برنامجك", "Your coach updated your meal plan": "الكابتن حدّث نظام أكلك",
  // comments and notifications (phase 4)
  "Today": "اليوم", "Yesterday": "أمس", "You": "أنت", "Reply": "رد", "Add a comment": "أضف تعليقًا", "Send": "إرسال", "Comment": "علّق", "Comments": "التعليقات", "About": "عن",
  "Not sent": "لم يُرسل", "Sending…": "جارٍ الإرسال…", "Delete this comment?": "حذف هذا التعليق؟", "Couldn't delete. Try again.": "تعذّر الحذف. حاول مرة أخرى.",
  "Write a comment…": "اكتب تعليقًا…", "Your comment": "تعليقك", "Couldn't send. Try again.": "تعذّر الإرسال. حاول مرة أخرى.", "Not about this": "ليس عن هذا",
  "No comments yet.": "لا تعليقات بعد.", "A workout that was removed": "تمرين محذوف", "A check-in that was removed": "قياس محذوف",
  "Write something first": "اكتب شيئًا أولًا", "New comment from your coach": "تعليق جديد من الكابتن", "Open": "افتح",
  "You don't have a coach right now. Your earlier comments stay here.": "ليس لديك كابتن الآن، وتعليقاتك السابقة باقية هنا.",
  "Write to your coach…": "اكتب للكابتن…", "Comment for your coach": "تعليق للكابتن",
  "No comments yet. Ask your coach about a workout, your meals or anything else.": "لا تعليقات بعد. اسأل الكابتن عن تمرين أو وجباتك أو أي شيء آخر.",
  "Ask your coach about this workout": "اسأل الكابتن عن هذا التمرين", "Ask your coach about this workout…": "اسأل الكابتن عن هذا التمرين…",
  "1 comment": "تعليق واحد", "1 new comment": "تعليق جديد واحد",
  "Comment on this day's meals": "علّق على وجبات هذا اليوم", "Tell your coach about this day's meals…": "اكتب للكابتن عن وجبات هذا اليوم…",
  "Tell your coach about this check-in…": "اكتب للكابتن عن هذا القياس…", "Comment on this check-in": "علّق على هذا القياس",
  "Notifications": "الإشعارات", "Notifications on this phone": "الإشعارات على هذا الهاتف",
  "Comments from your coach, new programs, and training reminders": "تعليقات الكابتن والبرامج الجديدة وتذكيرات التمرين",
  "Training reminders, and comments once you have a coach": "تذكيرات التمرين، وتعليقات الكابتن عندما يكون لديك كابتن",
  "Notifications off on this phone": "أُوقفت الإشعارات على هذا الهاتف", "Notifications on ✓": "الإشعارات تعمل ✓",
  "Notifications are blocked for Gym Log. Allow them in your browser or phone settings, then turn them on here.": "الإشعارات محظورة لسجل الجيم. اسمح بها من إعدادات المتصفح أو الهاتف، ثم شغّلها من هنا.",
  "On iPhone, notifications work once Gym Log is on your Home Screen: tap Share, then Add to Home Screen, and open it from there.": "على الآيفون تعمل الإشعارات بعد إضافة سجل الجيم إلى الشاشة الرئيسية: اضغط مشاركة، ثم إضافة إلى الشاشة الرئيسية، وافتحه من هناك.",
  "This browser can't show notifications from Gym Log.": "هذا المتصفح لا يعرض إشعارات سجل الجيم.",
  "On iPhone, add Gym Log to your Home Screen first, then open it from there.": "على الآيفون، أضف سجل الجيم إلى الشاشة الرئيسية أولًا، ثم افتحه من هناك.",
  "Notifications are blocked. Allow them for this site in your browser or phone settings.": "الإشعارات محظورة. اسمح بها لهذا الموقع من إعدادات المتصفح أو الهاتف.",
  "Couldn't turn notifications on. Try again.": "تعذّر تشغيل الإشعارات. حاول مرة أخرى.",
  "Remind me on training days": "ذكّرني في أيام التمرين", "Only on days you haven't trained yet": "فقط في الأيام التي لم تتمرن فيها بعد",
  "Training days": "أيام التمرين", "At": "الساعة", "Pick the days you train.": "اختر أيام تمرينك.",
  "You'll get one reminder at that time on each day you picked, unless you've already trained.": "يصلك تذكير واحد في هذا الوقت في كل يوم اخترته، إلا إذا كنت تمرنت بالفعل.",
  "Saturday": "السبت", "Sunday": "الأحد", "Monday": "الاثنين", "Tuesday": "الثلاثاء", "Wednesday": "الأربعاء", "Thursday": "الخميس", "Friday": "الجمعة",
  "Waiting for your reply": "ينتظر ردك", "Comment on this workout": "علّق على هذا التمرين", "Your comment on this workout…": "تعليقك على هذا التمرين…",
  "Comment on this day": "علّق على هذا اليوم", "Your comment on this day's meals…": "تعليقك على وجبات هذا اليوم…", "Your comment on this check-in…": "تعليقك على هذا القياس…",
  "Notifications on": "الإشعارات تعمل", "Turn on notifications": "شغّل الإشعارات", "new": "جديد",
  "Get a notification when a client writes to you": "يصلك إشعار عندما يكتب لك متدرب",
  "You get a notification when a client writes to you. Tap to turn it off.": "يصلك إشعار عندما يكتب لك متدرب. اضغط لإيقافه.",
  "Notifications off in this browser": "أُوقفت الإشعارات في هذا المتصفح",
  "Notifications on ✓ You'll hear when a client writes to you.": "الإشعارات تعمل ✓ سيصلك إشعار عندما يكتب لك متدرب.",
  // progress photos (phase 5)
  "Front": "الأمام", "Side": "الجنب", "Before": "قبل", "After": "بعد", "Photos": "الصور", "Pose": "الوضع", "Progress photos": "صور التقدّم",
  "Photos (optional)": "الصور (اختياري)", "Add a front photo": "أضف صورة من الأمام", "Add a side photo": "أضف صورة من الجنب", "Add a back photo": "أضف صورة من الظهر",
  "Remove the front photo": "احذف الصورة الأمامية", "Remove the side photo": "احذف الصورة الجانبية", "Remove the back photo": "احذف صورة الظهر",
  "Front, side and back. Your coach sees them too.": "من الأمام والجنب والظهر، والكابتن يراها أيضًا.",
  "Front, side and back. Saved in your account.": "من الأمام والجنب والظهر، وتُحفظ في حسابك.",
  "Front, side and back. Kept on this phone only.": "من الأمام والجنب والظهر، وتبقى على هذا الهاتف فقط.",
  "That photo couldn't be read. Try another one.": "تعذّرت قراءة هذه الصورة. جرّب صورة أخرى.",
  "Photo not available right now": "الصورة غير متاحة الآن", "Slide between before and after": "حرّك بين قبل وبعد",
  "Enter at least one measurement or add a photo": "أدخل قياسًا واحدًا على الأقل أو أضف صورة",
  "This browser couldn't keep the photos. Turn off private browsing and try again.": "تعذّر على هذا المتصفح حفظ الصور. أوقف التصفح الخاص وحاول مرة أخرى.",
  // subscriptions (phase 6)
  "Payments": "المدفوعات", "Subscription": "الاشتراك", "Record a payment": "سجّل دفعة", "Record payment": "سجّل الدفعة", "How long it covers": "المدة",
  "1 month": "شهر", "3 months": "٣ شهور", "6 months": "٦ شهور", "Other": "أخرى", "Days": "الأيام", "Number of days": "عدد الأيام",
  "Amount (EGP)": "المبلغ (جنيه)", "Amount in EGP": "المبلغ بالجنيه", "e.g. 1500": "مثلًا 1500", "How they paid": "طريقة الدفع",
  "InstaPay": "إنستاباي", "Vodafone Cash": "فودافون كاش", "Cash": "كاش", "Bank transfer": "تحويل بنكي", "Note": "ملاحظة", "Optional": "اختياري",
  "Enter 1 to 366 days": "أدخل من 1 لـ 366 يوم", "Enter the amount they paid": "أدخل المبلغ اللي اتدفع", "Payment taken back": "اتلغت الدفعة", "Take back": "إلغاء",
  "Subscription ended": "الاشتراك خلص", "Subscription ends today": "الاشتراك بيخلص النهارده", "Subscription ends tomorrow": "الاشتراك بيخلص بكرة",
  "Subscription ended yesterday": "الاشتراك خلص امبارح", "1 day": "يوم واحد",
  "Not tracked yet. Record their first payment to start.": "لسه مش متتبَّع. سجّل أول دفعة ليه عشان يبدأ.",
  "Clients pay you outside the app. Record each payment here: their subscription runs on from the last paid day. When it ends, they keep using the app, but you see only what they logged until then, and can't send them programs, meal plans or comments until the next payment.":
    "المتدربين بيدفعولك برّه الأبلكيشن، وانت بتسجّل كل دفعة هنا، والاشتراك بيكمل من آخر يوم مدفوع. ولما يخلص، المتدرب بيكمل يستخدم الأبلكيشن عادي، بس انت بتشوف اللي سجّله لحد آخر يوم مدفوع بس، ومش هتقدر تبعتله برامج ولا نظام أكل ولا تعليقات لحد الدفعة الجاية.",
  "For a payment made outside the app: InstaPay, Vodafone Cash or cash. The first one starts tracking their subscription.": "لدفعة اتدفعت برّه الأبلكيشن: إنستاباي أو فودافون كاش أو كاش. أول دفعة بتبدأ تتبّع اشتراكه.",
  "Their subscription has ended, so this one starts today.": "اشتراكه خلص، فالدفعة دي بتبدأ من النهارده.",
  "You see what they logged up to their last paid day. Record a payment to see the rest and send them anything.": "بتشوف اللي سجّلوه لحد آخر يوم مدفوع. سجّل دفعة عشان تشوف الباقي وتقدر تبعتلهم.",
  "Their subscription has ended. Record a payment to send them a program.": "اشتراكه خلص. سجّل دفعة عشان تبعتله برنامج.",
  "Their subscription has ended. Record a payment to send them a meal plan.": "اشتراكه خلص. سجّل دفعة عشان تبعتله نظام أكل.",
  "Their subscription has ended. Record a payment to write to them again.": "اشتراكه خلص. سجّل دفعة عشان تقدر تكتبله تاني.",
  "Your coaching has ended": "اشتراكك مع الكابتن خلص", "Your coaching ends today": "اشتراكك مع الكابتن بيخلص النهارده", "Your coaching ends tomorrow": "اشتراكك مع الكابتن بيخلص بكرة",
  "Your coach can't see what you log until you renew.": "الكابتن مش هيشوف اللي بتسجّله لحد ما تجدد.",
  "Renew with your coach to keep your program and comments coming.": "جدّد مع الكابتن عشان البرنامج والتعليقات يفضلوا شغالين.",
  "Your coaching has ended. Your coach will see new comments once you renew.": "اشتراكك مع الكابتن خلص. الكابتن هيشوف التعليقات الجديدة لما تجدد.",
  "1 subscription has ended.": "اشتراك واحد خلص."
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
var AR_POSE = { front: "من الأمام", side: "من الجنب", back: "من الظهر", Front: "الأمام", Side: "الجنب", Back: "الظهر", Before: "قبل", After: "بعد" };
var AR_RULES = [
  // subscriptions: amounts in pounds, days, and sentences that carry a date
  [/^([\d,]+(?:\.\d+)?) EGP$/, function (m) { return m[1] + " جنيه"; }],
  [/^Recorded this month: ([\d,]+(?:\.\d+)?) EGP$/, function (m) { return "اتسجّل الشهر ده: " + m[1] + " جنيه"; }],
  [/^Take back this payment of ([\d,]+(?:\.\d+)?) EGP\? Use this for a payment recorded by mistake\.$/, function (m) { return "إلغاء الدفعة دي (" + m[1] + " جنيه)؟ ده لدفعة اتسجّلت بالغلط."; }],
  [/^(\d+) subscriptions have ended\.$/, function (m) { return "اشتراكات خلصت: " + m[1] + "."; }],
  [/^(.+\.) (1 subscription has ended\.|\d+ subscriptions have ended\.)$/, function (m) { return T(m[1]) + " " + T(m[2]); }],
  [/^Subscription ends in (\d+) days$/, function (m) { return "الاشتراك بيخلص بعد " + m[1] + " أيام"; }],
  [/^Subscription ended (\d+) days ago$/, function (m) { return "الاشتراك خلص من " + m[1] + " أيام"; }],
  [/^Your coaching ends in (\d+) days$/, function (m) { return "اشتراكك مع الكابتن بيخلص بعد " + m[1] + " أيام"; }],
  [/^Paid until (.+)$/, function (m) { return "مدفوع لحد " + arDate(m[1]); }],
  [/^Recorded (.+)$/, function (m) { return "اتسجّلت " + arDate(m[1]); }],
  [/^(\d+) days?: (.+) to (.+)$/, function (m) { return (m[1] === "1" ? "يوم واحد" : m[1] + " أيام") + ": " + arDate(m[2]) + " لحد " + arDate(m[3]); }],
  [/^((?:Sun|Mon|Tue|Wed|Thu|Fri|Sat) \d{1,2} \w{3}) to ((?:Sun|Mon|Tue|Wed|Thu|Fri|Sat) \d{1,2} \w{3})$/, function (m) { return arDate(m[1]) + " لحد " + arDate(m[2]); }],
  [/^This one starts the day after their last paid day, (.+)\.$/, function (m) { return "الدفعة دي بتبدأ من اليوم اللي بعد آخر يوم مدفوع، " + arDate(m[1]) + "."; }],
  [/^You see what they logged until (.+)\. Record a payment to see the rest and send them programs, meal plans and comments\.$/,
    function (m) { return "بتشوف اللي سجّله لحد " + arDate(m[1]) + ". سجّل دفعة عشان تشوف الباقي وتبعتله برامج ونظام أكل وتعليقات."; }],
  [/^Your coaching ended on (.+)\. Your coach sees what you logged until then\.$/, function (m) { return "اشتراكك مع الكابتن خلص يوم " + arDate(m[1]) + "، والكابتن بيشوف اللي سجّلته لحد اليوم ده."; }],
  // progress photos: a pose or before/after, then a day and weight
  [/^Add another check-in with a (front|side|back) photo to compare\.$/, function (m) { return "أضف قياسًا آخر بصورة " + AR_POSE[m[1]] + " للمقارنة."; }],
  [/^(Front|Side|Back) photo, (.+)$/, function (m) { return "صورة " + AR_POSE[m[1]] + "، " + T(m[2]); }],
  [/^(Front|Side|Back|Before|After), (.+)$/, function (m) { return AR_POSE[m[1]] + "، " + T(m[2]); }],
  // comments: counts, and sentences that carry a client's name
  [/^(\d+) new comments from your coach$/, function (m) { return "تعليقات جديدة من الكابتن: " + m[1]; }],
  [/^(\d+) new comments$/, function (m) { return "تعليقات جديدة: " + m[1]; }],
  [/^(\d+) comments$/, function (m) { return "التعليقات: " + m[1]; }],
  [/^(\d+) new$/, function (m) { return m[1] + " جديد"; }],
  [/^Write to (.+)…$/, function (m) { return "اكتب لـ" + m[1] + "…"; }],
  [/^Comment for (.+)$/, function (m) { return "تعليق لـ" + m[1]; }],
  [/^No comments yet\. Write to (.+) about anything: a workout, their meals or a check-in\. Comments on a workout, a day of meals or a check-in show up here too\.$/,
    function (m) { return "لا تعليقات بعد. اكتب لـ" + m[1] + " عن أي شيء: تمرين أو وجباته أو قياس. والتعليقات على تمرين أو يوم أكل أو قياس تظهر هنا أيضًا."; }],
  // sentences that carry a program name ("My Split: Push / Pull …") go first, before the name patterns below
  [/^What they follow now: (.+)$/, function (m) { return "ما يتبعه الآن: " + T(m[1]); }],
  [/^No program from you yet\. They follow (.+) in the app\.$/, function (m) { return "لا يوجد برنامج منك بعد. يتبع " + T(m[1]) + " في التطبيق."; }],
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
  // the muscle map's note early in the week ("So far: Below target: … · On track: …")
  [/^So far: (.+)$/, function (m) { return "حتى الآن: " + m[1].split(" · ").map(T).join(" · "); }],
  [/^On track: (.+?)( \+(\d+))?$/, function (m) { return "على المسار: " + m[1].split(", ").map(trWord).join("، ") + (m[3] ? " (+" + m[3] + ")" : ""); }],
  [/^High volume: (.+)$/, function (m) { return "حجم عالٍ: " + m[1].split(", ").map(trWord).join("، "); }],
  [/^Below target: ([^·]+)$/, function (m) { return "أقل من الهدف: " + m[1].replace(/([A-Za-z][A-Za-z /]+?) −(\d+)/g, function (_, n, v) { return trWord(n) + " −" + v; }).replace(/, /g, "، ").replace(/ sets/, " مجموعات").replace(/\(\+(\d+) more\)/, "(+$1 أخرى)"); }],
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
  // account and sync
  [/^From Coach (.+)$/, function (m) { return "من الكابتن " + m[1]; }],
  [/^You're now training with Coach (.+)$/, function (m) { return "أنت الآن تتمرن مع الكابتن " + m[1]; }],
  [/^New program from your coach: (.+)$/, function (m) { return "برنامج جديد من الكابتن: " + m[1]; }],
  [/^We sent a link to (.+)\.$/, function (m) { return "أرسلنا رابطًا إلى " + m[1] + "."; }],
  [/^We sent a reset link to (.+)\.$/, function (m) { return "أرسلنا رابط إعادة التعيين إلى " + m[1] + "."; }],
  [/^(\d+) workouts$/, function (m) { return "التمارين: " + m[1]; }],
  [/^(\d+) foods$/, function (m) { return "الأكلات: " + m[1]; }],
  [/^(\d+) check-ins$/, function (m) { return "القياسات: " + m[1]; }],
  [/^(\d+) days of habits$/, function (m) { return "أيام العادات: " + m[1]; }],
  [/^(\d+) changes waiting to upload$/, function (m) { return "تعديلات في انتظار الرفع: " + m[1]; }],
  [/^(\d+) items couldn't upload$/, function (m) { return "عناصر لم تُرفع: " + m[1]; }],
  [/^(\d+) items kept on this phone only$/, function (m) { return "عناصر على هذا الهاتف فقط: " + m[1]; }],
  [/^(\d+) changes aren't uploaded yet$/, function (m) { return "تعديلات لم تُرفع بعد: " + m[1]; }],
  [/^Last synced just now$/, function () { return "آخر مزامنة: الآن"; }],
  [/^Last synced (\d+) min ago$/, function (m) { return "آخر مزامنة منذ " + m[1] + " دقيقة"; }],
  [/^Last synced (\d+) h ago$/, function (m) { return "آخر مزامنة منذ " + m[1] + " ساعة"; }],
  [/^Last synced on (\d{4}-\d\d-\d\d)$/, function (m) { return "آخر مزامنة: " + arIso(m[1]); }],
  [/^Add this backup to your account\?/, function (m, s) {
    var n = s.match(/Backup: (\d+) workouts?, (\d+) check-ins?/);
    return "إضافة هذه النسخة إلى حسابك؟\n\nالنسخة: " + (n ? n[1] + " تمارين، " + n[2] + " قياسات" : "") + ".\n\nما في حسابك يبقى كما هو، وإذا كان العنصر نفسه في النسخة تُستخدم نسخته.";
  }],
  // coach dashboard
  [/^(\d+) clients need you today\.$/, function (m) { return "متدربون يحتاجونك اليوم: " + m[1] + "."; }],
  [/^Active (\d+) days ago$/, function (m) { return "نشِط منذ " + m[1] + " يوم"; }],
  [/^(\d+) of (\d+)$/, function (m) { return m[1] + " من " + m[2]; }],
  [/^of ([\d,]+) g$/, function (m) { return "من " + m[1] + " جم"; }],
  [/^([\d,]+) kcal$/, function (m) { return m[1] + " سعرة"; }],
  [/^of ([\d,]+) kcal$/, function (m) { return "من " + m[1] + " سعرة"; }],
  [/^([\d,]+) g protein$/, function (m) { return m[1] + " جم بروتين"; }],
  [/^of ([\d,]+) g protein$/, function (m) { return "من " + m[1] + " جم بروتين"; }],
  [/^([\d.]+) kcal, ([\d.]+) g protein$/, function (m) { return m[1] + " سعرة، " + m[2] + " جم بروتين"; }],
  [/^([▲▼] )?([\d.]+) kg in 2 weeks$/, function (m) { return (m[1] || "") + m[2] + " كجم في أسبوعين"; }],
  [/^No workout for (\d+) days$/, function (m) { return "بدون تمرين منذ " + m[1] + " يوم"; }],
  [/^No check-in for (\d+) days$/, function (m) { return "بدون قياس منذ " + m[1] + " يوم"; }],
  [/^(\d+) sets, ([\d,]+) kg volume$/, function (m) { return m[1] + " مجموعات، حجم " + m[2] + " كجم"; }],
  [/^Client since (.+)$/, function (m) { return "متدرب منذ " + arDate(m[1]); }],
  [/^You're signed in as (.+)\. Ask the app's owner to make this a coach account, then reload this page\.$/, function (m) { return "أنت مسجّل الدخول بحساب " + m[1] + ". اطلب من صاحب التطبيق أن يجعله حساب كابتن، ثم أعد تحميل الصفحة."; }],
  [/^Remove (.+) from your clients\? You'll stop seeing their log\. They can join you again with a new invite\.$/, function (m) { return "إزالة " + m[1] + " من متدربيك؟ لن ترى سجله بعد ذلك، ويمكنه الانضمام إليك مرة أخرى بدعوة جديدة."; }],
  [/^(.+) (paused|resumed)$/, function (m) { return m[1] + ": " + (m[2] === "paused" ? "تم الإيقاف المؤقت" : "تم الاستئناف"); }],
  [/^Private notes about (.+)$/, function (m) { return "ملاحظات خاصة عن " + m[1]; }],
  [/^Expires in (\d+) days$/, function (m) { return "ينتهي بعد " + m[1] + " أيام"; }],
  [/^Send to (.+)$/, function (m) { return "أرسله إلى " + m[1]; }],
  [/^Sent to (.+)$/, function (m) { return "تم الإرسال إلى " + m[1]; }],
  [/^Sent (\d.+)$/, function (m) { return "أُرسل " + arDate(m[1]); }],
  [/^Remove (.+) and its exercises\?$/, function (m) { return "حذف " + m[1] + " وتمارينه؟"; }],
  [/^(\d+) exercises$/, function (m) { return "التمارين: " + m[1]; }],
  [/^(\d+) meals$/, function (m) { return "الوجبات: " + m[1]; }],
  [/^([\d,]+) g carbs$/, function (m) { return m[1] + " جم كربوهيدرات"; }],
  [/^([\d,]+) g fat$/, function (m) { return m[1] + " جم دهون"; }],
  [/^Stop (.+) for (.+)\? They go back to their own program\.$/, function (m) { return "إيقاف " + m[1] + " لـ " + m[2] + "؟ سيعود إلى برنامجه الخاص."; }],
  [/^Stop (.+) for (.+)\? Their own targets apply again\.$/, function (m) { return "إيقاف " + m[1] + " لـ " + m[2] + "؟ ستعود أهدافه الخاصة."; }],
  [/^Delete the template (.+)\? What you already sent to clients stays\.$/, function (m) { return "حذف القالب " + m[1] + "؟ ما أرسلته للمتدربين يبقى كما هو."; }],
  [/^Check the numbers for (.+)$/, function (m) { return "راجع الأرقام في " + m[1]; }],
  [/^Program from Coach (.+)$/, function (m) { return "برنامج من الكابتن " + m[1]; }],
  [/^New meal plan from your coach: (.+)$/, function (m) { return "نظام أكل جديد من الكابتن: " + m[1]; }],
  [/^Coach (.+)$/, function (m) { return "الكابتن " + m[1]; }],
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

var i18nObserver = null, I18N_ATTRS = ["placeholder", "aria-label", "title", "label", "alt"];
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
  if (n.getAttribute("translate") === "no") return;  // people's names, emails, codes
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
