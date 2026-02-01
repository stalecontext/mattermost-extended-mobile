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
from pathlib import Path

# Add parent directory to path so we can import icon_manager as a package
package_dir = Path(__file__).parent
tools_dir = package_dir.parent
if str(tools_dir) not in sys.path:
    sys.path.insert(0, str(tools_dir))

# Now import from the package
from icon_manager.core import Theme
from icon_manager.ui import IconManagerWindow

from PyQt6.QtWidgets import QApplication


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
