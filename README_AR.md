# DTDC GAMES — Android v2.0.0

تطبيق أندرويد واحد يجمع أحدث نسخ الألعاب الست:

1. **NEON RUSH** — سباق نيون سريع.
2. **ORBIT SMASH** — تصويب وجاذبية.
3. **PULSE ARENA** — مواجهة تنافسية.
4. **LAST LINE** — دفاع ساحلي.
5. **PUZZLE ODYSSEY** — عشرون لوحة متدرجة مع تحدي لاعبين.
6. **SKYLINE RUSH** — مطاردة دراجات محسّنة مع مطاردين ومراحل.

## أهم ما في البنية

- قائمة الألعاب Native وخفيفة؛ لا يتم إنشاء WebView في القائمة.
- اللعبة المفتوحة وحدها تعمل ضمن process مستقلة باسم `:game`.
- عند الخروج يتم إيقاف WebGL وWebAudio والمؤقتات وتدمير WebView بالكامل.
- يدعم اللمس، الكيبورد، ريموت Android، وقبضتين للاعبين.
- يوجد تحويل Native احتياطي من أزرار القبضة إلى Keyboard events.
- أوفلاين بالكامل ولا يطلب صلاحية الإنترنت.
- يمكن لتطبيق Display فتح القائمة أو فتح لعبة محددة مباشرة.

## التثبيت

```bash
adb install -r DTDC_GAMES_v2.0.0.apk
```

يمكن أيضاً نقل ملف APK إلى جهاز الشاشة وفتحه من مدير الملفات ثم السماح بالتثبيت من هذا المصدر.

## الربط مع Display

راجع الملف `DISPLAY_INTEGRATION_KOTLIN.txt`. معرّف التطبيق هو:

```text
com.dentalchain.games
```

## البناء من المصدر

يمكن فتح المشروع مباشرة في Android Studio، أو استخدام البناء المحلي الخفيف:

```bash
./build-local.sh /path/to/android-34/android.jar /path/to/build-tools/34.0.0
```

النتيجة تكون في:

```text
dist/DTDC_GAMES_v2.0.0.apk
```

## البناء من GitHub

المشروع يتضمن Workflow جاهزاً في:

```text
.github/workflows/build-apk.yml
```

بعد رفع محتويات هذا المجلد إلى جذر مستودع جديد باسم `DTDC-GAMES`، افتح تبويب **Actions** وشغّل **Build DTDC GAMES APK**. ستجد الناتج ضمن **Artifacts** باسم `DTDC-GAMES-APK`.

نسخة GitHub الناتجة هي Debug وموقعة تلقائياً بمفتاح Android التجريبي الخاص بعملية البناء. قبل النشر على Google Play يجب إنشاء مفتاح Release رسمي وحفظه بمكان آمن.

الترتيب المختصر:

1. أنشئ مستودعاً فارغاً جديداً من GitHub باسم `DTDC-GAMES`.
2. فك ضغط هذه الحزمة وارفع **محتوياتها** إلى جذر المستودع، وليس المجلد الخارجي.
3. ثبّت الرفع عبر `Commit changes`.
4. افتح `Actions` ثم `Build DTDC GAMES APK` واضغط `Run workflow`.
5. نزّل ملف `DTDC-GAMES-APK` من قسم `Artifacts`.
