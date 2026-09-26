# دليل نشر نظام إدارة البرامج الأسبوعية للمشرفين
## مديرية التربية والتعليم يطا - قسم الإشراف والتأهيل التربوي

يشرح هذا الدليل خطوة بخطوة كيفية نشر النظام على استضافة مجانية تدعم **ASP.NET Core** و **Microsoft SQL Server** مثل استضافة **Somee.com**، بالإضافة إلى النشر على خادم Windows Server محلي أو سحابي (IIS).

---

## 1. متطلبات النشر
1. بيئة تشغيل **ASP.NET Core 8 أو 10 Runtime**.
2. قاعدة بيانات **Microsoft SQL Server 2019 / 2022** أو **SQL Server Express**.
3. صلاحيات إدارة IIS أو لوحة تحكم الاستضافة (Somee Control Panel).
4. ملف سكربت قاعدة البيانات: `Database.sql`.
5. ملف الإعدادات: `web.config`.

---

## 2. خطوات النشر على استضافة Somee المجانية (Somee.com)

### الخطوة 1: إنشاء حساب مجاني
1. توجه إلى موقع [Somee.com](https://somee.com).
2. اضغط على **Register** وأدخل بياناتك الشخصية وبريدك الإلكتروني.
3. قم بتأكيد الحساب من خلال رابط التفعيل المرسل إلى بريدك الإلكتروني.

### الخطوة 2: إنشاء قاعدة بيانات MS SQL Server مجانية
1. من القائمة الجانبية في لوحة تحكم Somee، اختر **MS SQL** ثم اضغط على **Create Database**.
2. اختر الخطة المجانية (**Free Package**).
3. أدخل اسم قاعدة البيانات: `WeeklySupervisorProgramDb`.
4. حدد كلمة مرور قوية لمستخدم قاعدة البيانات `sa_user`.
5. احفظ بيانات الاتصال المعروضة:
   - **SQL Server Address / Host**: (مثال: `WeeklySupervisorProgramDb.mssql.somee.com`)
   - **Database Name**: `WeeklySupervisorProgramDb`
   - **User ID**: اسم المستخدم الممنوح لك.
   - **Password**: كلمة المرور التي اخترتها.

### الخطوة 3: تنفيذ سكربت قاعدة البيانات (Database.sql)
1. في لوحة تحكم Somee، انتقل إلى قاعدة البيانات التي أنشأتها، ثم اختر **SQL Commands** أو استخدم **SQL Server Management Studio (SSMS)** من جهازك بالاتصال بعنوان السيرفر.
2. افتح ملف `Database.sql` الموجود في جذر هذا المستودع.
3. انسخ محتويات الملف بالكامل والصقها في نافذة تنفيذ الأوامر، ثم اضغط **Execute**.
4. سيتم إنشاء جميع الجداول الـ 17، والعلاقات، والفهارس، وحساب مسؤول النظام الافتراضي، والأنشطة، والمدارس، والسنة الدراسية.

### الخطوة 4: تجهيز وحزم ملفات المشروع (Publish)
من سطر أوامر جهاز التطوير:
```bash
dotnet publish WeeklySupervisorProgram\WeeklySupervisorProgram.csproj -c Release -o ./publish
```
تأكد من وجود الملفات التالية داخل مجلد `publish`:
- `WeeklySupervisorProgram.dll`
- `web.config`
- `appsettings.json`
- ملفات الواجهة والـ wwwroot.

### الخطوة 5: ضبط Connection String في web.config أو appsettings.json
في مجلد النشر، عدّل `appsettings.json` أو ضع Connection String في لوحة Somee:
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=YOUR_SOMEE_SQL_HOST;Database=WeeklySupervisorProgramDb;User Id=YOUR_USER;Password=YOUR_PASSWORD;TrustServerCertificate=True;MultipleActiveResultSets=true;"
  }
}
```

### الخطوة 6: إنشاء الموقع ورفع الملفات
1. في لوحة Somee، اختر **Websites** ثم **Create Site**.
2. اختر اسم النطاق الفرعي المجاني (مثال: `yatta-supervisor.somee.com`).
3. اختر إصدار ASP.NET Core المتوافق (In-Process Hosting).
4. انتقل إلى **File Manager** الخاص بالموقع، واضغط على **Upload** لرفع ملف الأرشيف المضغوط (ZIP) الناتج من مجلد `publish`.
5. قم بفك الضغط في المجلد الرئيسي `public_html` أو الجذر.

### الخطوة 7: اختبار وتشغيل النظام
1. افتح الرابط: `http://yatta-supervisor.somee.com`.
2. ستظهر شاشة تسجيل الدخول الرسمية لمديرية التربية والتعليم يطا.
3. قم بتسجيل الدخول بالحساب الإداري:
   - **اسم المستخدم**: `admin`
   - **كلمة المرور الافتراضية**: `Admin@123456`
4. ادخل إلى **الملف الشخصي** وقم بتغيير كلمة المرور فوراً لتأمين النظام.

---

## 3. النشر باستخدام Docker / Docker Compose

إذا كنت تملك خادم خاص (VPS / Ubuntu / Windows Server):
```bash
# 1. نسخ المستودع
git clone https://github.com/your-org/WeeklySupervisorProgram.git
cd WeeklySupervisorProgram

# 2. تشغيل SQL Server مع تطبيق ASP.NET Core
docker-compose up -d --build
```
سيعمل النظام على المنفذ: `http://localhost:5000`.

---

## 4. الفحص والتحقق بعد النشر (Smoke Test Checklist)
- [x] شاشة تسجيل الدخول تعمل باللغة العربية مع حفظ الجلسة.
- [x] لوحة التحكم تظهر بطاقات الإحصاءات والرسوم البيانية الأربعة.
- [x] إضافة مشرف جديد تنشئ له حساب دخول في جدول Users تلقائياً.
- [x] المشرف يرى برامجه فقط ولا يرى برامج المشرفين الآخرين.
- [x] إرسال البرنامج يحوله إلى حالة "تم الإرسال" ويسجل الطابع الزمني `SubmittedAt`.
- [x] رئيس القسم يستطيع اعتماد البرنامج أو طلب تعديله مع إشعار فوري.
- [x] تقرير "المشرفون الذين لم يرسلوا" يظهر العداد التنازلي وزر إرسال التنبيه.
- [x] تصدير التقارير العشرة إلى Excel يعمل بالترميز العربي UTF-8 BOM بدون أي تشويه.
- [x] سجل العمليات (Audit Log) يوثق كافة التحركات مع التاريخ والتوقيت الفلسطيني.
