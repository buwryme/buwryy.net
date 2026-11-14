#!/usr/bin/env bash
set -euo pipefail

APP_ID="net.buwryy.Netblog"
BIN_DIR="$HOME/.local/bin"
ICON_DIR="$HOME/.local/share/icons/hicolor/scalable/apps"
DESKTOP_DIR="$HOME/.local/share/applications"
METAINFO_DIR="$HOME/.local/share/metainfo"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

say() { printf '  → %s\n' "$*"; }
ok() { printf '  ✓ %s\n' "$*"; }
die() { printf '  ✗ %s\n' "$*" >&2; exit 1; }

cd "$SCRIPT_DIR"

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "missing $1 — install it first"
}

section() { printf '\n%s\n' "$*"; }

section "checking build dependencies"
need_cmd cargo
need_cmd pkg-config
need_cmd install

if ! pkg-config --exists gtk4 libadwaita-1 gtksourceview-5 webkitgtk-6.0; then
  cat >&2 <<'MSG'
  ✗ missing GTK development libraries.

  Install the GTK 4, libadwaita, GtkSourceView 5 and WebKitGTK 6 development packages:

    Arch:        sudo pacman -S gtk4 libadwaita gtksourceview5 webkitgtk-6.0
    Fedora:      sudo dnf install gtk4-devel libadwaita-devel gtksourceview5-devel webkitgtk6.0-devel
    Debian:      sudo apt install libgtk-4-dev libadwaita-1-dev libgtksourceview-5-dev libwebkitgtk-6.0-dev
    openSUSE:    sudo zypper install gtk4-devel libadwaita-devel gtksourceview5-devel webkit2gtk6.0-devel
MSG
  exit 1
fi
ok "GTK dependencies found"

if ! command -v gh >/dev/null 2>&1; then
  die "missing gh — install the GitHub CLI and run: gh auth login"
fi
if ! gh auth status >/dev/null 2>&1; then
  say "gh is installed but not signed in; run: gh auth login"
fi

section "building Netblog"
cargo build --release
ok "built target/release/netblog"

section "installing"
mkdir -p "$BIN_DIR" "$ICON_DIR" "$DESKTOP_DIR" "$METAINFO_DIR"
install -m 755 target/release/netblog "$BIN_DIR/netblog"
install -m 644 assets/netblog.svg "$ICON_DIR/$APP_ID.svg"
sed "s|@BINDIR@|$BIN_DIR|g" net.buwryy.Netblog.desktop > "$DESKTOP_DIR/$APP_ID.desktop"
install -m 644 net.buwryy.Netblog.metainfo.xml "$METAINFO_DIR/$APP_ID.metainfo.xml"
ok "binary, icon, desktop entry and metainfo installed"

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "$DESKTOP_DIR" >/dev/null 2>&1 || true
fi
if command -v gtk-update-icon-cache >/dev/null 2>&1; then
  gtk-update-icon-cache -f -t "$HOME/.local/share/icons/hicolor" >/dev/null 2>&1 || true
fi

printf '\nNetblog is installed.\n\n'
printf '  run:  %s\n' "$BIN_DIR/netblog"
if [[ ":$PATH:" != *":$BIN_DIR:"* ]]; then
  printf '  note: %s is not in PATH\n' "$BIN_DIR"
fi
