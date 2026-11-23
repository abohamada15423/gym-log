# خطة: Gym Log للكابتن والكلاينتس

> الملف ده هو المرجع لأي شغل جاي. كل مرحلة ليها **برومبت جاهز** في آخر الملف.
> الشرح بالعربي، والتفاصيل التقنية (قاعدة البيانات، الصلاحيات، الملفات) بالإنجليزي عشان تبقى دقيقة في الكود.

---

## ١. الهدف

نحوّل الأبلكيشن من **شخص واحد على موبايل واحد** لـ **كابتن بيتابع تمارين وأكل الكلاينتس بتوعه**:

- **الكلاينت:** نفس الأبلكيشن الحالي. بيستلم البرنامج ونظام الأكل من الكابتن، وكل اللي بيسجّله بيوصل للكابتن أوتوماتيك، وبيشتغل أوفلاين في الجيم.
- **الكابتن:** لوحة متابعة فيها كل الكلاينتس، مين ملتزم ومين لأ، وبيكتب البرامج ونظام الأكل وبيعلّق.

**القرار:** هنبدأ بـ **كابتن واحد**، بس قاعدة البيانات هتتصمم من الأول بحيث تستحمل **أكتر من كابتن** بعدين من غير ما نعيد البناء. كل جدول فيه `coach_id` أو مربوط بيه.

---

## ٢. الوضع الحالي (نقطة البداية)

- واجهة بـ JavaScript عادي من غير build: `index.html` و`css/app.css` و`js/*.js` (ترتيب التحميل في README).
- مستضاف على GitHub Pages: `https://abohamada15423.github.io/gym-log/`
- كل البيانات في `localStorage` تحت المفتاح `gymlog-v1`، وشكلها `fresh()` في `js/core.js`:
  `sessions, body, food, drafts, baselines, habits, habitList, programId, custom, customLib, myFoods, setAdj, draftNotes, goals, lang, lastBackup…`
- الترجمة العربي في `js/i18n.js` (`AR_WORDS` و`AR_RULES`)، وكل نص جديد لازم يتضاف هناك.
- الاختبارات: `npm test` (‏jsdom + node:test) في `tests/workout.test.cjs`.
- التصميم: tokens في أول `css/app.css` (rubber / iron / chalk / lime)، من غير حروف كابيتال، ونفس قواعد الـ frontend-design.

---

## ٣. التقنية المختارة

| الحاجة | الاختيار | ليه |
|---|---|---|
| قاعدة بيانات + حسابات + صلاحيات + تخزين صور | **Supabase** (Postgres + Auth + RLS + Storage) | كله في مكان واحد، والخطة المجانية تكفي في البداية، وحوالي ٢٥ دولار في الشهر لما نكبر |
| الواجهة | تفضل JavaScript عادي على GitHub Pages | من غير ما نعيد كتابة الأبلكيشن |
| مكتبة Supabase | `@supabase/supabase-js` من CDN بإصدار ثابت | من غير build |
| تسجيل الدخول | إيميل بكود (OTP / magic link) | ببلاش. الـ SMS بفلوس، فنأجله |
| الإشعارات (مرحلة ٤) | Web Push + Supabase Edge Function | على الآيفون بيشتغل بس لو الأبلكيشن متضاف للشاشة الرئيسية |
| الدفع (مرحلة ٥) | Paymob أو Fawry | Stripe غالبًا مش متاح لحساب مصري |

**الأمان:** الـ `anon key` بتاع Supabase عادي يبقى جوّه الكود لأنه عام. اللي بيحمي البيانات هو **RLS** على كل جدول. أما الـ `service_role key` فممنوع يدخل الواجهة أو الريبو خالص.

---

## ٤. قاعدة البيانات (Schema)

### Conventions

- **Record tables** (everything a client logs, plus programs, meal plans and comments) get:
  `id uuid primary key` (created on the device with `crypto.randomUUID()`), `created_at timestamptz default now()`,
  `updated_at timestamptz` (set by a trigger on every write, used only as the pull cursor),
  `modified_at timestamptz` (set by the device when the user edits, used for last-write-wins), `deleted_at timestamptz` (soft delete).
- **Exceptions, on purpose:**
  - `profiles`: primary key `id = auth.users.id`.
  - `client_settings`: one row **per setting**, primary key `(client_id, key)`, so settings edited on two devices don't overwrite each other.
  - `habit_days`: primary key `(client_id, date)`, so two devices ticking habits on the same day update one row instead of colliding.
  - `coach_clients` and `coach_notes`: primary key `(coach_id, client_id)`.
  - `invites`: primary key `code`.
- SQL goes in `supabase/migrations/NNNN_name.sql`. Every `security definer` function has `set search_path = ''` and schema-qualified names (`public.x`, `auth.uid()`).

```text
profiles            id = auth.users.id, role ('coach'|'client'), full_name, phone, lang ('en'|'ar'), avatar_path
coach_clients       coach_id, client_id, status ('active'|'paused'|'archived'), started_at      pk(coach_id, client_id)
coach_notes         coach_id, client_id, body, updated_at                    pk(coach_id, client_id)  -- coach-only, never in a table the client can read
invites             code (pk, 10+ random base32 chars), coach_id, expires_at (default now() + 7 days), used_by, used_at

programs            id, coach_id, client_id (NULL = template), name, days jsonb  -- same shape as DAYS in js/data.js
                    active bool, starts_on date, modified_at, updated_at, deleted_at
meal_plans          id, coach_id, client_id (NULL = template), name, targets jsonb {kcal, protein, carbs, fat},
                    meals jsonb [{name, items[], kcal, p, c, f}], active bool, modified_at, updated_at, deleted_at

workout_sessions    id, client_id, date, day_id, day_name, program_id, sets jsonb {exercise: [[kg, reps], ...]},
                    notes jsonb, note text, modified_at, updated_at, deleted_at
food_logs           id, client_id, date, name, kcal, p, c, f, modified_at, updated_at, deleted_at
body_checkins       id, client_id, date, kg, waist, chest, arm, thigh, hips, fat, photo_path, note, modified_at, updated_at, deleted_at
habit_days          client_id, date, data jsonb, modified_at, updated_at, deleted_at            pk(client_id, date)
client_settings     client_id, key ('goals'|'habit_list'|'my_foods'|'custom_lib'|'baselines'|'custom_program'), value jsonb,
                    modified_at, updated_at                                      pk(client_id, key)

comments            id, client_id, author_id, target_type ('session'|'food_day'|'checkin'|'general'),
                    target_ref text (session id or date), body, read_at, created_at, updated_at, deleted_at
```

Storage: private bucket `progress`, path `{client_id}/{yyyy-mm-dd}-{uuid}.webp`. **Never make it public**: these are body photos.

### الصلاحيات (RLS)

**الكود الحقيقي في** [`supabase/migrations/0001_coach_core.sql`](../supabase/migrations/0001_coach_core.sql)، **والاختبارات اللي بتثبت كل قاعدة في** [`supabase/tests/rls.test.cjs`](../supabase/tests/rls.test.cjs). لو القسم ده اختلف مع الكود، الكود هو الصح.

القواعد باختصار:

- **RLS شغالة على كل جدول**، و`anon` (الزائر من غير حساب) مالوش أي صلاحية على أي جدول أو دالة.
- **الدوال المساعدة:** `is_coach_of` و`is_client_of` و`is_coach` و`can_read_progress_path` موجودة في schema اسمها `private`، والـ API مابيعرضهاش. كلها `security definer` و`search_path = ''`.
- **بيانات الكلاينت** (`workout_sessions`, `food_logs`, `body_checkins`, `habit_days`, `client_settings`):
  - الكلاينت يقرا ويضيف ويعدّل صفوفه بس.
  - الكابتن **يقرا بس**.
  - **مفيش مسح نهائي لحد:** المسح بـ `deleted_at` عشان يوصل لكل الأجهزة.
- **`programs` و `meal_plans`:**
  - الكابتن يكتب ويعدّل بتوعه.
  - الكلاينت يقرا **بس** اللي متخصص ليه.
  - القوالب (`client_id` فاضي) للكابتن بس.
  - محدش يقدر يعمل برنامج غير لو `role = 'coach'`، ولكلاينت بتاعه بس.
- **`comments`:**
  - الطرفين يقروا المحادثة.
  - كل واحد يكتب ويعدّل ويمسح (soft) **بتاعه بس**: التعديل مسموح بس على `body` و`deleted_at` بـ column grants.
  - `read_at` مايتغيرش غير من `mark_comments_read(client)`، وبتعلّم بس تعليقات الطرف التاني.
- **`coach_clients`:**
  - الطرفين يقروا الرابط.
  - الكابتن يغيّر الحالة (active / paused / archived) طول ما الرابط مش archived.
  - الكلاينت يقدر **يسيب** الكابتن (archived) بس.
  - الرابط اللي اتأرشف **مايرجعش غير بدعوة جديدة**، عشان الكابتن مايقدرش يرجّع لنفسه الصلاحية من غير موافقة.
  - كل كلاينت ليه كابتن واحد بس مش archived.
- **`coach_notes`:** الكابتن بس، وعن كلاينتس حاليين بس. جدول لوحده عشان الكلاينت يقرا `coach_clients`.
- **`profiles`:**
  - كل واحد يقرا ويعدّل بروفايله، **ماعدا `role`**.
  - الكابتن يقرا بروفايلات كلاينتسه.
  - الكلاينت يقرا بروفايل الكابتن بتاعه، عشان الاسم والصورة يظهروا في الهيدر.
  - الكابتن بيتعمل يدويًا من الـ SQL Editor (الخطوات في `supabase/README.md`).
- **الدعوات:**
  - بتتعمل بـ `create_invite(days)` بس، والكابتن بس هو اللي يقدر ينادي عليها.
  - مدتها من ١ لـ ٣٠ يوم.
  - الكود ١٢ حرف من ٣١ حرف مافيهمش الحروف اللي بتتلخبط زي 0/O و1/I/L، يعني حوالي ٥٩ bit.
  - الكابتن يشوف أكواده ويسحب اللي ماتستخدمتش.
- **`accept_invite(code)`:**
  1. لازم يكون فيه مستخدم مسجّل، ويرفض لو اللي بينادي كابتن.
  2. لو الكلاينت عنده كابتن حالي، يرفض **قبل ما يبص على الكود أصلًا**، عشان الرد مايكشفش إن كان الكود صح، والكود مايضيعش.
  3. يستخدم الكود **مرة واحدة** في خطوة واحدة (`update … where used_at is null and expires_at > now() returning coach_id`).
     `used_at` بيفضل موجود حتى لو الحساب اللي استخدم الكود اتمسح، فالكود مايرجعش يشتغل.
  4. الكود الغلط والمنتهي والمستخدم ليهم **رسالة واحدة** عشان الرد مايساعدش في التخمين.
  5. يعمل الرابط `active`. ولو كان archived، `started_at` يبدأ من جديد.
- **صور التقدّم** (`storage.objects`، bucket `progress` الخاص):
  - الكلاينت يضيف ويستبدل ويمسح في فولدره `{client_id}/` بس.
  - القراية لصاحب الصور وللكابتن بتاعه.
  - المقارنة بتتعمل كنص، عشان مسار في bucket تاني مش uuid مايكسرش أي استعلام.
  - العرض بـ signed URLs قصيرة العمر.

---

## ٥. المزامنة والأوفلاين

الجيم ساعات مفيهوش نت، فالقاعدة: **الموبايل يكتب محليًا الأول وبعدين يرفع.**

- `localStorage` يفضل نسخة محلية زي ما هو، ونضيف له:
  - `outbox`: قائمة تغييرات مستنية ترفع (upsert/delete لكل record بـ uuid).
  - `cursor`: لكل جدول، أكبر `updated_at` اتسحب، **من السيرفر مش من ساعة الموبايل**.
- أي record جديد ياخد `id` من نوع uuid من الموبايل (`crypto.randomUUID()`) بدل `uid()` الحالي.
- **الرفع:** لما النت يرجع، أو الأبلكيشن يتفتح، أو بعد كل حفظ لو فيه نت، الـ outbox يترفع بالترتيب.
- **السحب:** كل جدول يتسحب بـ `updated_at > cursor - interval '5 minutes'` (هامش تداخل)، والدمج بالـ `id` فالتكرار مالوش ضرر.
  الهامش ضروري: `updated_at` بيتحدد وقت **بداية** العملية في السيرفر، وممكن صف يتحفظ متأخر بقيمة أقدم من آخر cursor، ومن غير هامش مش هيتسحب أبدًا.
- **التعارض:** آخر تعديل يكسب (last-write-wins) حسب **`modified_at`**، وهو وقت التعديل على الجهاز، **مش** `updated_at` اللي هو وقت الرفع. كده تعديل اتعمل أوفلاين امبارح واترفع النهارده مايمسحش تعديل أحدث منه.
  الرفع بيبقى `upsert ... where excluded.modified_at > existing.modified_at` (RPC أو trigger)، والسحب بيدمج بنفس القاعدة.
- **الإعدادات** (الأهداف، العادات، أطعمتي…) بتتزامن **إعداد إعداد** (صف لكل `key` في `client_settings`)، فتعديل الأهداف على جهاز وإضافة أكلة على جهاز تاني مايمسحوش بعض.
- **المسح:** soft delete (`deleted_at`) عشان يوصل لكل الأجهزة.
- البرنامج ونظام الأكل من الكابتن بيتسحبوا ويبانوا كـ program اسمه «برنامج الكابتن» (`programId: "coach"`)، وأهداف الأكل بتيجي من `meal_plans.targets`.
- مؤشر حالة في الهيدر بدل «Saved ✓»: «اتحفظ أونلاين» / «أوفلاين، هيترفع لما النت يرجع».
- **أول تسجيل دخول:** نعرض «عندك X تمرين على الموبايل، ترفعهم لحسابك؟» ونرفع البيانات القديمة مرة واحدة.
- الكود: ملف جديد `js/sync.js` (أو `js/api.js` و`js/sync.js`) يتحمّل بعد `core.js`. والمنطق الحالي مايتلمسش غير في `save()` ومكان الإضافة والحذف.

---

## ٦. شاشات الكلاينت (تعديلات على الأبلكيشن الحالي)

1. **تسجيل الدخول:** إيميل، ثم كود، ثم الاسم أول مرة. وفيه «انضم لكابتن بكود».
2. **الهيدر:** حالة المزامنة، وصورة واسم الكابتن.
3. **التمرين:** لو فيه برنامج من الكابتن، يبقى هو النشط وتظهر جملة صغيرة «برنامج من كابتن X».
4. **الوجبات:** الأهداف من نظام الأكل، وتظهر وجبات الكابتن كـ «إضافة سريعة».
5. **رسايل الكابتن:** صندوق تعليقات، ونقطة لايم على الحاجة اللي عليها تعليق جديد.
6. **التقدّم:** رفع صورة تقدّم مع القياس (Storage).
7. **الإعدادات (Plan):** الحساب، وتصدير البيانات، ومسح الحساب، وسياسة الخصوصية.

---

## ٧. لوحة الكابتن (صفحة جديدة)

`coach.html` في نفس الريبو، بنفس الـ tokens والخطوط، ومعمولة للكمبيوتر والتابلت الأول وتشتغل على الموبايل كمان.

- **قائمة الكلاينتس**، صف لكل كلاينت:
  - آخر نشاط.
  - تمارين آخر ٧ أيام / المخطط ليها.
  - متوسط البروتين / الهدف.
  - اتجاه الوزن (سهم + رقم).
  - علامات تنبيه.
- **التنبيهات** (`flags`):
  - مااتمرنش من ٥ أيام أو أكتر.
  - البروتين أقل من ٨٠٪ من الهدف ٣ أيام ورا بعض.
  - الوزن عكس الهدف أسبوعين.
  - مافيش قياس من ١٤ يوم.
  - تعليق مااترديش عليه.
- **صفحة الكلاينت** (تابات):
  - **ملخص:** نفس كروت «هذا الأسبوع» والتقويم.
  - **التمارين:** السجل بالمجموعات والملاحظات.
  - **الأكل:** يوم بيوم مقابل الهدف.
  - **الجسم:** الرسوم والصور.
  - **البرنامج:** محرر، نعيد استخدام `openDayEditor` ومكتبة التمارين بالصور.
  - **نظام الأكل:** محرر الأهداف والوجبات.
  - **التعليقات.**
  - **ملاحظات خاصة.**
- **القوالب:** برامج وأنظمة أكل جاهزة، تتنسخ لأي كلاينت بضغطة.
- **دعوة كلاينت:** كود أو لينك `…/gym-log/?invite=CODE`.
- كل الحسابات (الالتزام، المتوسطات) تعيد استخدام الدوال الموجودة: `weekSummary` و`personalRecords` و`weekStreak`. ونطلعها لملف مشترك `js/stats.js` لو احتجنا.

---

## ٨. الخصوصية والقانون

- دي بيانات صحية. لازم موافقة صريحة عند التسجيل وصفحة **سياسة خصوصية** بالعربي والإنجليزي.
- الكلاينت يقدر **يصدّر بياناته** و**يمسح حسابه** (المسح يشيل البيانات والصور).
- قانون حماية البيانات الشخصية المصري (رقم ١٥١ لسنة ٢٠٢٠): لو هيتباع لناس، **استشر محامي** قبل الإطلاق.
- النسخ الاحتياطي: الخطة المجانية في Supabase مافيهاش استرجاع لنقطة زمنية، فنعمل تصدير دوري أو نرقّي للمدفوعة قبل ما الكلاينتس يزيدوا.

---

## ٩. الاختبارات

- الاختبارات الحالية (`npm test`) لازم تفضل شغالة. الـ sync يتعمل من خلال adapter نقدر نستبدله بـ mock في jsdom.
- اختبارات RLS بـ SQL (‏pgTAP أو سكريبت) على Supabase محلي (`supabase start`) أو مشروع تجريبي.
- اختبار end-to-end بـ Playwright: كلاينت يسجّل تمرين أوفلاين، ثم يرجع أونلاين، ثم الكابتن يشوفه.
- في جلسات Claude السحابية: الشبكة لازم تسمح بدومين المشروع `<project>.supabase.co`، والمفاتيح تتضاف كـ credential مش في الكود.

---

## ١٠. المراحل

كل مرحلة = PR منفصل، بيتختبر في المتصفح بالعربي والإنجليزي قبل الدمج.

| # | المرحلة | تبقى خلصت لما |
|---|---|---|
| ٠ | **تجهيز Supabase** | ✅ الـ SQL والاختبارات خلصوا (`supabase/`). ⏳ فاضل: المشروع يتعمل، والـ migration يتنفّذ عليه، و`js/config.js` ياخد الـ URL والـ publishable key |
| ١ | **الحسابات والمزامنة** | تسجيل دخول بالإيميل، والبيانات تترفع وتتسحب، والأوفلاين شغال، والبيانات القديمة اترفعت مرة واحدة، والاختبارات خضرا |
| ٢ | **لوحة الكابتن للمتابعة بس** | `coach.html`: قائمة الكلاينتس بالالتزام والتنبيهات، وصفحة كلاينت للقراية، ودعوة بكود |
| ٣ | **البرامج ونظام الأكل من الكابتن** | الكابتن يكتب أو ينسخ قالب، والكلاينت يستلمه ويبقى نشط عنده، وأهداف الوجبات من الخطة |
| ٤ | **التعليقات والإشعارات** | تعليقات على تمرين أو يوم أكل أو قياس، وإشعار Web Push، وتذكير بمواعيد التمرين |
| ٥ | **صور التقدّم** | رفع صورة مع القياس، ومقارنة قبل وبعد في الأبلكيشن وعند الكابتن |
| ٦ | **الاشتراكات (اختياري)** | دفع بـ Paymob، واشتراك الكلاينت يتقفل لو انتهى |
| ٧ | **منصّة لأكتر من كابتن (اختياري)** | تسجيل كباتن، وصفحة لكل كابتن باسمه ولوجو بتاعه، ولوحة أدمن |

---

## ١١. المطلوب منك (حاجات مقدرش أعملها أنا)

1. تعمل حساب على **supabase.com** ومشروع جديد. اختار منطقة قريبة: `eu-central-1` (Frankfurt) غالبًا الأقرب لمصر.
2. تبعتلي **Project URL** و **anon public key** من Settings ثم API. دول عادي يتكتبوا في الكود.
3. لو عايزني أنفّذ الـ migrations بنفسي: **Access Token** من Account ثم Access Tokens. ده **سرّي**، يتضاف من خانة الـ credentials في الجلسة **مش في الشات**. أو انت تنفّذ الـ SQL في SQL Editor بنفسك وأنا أقولك تعمل إيه.
4. قرارات مستنية منك:
   - اسم الأبلكيشن (لو هيتباع).
   - كابتن واحد بس ولا منصّة بعدين.
   - تسجيل بالإيميل كفاية ولا لازم رقم موبايل.

---

## ١٢. برومبتات جاهزة لكل مرحلة

انسخ البرومبت في جلسة جديدة على نفس الريبو.

**مرحلة ٠: تجهيز Supabase** (الـ SQL والاختبارات خلصوا، فاضل التطبيق على المشروع)
```
اقرا docs/coach-plan.md و supabase/README.md. عملت مشروع Supabase ونفّذت
supabase/migrations/0001_coach_core.sql في الـ SQL Editor. Project URL = <...>،
publishable key = <...>. اتأكد إن القاعدة شغالة على المشروع الحقيقي وكمّل المرحلة ١.
```

**مرحلة ١: الحسابات والمزامنة**
```
اقرا docs/coach-plan.md. نفّذ المرحلة ١: القسم ٥ كله، ومن القسم ٦ البنود ١ و٢ و٧ بس (مش القسم ٧ بتاع الكابتن):
تسجيل دخول بإيميل OTP، js/sync.js مع outbox وأوفلاين، رفع البيانات المحلية أول مرة،
ومؤشر المزامنة. خلّي npm test أخضر، اختبر في المتصفح بالعربي والإنجليزي، وافتح PR.
```

**مرحلة ٢: لوحة الكابتن (متابعة)**
```
اقرا docs/coach-plan.md. نفّذ المرحلة ٢: coach.html بنفس التصميم، قائمة الكلاينتس
بالالتزام والتنبيهات (القسم ٧)، صفحة كلاينت للقراية بس، ودعوة بكود. افتح PR.
```

**مرحلة ٣: البرامج ونظام الأكل**
```
اقرا docs/coach-plan.md. نفّذ المرحلة ٣: محرر البرنامج ونظام الأكل في لوحة الكابتن،
القوالب، وإن الكلاينت يستلمهم كبرنامج نشط وأهداف أكل. افتح PR.
```

**مرحلة ٤: التعليقات والإشعارات**
```
اقرا docs/coach-plan.md. نفّذ المرحلة ٤: التعليقات بين الكابتن والكلاينت،
Web Push بـ Edge Function، وتذكير بأيام التمرين. افتح PR.
```

**مرحلة ٥ وما بعدها:** نفس الشكل: «اقرا docs/coach-plan.md ونفّذ المرحلة N».

---

## ١٣. سجل القرارات

| التاريخ | القرار |
|---|---|
| 2026-11-06 | نبدأ بكابتن واحد، وقاعدة البيانات جاهزة لأكتر من كابتن |
| 2026-11-06 | Supabase للباك إند، والواجهة تفضل JavaScript عادي على GitHub Pages |
| 2026-11-06 | تسجيل الدخول بالإيميل (OTP) في الأول |
| 2026-11-06 | مراجعة الخطة: تعليقات كل واحد يعدّل بتاعه بس، صلاحيات للتخزين، سحب بهامش تداخل والتعارض بـ `modified_at`، `search_path` ثابت، ملاحظات الكابتن في جدول لوحده، الإعدادات صف لكل إعداد، وكود دعوة يتستخدم مرة واحدة |
| 2026-11-22 | المرحلة ٠ اتنفذت: migration واحد (`0001_coach_core.sql`) و٢١ اختبار على Postgres محلي، اتجربوا كمان ضد ٩ أعطال مقصودة |
| 2026-11-22 | `habit_days` مفتاحها `(client_id, date)` بدل `id`، عشان جهازين في نفس اليوم مايتخانقوش |
| 2026-11-22 | الدوال المساعدة في schema `private` مش معروضة في الـ API. الدعوات بتتعمل بـ `create_invite()` بس |
| 2026-11-22 | الكلاينت يقدر يسيب الكابتن، والرابط المتأرشف مايرجعش غير بدعوة جديدة. كابتن واحد بس لكل كلاينت في نفس الوقت |
| 2026-11-22 | مفيش مسح نهائي لبيانات الكلاينت، كله soft delete. ومسح الحساب نفسه بيشيل كل حاجة (`on delete cascade`) |
