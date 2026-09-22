# Anexus Class Manager

> A production-grade academic class management, attendance tracking, and timetable coordination platform for students, faculty representatives, and academic coordinators.

Developed by [Anandakrishnan](https://github.com/anandakrishnano-bit).

---

## Overview

**Anexus Class Manager** is an offline-first academic management system built with modern web technologies and wrapped for native Android devices using Capacitor. Designed with an intentional monochromatic aesthetic accented by dynamic Material You tertiary colors, the platform allows class representatives and faculty to track attendance, organize weekly period schedules, monitor student eligibility thresholds, and export detailed institutional reports.

Core features operate 100% offline using client-side IndexedDB persistence, with optional Firebase cloud synchronization for multi-device classroom collaboration.

---

## Key Features

### 1. Attendance Tracking & Verification
- High-efficiency student attendance recording with tactile feedback.
- Support for Present, Absent, and On Duty (OD) status tags.
- Instant absentee summary formatting for institutional messaging.
- Automatic attendance deficit detector with customizable percentage thresholds.

### 2. Academic Schedule & Weekly Timetable Matrix
- Interactive weekly schedule matrix (6 days, up to 11 periods per day).
- Mobile-optimized responsive layout with Day Card view for smartphone screens.
- Customizable period timings, subject allocations, faculty assignments, and room numbers.
- Conflict-protected slot configuration to eliminate accidental edits while scrolling.

### 3. Android Native Live Class Notification
- Native Android ongoing notification featuring hardware-accelerated `Chronometer` countdown.
- Real-time progress bar reflecting elapsed class duration without waking the CPU or draining battery.
- One-tap "Take Attendance" shortcut directly from the notification tray.

### 4. Comprehensive Reporting & Data Export Hub
- Export complete multi-sheet workbooks (`.xlsx`) via Excel spreadsheet engines.
- Export clean comma-separated values (`.csv`) for individual or batch sessions.
- Detailed inspection modal for past attendance sessions (student rosters, absentee breakdowns, and timestamps).
- Print-optimized summary view for hard-copy submission.

### 5. In-App Administrative Diagnostics & Cloud Console
- Secure admin mode directly within the Settings portal, protected by SHA-256 passkey verification.
- Storage quota and disk space diagnostics powered by `navigator.storage.estimate()`.
- Real-time cloud collection inspector (Users & Classrooms) with selective record management.
- Cryptographically signed HMAC session validation with automatic 5-minute timeout security.

### 6. Battery-Efficient Background Engine & Hardware Alarms
- Android OS `RTC_WAKEUP` exact alarm scheduling via `SessionEndReceiver`: wakes only when a period ends, allowing the device to remain in deep sleep (Doze) during class.
- Smart foreground execution: halts polling threads when app is blurred or in the background for 0% CPU and GPU drain.
- In-app Firebase onboarding setup wizard: configure cloud sync securely at runtime without hardcoded keys.
- Next-Gen Google Gemini AI integration: support for Gemini 3.6 Flash and Gemini 3.8 Flash models.

---

## Architecture & Technology Stack

| Layer | Technology |
|---|---|
| **Core Framework** | React 18, TypeScript, Vite |
| **Local Database** | Dexie.js (Client-side IndexedDB) |
| **Styling & UI** | Tailwind CSS, Lucide Icons, Radix UI Primitives |
| **Mobile Runtime** | Capacitor Android Native Shell |
| **Cloud Layer (Optional)** | Firebase Cloud Firestore (REST API) |
| **AI Assistants** | Google Gemini API (v1beta/v1), Web-LLM Local Models |
| **Analytics & Data** | Recharts, SheetJS (XLSX) |

---

## Getting Started

### Prerequisites
- Node.js (v18.x or higher)
- npm (v9.x or higher)
- Android Studio / Android SDK (optional, for Android APK builds)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/anandakrishnano-bit/Anexus_Class_Monitor.git
   cd Anexus_Class_Monitor
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   *Note: Cloud synchronization is optional. If left unconfigured, the application runs entirely locally via IndexedDB or can be configured directly inside the first-launch setup wizard.*

4. Launch development server:
   ```bash
   npm run dev
   ```

5. Access the application in your browser at `http://localhost:5173`.

---

## Environment Configuration

Configuration variables are managed via Vite environment variables:

| Variable | Description | Default |
|---|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase Web API Key | `""` (Offline mode) |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain | `""` |
| `VITE_FIREBASE_PROJECT_ID` | Google Cloud / Firebase Project ID | `""` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Cloud Storage Bucket URL | `""` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Cloud Messaging Sender ID | `""` |
| `VITE_FIREBASE_APP_ID` | Firebase Application ID | `""` |
| `VITE_ADMIN_PASSKEY` | Passkey for Administrative Console | `admin123` |

Refer to [.env.example](.env.example) for a complete template.

---

## Building for Production

### Web Application
```bash
npm run build
```
The optimized production bundle will be output to the `dist/` directory.

### Android Application (Capacitor)
1. Build the web assets:
   ```bash
   npm run build
   ```

2. Sync assets with the native Android project:
   ```bash
   npx cap sync android
   ```

3. Open Android Studio to build and sign the APK:
   ```bash
   npx cap open android
   ```
   Or compile directly via Gradle:
   ```bash
   cd android && ./gradlew assembleDebug
   ```

---

## Privacy & Security

- **No Third-Party Telemetry**: The application does not embed analytics SDKs or track user identities.
- **Client-Side Encryption & Hashing**: Administrative authentication relies on browser SubtleCrypto SHA-256 digests.
- **Zero Hardcoded Secrets**: All sensitive API keys and endpoints are externalized into environment variables.

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
