# قاعدة البيانات (Supabase)

ده الجزء الخاص بالحسابات والمزامنة ولوحة الكابتن. الخطة الكاملة في [docs/coach-plan.md](../docs/coach-plan.md).

| الملف | فيه إيه |
|---|---|
| `migrations/0001_coach_core.sql` | الجداول والصلاحيات (RLS) والدوال وتخزين الصور. **ده اللي بيتنفّذ على المشروع.** |
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
- **إعدادات الدخول:**
  - Site URL هو `https://abohamada15423.github.io/gym-log/`.
  - Redirect URLs هي الموقع و`localhost:8000` و`localhost:8765`.

> **حدود الإيميل في الخطة المجانية:** إيميل Supabase الافتراضي بيبعت **٢ إيميل في الساعة بس**، و**مابيسمحش بتعديل الرسايل**. يعني مانقدرش نضيف كود الدخول (`{{ .Token }}`)، والرسالة فيها لينك بس.
> ولو الكلاينت دوس على لينك في الإيميل على الآيفون، اللينك بيفتح في Safari مش في الأبلكيشن المتثبّت.
> علشان كده المرحلة ١ لازم تختار طريقة دخول (القسم ١١ في الخطة):
> - **إيميل وباسورد** جوّه الأبلكيشن.
> - **أو** نربط خدمة إيميل (SMTP) زي Resend أو Brevo، وساعتها نقدر نبعت كود.

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

## Changing the schema later

Add a new file, `migrations/0002_<what>.sql`. Don't edit a migration that already ran on the project. Add tests for any new rule to `tests/rls.test.cjs` and run `npm run test:db` before applying the file in the SQL editor.
