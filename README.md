# 💸 Splitzy — Expense Splitter App

> Split smart. Pay easy. Track effortlessly.

Splitzy is a production-quality React Native (Expo) mobile app that helps friend groups,
roommates, and travel buddies track shared expenses and settle up with minimal hassle.

---

## 📋 Table of Contents

1. [Tech Stack](#tech-stack)
2. [Features](#features)
3. [Project Structure](#project-structure)
4. [Setup Guide](#setup-guide)
5. [Supabase Backend](#supabase-backend)
6. [Running the App](#running-the-app)
7. [Building APK (Android)](#building-apk-android)
8. [Design System](#design-system)
9. [CRUD Operations](#crud-operations)
10. [Troubleshooting](#troubleshooting)

---

## 🛠 Tech Stack

| Layer       | Technology                              |
|-------------|------------------------------------------|
| Frontend    | React Native (Expo SDK 52)              |
| Icons       | Lucide React Native                     |
| Navigation  | React Navigation v6 (Stack + Tabs)     |
| Backend     | Supabase (PostgreSQL + Auth + API)      |
| Auth        | Supabase Auth (email/password)          |
| Storage     | AsyncStorage (session persistence)      |
| Styling     | StyleSheet + LinearGradient (Expo)      |
| Build       | EAS Build → APK / Android Studio        |

---

## ✨ Features

### 💰 Expense Management (CRUD)
- Create expenses with title, amount, category, date, notes
- Edit and delete expenses (by payer or group member)
- Assign who paid for each expense
- Support for equal or custom splits

### 👥 Group Management (CRUD)
- Create groups with emoji, name, description
- Add members by email (must be registered)
- Remove members, manage roles
- Delete groups (admin only)

### ⚖️ Split Logic
- **Equal split**: auto-divide amount among all members
- **Custom split**: manually set each person's share (validated to sum to total)
- Real-time balance calculation (who owes whom)
- Simplified debt settlement (minimize transactions)

### 📊 Summary Screen
- Per-member balance overview (paid vs owed)
- "Settle Up" tab showing minimum transactions to clear debts
- Category breakdown with spend % and progress bars

### 🏷️ Categories
Food, Transport, Accommodation, Entertainment, Shopping, Utilities, Health, Others

### 📱 10 Screens
1. Login
2. Signup
3. Home Dashboard (net balance, recent activity)
4. Group List
5. Group Detail (members, expenses, balance)
6. Create/Edit Group
7. Add Expense (3-step wizard)
8. Expense Detail
9. Summary (balances, settle up, categories)
10. Settings / Profile

---

## 📁 Project Structure

```
splitzy/
├── App.js                          # Root entry point
├── app.json                        # Expo config
├── package.json
├── patch.js                        # Windows node:sea path fix (auto-runs on npm start)
├── babel.config.js
├── .gitignore
├── docs/
│   ├── schema.sql                  # Supabase DB schema
│   └── README.md                   # This file
└── src/
    ├── config/
    │   ├── supabase.js             # Supabase client + constants
    │   └── theme.js                # Design tokens (colors, fonts, spacing)
    ├── context/
    │   └── AuthContext.js          # Global auth state + 5s timeout guard
    ├── navigation/
    │   └── AppNavigator.js         # Stack + Tab navigator (Lucide icons)
    ├── components/
    │   ├── UIComponents.js         # Buttons, inputs, cards, avatars
    │   └── Cards.js                # ExpenseCard, GroupCard, BalanceCard
    ├── screens/
    │   ├── auth/
    │   │   ├── LoginScreen.js
    │   │   └── SignupScreen.js
    │   ├── dashboard/
    │   │   └── HomeScreen.js
    │   ├── groups/
    │   │   ├── GroupListScreen.js
    │   │   ├── GroupDetailScreen.js
    │   │   └── CreateEditGroupScreen.js
    │   ├── expenses/
    │   │   ├── AddExpenseScreen.js   # 3-step wizard
    │   │   └── ExpenseDetailScreen.js
    │   ├── summary/
    │   │   └── SummaryScreen.js
    │   └── settings/
    │       └── SettingsScreen.js
    └── utils/
        └── splitCalculator.js        # Split math + debt simplification
```

---

## 🚀 Setup Guide

### Prerequisites
- Node.js 18 LTS — **required**. Node 20+ may cause issues with Expo SDK 52 on Windows.
  Download from [nodejs.org/en/download](https://nodejs.org/en/download)
- A [Supabase](https://supabase.com) account (free tier works)
- **Expo Go** app installed on your Android phone (SDK 52 version)

### Step 1 — Install dependencies

```bash
cd splitzy
npm install --legacy-peer-deps
```

> ⚠️ Always use `--legacy-peer-deps` to avoid peer dependency conflicts between React Native packages.

### Step 2 — Supabase Project Setup

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Copy your credentials from **Settings → API**:
   - **Project URL** → looks like `https://xxxxxxxx.supabase.co`
   - **anon / public key** → long JWT string (use the Legacy anon key tab)
3. Open **SQL Editor** → paste and run the full contents of `docs/schema.sql`
4. Verify tables exist under **Table Editor**

### Step 3 — Configure Credentials

Open `src/config/supabase.js` and replace the placeholders:

```js
const SUPABASE_URL      = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY_HERE';
```

> ⚠️ Do NOT use the REST API URL from the Integrations page. Use the plain project URL from Settings → API.

### Step 4 — Supabase Auth Settings

1. Go to **Authentication → Providers → Email**
2. Turn **OFF** "Confirm email" — required for development, otherwise signup will be rate-limited and blocked
3. Save changes

### Step 5 — Fix RLS on group_members (required)

The default schema may have recursive RLS policies on `group_members`. Run this in **SQL Editor** to fix:

```sql
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'group_members'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON group_members';
  END LOOP;
END $$;

CREATE POLICY "gm_select" ON group_members FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "gm_insert" ON group_members FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "gm_delete" ON group_members FOR DELETE USING (user_id = auth.uid());
```

### Step 6 — Add trigger for user profile creation

Run this in **SQL Editor** to auto-create user profiles on signup:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## ▶️ Running the App

### On Windows — use `npm start` (not `npx expo start`)

```bash
npm start
```

> This runs `patch.js` first to fix a Windows-specific Expo CLI bug where `node:sea` is used as a folder name (which Windows forbids due to the colon character). The patch is safe and only applies if not already patched.

### Connect your phone

1. Install **Expo Go** (SDK 52) on your Android phone
2. Make sure your phone and PC are on the **same WiFi network**
3. Scan the QR code shown in the terminal with Expo Go

---

## 📦 Building APK (Android)

### Option A: EAS Build (Recommended — no Android Studio needed)

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```

Download the APK from the link provided after the build finishes (~10 min).

### Option B: Local Build with Android Studio

```bash
# Generate native Android project
npx expo prebuild --platform android

# Open in Android Studio, then:
# Build → Generate Signed Bundle/APK → APK
```

---

## 🗃️ Supabase Backend

### Database Tables

| Table            | Purpose                                |
|------------------|----------------------------------------|
| `users`          | User profiles (linked to Supabase Auth)|
| `groups`         | Expense groups                         |
| `group_members`  | Many-to-many: users ↔ groups           |
| `expenses`       | Individual expenses                    |
| `expense_splits` | How each expense is split per user     |

### Row Level Security
All tables have RLS enabled. Users can only see and modify data from groups they belong to.

> ⚠️ The `group_members` table requires simplified RLS policies (see Setup Step 5). The default schema policies cause infinite recursion errors.

---

## 🎨 Design System

### Color Palette
| Role       | Colors                                      |
|------------|----------------------------------------------|
| Primary    | Purple `#9b59d0` → Blue `#3b82f6`           |
| Baby Pink  | `#ffadd0` (blush), `#ffc2d9` (light blush)  |
| Lavender   | `#f0d6ff`                                    |
| Danger     | Red `#dc2626` → Dark Red `#991b1b`          |
| Success    | Green `#16a34a`                              |
| Background | Dark `#130520` / Card `#25103d`             |

### Icons
All icons use **Lucide React Native** — clean, consistent stroke-based icons throughout the app.

---

## 🔄 CRUD Operations

### Expenses
| Operation | Screen               | Supabase Call |
|-----------|----------------------|---------------|
| Create    | AddExpenseScreen     | `insert` into `expenses` + `expense_splits` |
| Read      | HomeScreen, ExpenseDetailScreen | `select` with joins |
| Update    | AddExpenseScreen (edit mode) | `update` + re-create splits |
| Delete    | ExpenseDetailScreen  | `delete` splits first, then expense |

### Groups
| Operation | Screen                | Supabase Call |
|-----------|-----------------------|---------------|
| Create    | CreateEditGroupScreen | `insert` into `groups` + `group_members` |
| Read      | GroupListScreen, GroupDetailScreen | `select` with member joins |
| Update    | CreateEditGroupScreen (edit) | `update` group + sync members |
| Delete    | GroupDetailScreen     | `delete` splits → expenses → members → group |

---

## 🐛 Troubleshooting

### ❌ `node:sea` error on Windows when running `npx expo start`
Expo SDK 50–52 CLI has a bug on Windows where it tries to create a folder named `node:sea`, which Windows forbids (colons are illegal in folder names).

**Fix:** Always use `npm start` instead of `npx expo start`. The included `patch.js` automatically fixes the offending line in the Expo CLI before starting.

If you run `npm install` again, the patch gets overwritten. Just run `npm start` and it re-patches automatically.

---

### ❌ `ERESOLVE unable to resolve dependency tree` on npm install
Caused by peer dependency conflicts between Expo and React Native packages.

**Fix:** Always install with the `--legacy-peer-deps` flag:
```bash
npm install --legacy-peer-deps
```

---

### ❌ `rm -r node_modules` fails on Windows (path too long)
PowerShell's `rm` can't handle deeply nested paths in `node_modules`.

**Fix:** Use CMD instead:
```bash
cmd /c "rd /s /q node_modules"
```

---

### ❌ Project is incompatible with this version of Expo Go
Your Expo Go app version must match the project's SDK version.

**Fix:** Check which SDK version is in `package.json` (`"expo": "~52.0.0"`) and install the matching Expo Go:
- SDK 52: https://expo.dev/go?sdkVersion=52&platform=android&device=true

---

### ❌ `Signup Failed` — row-level security policy violation
The `users` table RLS is blocking the insert during signup.

**Fix:** Make sure the trigger from Setup Step 6 is installed. The trigger creates the user profile automatically via `SECURITY DEFINER` which bypasses RLS. The app's `signUp` function passes `full_name` through Supabase auth metadata so the trigger picks it up.

---

### ❌ `infinite recursion detected in policy for relation "group_members"`
The default RLS policies on `group_members` reference the same table they're protecting, causing infinite recursion.

**Fix:** Run the SQL from Setup Step 5 to drop all existing policies and replace them with simple `user_id = auth.uid()` checks.

---

### ❌ Email rate limit exceeded during testing
Supabase limits signup emails on the free tier.

**Fix:**
1. Disable "Confirm email" in **Authentication → Providers → Email**
2. Use `+` trick for test emails: `yourname+test1@gmail.com`, `yourname+test2@gmail.com` — each is treated as a unique address

---

### ❌ App stuck on "Starting Splitzy" loading screen
The auth session check is hanging, usually due to a network issue or Supabase misconfiguration.

**Fix:** The `AuthContext.js` includes a 5-second safety timeout that forces the app past the loading screen. If it keeps happening, verify your `SUPABASE_URL` and `SUPABASE_ANON_KEY` are correct in `src/config/supabase.js`.

---

### ❌ `Cannot read property 'map' of undefined` on Avatar
Happens when a user's `name` prop is empty or undefined, causing `charCodeAt(0)` to return `NaN`.

**Fix:** Already patched in `UIComponents.js` — the Avatar component now defaults to index `0` when the name is empty.

---

### ❌ Git LF/CRLF warnings on Windows
Git warns about line ending conversions in `node_modules` files.

**Fix:** These are harmless. To silence them permanently:
```bash
git config --global core.autocrlf false
```
Also make sure `node_modules/` is in your `.gitignore` so Git doesn't track it at all.

---

## 📚 Course Outcome Alignment

| CO   | Demonstrated By                                           |
|------|-----------------------------------------------------------|
| CO1  | React Native Expo approach, component-based architecture  |
| CO2  | Supabase Auth + PostgreSQL + RLS + Realtime integration   |
| CO3  | Working app: full CRUD, split logic, 10 screens, APK build|

---

## 👨‍💻 Built With

- [Expo](https://expo.dev) — React Native framework
- [Supabase](https://supabase.com) — Backend-as-a-Service
- [React Navigation](https://reactnavigation.org) — Navigation
- [Lucide React Native](https://lucide.dev) — Icons
- [expo-linear-gradient](https://docs.expo.dev/versions/latest/sdk/linear-gradient/) — Gradients

---

*Splitzy v1.0 — Built for CS Mobile Development Course*