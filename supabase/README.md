# قاعدة البيانات (Supabase)

ده الجزء الخاص بالحسابات والمزامنة ولوحة الكابتن. الخطة الكاملة في [docs/coach-plan.md](../docs/coach-plan.md).

| الملف | فيه إيه |
|---|---|
| `migrations/0001_coach_core.sql` | الجداول والصلاحيات (RLS) والدوال وتخزين الصور. **ده اللي بيتنفّذ على المشروع.** |
| `migrations/0002_delete_account.sql` | `delete_my_account()`: كل واحد يمسح حسابه وكل بياناته (المرحلة ١) |
| `migrations/0003_comments_push.sql` | التعليقات (إيصال القراية، وصندوق الكابتن)، واشتراكات الإشعارات، والإشعار اللي بيتبعت لكل حدث، وتذكير أيام التمرين (المرحلة ٤) |
| `migrations/0004_progress_photos.sql` | صور التقدّم: ٣ صور لكل قياس (`photos`)، وأسماء الملفات متشيّكة، والـ bucket بيقبل صور بس و٢ ميجا بالكتير (المرحلة ٥) |
| `functions/push/` | الـ Edge Function اللي بتشفّر الإشعار وتبعته (Web Push بـ VAPID). `index.ts` للنشر، والشغل في `handler.mjs` و`webpush.mjs` |
| `tests/rls.test.cjs` | اختبارات بتثبت كل قاعدة صلاحية على Postgres محلي |
| `tests/supabase_stub.sql` | نسخة مصغّرة من Supabase للاختبارات بس. **ماتنفذوش على المشروع الحقيقي** |

## المشروع الحقيقي

| | |
|---|---|
| الاسم | `gym-log` |
| الكود (ref) | `wacekcjwcvcawdptbgwv` |
| المنطقة | `eu-west-2` (London)، على الخطة المجانية (Free) |
| العنوان | `https://wacekcjwcvcawdptbgwv.supabase.co` |
| المفتاح العام | في [`js/config.js`](../js/config.js) |

اتعمل واتجهز يوم 2026-11-24 من خلال Supabase Management API:

- **`0001_coach_core.sql` اتطبق.** فيه ١٢ جدول كلهم عليهم RLS، و٣٢ قاعدة صلاحية، و٤ قواعد لصور التقدّم. `anon` مالوش أي صلاحية، ومخزن الصور خاص.
- **اختبار سريع على قاعدة البيانات الحقيقية** بـ ٣ مستخدمين وهميين، اتمسحوا بعد الاختبار، ونجح ٨ من ٨:
  - التسجيل بيعمل بروفايل.
  - الكود بيتستخدم مرة واحدة.
  - كلاينت تاني مايشوفش بيانات غيره، والكابتن بيشوفها.
  - الكلاينت مايغيّرش دوره.
  - الزائر مرفوض.
- **اختبار من بره بالمفتاح العام:**
  - قراية الجداول: رفض.
  - نداء `accept_invite` من غير حساب: رفض.
  - دوال `private`: مش ظاهرة.
  - مخزن الصور: فاضي.
- **`0002_delete_account.sql` اتطبق** (المرحلة ١). الدالة `security definer` و`search_path` ثابت، والزائر مايقدرش يناديها. اتجربت بمستخدم وهمي: الحساب وكل بياناته اتمسحوا.
- **اختبار المرحلة ١ من المتصفح** (Chromium، مقاس موبايل، بالعربي والإنجليزي) بحسابين وهميين اتمسحوا بعدها: تسجيل الدخول، ورفع بيانات موبايل قديم، والإضافة أونلاين وأوفلاين، والسحب من جهاز تاني، والانضمام لكابتن بكود، والكابتن بيقرا بيانات الكلاينت بتسجيل دخوله الحقيقي، وبرنامج الكابتن، وتسجيل الخروج والرجوع، ومسح الحساب. ٣٠ من ٣٠ نجحوا.
- **اختبار المرحلة ٢ (لوحة الكابتن)** على المشروع الحقيقي بكابتن و٥ كلاينتس وهميين اتمسحوا بعدها، و١٧ من ١٧ نجحوا:
  - ترتيب الكلاينتس والتنبيهات.
  - الملاحظات الخاصة بتتحفظ في `coach_notes`.
  - الإيقاف والاستئناف والإزالة.
  - كود دعوة جديد، وكلاينت جديد بينضم بيه من لينك الأبلكيشن ويظهر عند الكابتن، والكود بيبقى مستخدم.
  - سحب كود.
  - حساب كلاينت مايقدرش يفتح اللوحة.

  مفيش migration جديد، لأن صلاحيات `0001` كانت كفاية.
- **اختبار المرحلة ٣ (البرامج ونظام الأكل)** على المشروع الحقيقي بحسابات وهمية اتمسحت بعدها، و١١ من ١١ نجحوا:
  - برنامج اتكتب من «Upper / Lower» واتعدّل بمحرر الأيام والمكتبة، ووصل لقاعدة البيانات بالتعديل.
  - نظام أكل بأهداف و٣ وجبات، واتحفظ كقالب.
  - أبلكيشن الكلاينت استلم البرنامج نشط، والأهداف من نظام الأكل، والوجبات في تبويب الوجبات.
  - لما الكابتن عدّل البرنامج، الكلاينت شاف «الكابتن حدّث برنامجك».

  مفيش migration جديد هنا كمان.
- **المرحلة ٤ (التعليقات والإشعارات):**
  - **`0003_comments_push.sql` اتطبق.** شغّل `pg_net` و`pg_cron`، وعمل مهمة `gymlog-reminders` كل ١٥ دقيقة.
  - **الـ Edge Function `push` اتنشرت** من `functions/push` بالـ Management API (`POST /v1/projects/{ref}/functions/deploy`)، والـ JWT check مقفول لأن اللي بيناديها قاعدة البيانات بس، بسر مشترك.
  - **الـ secrets بتاعتها اتحطّت** (الأسماء بس هنا، القيم عمرها ما اتكتبت في ملف ولا شات): `PUSH_SECRET`، `VAPID_PUBLIC_KEY`، `VAPID_PRIVATE_KEY`، `VAPID_SUBJECT`. والمفتاح العام نسخته في `js/config.js`.
  - **في Vault اتحط سرّين** بتقراهم قاعدة البيانات: `push_url` (عنوان الـ function) و`push_secret` (نفس `PUSH_SECRET`). من غيرهم مفيش إشعار بيتبعت، وكل حاجة تانية شغالة عادي.
  - **الاختبار على المشروع الحقيقي** بكابتن وكلاينت وهميين اتمسحوا بعدها، و٣٢ من ٣٢ نجحوا:
    - التعليقات في الاتجاهين، وإيصال القراية، وتنبيه «ينتظر ردك».
    - تعليق اتكتب أوفلاين واترفع لوحده.
    - الإشعارات والتذكير لحد خدمة Google: المتصفح هنا مالوش خدمة إشعارات، فاتجرّب بعنوان FCM وهمي بمفاتيح حقيقية. Google ردّت إن العنوان مش موجود، والعنوان اتمسح لوحده.
    - العربي.
  - **اتجرّب كمان مباشرة:** تعليق من الكابتن، وبرنامج جديد، وصلوا للـ function ولـ Google.
  - **ملحوظة:** Supabase بقى مابيدّيش أدوار الـ API صلاحيات على الجداول الجديدة لوحده، فالـ migration بيدّي `service_role` (اللي الـ function بتستخدمه) القراءة والمسح على `push_subscriptions` بس.
- **المرحلة ٥ (صور التقدّم):**
  - **`0004_progress_photos.sql` اتطبق.**
  - **الاختبار على المشروع الحقيقي** بكابتن وكلاينت وهميين اتمسحوا بعدها، و٢٠ من ٢٠ نجحوا:
    - صور بحجم صور الكاميرا اتصغّرت على الموبايل لـ 1080 بكسل، واترفعت WebP في فولدر الكلاينت.
    - المقارنة بتتسحب بالصباع.
    - الكابتن شاف الصور بلينكات مؤقتة، ومقدرش يرفع حاجة في فولدر الكلاينت.
    - موبايل تاني للكلاينت جاب الصور واحتفظ بيها.
    - الـ bucket رفض ملف ٢٫٥ ميجا وملف مش صورة.
    - مسح قياس مسح صورته بعد دقيقة «تراجع».
    - العربي.
    - مسح الحساب من الأبلكيشن مسح كل الصور من Storage.
- **إعدادات الدخول:**
  - Site URL هو `https://abohamada15423.github.io/gym-log/`.
  - Redirect URLs هي الموقع و`localhost:8000` و`localhost:8765`.
  - الدخول **بإيميل وباسورد** (٨ حروف على الأقل)، وتأكيد الإيميل شغال لكل حساب جديد.

> **حدود الإيميل في الخطة المجانية:** إيميل Supabase الافتراضي بيبعت **٢ إيميل في الساعة بس**، و**مابيسمحش بتعديل الرسايل**. يعني مانقدرش نضيف كود الدخول (`{{ .Token }}`)، والرسالة فيها لينك بس.
> ولو الكلاينت دوس على لينك في الإيميل على الآيفون، اللينك بيفتح في Safari مش في الأبلكيشن المتثبّت.
> علشان كده اخترنا **الإيميل والباسورد** للمرحلة ١. ولو احتجنا كود في الإيميل، أو أكتر من ٢ تسجيل في الساعة، نربط خدمة إيميل (SMTP) زي Resend أو Brevo.

---

## تجهيز المشروع (مرة واحدة)

### ١. اعمل المشروع
1. ادخل **supabase.com**، اعمل حساب (ينفع بحساب GitHub)، واضغط **New project**.
2. الاسم: `gym-log`.
3. **Database password:** اختار باسورد قوي واحفظه عندك في مكان آمن. **ماتبعتهوش لحد، ولا ليا.**
4. **Region:** اختار أقرب منطقة ليك، غالبًا **Central EU (Frankfurt)**.
5. الخطة المجانية (Free) كفاية دلوقتي.

### ٢. طبّق قاعدة البيانات
1. من القائمة الجانبية افتح **SQL Editor**، واضغط **New query**.
2. افتح الملف [`migrations/0001_coach_core.sql`](migrations/0001_coach_core.sql) من GitHub، واضغط زرار **Copy raw file**.
3. الصقه في الـ SQL Editor واضغط **Run**.
4. المفروض يظهر **Success. No rows returned**. لو ظهر خطأ، ابعتلي نصّه بالظبط.

### ٣. اعمل نفسك كابتن
1. من **Authentication**، ثم **Users**، اضغط **Add user** ثم **Create new user**. حط إيميلك وعلّم على **Auto Confirm User**.
2. ارجع للـ **SQL Editor** ونفّذ السطر ده بعد ما تحط إيميلك:
   ```sql
   update public.profiles set role = 'coach'
   where id = (select id from auth.users where email = 'YOUR_EMAIL');
   ```
   المفروض يقول **1 row affected**.

### ٤. إعدادات تسجيل الدخول
1. **Authentication**، ثم **Sign In / Providers**: اتأكد إن **Email** شغال.
2. **Authentication**، ثم **URL Configuration**:
   - **Site URL:** `https://abohamada15423.github.io/gym-log/`
   - **Redirect URLs:** ضيف `https://abohamada15423.github.io/gym-log/` و`http://localhost:8000/`
3. **Authentication**، ثم **Email Templates**، ثم **Magic Link**: ضيف السطر ده في الرسالة، عشان الكلاينت يقدر يكتب كود بدل ما يدوس على لينك. **في الخطة المجانية الخطوة دي محتاجة خدمة إيميل (SMTP) الأول**، لأن Supabase مابيسمحش بتعديل الرسايل مع الإيميل الافتراضي:
   ```html
   <p>Your code: <strong>{{ .Token }}</strong></p>
   ```

> **ملحوظة:** الإيميلات المجانية في Supabase محدودة جدًا (كام إيميل في الساعة) ومعمولة للتجربة بس. قبل ما تضيف كلاينتس حقيقيين لازم نربط خدمة إيميل (SMTP) زي Resend أو Brevo، وده موجود في خطوات المرحلة ١.

### ٥. ابعتلي الحاجتين دول
من **Project Settings**، ثم **API Keys** (أو **API** في المشاريع القديمة):
- **Project URL**، شكله `https://xxxx.supabase.co`
- **Publishable key** (`sb_publishable_...`)، أو **anon public key** في المشاريع القديمة

**دول عادي يتبعتوا في الشات ويتكتبوا في الكود**، لأن الصلاحيات (RLS) هي اللي بتحمي البيانات، مش المفتاح.

**ماتبعتش أبدًا** الـ **secret key** (`sb_secret_...`) ولا الـ **service_role key** ولا باسورد قاعدة البيانات. دول بيفتحوا كل حاجة.

---

## الاختبارات

```bash
npm run test:db
```

الاختبار بيشغّل Postgres مؤقت على الجهاز، ويطبّق الـ migration، ويجرّب كل قاعدة صلاحية بمستخدمين حقيقيين: كابتنين وكلاينتس وزوار من غير حساب. محتاج PostgreSQL 14 أو أحدث (`initdb` و`pg_ctl`). لو مش لاقيه، حط مكانه في `PG_BIN`. ولو Postgres مش موجود خالص، الاختبارات بتتخطّى برسالة.

What the tests prove (one test each):

- every public table has RLS on; `anon` has no table privileges and can't call any function
- every `security definer` function pins `search_path`
- signing up creates a client profile; nobody can change their own `role`
- only coaches create invites; a code works once (even after the account that used it is deleted), expires, and wrong/used/expired codes get one message; coaches can't join as clients; a client with a coach can't join another, the code stays unused, and the reply doesn't reveal whether the code was real
- clients see only their own data; their coach reads it; other clients and coaches see nothing; nobody (the coach included) writes someone else's data; no hard deletes
- last-write-wins on `modified_at`: an older edit that arrives later loses; a fast phone clock is clamped; replays change nothing; devices can't set `updated_at`
- habits are one row per day and settings one row per key, so two devices don't overwrite each other
- coach programs/meal plans: only the assigned client reads them; templates stay with the coach; nobody poses as a coach
- `coach_notes` are invisible to the client and other coaches
- comments: each person edits/deletes only their own; `read_at` only through `mark_comments_read`
- progress photos: own folder only, the coach can view, other buckets never break the check, the bucket is private
- pausing keeps access, leaving ends it, and only a new invite brings a coach back
- deleting an account removes its data

The suite was also checked against eleven deliberate breakages of the migration (anon access, missing `search_path`, coach editing client comments, writable `read_at`, editable `role`, older edits winning, re-activating archived links, reusable invites, invites reusable after account deletion, checking the code before the existing coach, coaches reading other folders). Each one made a test fail.

Phase 5 (`0004_progress_photos.sql`): a check-in holds up to three photos, named the way the app names them (another pose, a path out of the folder, someone else's folder or another file type is refused); the bucket takes photos up to 2 MB only and stays private.

Phase 4 (`0003_comments_push.sql`) adds seven more:

- push subscriptions: your own only; only the big push services' addresses; one browser can hold two accounts; at most 20 per account; the push function's role can find and delete them and nothing else
- a new comment is sent to the other side of the thread, in each browser's language, with the Vault secret; with no secret set, or nobody to tell, nothing is sent
- read receipts for chosen comments; the coach inbox counts unread comments and knows when the client has the last word
- a program or meal plan is announced once, and only when what the client follows changed; templates and retired plans say nothing
- training reminders: chosen days and time in the phone's time zone, once a day, never after a workout, never more than two hours late; an unknown time zone is skipped
- the helpers in `private` can't be called by anyone; the reminder job runs every 15 minutes; deleting an account removes its subscriptions

The local stand-ins for `pg_net`, Vault and `pg_cron` in `supabase_stub.sql` record what would be sent, so the tests read the exact notifications. These tests were checked against eleven deliberate breakages of `0003` (any https address accepted, subscriptions readable by everyone, no per-account limit, read receipts ignoring the ids, a comment sent back to its author, an unchanged plan announced again, a reminder after a workout, two reminders a day, helpers callable by users, the wrong "last word" in the inbox, the push function's role without its grant). Each one made a test fail.

## The push function

`functions/push` sends the notifications the database asks for. It holds no rules of its own: each request from the database (`private.push()`) is a list of jobs, one per browser, already written in that browser's language. It encrypts each one (RFC 8291) and signs the request (VAPID, RFC 8292) with WebCrypto only, then forgets browsers the push service says are gone. `tests/push.test.cjs` checks the encryption byte for byte against the worked example in RFC 8291.

To deploy it again after a change (needs a Supabase access token, through the session's credentials):

```bash
curl -X POST "https://api.supabase.com/v1/projects/wacekcjwcvcawdptbgwv/functions/deploy?slug=push" \
  -F 'metadata={"entrypoint_path":"index.ts","name":"push","verify_jwt":false};type=application/json' \
  -F 'file=@supabase/functions/push/index.ts;filename=index.ts' \
  -F 'file=@supabase/functions/push/handler.mjs;filename=handler.mjs' \
  -F 'file=@supabase/functions/push/webpush.mjs;filename=webpush.mjs'
```

Keep the VAPID keys as they are: browsers subscribe with the public key, so new keys mean everyone turns notifications on again.

## Changing the schema later

Add a new file, `migrations/0005_<what>.sql`. Don't edit a migration that already ran on the project. Add tests for any new rule to `tests/rls.test.cjs` and run `npm run test:db` before applying the file in the SQL editor.
