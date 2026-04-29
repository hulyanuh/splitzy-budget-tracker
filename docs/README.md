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

| Layer       | Technology                         |
|-------------|-------------------------------------|
| Frontend    | React Native (Expo SDK 50)          |
| Navigation  | React Navigation v6 (Stack + Tabs)  |
| Backend     | Supabase (PostgreSQL + Auth + API)  |
| Auth        | Supabase Auth (email/password)      |
| Storage     | AsyncStorage (session persistence)  |
| Styling     | StyleSheet + LinearGradient (Expo)  |
| Build       | EAS Build → APK via Android Studio  |

---

## ✨ Features

### 💰 Expense Management (CRUD)
- Create expenses with title, amount, category, date, notes
- Edit and delete expenses (by payer or creator)
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

### 🔔 Decision UI
- ✅ **Accept button** (green gradient) — confirm expense
- ❌ **Decline button** (red gradient) — cancel/decline

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
├── babel.config.js
├── docs/
│   ├── schema.sql                  # Supabase DB schema
│   └── README.md                   # This file
└── src/
    ├── config/
    │   ├── supabase.js             # Supabase client + constants
    │   └── theme.js                # Design tokens (colors, fonts, spacing)
    ├── context/
    │   └── AuthContext.js          # Global auth state
    ├── navigation/
    │   └── AppNavigator.js         # Stack + Tab navigator
    ├── components/
    │   ├── UIComponents.js         # Buttons, inputs, cards, etc.
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
    │   │   └── SummaryScreen.js      # 3 tabs: balances/settle/categories
    │   └── settings/
    │       └── SettingsScreen.js
    └── utils/
        └── splitCalculator.js        # Split math + debt simplification
```

---

## 🚀 Setup Guide

### Prerequisites
- Node.js 18+ and npm/yarn
- Expo CLI: `npm install -g expo-cli`
- EAS CLI (for builds): `npm install -g eas-cli`
- A [Supabase](https://supabase.com) account (free tier works)
- Android Studio (for APK signing)

### Step 1 — Clone and Install

```bash
git clone https://github.com/your-username/splitzy.git
cd splitzy
npm install
```

### Step 2 — Supabase Project Setup

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Note your **Project URL** and **anon/public key** from:
   `Settings → API → Project URL / API Keys`
3. Open **SQL Editor** → **New Query**
4. Paste and run the full contents of `docs/schema.sql`
5. Verify tables exist in **Table Editor**

### Step 3 — Configure Credentials

Open `src/config/supabase.js` and replace:

```js
const SUPABASE_URL     = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY_HERE';
```

### Step 4 — Supabase Auth Settings

In Supabase dashboard → **Authentication → Settings**:
- Disable email confirmation for development (optional but easier)
- Enable **email/password** sign-in provider

---

## ▶️ Running the App

```bash
# Start Expo dev server
npx expo start

# Run on Android (emulator or device)
npx expo start --android

# Run on iOS simulator
npx expo start --ios
```

Scan QR code with **Expo Go** app on your phone for instant testing.

---

## 📦 Building APK (Android Studio)

### Option A: EAS Build (Recommended)

```bash
# Login to Expo account
eas login

# Configure EAS
eas build:configure

# Add to eas.json:
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}

# Build APK (uploads to Expo servers, ~10 min)
eas build --platform android --profile preview

# Download APK from the link provided
```

### Option B: Local Build with Android Studio

```bash
# Step 1: Generate native Android project
npx expo prebuild --platform android

# Step 2: Open in Android Studio
open android/

# Step 3: In Android Studio:
# Build → Generate Signed Bundle/APK → APK
# Follow keystore creation wizard
# APK saved to: android/app/build/outputs/apk/release/

# Step 4: Install on device
adb install android/app/build/outputs/apk/release/app-release.apk
```

### Keystore (for signing)

```bash
keytool -genkey -v \
  -keystore splitzy-release.jks \
  -alias splitzy \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
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

### Key Relationships

```
users ──< group_members >── groups
groups ──< expenses >── expense_splits >── users
expenses.paid_by → users.id
```

### Row Level Security
All tables have RLS enabled. Users can only see/modify data from groups they belong to.

### Real-time
Expenses and splits publish to Supabase Realtime for live updates.

---

## 🎨 Design System

### Color Palette
| Role      | Colors                          |
|-----------|---------------------------------|
| Primary   | Purple `#7b1fa2` → Blue `#3b82f6` |
| Secondary | Pink `#ec4899` → Purple `#8b2fc9` |
| Accent    | Lavender `#bf94ff` → Pink `#f472b6` |
| Danger    | Red `#dc2626` → Dark Red `#991b1b` |
| Success   | Green `#16a34a`                 |
| Background| Dark `#0d0118` / Card `#1e0740` |

### Buttons
- **Primary (Gradient)**: `GradientButton` — purple→blue gradient
- **Secondary**: `GradientButton variant="secondary"` — pink→purple
- **Accept**: `AcceptButton` — green gradient, stands out clearly ✅
- **Decline**: `DeclineButton` — red gradient, danger action ❌
- **Outline**: `OutlineButton` — bordered, multiple variants

---

## 🔄 CRUD Operations

### Expenses
| Operation | Screen              | Supabase Call |
|-----------|---------------------|---------------|
| Create    | AddExpenseScreen    | `insert` into `expenses` + `expense_splits` |
| Read      | ExpenseListScreen, ExpenseDetailScreen | `select` with joins |
| Update    | AddExpenseScreen (edit mode) | `update` expense + re-create splits |
| Delete    | ExpenseDetailScreen | `delete` splits first, then expense |

### Groups
| Operation | Screen                | Supabase Call |
|-----------|-----------------------|---------------|
| Create    | CreateEditGroupScreen | `insert` into `groups` + `group_members` |
| Read      | GroupListScreen, GroupDetailScreen | `select` with member joins |
| Update    | CreateEditGroupScreen (edit) | `update` group + sync members |
| Delete    | GroupDetailScreen     | `delete` splits → expenses → members → group |

---

## 🐛 Troubleshooting

### "Invalid API key"
→ Double-check `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `src/config/supabase.js`

### "User not found" when adding member
→ They must sign up in Splitzy first. Email lookup uses the `users` table.

### Splits don't add up
→ In custom split mode, all amounts must sum exactly to the total. The UI shows a live validator.

### Build fails on Android
→ Make sure `local.properties` has correct `sdk.dir` path to Android SDK.

### RLS blocks reads
→ Confirm user is authenticated and is a member of the group being queried.

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
- [expo-linear-gradient](https://docs.expo.dev/versions/latest/sdk/linear-gradient/) — Gradients

---

*Splitzy v1.0 — Built for CS Mobile Development Course*
