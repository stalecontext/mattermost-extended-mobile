#!/usr/bin/env python3
"""
Icon Manager Tool for Mattermost Mobile

A GUI tool to convert SVG files to PNG icons at various resolutions
for Android and iOS platforms.

Usage:
    cd tools/icon_manager
    python main.py
"""

import sys
from PyQt6.QtWidgets import QApplication

from core import Theme
from ui import IconManagerWindow


def main():
    """Launch the Icon Manager application."""
    app = QApplication(sys.argv)
    app.setStyle("Fusion")
    app.setStyleSheet(Theme.get_stylesheet())

    window = IconManagerWindow()
    window.show()

    sys.exit(app.exec())


if __name__ == "__main__":
    main()
