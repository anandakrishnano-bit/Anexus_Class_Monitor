# Anexus Class Manager

> A production-grade academic class management, attendance tracking, and timetable coordination platform for students, faculty representatives, and academic coordinators.

Developed by [Anandakrishnan](https://github.com/anandakrishnano-bit).

[![Release](https://img.shields.io/github/v/release/anandakrishnano-bit/Anexus_Class_Monitor?color=7C3AED&label=Android%20APK)](https://github.com/anandakrishnano-bit/Anexus_Class_Monitor/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Android%20%7C%20Windows%20%7C%20macOS%20%7C%20Linux-black)](https://github.com/anandakrishnano-bit/Anexus_Class_Monitor/releases)

---

## Download & Installation

### Option 1: Live Web App (Permanent — Instant Cloud Access)
Access the fully functional, permanent web app directly in any browser:
- **[Launch Live Web App](https://anandakrishnano-bit.github.io/Anexus_Class_Monitor/)**
- *Hosted 24/7 on GitHub Pages with complete offline IndexedDB support.*

---

### Option 2: Android (Native APK)
Download the pre-compiled APK directly to your smartphone:
- **[Download Latest APK from Releases](https://github.com/anandakrishnano-bit/Anexus_Class_Monitor/releases/latest)**
- Install on Android (supports Android 8.0 through Android 16).

---

### Option 3: Terminal One-Liner (Native Desktop App)

You can download and run the Anexus Class Manager as a standalone desktop app (no browser tabs, no localhost needed) directly via your terminal:

#### Windows (PowerShell)
Open PowerShell and run:
```powershell
irm https://raw.githubusercontent.com/anandakrishnano-bit/Anexus_Class_Monitor/main/install.ps1 | iex
```

#### macOS / Linux (Terminal)
Open Terminal and run:
```bash
curl -fsSL https://raw.githubusercontent.com/anandakrishnano-bit/Anexus_Class_Monitor/main/install.sh | bash
```

Alternatively, if you have already cloned the repository:
```bash
npm run desktop
```

---

## Key Features

### 1. Automated Attendance Excel Emailing & Instant Dispatch
- **Direct Dispatch**: When an attendance session is submitted, a color-coded, tabulated `.xlsx` spreadsheet is generated and immediately sent to designated recipient email addresses.
- **Offline Reliability Queue**: If taking attendance in a low-connectivity classroom or offline, the spreadsheet is securely queued locally in encrypted storage and dispatched automatically the instant internet connection is restored.
- **Recipient Management**: Enable/disable automated emailing and manage recipient lists anytime from Settings.

### 2. Tabulated & Structured Excel Reports
- Human-readable `.xlsx` reports featuring executive summary cards, KPI blocks (Attendance Rate, Total Present/Absent/OD), clean grid alignment, and visual status badges (`🟢 PRESENT`, `🔴 ABSENT`, `🟡 ON DUTY`).
- Includes both session-by-session breakdowns and comprehensive multi-sheet semester logs.

### 3. Android Native Foreground Live Class Activity
- Strictly **ONE** ongoing live notification for class activity with real-time `Chronometer` countdown ticking smoothly on the lock screen and status bar.
- Powered by a native Android Foreground Service (`LiveClassService`) preventing the OS from killing the background process when switching apps or locking the device.
- Task, exam, and homework reminders remain cleanly distinct and scheduled separately.
- One-tap "Take Attendance" quick action directly from the notification tray.

### 4. Cohesive Dynamic Palette & Smooth Phone UI
- Unified Material You tertiary accent styling (`var(--accent-tertiary)`) throughout the home dashboard.
- Smooth `cubic-bezier(0.16, 1, 0.3, 1)` transitions and responsive safe-area insets (`env(safe-area-inset-bottom)`) optimized for modern gesture-navigation smartphones.

### 5. Academic Schedule & Weekly Timetable Matrix
- Interactive weekly schedule matrix (6 days, up to 11 periods per day).
- Mobile-optimized responsive layout with Day Card view for smartphone screens.
- Conflict-protected slot configuration to eliminate accidental edits while scrolling.

### 6. 100% Offline-First Architecture
- Operates locally using client-side IndexedDB persistence (Dexie.js).
- Optional end-to-end Firebase cloud backup and synchronization for multi-device coordination.

---

## Architecture & Technology Stack

| Layer | Technology |
|---|---|
| **Core Framework** | React 18, TypeScript, Vite |
| **Local Database** | Dexie.js (Client-side IndexedDB) |
| **Styling & UI** | Vanilla CSS Design Tokens, Tailwind CSS, Lucide Icons |
| **Mobile Runtime** | Capacitor Android Native Shell (Java Foreground Service) |
| **Spreadsheet Engine** | SheetJS (Structured XML & Tabulated XLSX Generation) |
| **Cloud Layer (Optional)** | Firebase Cloud Firestore (REST API) |
| **AI Assistants** | Google Gemini API (v1beta/v1), Web-LLM Local Models |

---

## Privacy & Security

- **Zero Hardcoded Secrets**: All sensitive API keys, secrets, and credentials have been strictly audited and excluded from the repository.
- **No Third-Party Telemetry**: The application contains no analytics tracking, spyware, or telemetry SDKs.
- **Client-Side Encryption & Hashing**: Administrative authentication relies on browser SubtleCrypto SHA-256 digests.

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
