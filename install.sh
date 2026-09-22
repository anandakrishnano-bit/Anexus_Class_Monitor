#!/usr/bin/env bash
set -e

REPO_OWNER="anandakrishnano-bit"
REPO_NAME="Anexus_Class_Monitor"
REPO_URL="https://github.com/${REPO_OWNER}/${REPO_NAME}.git"

echo ""
echo "============================================================"
echo "            ANEXUS CLASS MANAGER - CLI INSTALLER            "
echo "============================================================"
echo ""

download_apk() {
    echo "[1/2] Fetching latest Android APK release from GitHub..."
    LATEST_API="https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest"
    DOWNLOAD_URL=$(curl -sSL "$LATEST_API" | grep -o 'https://[^"]*app-release.apk' | head -n 1 || true)

    if [ -z "$DOWNLOAD_URL" ]; then
        DOWNLOAD_URL="https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/download/v1.0.7/anexus-class-manager.apk"
    fi

    DEST="$HOME/Downloads/Anexus_Class_Manager.apk"
    mkdir -p "$HOME/Downloads"
    echo "[2/2] Downloading APK to: $DEST"
    curl -L "$DOWNLOAD_URL" -o "$DEST"

    echo ""
    echo " SUCCESS: Android APK downloaded to: $DEST"
    echo " Install via ADB: adb install \"$DEST\" or transfer to your Android device."
}

install_desktop() {
    INSTALL_DIR="$HOME/.anexus-class-manager"
    echo "[1/4] Setting up Anexus Class Manager in: $INSTALL_DIR"

    if [ -d "$INSTALL_DIR/.git" ]; then
        echo "[2/4] Updating repository..."
        git -C "$INSTALL_DIR" pull --ff-only
    else
        echo "[2/4] Cloning repository..."
        git clone --depth=1 "$REPO_URL" "$INSTALL_DIR"
    fi

    cd "$INSTALL_DIR"
    echo "[3/4] Installing dependencies & building..."
    npm install --silent
    npm run build --silent

    echo "[4/4] Launching Anexus Class Manager Desktop App..."
    npm run desktop
}

if [ "$1" = "--android" ]; then
    download_apk
elif [ "$1" = "--desktop" ]; then
    install_desktop
else
    echo "Choose installation option:"
    echo "  1) Download Android APK directly (Mobile)"
    echo "  2) Install & Launch Anexus Class Manager (Desktop App)"
    read -rp "Enter choice [1/2, default 1]: " choice
    if [ "$choice" = "2" ]; then
        install_desktop
    else
        download_apk
    fi
fi
