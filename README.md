# OAP House Visiting List

**Production-Ready PWA** — Mobile App + Desktop Web Application

> Manage OAP house visits, customer records, monthly status, skip tracking, commission calculations, and reports — all in one secure, installable app.

---

## 🚀 SETUP GUIDE (Step by Step)

---

## STEP 1 — Create Supabase Project (FREE)

1. Go to **https://supabase.com** → Sign Up (free)
2. Click **"New Project"**
3. Fill in:
   - **Name**: `oap-visiting-list`
   - **Password**: Choose a strong password (save it somewhere safe)
   - **Region**: Choose closest to you (e.g. Southeast Asia)
4. Wait ~2 minutes for the project to be ready

---

## STEP 2 — Get Your API Keys

1. In your Supabase project → click **"Settings"** (gear icon, left sidebar)
2. Click **"API"**
3. Copy these two values:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **anon public key** — long JWT token starting with `eyJ...`

> ⚠️ **NEVER copy the `service_role` key** — keep that secret forever.

---

## STEP 3 — Configure the App

1. Open `c:\xampp\htdocs\OAP-Visiting-List\config.js`
2. Replace the placeholder values:

```js
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';   // ← paste your URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // ← paste anon key
```

3. Save the file.

---

## STEP 4 — Run the Database Schema

1. In Supabase → click **"SQL Editor"** (left sidebar)
2. Click **"New Query"**
3. Open `c:\xampp\htdocs\OAP-Visiting-List\database\schema.sql`
4. Copy the **entire contents** and paste into the SQL Editor
5. Click **"Run"** (or press F5)
6. You should see: `Success. No rows returned`

This creates all tables, RLS policies, triggers, and storage buckets.

---

## STEP 5 — Create Admin Account in Supabase

1. In Supabase → **"Authentication"** → **"Users"** → **"Invite User"**
2. Enter email: `admin@oap-visit.local` and password: `5566`
   - OR click **"Add User"** → **"Create new user"** and fill in the same
3. After creating, go to **SQL Editor** and run:

```sql
UPDATE public.profiles SET role = 'admin' WHERE email = 'admin@oap-visit.local';
```

This sets the admin role. You can now log in with:
- **Username**: `Admin`
- **Password**: `5566`

---

## STEP 6 — Test Locally

1. Open **XAMPP Control Panel** → Start **Apache**
2. Open browser → go to: **http://localhost/OAP-Visiting-List/**
3. You should see the welcome screen with Login/Signup buttons

---

## STEP 7 — Deploy to Vercel (FREE hosting)

### 7a. Push to GitHub

1. Create a **free GitHub account** at https://github.com
2. Create a **new repository** (name: `oap-visiting-list`)
3. Open **Git Bash** or PowerShell in `c:\xampp\htdocs\OAP-Visiting-List\`
4. Run:

```bash
git init
git add .
git commit -m "Initial OAP Visiting List app"
git remote add origin https://github.com/YOUR_USERNAME/oap-visiting-list.git
git push -u origin main
```

### 7b. Deploy on Vercel

1. Go to **https://vercel.com** → Sign up with GitHub (free)
2. Click **"New Project"** → Import your `oap-visiting-list` repo
3. Framework Preset: **Other**
4. Click **Deploy**
5. Wait ~1 minute → Your app is live at `https://oap-visiting-list.vercel.app`

### 7c. Update manifest.json for deployment

Once deployed, update `manifest.json` → change `start_url` and `scope`:

```json
"start_url": "/",
"scope": "/"
```

---

## STEP 8 — Add PWA Icons

Replace the placeholder icons in the `icons/` folder with real PNG files:
- `icon-72.png` (72×72)
- `icon-96.png` (96×96)
- `icon-128.png` (128×128)
- `icon-192.png` (192×192)
- `icon-512.png` (512×512)

Use any online tool like https://realfavicongenerator.net to generate from one image.

---

## 🔐 SECURITY CHECKLIST

Before going live, verify:

| Check | Status |
|-------|--------|
| ✅ No secrets in code | `config.js` has only anon public key |
| ✅ `.env` in `.gitignore` | `.gitignore` prevents secret file uploads |
| ✅ RLS enabled | All tables protected via Row Level Security |
| ✅ Auth protected | `requireAuth()` guards dashboard and admin |
| ✅ Input sanitized | `sanitize()` and `escapeHtml()` used everywhere |
| ✅ File validation | Image type/size validated before upload |
| ✅ Admin key not in code | Admin logs in via Supabase Auth, not hardcoded check |
| ✅ HTTPS | Vercel/Netlify enforce HTTPS automatically |

---

## 🚫 FILES YOU MUST NOT UPLOAD TO GITHUB

| File | Why |
|------|-----|
| `.env` | Contains secrets — but this app doesn't use one |
| `config.local.js` | If you ever create a local override |
| `*.apk` | APK files are uploaded via admin panel to Supabase Storage |
| `node_modules/` | If you ever install npm packages |
| `database/backup_*.sql` | If you export Supabase data locally |

> **config.js IS safe to upload** — it only contains the public anon key.

---

## 📱 HOW TO INSTALL AS MOBILE APP

### Android
1. Open the deployed URL in **Chrome**
2. Tap the **"Download App"** button → or tap Chrome menu (⋮) → **"Add to Home Screen"**
3. Tap **"Install"**
4. The app icon appears on your home screen — tap it to open full-screen

### iOS (iPhone/iPad)
1. Open the URL in **Safari**
2. Tap the **Share** button (box with arrow)
3. Scroll down → tap **"Add to Home Screen"**
4. Tap **"Add"**

---

## 📋 APP FEATURES SUMMARY

| Feature | Status |
|---------|--------|
| Login / Signup / Forgot Password | ✅ |
| Admin Login (Admin/5566) | ✅ |
| Security Questions (3 Q&A) | ✅ |
| Dark / Light Theme | ✅ |
| Customer CRUD | ✅ |
| Monthly Status (Done/Undone) | ✅ |
| Skip / Unskip + Carry Forward | ✅ |
| Commission Calculation | ✅ |
| Done Popup (Chance Multiplier) | ✅ |
| Image Upload (4 slots) | ✅ |
| Import (CSV/Excel/HTML/Text) | ✅ |
| Export (CSV/Excel/PDF/HTML/Text) | ✅ |
| Admin Panel (6 tabs) | ✅ |
| APK Upload & Version Management | ✅ |
| QR Code for Desktop Download | ✅ |
| PWA (Installable) | ✅ |
| Offline Support (App Shell) | ✅ |
| Row Level Security | ✅ |
| Soft Delete + Undo | ✅ |

---

## 🛠 TECH STACK

- **Frontend**: Vanilla HTML + CSS + JavaScript (no framework, no build required)
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Hosting**: Vercel / Netlify (free)
- **Libraries** (CDN, free):
  - Supabase JS v2
  - SheetJS (Excel)
  - jsPDF + AutoTable (PDF)
  - QRCode.js (QR codes)

---

## ❓ SUPPORT

If anything doesn't work after setup, check:
1. Supabase project URL and anon key are correct in `config.js`
2. SQL schema was run without errors
3. Admin user was created in Supabase Auth
4. RLS is enabled (visible in Supabase → Authentication → Policies)
