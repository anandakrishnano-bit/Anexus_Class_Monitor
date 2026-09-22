<#
.SYNOPSIS
    Anexus Class Manager - One-Liner Terminal Installer & Launcher
.DESCRIPTION
    Installs and launches Anexus Class Manager on Windows, or downloads the latest native Android APK directly from GitHub Releases.
.EXAMPLE
    irm https://raw.githubusercontent.com/anandakrishnano-bit/Anexus_Class_Monitor/main/install.ps1 | iex
#>

[CmdletBinding()]
param(
    [switch]$Android,
    [switch]$Desktop
)

$ErrorActionPreference = "Stop"
$RepoOwner = "anandakrishnano-bit"
$RepoName = "Anexus_Class_Monitor"
$RepoUrl = "https://github.com/$RepoOwner/$RepoName.git"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "            ANEXUS CLASS MANAGER - CLI INSTALLER            " -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

function Download-AndroidApk {
    Write-Host "[1/2] Fetching latest Android APK release from GitHub..." -ForegroundColor Yellow
    $ApiUrl = "https://api.github.com/repos/$RepoOwner/$RepoName/releases/latest"
    try {
        $Release = Invoke-RestMethod -Uri $ApiUrl -Headers @{ "User-Agent" = "Anexus-Installer" }
        $ApkAsset = $Release.assets | Where-Object { $_.name -like "*.apk" } | Select-Object -First 1
        
        if (-not $ApkAsset) {
            Write-Host "No APK asset found in the latest release. Downloading from fallback link..." -ForegroundColor Yellow
            $DownloadUrl = "https://github.com/$RepoOwner/$RepoName/releases/download/v1.0.7/anexus-class-manager.apk"
        } else {
            $DownloadUrl = $ApkAsset.browser_download_url
        }

        $DestPath = Join-Path ([Environment]::GetFolderPath("UserProfile")) "Downloads\Anexus_Class_Manager.apk"
        Write-Host "[2/2] Downloading APK to: $DestPath" -ForegroundColor Cyan
        Invoke-WebRequest -Uri $DownloadUrl -OutFile $DestPath -UseBasicParsing
        
        Write-Host ""
        Write-Host " SUCCESS: Android APK downloaded to:" -ForegroundColor Green
        Write-Host "   $DestPath" -ForegroundColor White
        Write-Host " Transfer this file to your Android phone or install via ADB: adb install `"$DestPath`"" -ForegroundColor Gray
    } catch {
        Write-Host "Error fetching release: $_" -ForegroundColor Red
    }
}

function Install-DesktopApp {
    $InstallDir = Join-Path ([Environment]::GetFolderPath("LocalApplicationData")) "AnexusClassManager"
    Write-Host "[1/4] Setting up Anexus Class Manager in: $InstallDir" -ForegroundColor Cyan

    if (-not (Test-Path $InstallDir)) {
        New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
    }

    if (Test-Path (Join-Path $InstallDir ".git")) {
        Write-Host "[2/4] Updating existing installation..." -ForegroundColor Yellow
        git -C $InstallDir pull --ff-only
    } else {
        Write-Host "[2/4] Cloning repository..." -ForegroundColor Yellow
        if (Get-Command git -ErrorAction SilentlyContinue) {
            git clone --depth=1 $RepoUrl $InstallDir
        } else {
            Write-Host "Git not found! Please install Git or Node.js to run the desktop client." -ForegroundColor Red
            return
        }
    }

    Push-Location $InstallDir
    try {
        Write-Host "[3/4] Installing dependencies & preparing app build..." -ForegroundColor Yellow
        npm install --silent
        npm run build --silent

        Write-Host "[4/4] Launching Anexus Class Manager Desktop App..." -ForegroundColor Green
        npm run desktop
    } finally {
        Pop-Location
    }
}

if ($Android) {
    Download-AndroidApk
} elseif ($Desktop) {
    Install-DesktopApp
} else {
    Write-Host "Select installation target:" -ForegroundColor White
    Write-Host "  [1] Download Android APK directly (Mobile)" -ForegroundColor Cyan
    Write-Host "  [2] Install & Launch Anexus Class Manager (Desktop App)" -ForegroundColor Green
    Write-Host ""
    $Choice = Read-Host "Enter option (1 or 2, default 1)"
    if ($Choice -eq "2") {
        Install-DesktopApp
    } else {
        Download-AndroidApk
    }
}
