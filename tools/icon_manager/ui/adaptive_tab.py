"""
Adaptive icon layer replacement tab.

A dedicated UI for replacing Android adaptive icon foreground and background layers
with PNG previews for each density.
"""

from pathlib import Path

from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QGridLayout,
    QPushButton, QLabel, QFileDialog, QMessageBox,
    QGroupBox, QScrollArea, QFrame, QApplication,
    QProgressDialog,
)
from PyQt6.QtCore import Qt
from PyQt6.QtGui import QImage, QPixmap, QPainter

from ..core import (
    COLORS, ADAPTIVE_ICON_SIZES, ANDROID_RES_DIR, ASSETS_ANDROID_DIR,
    replace_layer, get_layer_preview, get_layer_targets,
)
from ..rendering import create_checkerboard
from .icons import get_icon


class DensityPreview(QFrame):
    """Preview widget for a single density's icon."""

    def __init__(self, density: str, size: int, parent=None):
        super().__init__(parent)
        self.density = density
        self.size = size
        self.setFrameStyle(QFrame.Shape.Box | QFrame.Shadow.Sunken)
        self.setStyleSheet(f"""
            QFrame {{
                background-color: {COLORS['surface']};
                border: 1px solid {COLORS['border']};
                border-radius: 4px;
            }}
        """)

        layout = QVBoxLayout(self)
        layout.setSpacing(4)
        layout.setContentsMargins(8, 8, 8, 8)

        # Density label
        self.density_label = QLabel(density.replace("mipmap-", ""))
        self.density_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.density_label.setStyleSheet(f"font-weight: bold; color: {COLORS['text_primary']};")
        layout.addWidget(self.density_label)

        # Preview image
        self.preview_label = QLabel()
        self.preview_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.preview_label.setMinimumSize(80, 80)
        self.preview_label.setMaximumSize(80, 80)
        layout.addWidget(self.preview_label)

        # Size label
        self.size_label = QLabel(f"{size}×{size}")
        self.size_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.size_label.setStyleSheet(f"color: {COLORS['text_secondary']}; font-size: 9pt;")
        layout.addWidget(self.size_label)

        self.setFixedWidth(100)

    def set_preview(self, path: Path | None):
        """Set the preview image from a file path."""
        preview_size = 72
        checkerboard = create_checkerboard(preview_size, preview_size, 8)

        if path and path.exists():
            img = QImage(str(path))
            if not img.isNull():
                scaled = img.scaled(
                    preview_size, preview_size,
                    Qt.AspectRatioMode.KeepAspectRatio,
                    Qt.TransformationMode.SmoothTransformation
                )
                painter = QPainter(checkerboard)
                x = (preview_size - scaled.width()) // 2
                y = (preview_size - scaled.height()) // 2
                painter.drawImage(x, y, scaled)
                painter.end()

        self.preview_label.setPixmap(checkerboard)


class LayerGroup(QGroupBox):
    """Group box for a single layer (foreground or background)."""

    def __init__(self, layer: str, parent=None):
        layer_title = "Foreground Layer" if layer == "foreground" else "Background Layer"
        super().__init__(layer_title, parent)
        self.layer = layer
        self.previews: dict[str, DensityPreview] = {}

        self.setStyleSheet(f"""
            QGroupBox {{
                background-color: {COLORS['surface']};
                border: 1px solid {COLORS['border']};
                border-radius: 8px;
                margin-top: 16px;
                padding: 16px;
                padding-top: 28px;
            }}
            QGroupBox::title {{
                subcontrol-origin: margin;
                subcontrol-position: top left;
                padding: 0 12px;
                color: {COLORS['text_primary']};
                font-weight: bold;
                font-size: 12pt;
            }}
        """)

        layout = QVBoxLayout(self)
        layout.setSpacing(12)

        # Description
        desc_text = (
            "The foreground layer contains the icon artwork with transparency. "
            "It should be centered in the safe zone (inner 66% of the canvas)."
            if layer == "foreground" else
            "The background layer is typically a solid color or gradient. "
            "It fills the entire adaptive icon area behind the foreground."
        )
        desc = QLabel(desc_text)
        desc.setWordWrap(True)
        desc.setStyleSheet(f"color: {COLORS['text_secondary']};")
        layout.addWidget(desc)

        # Source section
        source_layout = QHBoxLayout()
        source_label = QLabel("Source PNG:")
        source_label.setStyleSheet(f"color: {COLORS['text_secondary']};")
        source_layout.addWidget(source_label)

        self.source_path_label = QLabel("No file selected")
        self.source_path_label.setStyleSheet(f"color: {COLORS['text_disabled']}; font-style: italic;")
        source_layout.addWidget(self.source_path_label, 1)

        self.browse_btn = QPushButton(get_icon("browse", 14), "Select PNG...")
        self.browse_btn.setProperty("secondary", True)
        self.browse_btn.setFixedWidth(120)
        source_layout.addWidget(self.browse_btn)

        self.replace_btn = QPushButton(get_icon("generate", 14), "Replace All")
        self.replace_btn.setEnabled(False)
        self.replace_btn.setFixedWidth(100)
        source_layout.addWidget(self.replace_btn)

        layout.addLayout(source_layout)

        # Previews section
        preview_section = QHBoxLayout()

        # Current icons
        current_group = QVBoxLayout()
        current_label = QLabel("Current Icons:")
        current_label.setStyleSheet(f"font-weight: bold; color: {COLORS['text_primary']};")
        current_group.addWidget(current_label)

        current_scroll = QScrollArea()
        current_scroll.setWidgetResizable(True)
        current_scroll.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAsNeeded)
        current_scroll.setVerticalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        current_scroll.setFixedHeight(140)
        current_scroll.setStyleSheet(f"background-color: {COLORS['background']}; border: none;")

        current_container = QWidget()
        current_layout = QHBoxLayout(current_container)
        current_layout.setSpacing(8)
        current_layout.setContentsMargins(4, 4, 4, 4)

        for density, size in ADAPTIVE_ICON_SIZES.items():
            preview = DensityPreview(density, size)
            self.previews[density] = preview
            current_layout.addWidget(preview)

        current_layout.addStretch()
        current_scroll.setWidget(current_container)
        current_group.addWidget(current_scroll)
        preview_section.addLayout(current_group)

        layout.addLayout(preview_section)

        # Store source path
        self.source_path: Path | None = None

    def refresh_previews(self):
        """Refresh all preview images from disk."""
        targets = get_layer_targets(self.layer)
        target_map = {t[0].parent.name: t[0] for t in targets}

        for density, preview in self.previews.items():
            path = target_map.get(density)
            preview.set_preview(path)

    def set_source(self, path: Path):
        """Set the source PNG path."""
        self.source_path = path
        self.source_path_label.setText(path.name)
        self.source_path_label.setStyleSheet(f"color: {COLORS['primary_light']};")
        self.source_path_label.setToolTip(str(path))
        self.replace_btn.setEnabled(True)


class AdaptiveIconTab(QWidget):
    """Tab for adaptive icon layer replacement."""

    def __init__(self, parent=None):
        super().__init__(parent)
        self._last_browse_dir: str | None = None
        self._init_ui()
        self._refresh_all_previews()

    def _init_ui(self):
        layout = QVBoxLayout(self)
        layout.setSpacing(16)
        layout.setContentsMargins(16, 16, 16, 16)

        # Header
        header = QLabel("Android Adaptive Icon Layers")
        header.setStyleSheet(f"font-size: 16pt; font-weight: bold; color: {COLORS['text_primary']};")
        layout.addWidget(header)

        # Info text
        info = QLabel(
            "Android adaptive icons consist of two separate PNG layers that the system combines. "
            "Use this tool to replace the foreground and/or background layers across all density folders."
        )
        info.setWordWrap(True)
        info.setStyleSheet(f"color: {COLORS['text_secondary']};")
        layout.addWidget(info)

        # Scroll area for the groups
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setFrameShape(QFrame.Shape.NoFrame)
        scroll.setStyleSheet(f"background-color: {COLORS['background']};")

        scroll_content = QWidget()
        scroll_layout = QVBoxLayout(scroll_content)
        scroll_layout.setSpacing(16)

        # Foreground group
        self.fg_group = LayerGroup("foreground")
        self.fg_group.browse_btn.clicked.connect(lambda: self._browse_source("foreground"))
        self.fg_group.replace_btn.clicked.connect(lambda: self._replace_layer("foreground"))
        scroll_layout.addWidget(self.fg_group)

        # Background group
        self.bg_group = LayerGroup("background")
        self.bg_group.browse_btn.clicked.connect(lambda: self._browse_source("background"))
        self.bg_group.replace_btn.clicked.connect(lambda: self._replace_layer("background"))
        scroll_layout.addWidget(self.bg_group)

        scroll_layout.addStretch()
        scroll.setWidget(scroll_content)
        layout.addWidget(scroll, 1)

        # Bottom actions
        actions = QHBoxLayout()

        self.refresh_btn = QPushButton("Refresh Previews")
        self.refresh_btn.setProperty("secondary", True)
        self.refresh_btn.clicked.connect(self._refresh_all_previews)
        actions.addWidget(self.refresh_btn)

        actions.addStretch()

        self.status_label = QLabel("Ready")
        self.status_label.setStyleSheet(f"color: {COLORS['text_secondary']};")
        actions.addWidget(self.status_label)

        layout.addLayout(actions)

    def _get_browse_dir(self) -> str:
        """Get the directory to start file dialogs in."""
        if self._last_browse_dir and Path(self._last_browse_dir).exists():
            return self._last_browse_dir
        return str(Path.home())

    def _browse_source(self, layer: str):
        """Browse for a source PNG file."""
        group = self.fg_group if layer == "foreground" else self.bg_group

        path, _ = QFileDialog.getOpenFileName(
            self, f"Select {layer.title()} PNG",
            self._get_browse_dir(),
            "PNG Files (*.png);;All Files (*)"
        )
        if not path:
            return

        source_path = Path(path)
        self._last_browse_dir = str(source_path.parent)

        # Validate
        img = QImage(str(source_path))
        if img.isNull():
            QMessageBox.warning(self, "Invalid PNG", "Could not load the selected PNG file.")
            return

        group.set_source(source_path)
        self.status_label.setText(f"Selected {layer}: {source_path.name} ({img.width()}×{img.height()})")

    def _replace_layer(self, layer: str):
        """Replace a layer across all densities."""
        group = self.fg_group if layer == "foreground" else self.bg_group

        if not group.source_path:
            QMessageBox.warning(self, "No Source", "Please select a source PNG first.")
            return

        # Confirm
        img = QImage(str(group.source_path))
        reply = QMessageBox.question(
            self, f"Replace {layer.title()} Layer",
            f"This will replace ic_launcher_{layer}.png in all mipmap density folders:\n\n"
            f"  • android/app/src/main/res/mipmap-*/\n"
            f"  • assets/base/release/icons/android/mipmap-*/\n\n"
            f"Source: {group.source_path.name} ({img.width()}×{img.height()})\n\n"
            "Continue?",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
        )
        if reply != QMessageBox.StandardButton.Yes:
            return

        # Replace
        progress = QProgressDialog(f"Replacing {layer} layer...", None, 0, 0, self)
        progress.setWindowModality(Qt.WindowModality.WindowModal)
        progress.setMinimumDuration(0)
        progress.show()
        QApplication.processEvents()

        success, errors = replace_layer(group.source_path, layer)

        progress.close()

        if errors:
            QMessageBox.warning(
                self, "Completed with Errors",
                f"Replaced {success} files.\n\nErrors:\n" + "\n".join(errors[:10])
            )
        else:
            QMessageBox.information(
                self, "Success",
                f"Successfully replaced {success} {layer} layer files!"
            )

        # Refresh previews
        group.refresh_previews()
        self.status_label.setText(f"Replaced {success} {layer} layer files")

    def _refresh_all_previews(self):
        """Refresh all preview images."""
        self.fg_group.refresh_previews()
        self.bg_group.refresh_previews()
        self.status_label.setText("Previews refreshed")
