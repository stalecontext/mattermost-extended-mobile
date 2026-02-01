"""
Constants, paths, and theme configuration for the Icon Manager.
"""

from pathlib import Path

# Project paths
PACKAGE_DIR = Path(__file__).parent.parent  # icon_manager/
TOOLS_DIR = PACKAGE_DIR.parent              # tools/
PROJECT_ROOT = TOOLS_DIR.parent             # mattermost-mobile/

# Icon directories
ANDROID_RES_DIR = PROJECT_ROOT / "android" / "app" / "src" / "main" / "res"
IOS_ASSETS_DIR = PROJECT_ROOT / "ios" / "Mattermost" / "Images.xcassets" / "AppIcon.appiconset"
ASSETS_ANDROID_DIR = PROJECT_ROOT / "assets" / "base" / "release" / "icons" / "android"
ASSETS_IOS_DIR = PROJECT_ROOT / "assets" / "base" / "release" / "icons" / "ios"

# Config file (in the same folder as main.py)
CONFIG_PATH = PACKAGE_DIR / "icon_manager_config.json"

# Android mipmap size mappings for legacy launcher icons (48dp base)
MIPMAP_SIZES = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}

# Android mipmap size mappings for adaptive icon layers (108dp base)
# Adaptive icons use 108dp with a 72dp safe zone; outer 18dp can be clipped
ADAPTIVE_ICON_SIZES = {
    "mipmap-mdpi": 108,
    "mipmap-hdpi": 162,
    "mipmap-xhdpi": 216,
    "mipmap-xxhdpi": 324,
    "mipmap-xxxhdpi": 432,
}

# Legacy Android icon files (use MIPMAP_SIZES)
ANDROID_LEGACY_ICONS = [
    "ic_launcher.png",
    "ic_launcher_round.png",
]

# Adaptive icon layers (use ADAPTIVE_ICON_SIZES)
ANDROID_ADAPTIVE_ICONS = [
    "ic_launcher_foreground.png",
    "ic_launcher_background.png",
]

# All Android icon files to process
ANDROID_ICON_FILES = ANDROID_LEGACY_ICONS + ANDROID_ADAPTIVE_ICONS

# Mattermost color palette
COLORS = {
    "background": "#F0F4F8",
    "surface": "#FFFFFF",
    "surface_alt": "#E8EEF4",
    "primary": "#1E325C",
    "primary_light": "#2389D7",
    "primary_hover": "#1C7AC0",
    "primary_pressed": "#166BB3",
    "text_primary": "#1E325C",
    "text_secondary": "#5D6E7E",
    "text_disabled": "#A0AEB8",
    "text_inverse": "#FFFFFF",
    "success": "#3DB887",
    "error": "#D24B4E",
    "warning": "#FFBC1F",
    "border": "#C4CDD6",
    "border_focus": "#2389D7",
    "row_alt": "#F7FAFC",
    "selected": "#E3F2FD",
    "checker_light": "#FFFFFF",
    "checker_dark": "#E0E0E0",
}


class Theme:
    """Qt stylesheet generator using Mattermost colors."""

    @staticmethod
    def get_stylesheet() -> str:
        return f"""
            QMainWindow, QWidget {{
                background-color: {COLORS['background']};
                color: {COLORS['text_primary']};
                font-family: "Segoe UI", "Open Sans", Arial, sans-serif;
                font-size: 10pt;
            }}
            QGroupBox {{
                background-color: {COLORS['surface']};
                border: 1px solid {COLORS['border']};
                border-radius: 8px;
                margin-top: 16px;
                padding: 16px;
                padding-top: 24px;
                font-weight: bold;
            }}
            QGroupBox::title {{
                subcontrol-origin: margin;
                subcontrol-position: top left;
                padding: 0 12px;
                color: {COLORS['text_primary']};
                font-weight: bold;
                font-size: 11pt;
            }}
            QPushButton {{
                background-color: {COLORS['primary']};
                color: {COLORS['text_inverse']};
                border: none;
                border-radius: 4px;
                padding: 8px 16px;
                font-weight: bold;
                min-height: 20px;
            }}
            QPushButton:hover {{ background-color: {COLORS['primary_light']}; }}
            QPushButton:pressed {{ background-color: {COLORS['primary_pressed']}; }}
            QPushButton:disabled {{ background-color: {COLORS['text_disabled']}; color: {COLORS['surface']}; }}
            QPushButton[secondary="true"] {{
                background-color: {COLORS['surface']};
                color: {COLORS['text_primary']};
                border: 1px solid {COLORS['border']};
            }}
            QPushButton[secondary="true"]:hover {{
                background-color: {COLORS['surface_alt']};
                border-color: {COLORS['primary_light']};
            }}
            QTableWidget {{
                background-color: {COLORS['surface']};
                alternate-background-color: {COLORS['row_alt']};
                border: 1px solid {COLORS['border']};
                border-radius: 6px;
                gridline-color: {COLORS['border']};
            }}
            QTableWidget::item {{ padding: 4px 8px; }}
            QTableWidget::item:selected {{ background-color: {COLORS['selected']}; color: {COLORS['text_primary']}; }}
            QHeaderView::section {{
                background-color: {COLORS['surface_alt']};
                color: {COLORS['text_primary']};
                padding: 8px 12px;
                border: none;
                border-right: 1px solid {COLORS['border']};
                border-bottom: 1px solid {COLORS['border']};
                font-weight: bold;
            }}
            QScrollBar:vertical {{
                background-color: {COLORS['surface']};
                width: 12px;
                border-radius: 6px;
            }}
            QScrollBar::handle:vertical {{
                background-color: {COLORS['border']};
                border-radius: 6px;
                min-height: 30px;
            }}
            QScrollBar::handle:vertical:hover {{ background-color: {COLORS['primary_light']}; }}
            QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {{ height: 0px; }}
            QLabel {{ background-color: transparent; }}
            QCheckBox {{ background-color: transparent; }}
            QCheckBox::indicator {{ width: 18px; height: 18px; }}
            QCheckBox::indicator:unchecked {{
                border: 2px solid {COLORS['border']};
                border-radius: 3px;
                background: {COLORS['surface']};
            }}
            QCheckBox::indicator:checked {{
                border: 2px solid {COLORS['primary_light']};
                border-radius: 3px;
                background: {COLORS['primary_light']};
            }}
        """
