# Anexus Class Manager

A simple and practical tool for students, class representatives, and teachers to track attendance, organize timetables, and export clean Excel reports.

Developed by [Anandakrishnan](https://github.com/anandakrishnano-bit).

[![Release](https://img.shields.io/github/v/release/anandakrishnano-bit/Anexus_Class_Monitor?color=7C3AED&label=Android%20APK)](https://github.com/anandakrishnano-bit/Anexus_Class_Monitor/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Android%20%7C%20Windows%20%7C%20macOS%20%7C%20Linux-black)](https://github.com/anandakrishnano-bit/Anexus_Class_Monitor/releases)

---

## Ways to Use

### 1. Web App (Instant Access)
Open and use the app directly in your browser without installing anything:
- **[Launch Web App](https://anandakrishnano-bit.github.io/Anexus_Class_Monitor/)**

### 2. Android App (APK)
Download and install the app on your Android phone:
- **[Download Latest APK](https://github.com/anandakrishnano-bit/Anexus_Class_Monitor/releases/latest)**

### 3. Desktop App (Terminal)
Run the app as a desktop window on your computer using a single command:

**Windows (PowerShell)**:
```powershell
irm https://raw.githubusercontent.com/anandakrishnano-bit/Anexus_Class_Monitor/main/install.ps1 | iex
```

**macOS / Linux (Terminal)**:
```bash
curl -fsSL https://raw.githubusercontent.com/anandakrishnano-bit/Anexus_Class_Monitor/main/install.sh | bash
```

Or run directly from the project directory:
```bash
npm run desktop
```

---

## What It Does

### Fast Attendance Marking
- Mark attendance for any period (Present, Absent, or On Duty).
- Remembers marked absentees across all periods during the day, so you can easily review or update later.
- Visual badges on period buttons show absentee counts at a glance.

### Clean Excel Reports
- Automatically creates neat, formatted Excel spreadsheets (.xlsx).
- Includes clear summaries showing total students, present count, absent list, and attendance percentage.
- Exports single-session sheets or full semester records.

### Automatic Email Reports
- Sends the attendance summary directly to designated teachers or coordinators after you finish marking.
- If you mark attendance without internet, reports are saved locally and sent as soon as you reconnect.
- Easily add or remove recipient email addresses from the Settings page.

### Live Class Notification on Android
- Shows a single notification on your phone with the active class subject and time remaining.
- Updates continuously on the lock screen and notification tray so you always know how much time is left in the period.
- Quick button to jump straight to attendance marking.

### Weekly Timetable
- View and manage your weekly schedule (days and period times).
- Clean, readable view designed to work smoothly on phones and computers.

### Works Offline
- All attendance records, student lists, and schedules are stored directly on your device.
- Does not require a constant internet connection to take attendance.
- Optional cloud sync is available for multi-device backup.

---

## Development Setup

To run or build the project from source:

1. Clone the repository:
```bash
git clone https://github.com/anandakrishnano-bit/Anexus_Class_Monitor.git
cd Anexus_Class_Monitor
```

2. Install dependencies:
```bash
npm install
```

3. Start the local server:
```bash
npm run dev
```

4. Build the application:
```bash
npm run build
```

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
