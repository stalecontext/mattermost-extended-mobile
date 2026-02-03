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
    QProgressDialog, QLineEdit, QColorDialog,
)
from PyQt6.QtCore import Qt
from PyQt6.QtGui import QImage, QPixmap, QPainter, QColor

import re

from ..core import (
    COLORS, ADAPTIVE_ICON_SIZES, MIPMAP_SIZES, ANDROID_RES_DIR, ASSETS_ANDROID_DIR,
    PROJECT_ROOT, replace_layer, get_layer_preview, get_layer_targets, get_layer_sizes,
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
    """Group box for a single layer (foreground, background, or notification)."""

    LAYER_CONFIG = {
        "foreground": {
            "title": "Foreground Layer",
            "desc": "The foreground layer contains the icon artwork with transparency. "
                    "It should be centered in the safe zone (inner 66% of the canvas).",
        },
        "background": {
            "title": "Background Layer",
            "desc": "The background layer is typically a solid color or gradient. "
                    "It fills the entire adaptive icon area behind the foreground.",
        },
        "notification": {
            "title": "Notification Icon",
            "desc": "The notification icon appears in the status bar. "
                    "It should be a white silhouette on transparent background (24dp visible area).",
        },
    }

    def __init__(self, layer: str, parent=None):
        config = self.LAYER_CONFIG.get(layer, self.LAYER_CONFIG["foreground"])
        super().__init__(config["title"], parent)
        self.layer = layer
        self.previews: dict[str, DensityPreview] = {}
        self.sizes = get_layer_sizes(layer)

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
        desc_text = config["desc"]
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

        for density, size in self.sizes.items():
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
        header = QLabel("Android Icon Layers")
        header.setStyleSheet(f"font-size: 16pt; font-weight: bold; color: {COLORS['text_primary']};")
        layout.addWidget(header)

        # Info text
        info = QLabel(
            "Replace Android adaptive icon layers (foreground/background) and notification icons. "
            "Each source PNG is automatically scaled to all mipmap density folders."
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

        # Notification icon group
        self.notif_group = LayerGroup("notification")
        self.notif_group.browse_btn.clicked.connect(lambda: self._browse_source("notification"))
        self.notif_group.replace_btn.clicked.connect(lambda: self._replace_layer("notification"))
        scroll_layout.addWidget(self.notif_group)

        # Notification accent color section
        self.color_group = QGroupBox("Notification Accent Color")
        self.color_group.setStyleSheet(f"""
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
        color_layout = QVBoxLayout(self.color_group)
        color_layout.setSpacing(12)

        color_desc = QLabel(
            "The accent color tints the notification icon in the notification shade. "
            "This is set in CustomPushNotificationHelper.java via setColor()."
        )
        color_desc.setWordWrap(True)
        color_desc.setStyleSheet(f"color: {COLORS['text_secondary']};")
        color_layout.addWidget(color_desc)

        color_row = QHBoxLayout()
        color_label = QLabel("Accent Color:")
        color_label.setStyleSheet(f"color: {COLORS['text_secondary']};")
        color_row.addWidget(color_label)

        self.color_preview = QLabel()
        self.color_preview.setFixedSize(32, 32)
        self.color_preview.setStyleSheet(f"background-color: #888888; border: 1px solid {COLORS['border']}; border-radius: 4px;")
        color_row.addWidget(self.color_preview)

        self.color_input = QLineEdit()
        self.color_input.setPlaceholderText("#RRGGBB")
        self.color_input.setFixedWidth(100)
        self.color_input.textChanged.connect(self._on_color_input_changed)
        color_row.addWidget(self.color_input)

        self.color_picker_btn = QPushButton("Pick Color...")
        self.color_picker_btn.setProperty("secondary", True)
        self.color_picker_btn.setFixedWidth(100)
        self.color_picker_btn.clicked.connect(self._pick_color)
        color_row.addWidget(self.color_picker_btn)

        self.apply_color_btn = QPushButton("Apply to Java")
        self.apply_color_btn.setFixedWidth(120)
        self.apply_color_btn.setStyleSheet(f"""
            QPushButton {{
                background-color: {COLORS['primary_light']};
                color: {COLORS['text_inverse']};
                border: none;
                border-radius: 4px;
                padding: 8px 16px;
                font-weight: bold;
            }}
            QPushButton:hover {{ background-color: {COLORS['primary_hover']}; }}
            QPushButton:disabled {{
                background-color: {COLORS['border']};
                color: {COLORS['text_disabled']};
            }}
        """)
        self.apply_color_btn.clicked.connect(self._apply_notification_color)
        color_row.addWidget(self.apply_color_btn)

        color_row.addStretch()
        color_layout.addLayout(color_row)

        scroll_layout.addWidget(self.color_group)

        # Load current color from Java file
        self._load_current_notification_color()

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

    def _get_group(self, layer: str) -> LayerGroup:
        """Get the LayerGroup for a given layer type."""
        if layer == "foreground":
            return self.fg_group
        elif layer == "background":
            return self.bg_group
        else:
            return self.notif_group

    def _browse_source(self, layer: str):
        """Browse for a source PNG file."""
        group = self._get_group(layer)

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
        group = self._get_group(layer)

        if not group.source_path:
            QMessageBox.warning(self, "No Source", "Please select a source PNG first.")
            return

        # Get the filename based on layer type
        if layer == "notification":
            filename = "ic_notification.png"
            title = "Replace Notification Icon"
        else:
            filename = f"ic_launcher_{layer}.png"
            title = f"Replace {layer.title()} Layer"

        # Confirm
        img = QImage(str(group.source_path))
        reply = QMessageBox.question(
            self, title,
            f"This will replace {filename} in all mipmap density folders:\n\n"
            f"  • android/app/src/main/res/mipmap-*/\n"
            f"  • assets/base/release/icons/android/mipmap-*/\n\n"
            f"Source: {group.source_path.name} ({img.width()}×{img.height()})\n\n"
            "Continue?",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
        )
        if reply != QMessageBox.StandardButton.Yes:
            return

        # Replace
        progress = QProgressDialog(f"Replacing {layer}...", None, 0, 0, self)
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
                f"Successfully replaced {success} {layer} files!"
            )

        # Refresh previews
        group.refresh_previews()
        self.status_label.setText(f"Replaced {success} {layer} files")

    def _refresh_all_previews(self):
        """Refresh all preview images."""
        self.fg_group.refresh_previews()
        self.bg_group.refresh_previews()
        self.notif_group.refresh_previews()
        self.status_label.setText("Previews refreshed")

    def _get_java_helper_path(self) -> Path:
        """Get the path to CustomPushNotificationHelper.java."""
        return PROJECT_ROOT / "android" / "app" / "src" / "main" / "java" / "com" / "mattermost" / "helpers" / "CustomPushNotificationHelper.java"

    def _load_current_notification_color(self):
        """Load the current notification color from the Java file."""
        java_path = self._get_java_helper_path()
        if not java_path.exists():
            self.color_input.setText("")
            self.status_label.setText("Java file not found")
            return

        try:
            content = java_path.read_text(encoding='utf-8')
            # Look for .setColor(Color.parseColor("#XXXXXX"))
            match = re.search(r'\.setColor\(Color\.parseColor\("(#[0-9A-Fa-f]{6})"\)\)', content)
            if match:
                color = match.group(1).upper()
                self.color_input.setText(color)
                self._update_color_preview(color)
            else:
                self.color_input.setText("")
                self._update_color_preview(None)
        except Exception as e:
            self.status_label.setText(f"Error reading Java file: {e}")

    def _on_color_input_changed(self, text: str):
        """Update preview when color input changes."""
        text = text.strip()
        if re.match(r'^#[0-9A-Fa-f]{6}$', text):
            self._update_color_preview(text)
        else:
            self._update_color_preview(None)

    def _update_color_preview(self, color: str | None):
        """Update the color preview label."""
        if color:
            self.color_preview.setStyleSheet(
                f"background-color: {color}; border: 1px solid {COLORS['border']}; border-radius: 4px;"
            )
        else:
            self.color_preview.setStyleSheet(
                f"background-color: #888888; border: 1px solid {COLORS['border']}; border-radius: 4px;"
            )

    def _pick_color(self):
        """Open color picker dialog."""
        current = self.color_input.text().strip()
        initial = QColor(current) if re.match(r'^#[0-9A-Fa-f]{6}$', current) else QColor("#F2A900")

        color = QColorDialog.getColor(initial, self, "Select Notification Accent Color")
        if color.isValid():
            hex_color = color.name().upper()
            self.color_input.setText(hex_color)
            self._update_color_preview(hex_color)

    def _apply_notification_color(self):
        """Apply the notification color to the Java file."""
        color = self.color_input.text().strip().upper()
        if not re.match(r'^#[0-9A-Fa-f]{6}$', color):
            QMessageBox.warning(self, "Invalid Color", "Please enter a valid hex color (e.g., #F2A900)")
            return

        java_path = self._get_java_helper_path()
        if not java_path.exists():
            QMessageBox.warning(self, "File Not Found", f"Could not find:\n{java_path}")
            return

        try:
            content = java_path.read_text(encoding='utf-8')

            # Check if setColor already exists
            if '.setColor(Color.parseColor(' in content:
                # Replace existing color
                new_content = re.sub(
                    r'\.setColor\(Color\.parseColor\("#[0-9A-Fa-f]{6}"\)\)',
                    f'.setColor(Color.parseColor("{color}"))',
                    content
                )
            else:
                # Add setColor before the semicolon after .setAutoCancel(true)
                new_content = content.replace(
                    '.setAutoCancel(true);',
                    f'.setAutoCancel(true)\n                .setColor(Color.parseColor("{color}")); // Notification accent color'
                )

            if new_content == content:
                QMessageBox.warning(
                    self, "Could Not Apply",
                    "Could not find the expected code pattern in the Java file.\n"
                    "You may need to add .setColor() manually."
                )
                return

            java_path.write_text(new_content, encoding='utf-8')
            QMessageBox.information(
                self, "Success",
                f"Applied notification accent color: {color}\n\n"
                f"File: {java_path.name}"
            )
            self.status_label.setText(f"Applied color {color} to Java file")

        except Exception as e:
            QMessageBox.warning(self, "Error", f"Failed to update Java file:\n{e}")
