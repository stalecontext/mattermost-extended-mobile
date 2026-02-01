"""
Reusable UI widgets for the Icon Manager.
"""

import subprocess
import sys
from pathlib import Path
from typing import Optional

from PyQt6.QtWidgets import QLabel, QGroupBox, QVBoxLayout, QHBoxLayout, QPushButton, QMenu
from PyQt6.QtCore import Qt
from PyQt6.QtGui import QImage, QPainter, QAction
from PyQt6.QtSvg import QSvgRenderer

from ..core import COLORS, IconBounds, IconTarget
from ..rendering import (
    create_checkerboard,
    get_svg_content_bounds,
    render_svg_to_size,
    render_svg_cropped,
    render_png_to_bounds,
)


class IconPreviewLabel(QLabel):
    """Label that displays an icon with checkerboard background."""

    def __init__(self, size: int = 96, parent=None):
        super().__init__(parent)
        self.preview_size = size
        self.current_path: Optional[Path] = None
        self.setFixedSize(size, size)
        self.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.setContextMenuPolicy(Qt.ContextMenuPolicy.CustomContextMenu)
        self.customContextMenuRequested.connect(self._show_context_menu)
        self._set_placeholder()

    def _show_context_menu(self, pos):
        if not self.current_path or not self.current_path.exists():
            return
        menu = QMenu(self)
        open_folder = QAction("Open Containing Folder", self)
        open_folder.triggered.connect(self._open_containing_folder)
        menu.addAction(open_folder)
        menu.exec(self.mapToGlobal(pos))

    def _open_containing_folder(self):
        if not self.current_path or not self.current_path.exists():
            return
        if sys.platform == "win32":
            subprocess.run(["explorer", "/select,", str(self.current_path)])
        elif sys.platform == "darwin":
            subprocess.run(["open", "-R", str(self.current_path)])
        else:
            subprocess.run(["xdg-open", str(self.current_path.parent)])

    def _set_placeholder(self):
        self.current_path = None
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

    def set_from_qimage(self, image: QImage, path: Optional[Path] = None):
        """Display a QImage on checkerboard background, preserving aspect ratio."""
        if image.isNull():
            self._set_placeholder()
            return

        self.current_path = path
        bg = create_checkerboard(self.preview_size, self.preview_size, 8)

        # Scale while preserving aspect ratio
        scaled = image.scaled(self.preview_size, self.preview_size,
                              Qt.AspectRatioMode.KeepAspectRatio,
                              Qt.TransformationMode.SmoothTransformation)

        # Center on checkerboard
        painter = QPainter(bg)
        x = (self.preview_size - scaled.width()) // 2
        y = (self.preview_size - scaled.height()) // 2
        painter.drawImage(x, y, scaled)
        painter.end()

        self.setPixmap(bg)
        self.setStyleSheet(f"QLabel {{ border: 1px solid {COLORS['border']}; border-radius: 8px; }}")

    def set_from_path(self, path: Path):
        """Load and display an image from a file path."""
        if not path.exists():
            self._set_placeholder()
            return
        image = QImage(str(path))
        self.set_from_qimage(image, path)

    def clear(self):
        """Clear the preview and show placeholder."""
        self._set_placeholder()


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
        """Set the default SVG renderer and its content bounds."""
        self.svg_renderer = renderer
        self.svg_bounds = bounds
        self._update_new_preview()

    def _render_preview_image(self, target: IconTarget) -> Optional[QImage]:
        """
        Render the preview image for a target using the exact same logic as generation.
        Returns None if no valid source is available.
        """
        if target.override_is_png:
            source = QImage(str(target.override_path))
            if source.isNull():
                return None
            return render_png_to_bounds(source, target)

        if target.override_path:
            # SVG override
            renderer = QSvgRenderer(str(target.override_path))
            if not renderer.isValid():
                return None
            svg_bounds = get_svg_content_bounds(renderer)
            return render_svg_cropped(renderer, target, svg_bounds)

        if self.svg_renderer and self.svg_renderer.isValid():
            # Default SVG
            return render_svg_cropped(self.svg_renderer, target, self.svg_bounds)

        return None

    def _render_default_svg_preview(self) -> Optional[QImage]:
        """Render a preview of the default SVG with cropping applied."""
        if not self.svg_renderer or not self.svg_renderer.isValid():
            return None
        return render_svg_to_size(self.svg_renderer, self.new_preview.preview_size, self.svg_bounds)

    def _update_new_preview(self):
        """Update the 'New' preview to show what the generated output will look like."""
        target = self.current_target

        if target is None:
            # No target selected - show default SVG preview (cropped)
            image = self._render_default_svg_preview()
            if image:
                self.new_preview.set_from_qimage(image)
            else:
                self.new_preview.clear()
            return

        # Render using the same logic as actual generation
        image = self._render_preview_image(target)
        if image:
            self.new_preview.set_from_qimage(image)
        else:
            self.new_preview.clear()

    def set_current(self, target: Optional[IconTarget]):
        """Set the current target to preview."""
        self.current_target = target

        if target is None:
            self.current_preview.clear()
            self.new_preview.clear()
            self.info_label.setText("Select an icon to preview")
            return

        # Show current icon from disk
        self.current_preview.set_from_path(target.path)

        # Show what the new icon will look like
        self._update_new_preview()

        # Build info text
        info_lines = [f"{target.name}", f"{target.width}×{target.height}px"]

        if target.bounds and not target.bounds.is_full:
            b = target.bounds
            info_lines.append(f"Content: {b.width}×{b.height} at ({b.x}, {b.y})")

        if target.override_path:
            info_lines.append(f"Override: {target.override_path.name}")

        self.info_label.setText("\n".join(info_lines))


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
        """Load an SVG file and update the preview."""
        renderer = QSvgRenderer(str(path))
        if not renderer.isValid():
            return False

        self.svg_path = path
        self.svg_renderer = renderer
        self.svg_bounds = get_svg_content_bounds(renderer)

        # Render SVG to image for preview
        preview_image = render_svg_to_size(renderer, self.preview.preview_size, self.svg_bounds)
        self.preview.set_from_qimage(preview_image)

        self.path_label.setText(path.name)
        self.path_label.setToolTip(str(path))

        if self.svg_bounds and not self.svg_bounds.is_full:
            b = self.svg_bounds
            padding_pct = 100 - (b.width * b.height * 100) // (b.image_width * b.image_height)
            self.bounds_label.setText(f"Content: {b.width}×{b.height} ({padding_pct}% padding cropped)")
        else:
            self.bounds_label.setText("No padding detected")

        return True
