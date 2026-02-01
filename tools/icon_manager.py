#!/usr/bin/env python3
"""
Icon Manager Tool for Mattermost Mobile
Converts SVG files to PNG icons at various resolutions for Android and iOS.
"""

import sys
import json
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional

from PyQt6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QPushButton, QLabel, QFileDialog, QTableWidget, QTableWidgetItem,
    QGroupBox, QMessageBox, QProgressDialog, QHeaderView,
    QAbstractItemView, QCheckBox, QMenu
)
from PyQt6.QtCore import Qt, QSize, QRectF
from PyQt6.QtGui import QPixmap, QImage, QPainter, QColor, QIcon, QAction
from PyQt6.QtSvg import QSvgRenderer

# Project paths relative to this script
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
ANDROID_RES_DIR = PROJECT_ROOT / "android" / "app" / "src" / "main" / "res"
IOS_ASSETS_DIR = PROJECT_ROOT / "ios" / "Mattermost" / "Images.xcassets" / "AppIcon.appiconset"
ASSETS_ANDROID_DIR = PROJECT_ROOT / "assets" / "base" / "release" / "icons" / "android"
ASSETS_IOS_DIR = PROJECT_ROOT / "assets" / "base" / "release" / "icons" / "ios"
CONFIG_PATH = SCRIPT_DIR / "icon_manager_config.json"

# ============================================================================
# Theme and Colors (Mattermost Blue)
# ============================================================================

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


# ============================================================================
# Data Classes
# ============================================================================

@dataclass
class IconBounds:
    """Bounding box of non-transparent content in an image."""
    x: int = 0
    y: int = 0
    width: int = 0
    height: int = 0
    image_width: int = 0
    image_height: int = 0

    @property
    def is_full(self) -> bool:
        return (self.x == 0 and self.y == 0 and
                self.width == self.image_width and self.height == self.image_height)

    @property
    def is_empty(self) -> bool:
        return self.width == 0 or self.height == 0


@dataclass
class IconTarget:
    """Represents a target icon file to generate."""
    name: str
    width: int
    height: int
    path: Path
    category: str
    bounds: Optional[IconBounds] = None
    override_path: Optional[Path] = None  # Can be SVG or PNG

    @property
    def rel_path(self) -> str:
        try:
            return str(self.path.relative_to(PROJECT_ROOT))
        except ValueError:
            return str(self.path)

    @property
    def override_is_png(self) -> bool:
        return self.override_path and self.override_path.suffix.lower() == '.png'


@dataclass
class Config:
    """Saved configuration with SVG/PNG overrides."""
    default_svg: Optional[str] = None
    overrides: dict[str, str] = field(default_factory=dict)  # rel_path -> override_path
    last_browse_dir: Optional[str] = None  # Remember last browsed folder

    def save(self, path: Path):
        data = {
            "default_svg": self.default_svg,
            "overrides": self.overrides,
            "last_browse_dir": self.last_browse_dir
        }
        with open(path, "w") as f:
            json.dump(data, f, indent=2)

    @classmethod
    def load(cls, path: Path) -> "Config":
        if not path.exists():
            return cls()
        try:
            with open(path) as f:
                data = json.load(f)
            return cls(
                default_svg=data.get("default_svg"),
                overrides=data.get("overrides", {}),
                last_browse_dir=data.get("last_browse_dir")
            )
        except (json.JSONDecodeError, KeyError):
            return cls()


# ============================================================================
# Image Utilities
# ============================================================================

def create_checkerboard(width: int, height: int, tile_size: int = 8) -> QPixmap:
    """Create a checkerboard pattern pixmap for transparency preview."""
    pixmap = QPixmap(width, height)
    painter = QPainter(pixmap)
    light = QColor(COLORS["checker_light"])
    dark = QColor(COLORS["checker_dark"])
    for y in range(0, height, tile_size):
        for x in range(0, width, tile_size):
            color = light if (x // tile_size + y // tile_size) % 2 == 0 else dark
            painter.fillRect(x, y, tile_size, tile_size, color)
    painter.end()
    return pixmap


def get_image_bounds(image: QImage) -> IconBounds:
    """Find the bounding box of non-transparent content in an image."""
    if image.isNull():
        return IconBounds()

    width = image.width()
    height = image.height()

    if image.format() != QImage.Format.Format_ARGB32:
        image = image.convertToFormat(QImage.Format.Format_ARGB32)

    min_x, min_y = width, height
    max_x, max_y = 0, 0

    for y in range(height):
        for x in range(width):
            pixel = image.pixel(x, y)
            alpha = (pixel >> 24) & 0xFF
            if alpha > 10:
                min_x = min(min_x, x)
                min_y = min(min_y, y)
                max_x = max(max_x, x)
                max_y = max(max_y, y)

    if max_x < min_x or max_y < min_y:
        return IconBounds(0, 0, width, height, width, height)

    return IconBounds(
        x=min_x, y=min_y,
        width=max_x - min_x + 1,
        height=max_y - min_y + 1,
        image_width=width, image_height=height
    )


def get_svg_content_bounds(renderer: QSvgRenderer, render_size: int = 512) -> IconBounds:
    """Render SVG and find the bounds of its visible content."""
    image = QImage(render_size, render_size, QImage.Format.Format_ARGB32)
    image.fill(Qt.GlobalColor.transparent)

    painter = QPainter(image)
    painter.setRenderHint(QPainter.RenderHint.Antialiasing)
    painter.setRenderHint(QPainter.RenderHint.SmoothPixmapTransform)
    renderer.render(painter, QRectF(0, 0, render_size, render_size))
    painter.end()

    return get_image_bounds(image)


def load_icon_preview(path: Path, size: int = 48) -> QPixmap:
    """Load an icon and create a preview with checkerboard background."""
    result = create_checkerboard(size, size, 6)
    icon = QImage(str(path))
    if icon.isNull():
        return result

    scaled = icon.scaled(size, size,
                         Qt.AspectRatioMode.KeepAspectRatio,
                         Qt.TransformationMode.SmoothTransformation)
    painter = QPainter(result)
    x = (size - scaled.width()) // 2
    y = (size - scaled.height()) // 2
    painter.drawImage(x, y, scaled)
    painter.end()
    return result


def render_png_to_bounds(source: QImage, target: IconTarget) -> QImage:
    """Render a PNG override into the target's content bounds."""
    image = QImage(target.width, target.height, QImage.Format.Format_ARGB32)
    image.fill(Qt.GlobalColor.transparent)

    if source.isNull():
        return image

    # Determine destination rect
    if target.bounds and not target.bounds.is_full:
        dest_rect = QRectF(target.bounds.x, target.bounds.y,
                           target.bounds.width, target.bounds.height)
    else:
        dest_rect = QRectF(0, 0, target.width, target.height)

    # Find source content bounds and crop
    source_bounds = get_image_bounds(source)
    if not source_bounds.is_full and not source_bounds.is_empty:
        # Crop to content
        cropped = source.copy(source_bounds.x, source_bounds.y,
                              source_bounds.width, source_bounds.height)
    else:
        cropped = source

    # Scale to fit dest_rect while maintaining aspect ratio
    scaled = cropped.scaled(int(dest_rect.width()), int(dest_rect.height()),
                            Qt.AspectRatioMode.KeepAspectRatio,
                            Qt.TransformationMode.SmoothTransformation)

    # Center in dest_rect
    offset_x = dest_rect.x() + (dest_rect.width() - scaled.width()) / 2
    offset_y = dest_rect.y() + (dest_rect.height() - scaled.height()) / 2

    painter = QPainter(image)
    painter.setRenderHint(QPainter.RenderHint.SmoothPixmapTransform)
    painter.drawImage(int(offset_x), int(offset_y), scaled)
    painter.end()

    return image


def render_svg_cropped(renderer: QSvgRenderer, target: IconTarget, svg_bounds: IconBounds) -> QImage:
    """
    Render SVG to target size, cropping SVG padding and positioning within target bounds.

    If the target has content bounds (e.g., adaptive icon foreground), the SVG content
    is rendered into that specific area. The SVG's own padding is cropped out.
    """
    image = QImage(target.width, target.height, QImage.Format.Format_ARGB32)
    image.fill(Qt.GlobalColor.transparent)

    painter = QPainter(image)
    painter.setRenderHint(QPainter.RenderHint.Antialiasing)
    painter.setRenderHint(QPainter.RenderHint.SmoothPixmapTransform)

    # Determine where to render in the target image
    if target.bounds and not target.bounds.is_full:
        # Target has specific content bounds (e.g., adaptive icon)
        dest_rect = QRectF(target.bounds.x, target.bounds.y,
                           target.bounds.width, target.bounds.height)
    else:
        # Full image
        dest_rect = QRectF(0, 0, target.width, target.height)

    # If SVG has padding, we need to render only the content portion
    if not svg_bounds.is_full and not svg_bounds.is_empty:
        # Calculate the normalized bounds within the SVG's viewBox
        # We rendered at a fixed size to detect bounds, now scale back to viewBox
        svg_size = renderer.defaultSize()
        if svg_size.isEmpty():
            svg_size = QSize(svg_bounds.image_width, svg_bounds.image_height)

        # Scale factors from render size to SVG viewBox
        scale_x = svg_size.width() / svg_bounds.image_width
        scale_y = svg_size.height() / svg_bounds.image_height

        # The content rect in SVG coordinates
        content_x = svg_bounds.x * scale_x
        content_y = svg_bounds.y * scale_y
        content_w = svg_bounds.width * scale_x
        content_h = svg_bounds.height * scale_y

        # Calculate scaling to fit content into dest_rect while maintaining aspect ratio
        scale = min(dest_rect.width() / content_w, dest_rect.height() / content_h)

        # Calculate the offset to center the content
        scaled_w = content_w * scale
        scaled_h = content_h * scale
        offset_x = dest_rect.x() + (dest_rect.width() - scaled_w) / 2
        offset_y = dest_rect.y() + (dest_rect.height() - scaled_h) / 2

        # Set up transform: translate to dest, scale, then translate to crop the content
        painter.translate(offset_x, offset_y)
        painter.scale(scale, scale)
        painter.translate(-content_x, -content_y)

        # Render the full SVG (the transform will crop/position it)
        renderer.render(painter, QRectF(0, 0, svg_size.width(), svg_size.height()))
    else:
        # No cropping needed, render directly to dest_rect
        renderer.render(painter, dest_rect)

    painter.end()
    return image


# ============================================================================
# Preview Widgets
# ============================================================================

class IconPreviewLabel(QLabel):
    """Label that displays an icon with checkerboard background."""

    def __init__(self, size: int = 96, parent=None):
        super().__init__(parent)
        self.preview_size = size
        self.setFixedSize(size, size)
        self.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self._set_placeholder()

    def _set_placeholder(self):
        self.setText("—")
        self.setStyleSheet(f"""
            QLabel {{
                background-color: {COLORS['surface_alt']};
                border: 1px solid {COLORS['border']};
                border-radius: 8px;
                color: {COLORS['text_disabled']};
                font-size: 24px;
            }}
        """)

    def set_image(self, path: Optional[Path] = None, image: Optional[QImage] = None):
        if path is None and image is None:
            self._set_placeholder()
            return

        bg = create_checkerboard(self.preview_size, self.preview_size, 8)
        img = QImage(str(path)) if path else image

        if img and not img.isNull():
            scaled = img.scaled(self.preview_size, self.preview_size,
                               Qt.AspectRatioMode.KeepAspectRatio,
                               Qt.TransformationMode.SmoothTransformation)
            painter = QPainter(bg)
            x = (self.preview_size - scaled.width()) // 2
            y = (self.preview_size - scaled.height()) // 2
            painter.drawImage(x, y, scaled)
            painter.end()

        self.setPixmap(bg)
        self.setStyleSheet(f"QLabel {{ border: 1px solid {COLORS['border']}; border-radius: 8px; }}")

    def set_svg(self, renderer: Optional[QSvgRenderer], bounds: Optional[IconBounds] = None):
        if renderer is None or not renderer.isValid():
            self._set_placeholder()
            return

        bg = create_checkerboard(self.preview_size, self.preview_size, 8)
        image = QImage(self.preview_size, self.preview_size, QImage.Format.Format_ARGB32)
        image.fill(Qt.GlobalColor.transparent)

        painter = QPainter(image)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)

        if bounds and not bounds.is_full and not bounds.is_empty:
            # Show cropped preview
            svg_size = renderer.defaultSize()
            if svg_size.isEmpty():
                svg_size = QSize(bounds.image_width, bounds.image_height)

            scale_x = svg_size.width() / bounds.image_width
            scale_y = svg_size.height() / bounds.image_height
            content_x = bounds.x * scale_x
            content_y = bounds.y * scale_y
            content_w = bounds.width * scale_x
            content_h = bounds.height * scale_y

            scale = min(self.preview_size / content_w, self.preview_size / content_h)
            scaled_w = content_w * scale
            scaled_h = content_h * scale
            offset_x = (self.preview_size - scaled_w) / 2
            offset_y = (self.preview_size - scaled_h) / 2

            painter.translate(offset_x, offset_y)
            painter.scale(scale, scale)
            painter.translate(-content_x, -content_y)
            renderer.render(painter, QRectF(0, 0, svg_size.width(), svg_size.height()))
        else:
            renderer.render(painter, QRectF(0, 0, self.preview_size, self.preview_size))

        painter.end()

        bg_painter = QPainter(bg)
        bg_painter.drawImage(0, 0, image)
        bg_painter.end()

        self.setPixmap(bg)
        self.setStyleSheet(f"QLabel {{ border: 1px solid {COLORS['border']}; border-radius: 8px; }}")


class ComparisonWidget(QGroupBox):
    """Widget showing before/after icon comparison."""

    def __init__(self, parent=None):
        super().__init__("Preview", parent)
        self.svg_renderer: Optional[QSvgRenderer] = None
        self.svg_bounds: Optional[IconBounds] = None
        self.current_target: Optional[IconTarget] = None

        layout = QVBoxLayout(self)
        layout.setSpacing(16)

        compare_layout = QHBoxLayout()
        compare_layout.setSpacing(16)

        # Current icon
        current_col = QVBoxLayout()
        current_col.setSpacing(4)
        current_label = QLabel("Current")
        current_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        current_label.setStyleSheet(f"color: {COLORS['text_secondary']}; font-size: 9pt;")
        self.current_preview = IconPreviewLabel(96)
        current_col.addWidget(current_label)
        current_col.addWidget(self.current_preview, alignment=Qt.AlignmentFlag.AlignCenter)
        compare_layout.addLayout(current_col)

        arrow = QLabel("→")
        arrow.setStyleSheet(f"font-size: 28px; color: {COLORS['text_disabled']};")
        arrow.setAlignment(Qt.AlignmentFlag.AlignCenter)
        compare_layout.addWidget(arrow)

        # New icon
        new_col = QVBoxLayout()
        new_col.setSpacing(4)
        new_label = QLabel("New")
        new_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        new_label.setStyleSheet(f"color: {COLORS['text_secondary']}; font-size: 9pt;")
        self.new_preview = IconPreviewLabel(96)
        new_col.addWidget(new_label)
        new_col.addWidget(self.new_preview, alignment=Qt.AlignmentFlag.AlignCenter)
        compare_layout.addLayout(new_col)

        layout.addLayout(compare_layout)

        self.info_label = QLabel("Select an icon to preview")
        self.info_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.info_label.setStyleSheet(f"color: {COLORS['text_secondary']}; font-size: 9pt;")
        self.info_label.setWordWrap(True)
        layout.addWidget(self.info_label)

        layout.addStretch()

    def set_svg(self, renderer: Optional[QSvgRenderer], bounds: Optional[IconBounds] = None):
        self.svg_renderer = renderer
        self.svg_bounds = bounds
        self._update_new_preview()

    def _update_new_preview(self):
        """Update the 'New' preview to show SVG/PNG positioned in target's bounds."""
        target = self.current_target

        # Check if target has a PNG override
        if target and target.override_is_png:
            source = QImage(str(target.override_path))
            sim_image = render_png_to_bounds(source, target)
            self._show_simulated_preview(sim_image)
            return

        if not self.svg_renderer or not self.svg_renderer.isValid():
            self.new_preview.set_image()
            return

        if not target:
            # No target selected - just show cropped SVG
            self.new_preview.set_svg(self.svg_renderer, self.svg_bounds)
            return

        # Render a preview showing where the SVG will actually appear in the icon
        sim_image = render_svg_cropped(self.svg_renderer, target, self.svg_bounds)
        self._show_simulated_preview(sim_image)

    def _show_simulated_preview(self, sim_image: QImage):
        """Display a simulated image in the new preview."""
        preview_size = self.new_preview.preview_size

        # Scale to preview size
        scaled = sim_image.scaled(preview_size, preview_size,
                                  Qt.AspectRatioMode.KeepAspectRatio,
                                  Qt.TransformationMode.SmoothTransformation)

        # Draw on checkerboard
        bg = create_checkerboard(preview_size, preview_size, 8)
        painter = QPainter(bg)
        x = (preview_size - scaled.width()) // 2
        y = (preview_size - scaled.height()) // 2
        painter.drawImage(x, y, scaled)
        painter.end()

        self.new_preview.setPixmap(bg)
        self.new_preview.setStyleSheet(f"QLabel {{ border: 1px solid {COLORS['border']}; border-radius: 8px; }}")

    def set_current(self, target: Optional[IconTarget]):
        self.current_target = target

        if target is None:
            self.current_preview.set_image()
            self.new_preview.set_image()
            self.info_label.setText("Select an icon to preview")
            return

        self.current_preview.set_image(path=target.path)
        self._update_new_preview()

        bounds_info = ""
        if target.bounds and not target.bounds.is_full:
            b = target.bounds
            bounds_info = f"\nContent: {b.width}×{b.height} at ({b.x}, {b.y})"

        override_info = ""
        if target.override_path:
            override_info = f"\nOverride: {target.override_path.name}"

        self.info_label.setText(f"{target.name}\n{target.width}×{target.height}px{bounds_info}{override_info}")


class SvgInputWidget(QGroupBox):
    """Widget for SVG file input with preview."""

    def __init__(self, parent=None):
        super().__init__("Default SVG", parent)
        self.svg_path: Optional[Path] = None
        self.svg_renderer: Optional[QSvgRenderer] = None
        self.svg_bounds: Optional[IconBounds] = None

        layout = QVBoxLayout(self)
        layout.setSpacing(12)

        self.preview = IconPreviewLabel(128)
        self.preview.setText("Drop SVG\nor Browse")
        layout.addWidget(self.preview, alignment=Qt.AlignmentFlag.AlignCenter)

        self.path_label = QLabel("No file selected")
        self.path_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.path_label.setStyleSheet(f"color: {COLORS['text_secondary']}; font-size: 9pt;")
        self.path_label.setWordWrap(True)
        layout.addWidget(self.path_label)

        self.bounds_label = QLabel("")
        self.bounds_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.bounds_label.setStyleSheet(f"color: {COLORS['text_disabled']}; font-size: 8pt;")
        layout.addWidget(self.bounds_label)

        self.browse_btn = QPushButton("Browse SVG...")
        layout.addWidget(self.browse_btn)

        layout.addStretch()

    def set_svg(self, path: Path) -> bool:
        renderer = QSvgRenderer(str(path))
        if not renderer.isValid():
            return False

        self.svg_path = path
        self.svg_renderer = renderer
        self.svg_bounds = get_svg_content_bounds(renderer)

        self.preview.set_svg(renderer, self.svg_bounds)
        self.path_label.setText(path.name)
        self.path_label.setToolTip(str(path))

        if self.svg_bounds and not self.svg_bounds.is_full:
            b = self.svg_bounds
            padding_pct = 100 - (b.width * b.height * 100) // (b.image_width * b.image_height)
            self.bounds_label.setText(f"Content: {b.width}×{b.height} ({padding_pct}% padding cropped)")
        else:
            self.bounds_label.setText("No padding detected")

        return True


# ============================================================================
# Main Window
# ============================================================================

class IconManagerWindow(QMainWindow):
    """Main window for the Icon Manager tool."""

    # Column indices
    COL_CHECK = 0
    COL_PREVIEW = 1
    COL_NAME = 2
    COL_SIZE = 3
    COL_OVERRIDE = 4
    COL_PATH = 5

    def __init__(self):
        super().__init__()
        self.targets: list[IconTarget] = []
        self.config = Config.load(CONFIG_PATH)
        self._init_ui()
        self._scan_targets()
        self._apply_config()

    def _init_ui(self):
        self.setWindowTitle("Mattermost Icon Manager")
        self.setMinimumSize(1100, 700)

        central = QWidget()
        self.setCentralWidget(central)
        layout = QHBoxLayout(central)
        layout.setSpacing(16)
        layout.setContentsMargins(16, 16, 16, 16)

        # Left panel
        left_panel = QVBoxLayout()
        left_panel.setSpacing(16)

        self.svg_input = SvgInputWidget()
        self.svg_input.browse_btn.clicked.connect(self._browse_svg)
        self.svg_input.setFixedWidth(280)
        left_panel.addWidget(self.svg_input)

        self.comparison = ComparisonWidget()
        self.comparison.setFixedWidth(280)
        left_panel.addWidget(self.comparison, 1)

        layout.addLayout(left_panel)

        # Right panel
        right_panel = QVBoxLayout()
        right_panel.setSpacing(12)

        # Header
        header = QHBoxLayout()
        title = QLabel("Target Icons")
        title.setStyleSheet(f"font-weight: bold; font-size: 14pt; color: {COLORS['text_primary']};")
        header.addWidget(title)
        header.addStretch()

        select_label = QLabel("Select:")
        select_label.setStyleSheet(f"color: {COLORS['text_secondary']};")
        header.addWidget(select_label)

        for text, slot in [("All", self._select_all), ("None", self._select_none),
                           ("Android", lambda: self._select_category("android")),
                           ("iOS", lambda: self._select_category("ios"))]:
            btn = QPushButton(text)
            btn.setProperty("secondary", True)
            btn.setFixedWidth(70 if text == "Android" else 50)
            btn.clicked.connect(slot)
            header.addWidget(btn)

        right_panel.addLayout(header)

        # Table widget
        self.table = QTableWidget()
        self.table.setColumnCount(6)
        self.table.setHorizontalHeaderLabels(["", "Preview", "Icon", "Size", "Override SVG", "Path"])
        self.table.setAlternatingRowColors(True)
        self.table.setSelectionBehavior(QAbstractItemView.SelectionBehavior.SelectRows)
        self.table.setSelectionMode(QAbstractItemView.SelectionMode.ExtendedSelection)
        self.table.verticalHeader().setVisible(False)
        self.table.setContextMenuPolicy(Qt.ContextMenuPolicy.CustomContextMenu)
        self.table.customContextMenuRequested.connect(self._show_context_menu)
        self.table.itemSelectionChanged.connect(self._on_selection_changed)

        # Column widths
        header_view = self.table.horizontalHeader()
        header_view.setSectionResizeMode(self.COL_CHECK, QHeaderView.ResizeMode.Fixed)
        header_view.setSectionResizeMode(self.COL_PREVIEW, QHeaderView.ResizeMode.Fixed)
        header_view.setSectionResizeMode(self.COL_NAME, QHeaderView.ResizeMode.Interactive)
        header_view.setSectionResizeMode(self.COL_SIZE, QHeaderView.ResizeMode.Fixed)
        header_view.setSectionResizeMode(self.COL_OVERRIDE, QHeaderView.ResizeMode.Interactive)
        header_view.setSectionResizeMode(self.COL_PATH, QHeaderView.ResizeMode.Stretch)
        self.table.setColumnWidth(self.COL_CHECK, 30)
        self.table.setColumnWidth(self.COL_PREVIEW, 50)
        self.table.setColumnWidth(self.COL_NAME, 180)
        self.table.setColumnWidth(self.COL_SIZE, 70)
        self.table.setColumnWidth(self.COL_OVERRIDE, 150)

        right_panel.addWidget(self.table, 1)

        # Override buttons
        override_row = QHBoxLayout()
        self.set_override_btn = QPushButton("Set Override...")
        self.set_override_btn.setProperty("secondary", True)
        self.set_override_btn.clicked.connect(self._set_override)
        self.set_override_btn.setToolTip("Assign a specific SVG or PNG to selected icons")
        override_row.addWidget(self.set_override_btn)

        self.clear_override_btn = QPushButton("Clear Override")
        self.clear_override_btn.setProperty("secondary", True)
        self.clear_override_btn.clicked.connect(self._clear_override)
        self.clear_override_btn.setToolTip("Remove override, use default SVG")
        override_row.addWidget(self.clear_override_btn)

        override_row.addStretch()

        self.save_config_btn = QPushButton("Save Config")
        self.save_config_btn.setStyleSheet(f"""
            QPushButton {{
                background-color: {COLORS['success']};
                padding: 8px 20px;
            }}
            QPushButton:hover {{ background-color: #35a378; }}
        """)
        self.save_config_btn.clicked.connect(self._save_config)
        self.save_config_btn.setToolTip(f"Save configuration to {CONFIG_PATH.name}")
        override_row.addWidget(self.save_config_btn)

        right_panel.addLayout(override_row)

        # Bottom actions
        actions = QHBoxLayout()
        self.status_label = QLabel("Ready")
        self.status_label.setStyleSheet(f"color: {COLORS['text_secondary']};")
        actions.addWidget(self.status_label, 1)

        self.generate_btn = QPushButton("Generate && Replace Selected Icons")
        self.generate_btn.setEnabled(False)
        self.generate_btn.setStyleSheet(f"""
            QPushButton {{
                background-color: {COLORS['primary_light']};
                padding: 12px 24px;
                font-size: 11pt;
            }}
            QPushButton:hover {{ background-color: {COLORS['primary_hover']}; }}
            QPushButton:disabled {{ background-color: {COLORS['text_disabled']}; }}
        """)
        self.generate_btn.clicked.connect(self._generate_icons)
        actions.addWidget(self.generate_btn)

        right_panel.addLayout(actions)
        layout.addLayout(right_panel, 1)

    def _scan_targets(self):
        """Scan project directories for icon targets."""
        self.targets.clear()
        self.table.setRowCount(0)

        categories = [
            ("android", ANDROID_RES_DIR),
            ("ios", IOS_ASSETS_DIR),
            ("assets_android", ASSETS_ANDROID_DIR),
            ("assets_ios", ASSETS_IOS_DIR),
        ]

        for cat_id, base_path in categories:
            if not base_path.exists():
                continue
            if "android" in cat_id:
                self._scan_android(base_path, cat_id)
            else:
                self._scan_ios(base_path, cat_id)

        self.status_label.setText(f"Found {len(self.targets)} icon targets")

    def _scan_android(self, base_path: Path, category: str):
        """Scan Android mipmap directories."""
        mipmap_sizes = {
            "mipmap-mdpi": 48,
            "mipmap-hdpi": 72,
            "mipmap-xhdpi": 96,
            "mipmap-xxhdpi": 144,
            "mipmap-xxxhdpi": 192,
        }
        icon_files = ["ic_launcher.png", "ic_launcher_round.png", "ic_launcher_foreground.png"]

        for mipmap_dir, size in mipmap_sizes.items():
            mipmap_path = base_path / mipmap_dir
            if not mipmap_path.exists():
                continue
            for icon_file in icon_files:
                icon_path = mipmap_path / icon_file
                if icon_path.exists():
                    self._add_icon(icon_path, icon_file, size, category)

    def _scan_ios(self, base_path: Path, category: str):
        """Scan iOS appiconset directory."""
        contents_path = base_path / "Contents.json"
        icons = []

        if contents_path.exists():
            with open(contents_path) as f:
                contents = json.load(f)
            for image in contents.get("images", []):
                filename = image.get("filename")
                if not filename:
                    continue
                icon_path = base_path / filename
                if not icon_path.exists():
                    continue
                size_str = image.get("size", "60x60")
                scale_str = image.get("scale", "1x")
                base_size = float(size_str.split("x")[0])
                scale = float(scale_str.replace("x", ""))
                size = int(base_size * scale)
                icons.append((filename, size, icon_path))
        else:
            for icon_path in sorted(base_path.glob("*.png")):
                img = QImage(str(icon_path))
                if not img.isNull():
                    icons.append((icon_path.name, img.width(), icon_path))

        icons.sort(key=lambda x: (x[1], x[0]))
        for filename, size, icon_path in icons:
            self._add_icon(icon_path, filename, size, category)

    def _add_icon(self, path: Path, name: str, size: int, category: str):
        """Add an icon to the table."""
        img = QImage(str(path))
        bounds = get_image_bounds(img) if not img.isNull() else None

        target = IconTarget(
            name=name,
            width=size,
            height=size,
            path=path,
            category=category,
            bounds=bounds
        )
        self.targets.append(target)

        row = self.table.rowCount()
        self.table.insertRow(row)

        # Checkbox
        check = QCheckBox()
        check.setChecked(True)
        check_widget = QWidget()
        check_layout = QHBoxLayout(check_widget)
        check_layout.addWidget(check)
        check_layout.setAlignment(Qt.AlignmentFlag.AlignCenter)
        check_layout.setContentsMargins(0, 0, 0, 0)
        self.table.setCellWidget(row, self.COL_CHECK, check_widget)

        # Preview
        preview = load_icon_preview(path, 40)
        preview_item = QTableWidgetItem()
        preview_item.setIcon(QIcon(preview))
        preview_item.setFlags(preview_item.flags() & ~Qt.ItemFlag.ItemIsEditable)
        self.table.setItem(row, self.COL_PREVIEW, preview_item)

        # Name
        name_item = QTableWidgetItem(name)
        name_item.setFlags(name_item.flags() & ~Qt.ItemFlag.ItemIsEditable)
        name_item.setData(Qt.ItemDataRole.UserRole, len(self.targets) - 1)
        self.table.setItem(row, self.COL_NAME, name_item)

        # Size
        size_item = QTableWidgetItem(f"{size}×{size}")
        size_item.setFlags(size_item.flags() & ~Qt.ItemFlag.ItemIsEditable)
        self.table.setItem(row, self.COL_SIZE, size_item)

        # Override
        override_item = QTableWidgetItem("—")
        override_item.setFlags(override_item.flags() & ~Qt.ItemFlag.ItemIsEditable)
        override_item.setForeground(QColor(COLORS['text_disabled']))
        self.table.setItem(row, self.COL_OVERRIDE, override_item)

        # Path
        path_item = QTableWidgetItem(target.rel_path)
        path_item.setFlags(path_item.flags() & ~Qt.ItemFlag.ItemIsEditable)
        path_item.setForeground(QColor(COLORS['text_secondary']))
        self.table.setItem(row, self.COL_PATH, path_item)

        self.table.setRowHeight(row, 48)

    def _apply_config(self):
        """Apply saved config to targets."""
        if self.config.default_svg:
            svg_path = Path(self.config.default_svg)
            if svg_path.exists():
                self.svg_input.set_svg(svg_path)
                self.comparison.set_svg(self.svg_input.svg_renderer, self.svg_input.svg_bounds)
                self.generate_btn.setEnabled(True)

        for i, target in enumerate(self.targets):
            rel_path = target.rel_path
            if rel_path in self.config.overrides:
                override_path = Path(self.config.overrides[rel_path])
                if override_path.exists():
                    target.override_path = override_path
                    self.table.item(i, self.COL_OVERRIDE).setText(override_path.name)
                    self.table.item(i, self.COL_OVERRIDE).setForeground(QColor(COLORS['primary_light']))
                    self.table.item(i, self.COL_OVERRIDE).setToolTip(str(override_path))

    def _on_selection_changed(self):
        rows = self.table.selectionModel().selectedRows()
        if len(rows) == 1:
            idx = self.table.item(rows[0].row(), self.COL_NAME).data(Qt.ItemDataRole.UserRole)
            if idx is not None:
                target = self.targets[idx]
                self.comparison.set_current(target)

    def _show_context_menu(self, pos):
        menu = QMenu(self)
        set_action = QAction("Set Override SVG...", self)
        set_action.triggered.connect(self._set_override)
        menu.addAction(set_action)

        clear_action = QAction("Clear Override", self)
        clear_action.triggered.connect(self._clear_override)
        menu.addAction(clear_action)

        menu.exec(self.table.viewport().mapToGlobal(pos))

    def _get_browse_dir(self) -> str:
        """Get the directory to start file dialogs in."""
        if self.config.last_browse_dir and Path(self.config.last_browse_dir).exists():
            return self.config.last_browse_dir
        return str(PROJECT_ROOT)

    def _update_browse_dir(self, path: Path):
        """Update the last browsed directory."""
        self.config.last_browse_dir = str(path.parent)

    def _browse_svg(self):
        path, _ = QFileDialog.getOpenFileName(
            self, "Select SVG Icon", self._get_browse_dir(),
            "SVG Files (*.svg);;All Files (*)"
        )
        if path:
            svg_path = Path(path)
            self._update_browse_dir(svg_path)
            if self.svg_input.set_svg(svg_path):
                self.comparison.set_svg(self.svg_input.svg_renderer, self.svg_input.svg_bounds)
                self.generate_btn.setEnabled(True)
                self.status_label.setText(f"Loaded: {svg_path.name}")
            else:
                QMessageBox.warning(self, "Invalid SVG", "Could not load the selected SVG file.")

    def _set_override(self):
        rows = self.table.selectionModel().selectedRows()
        if not rows:
            QMessageBox.information(self, "No Selection", "Select one or more icons first.")
            return

        path, _ = QFileDialog.getOpenFileName(
            self, "Select Override (SVG or PNG)", self._get_browse_dir(),
            "Image Files (*.svg *.png);;SVG Files (*.svg);;PNG Files (*.png);;All Files (*)"
        )
        if not path:
            return

        override_path = Path(path)
        self._update_browse_dir(override_path)

        # Validate the file
        is_png = override_path.suffix.lower() == '.png'
        if is_png:
            img = QImage(str(override_path))
            if img.isNull():
                QMessageBox.warning(self, "Invalid PNG", "Could not load the selected PNG file.")
                return
        else:
            renderer = QSvgRenderer(str(override_path))
            if not renderer.isValid():
                QMessageBox.warning(self, "Invalid SVG", "Could not load the selected SVG file.")
                return

        for row_idx in rows:
            row = row_idx.row()
            idx = self.table.item(row, self.COL_NAME).data(Qt.ItemDataRole.UserRole)
            if idx is not None:
                self.targets[idx].override_path = override_path
                self.table.item(row, self.COL_OVERRIDE).setText(override_path.name)
                self.table.item(row, self.COL_OVERRIDE).setForeground(QColor(COLORS['primary_light']))
                self.table.item(row, self.COL_OVERRIDE).setToolTip(str(override_path))

        # Update preview if current target was affected
        self.comparison._update_new_preview()
        self.status_label.setText(f"Set override for {len(rows)} icon(s)")

    def _clear_override(self):
        rows = self.table.selectionModel().selectedRows()
        if not rows:
            return

        for row_idx in rows:
            row = row_idx.row()
            idx = self.table.item(row, self.COL_NAME).data(Qt.ItemDataRole.UserRole)
            if idx is not None:
                self.targets[idx].override_path = None
                self.table.item(row, self.COL_OVERRIDE).setText("—")
                self.table.item(row, self.COL_OVERRIDE).setForeground(QColor(COLORS['text_disabled']))
                self.table.item(row, self.COL_OVERRIDE).setToolTip("")

        # Update preview if current target was affected
        self.comparison._update_new_preview()
        self.status_label.setText(f"Cleared override for {len(rows)} icon(s)")

    def _save_config(self):
        self.config.default_svg = str(self.svg_input.svg_path) if self.svg_input.svg_path else None
        self.config.overrides = {}

        for target in self.targets:
            if target.override_path:
                self.config.overrides[target.rel_path] = str(target.override_path)

        self.config.save(CONFIG_PATH)
        self.status_label.setText(f"Config saved to {CONFIG_PATH.name}")

    def _select_all(self):
        for row in range(self.table.rowCount()):
            widget = self.table.cellWidget(row, self.COL_CHECK)
            if widget:
                widget.findChild(QCheckBox).setChecked(True)

    def _select_none(self):
        for row in range(self.table.rowCount()):
            widget = self.table.cellWidget(row, self.COL_CHECK)
            if widget:
                widget.findChild(QCheckBox).setChecked(False)

    def _select_category(self, category: str):
        for row in range(self.table.rowCount()):
            idx = self.table.item(row, self.COL_NAME).data(Qt.ItemDataRole.UserRole)
            if idx is not None:
                target = self.targets[idx]
                widget = self.table.cellWidget(row, self.COL_CHECK)
                if widget:
                    widget.findChild(QCheckBox).setChecked(category in target.category)

    def _get_selected_targets(self) -> list[IconTarget]:
        selected = []
        for row in range(self.table.rowCount()):
            widget = self.table.cellWidget(row, self.COL_CHECK)
            if widget and widget.findChild(QCheckBox).isChecked():
                idx = self.table.item(row, self.COL_NAME).data(Qt.ItemDataRole.UserRole)
                if idx is not None:
                    selected.append(self.targets[idx])
        return selected

    def _generate_icons(self):
        selected = self._get_selected_targets()
        if not selected:
            QMessageBox.warning(self, "No Targets", "Please select at least one target icon.")
            return

        # Check that all selected have either default SVG or override
        missing = [t for t in selected if not t.override_path and not self.svg_input.svg_renderer]
        if missing:
            QMessageBox.warning(self, "Missing Source",
                f"{len(missing)} icons have no source (no default SVG or override).\n\n"
                "Please set a default SVG or assign overrides to all selected icons.")
            return

        android_count = sum(1 for t in selected if "android" in t.category)
        ios_count = sum(1 for t in selected if "ios" in t.category)
        override_count = sum(1 for t in selected if t.override_path)

        reply = QMessageBox.question(
            self, "Confirm Replace",
            f"This will replace {len(selected)} icon files:\n\n"
            f"  • Android: {android_count} icons\n"
            f"  • iOS: {ios_count} icons\n"
            f"  • With overrides: {override_count} icons\n\n"
            "Padding will be cropped automatically.\n\n"
            "Continue?",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
        )
        if reply != QMessageBox.StandardButton.Yes:
            return

        progress = QProgressDialog("Generating icons...", "Cancel", 0, len(selected), self)
        progress.setWindowModality(Qt.WindowModality.WindowModal)
        progress.setMinimumDuration(0)

        # Cache SVG bounds for each unique SVG
        svg_cache: dict[Path, tuple[QSvgRenderer, IconBounds]] = {}

        def get_svg_data(svg_path: Path) -> tuple[QSvgRenderer, IconBounds]:
            if svg_path not in svg_cache:
                renderer = QSvgRenderer(str(svg_path))
                bounds = get_svg_content_bounds(renderer)
                svg_cache[svg_path] = (renderer, bounds)
            return svg_cache[svg_path]

        errors = []

        for i, target in enumerate(selected):
            if progress.wasCanceled():
                break

            progress.setValue(i)
            progress.setLabelText(f"Generating {target.name}...")
            QApplication.processEvents()

            try:
                # Check if target has a PNG override
                if target.override_is_png:
                    source = QImage(str(target.override_path))
                    image = render_png_to_bounds(source, target)
                else:
                    # Get SVG (override or default)
                    svg_path = target.override_path or self.svg_input.svg_path
                    renderer, svg_bounds = get_svg_data(svg_path)
                    image = render_svg_cropped(renderer, target, svg_bounds)

                target.path.parent.mkdir(parents=True, exist_ok=True)

                if not image.save(str(target.path), "PNG"):
                    errors.append(f"Failed to save: {target.path}")
            except Exception as e:
                errors.append(f"{target.path}: {e}")

        progress.setValue(len(selected))

        # Refresh table previews
        for row in range(self.table.rowCount()):
            idx = self.table.item(row, self.COL_NAME).data(Qt.ItemDataRole.UserRole)
            if idx is not None:
                target = self.targets[idx]
                preview = load_icon_preview(target.path, 40)
                self.table.item(row, self.COL_PREVIEW).setIcon(QIcon(preview))

        self.comparison.set_current(None)

        if errors:
            QMessageBox.warning(
                self, "Completed with Errors",
                f"Generated {len(selected) - len(errors)} icons.\n\nErrors:\n" + "\n".join(errors[:10])
            )
        else:
            QMessageBox.information(
                self, "Success",
                f"Successfully generated and replaced {len(selected)} icons!"
            )

        self.status_label.setText(f"Generated {len(selected) - len(errors)}/{len(selected)} icons")


# ============================================================================
# Main
# ============================================================================

def main():
    app = QApplication(sys.argv)
    app.setStyle("Fusion")
    app.setStyleSheet(Theme.get_stylesheet())

    window = IconManagerWindow()
    window.show()

    sys.exit(app.exec())


if __name__ == "__main__":
    main()
