#!/usr/bin/env python3
"""
Icon Manager Tool for Mattermost Mobile
Converts SVG files to PNG icons at various resolutions for Android and iOS.
"""

import sys
import os
import json
from pathlib import Path
from dataclasses import dataclass
from typing import Optional

from PyQt6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QPushButton, QLabel, QFileDialog, QTreeWidget, QTreeWidgetItem,
    QGroupBox, QSplitter, QMessageBox, QProgressDialog, QCheckBox,
    QFrame, QScrollArea
)
from PyQt6.QtCore import Qt, QSize
from PyQt6.QtGui import QPixmap, QImage, QPainter, QColor
from PyQt6.QtSvg import QSvgRenderer

# Project paths relative to this script
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent
ANDROID_RES_DIR = PROJECT_ROOT / "android" / "app" / "src" / "main" / "res"
IOS_ASSETS_DIR = PROJECT_ROOT / "ios" / "Mattermost" / "Images.xcassets" / "AppIcon.appiconset"
ASSETS_ANDROID_DIR = PROJECT_ROOT / "assets" / "base" / "release" / "icons" / "android"
ASSETS_IOS_DIR = PROJECT_ROOT / "assets" / "base" / "release" / "icons" / "ios"


@dataclass
class IconTarget:
    """Represents a target icon file to generate."""
    name: str
    width: int
    height: int
    path: Path
    category: str  # 'android', 'ios', 'assets_android', 'assets_ios'

    def __str__(self):
        return f"{self.name} ({self.width}x{self.height})"


class IconPreview(QLabel):
    """Widget to preview an icon with a checkerboard background."""

    def __init__(self, size: int = 128):
        super().__init__()
        self.preview_size = size
        self.setFixedSize(size, size)
        self.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.setStyleSheet("""
            QLabel {
                border: 1px solid #ccc;
                border-radius: 8px;
                background-color: #f0f0f0;
            }
        """)
        self.clear_preview()

    def clear_preview(self):
        """Show placeholder."""
        self.setText("No SVG\nLoaded")
        self.setStyleSheet("""
            QLabel {
                border: 2px dashed #ccc;
                border-radius: 8px;
                background-color: #f9f9f9;
                color: #999;
            }
        """)

    def set_svg(self, svg_path: Path):
        """Render SVG preview."""
        renderer = QSvgRenderer(str(svg_path))
        if not renderer.isValid():
            self.clear_preview()
            return False

        # Create image with transparency
        image = QImage(self.preview_size, self.preview_size, QImage.Format.Format_ARGB32)
        image.fill(Qt.GlobalColor.transparent)

        painter = QPainter(image)
        renderer.render(painter)
        painter.end()

        # Create checkerboard background
        bg = QPixmap(self.preview_size, self.preview_size)
        bg_painter = QPainter(bg)
        tile_size = 8
        for y in range(0, self.preview_size, tile_size):
            for x in range(0, self.preview_size, tile_size):
                color = QColor(255, 255, 255) if (x // tile_size + y // tile_size) % 2 == 0 else QColor(220, 220, 220)
                bg_painter.fillRect(x, y, tile_size, tile_size, color)
        bg_painter.drawImage(0, 0, image)
        bg_painter.end()

        self.setPixmap(bg)
        self.setStyleSheet("""
            QLabel {
                border: 1px solid #ccc;
                border-radius: 8px;
            }
        """)
        return True


class IconManagerWindow(QMainWindow):
    """Main window for the Icon Manager tool."""

    def __init__(self):
        super().__init__()
        self.svg_path: Optional[Path] = None
        self.targets: list[IconTarget] = []
        self.init_ui()
        self.scan_targets()

    def init_ui(self):
        """Initialize the user interface."""
        self.setWindowTitle("Mattermost Icon Manager")
        self.setMinimumSize(900, 700)

        central = QWidget()
        self.setCentralWidget(central)
        layout = QVBoxLayout(central)
        layout.setSpacing(12)
        layout.setContentsMargins(16, 16, 16, 16)

        # Top section: SVG input
        input_group = QGroupBox("SVG Input")
        input_layout = QHBoxLayout(input_group)

        # Preview
        self.preview = IconPreview(128)
        input_layout.addWidget(self.preview)

        # File selection
        file_layout = QVBoxLayout()
        self.file_label = QLabel("No file selected")
        self.file_label.setWordWrap(True)
        self.file_label.setStyleSheet("color: #666;")
        file_layout.addWidget(self.file_label)

        btn_layout = QHBoxLayout()
        self.browse_btn = QPushButton("Browse SVG...")
        self.browse_btn.clicked.connect(self.browse_svg)
        btn_layout.addWidget(self.browse_btn)
        btn_layout.addStretch()
        file_layout.addLayout(btn_layout)
        file_layout.addStretch()

        input_layout.addLayout(file_layout, 1)
        layout.addWidget(input_group)

        # Middle section: Target selection
        targets_group = QGroupBox("Target Icons")
        targets_layout = QVBoxLayout(targets_group)

        # Selection buttons
        sel_layout = QHBoxLayout()
        self.select_all_btn = QPushButton("Select All")
        self.select_all_btn.clicked.connect(self.select_all)
        self.select_none_btn = QPushButton("Select None")
        self.select_none_btn.clicked.connect(self.select_none)
        self.select_android_btn = QPushButton("Select Android")
        self.select_android_btn.clicked.connect(lambda: self.select_category("android"))
        self.select_ios_btn = QPushButton("Select iOS")
        self.select_ios_btn.clicked.connect(lambda: self.select_category("ios"))

        sel_layout.addWidget(self.select_all_btn)
        sel_layout.addWidget(self.select_none_btn)
        sel_layout.addWidget(self.select_android_btn)
        sel_layout.addWidget(self.select_ios_btn)
        sel_layout.addStretch()
        targets_layout.addLayout(sel_layout)

        # Tree widget for targets
        self.tree = QTreeWidget()
        self.tree.setHeaderLabels(["Icon", "Size", "Path"])
        self.tree.setColumnWidth(0, 250)
        self.tree.setColumnWidth(1, 100)
        self.tree.setAlternatingRowColors(True)
        targets_layout.addWidget(self.tree)

        layout.addWidget(targets_group, 1)

        # Bottom section: Actions
        action_layout = QHBoxLayout()

        self.status_label = QLabel("Ready")
        self.status_label.setStyleSheet("color: #666;")
        action_layout.addWidget(self.status_label, 1)

        self.generate_btn = QPushButton("Generate && Replace Icons")
        self.generate_btn.setEnabled(False)
        self.generate_btn.setStyleSheet("""
            QPushButton {
                background-color: #2389d7;
                color: white;
                padding: 8px 24px;
                border: none;
                border-radius: 4px;
                font-weight: bold;
            }
            QPushButton:hover {
                background-color: #1c7ac0;
            }
            QPushButton:disabled {
                background-color: #ccc;
            }
        """)
        self.generate_btn.clicked.connect(self.generate_icons)
        action_layout.addWidget(self.generate_btn)

        layout.addLayout(action_layout)

    def scan_targets(self):
        """Scan project directories for icon targets."""
        self.targets.clear()
        self.tree.clear()

        categories = {
            "Android (Project)": ("android", ANDROID_RES_DIR),
            "iOS (Project)": ("ios", IOS_ASSETS_DIR),
            "Android (Assets)": ("assets_android", ASSETS_ANDROID_DIR),
            "iOS (Assets)": ("assets_ios", ASSETS_IOS_DIR),
        }

        for cat_name, (cat_id, base_path) in categories.items():
            if not base_path.exists():
                continue

            cat_item = QTreeWidgetItem([cat_name, "", ""])
            cat_item.setFlags(cat_item.flags() | Qt.ItemFlag.ItemIsAutoTristate)
            cat_item.setCheckState(0, Qt.CheckState.Checked)
            self.tree.addTopLevelItem(cat_item)

            if cat_id in ("android", "assets_android"):
                self._scan_android_icons(base_path, cat_id, cat_item)
            else:
                self._scan_ios_icons(base_path, cat_id, cat_item)

            cat_item.setExpanded(True)

        self.status_label.setText(f"Found {len(self.targets)} icon targets")

    def _scan_android_icons(self, base_path: Path, category: str, parent_item: QTreeWidgetItem):
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
                    target = IconTarget(
                        name=f"{mipmap_dir}/{icon_file}",
                        width=size,
                        height=size,
                        path=icon_path,
                        category=category
                    )
                    self.targets.append(target)

                    item = QTreeWidgetItem([icon_file, f"{size}x{size}", str(icon_path.relative_to(PROJECT_ROOT))])
                    item.setCheckState(0, Qt.CheckState.Checked)
                    item.setData(0, Qt.ItemDataRole.UserRole, len(self.targets) - 1)

                    # Find or create mipmap folder item
                    folder_item = None
                    for i in range(parent_item.childCount()):
                        if parent_item.child(i).text(0) == mipmap_dir:
                            folder_item = parent_item.child(i)
                            break

                    if folder_item is None:
                        folder_item = QTreeWidgetItem([mipmap_dir, "", ""])
                        folder_item.setFlags(folder_item.flags() | Qt.ItemFlag.ItemIsAutoTristate)
                        folder_item.setCheckState(0, Qt.CheckState.Checked)
                        parent_item.addChild(folder_item)

                    folder_item.addChild(item)

    def _scan_ios_icons(self, base_path: Path, category: str, parent_item: QTreeWidgetItem):
        """Scan iOS appiconset directory."""
        contents_path = base_path / "Contents.json"

        if contents_path.exists():
            # Parse Contents.json for icon definitions
            with open(contents_path) as f:
                contents = json.load(f)

            for image in contents.get("images", []):
                filename = image.get("filename")
                if not filename:
                    continue

                icon_path = base_path / filename
                if not icon_path.exists():
                    continue

                # Parse size from scale and size fields
                size_str = image.get("size", "60x60")
                scale_str = image.get("scale", "1x")

                base_size = float(size_str.split("x")[0])
                scale = float(scale_str.replace("x", ""))
                size = int(base_size * scale)

                target = IconTarget(
                    name=filename,
                    width=size,
                    height=size,
                    path=icon_path,
                    category=category
                )
                self.targets.append(target)

                item = QTreeWidgetItem([filename, f"{size}x{size}", str(icon_path.relative_to(PROJECT_ROOT))])
                item.setCheckState(0, Qt.CheckState.Checked)
                item.setData(0, Qt.ItemDataRole.UserRole, len(self.targets) - 1)
                parent_item.addChild(item)
        else:
            # Fallback: scan PNG files and read their actual sizes
            for icon_path in base_path.glob("*.png"):
                img = QImage(str(icon_path))
                if img.isNull():
                    continue

                target = IconTarget(
                    name=icon_path.name,
                    width=img.width(),
                    height=img.height(),
                    path=icon_path,
                    category=category
                )
                self.targets.append(target)

                item = QTreeWidgetItem([icon_path.name, f"{img.width()}x{img.height()}", str(icon_path.relative_to(PROJECT_ROOT))])
                item.setCheckState(0, Qt.CheckState.Checked)
                item.setData(0, Qt.ItemDataRole.UserRole, len(self.targets) - 1)
                parent_item.addChild(item)

    def browse_svg(self):
        """Open file dialog to select SVG file."""
        path, _ = QFileDialog.getOpenFileName(
            self,
            "Select SVG Icon",
            str(PROJECT_ROOT),
            "SVG Files (*.svg);;All Files (*)"
        )

        if path:
            self.svg_path = Path(path)
            if self.preview.set_svg(self.svg_path):
                self.file_label.setText(str(self.svg_path))
                self.file_label.setStyleSheet("color: #333;")
                self.generate_btn.setEnabled(True)
                self.status_label.setText(f"Loaded: {self.svg_path.name}")
            else:
                QMessageBox.warning(self, "Invalid SVG", "Could not load the selected SVG file.")
                self.svg_path = None
                self.file_label.setText("No file selected")
                self.file_label.setStyleSheet("color: #666;")
                self.generate_btn.setEnabled(False)

    def select_all(self):
        """Select all targets."""
        self._set_all_checked(Qt.CheckState.Checked)

    def select_none(self):
        """Deselect all targets."""
        self._set_all_checked(Qt.CheckState.Unchecked)

    def _set_all_checked(self, state: Qt.CheckState):
        """Set check state for all items."""
        for i in range(self.tree.topLevelItemCount()):
            item = self.tree.topLevelItem(i)
            item.setCheckState(0, state)

    def select_category(self, category: str):
        """Select only items in a specific category."""
        self._set_all_checked(Qt.CheckState.Unchecked)

        for i in range(self.tree.topLevelItemCount()):
            top_item = self.tree.topLevelItem(i)
            text = top_item.text(0).lower()
            if category.lower() in text:
                top_item.setCheckState(0, Qt.CheckState.Checked)

    def get_selected_targets(self) -> list[IconTarget]:
        """Get list of selected targets."""
        selected = []

        def check_item(item: QTreeWidgetItem):
            idx = item.data(0, Qt.ItemDataRole.UserRole)
            if idx is not None and item.checkState(0) == Qt.CheckState.Checked:
                selected.append(self.targets[idx])

            for i in range(item.childCount()):
                check_item(item.child(i))

        for i in range(self.tree.topLevelItemCount()):
            check_item(self.tree.topLevelItem(i))

        return selected

    def generate_icons(self):
        """Generate and replace selected icons."""
        if not self.svg_path:
            QMessageBox.warning(self, "No SVG", "Please select an SVG file first.")
            return

        selected = self.get_selected_targets()
        if not selected:
            QMessageBox.warning(self, "No Targets", "Please select at least one target icon.")
            return

        # Confirm
        reply = QMessageBox.question(
            self,
            "Confirm Replace",
            f"This will replace {len(selected)} icon files.\n\nContinue?",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
        )

        if reply != QMessageBox.StandardButton.Yes:
            return

        # Progress dialog
        progress = QProgressDialog("Generating icons...", "Cancel", 0, len(selected), self)
        progress.setWindowModality(Qt.WindowModality.WindowModal)
        progress.setMinimumDuration(0)

        renderer = QSvgRenderer(str(self.svg_path))
        if not renderer.isValid():
            QMessageBox.critical(self, "Error", "Failed to load SVG file.")
            return

        errors = []
        for i, target in enumerate(selected):
            if progress.wasCanceled():
                break

            progress.setValue(i)
            progress.setLabelText(f"Generating {target.name}...")
            QApplication.processEvents()

            try:
                # Create image at target size
                image = QImage(target.width, target.height, QImage.Format.Format_ARGB32)
                image.fill(Qt.GlobalColor.transparent)

                painter = QPainter(image)
                painter.setRenderHint(QPainter.RenderHint.Antialiasing)
                painter.setRenderHint(QPainter.RenderHint.SmoothPixmapTransform)
                renderer.render(painter)
                painter.end()

                # Ensure parent directory exists
                target.path.parent.mkdir(parents=True, exist_ok=True)

                # Save
                if not image.save(str(target.path), "PNG"):
                    errors.append(f"Failed to save: {target.path}")
            except Exception as e:
                errors.append(f"{target.path}: {e}")

        progress.setValue(len(selected))

        if errors:
            QMessageBox.warning(
                self,
                "Completed with Errors",
                f"Generated {len(selected) - len(errors)} icons.\n\nErrors:\n" + "\n".join(errors[:10])
            )
        else:
            QMessageBox.information(
                self,
                "Success",
                f"Successfully generated {len(selected)} icons!"
            )

        self.status_label.setText(f"Generated {len(selected) - len(errors)}/{len(selected)} icons")


def main():
    app = QApplication(sys.argv)
    app.setStyle("Fusion")

    # Set application-wide stylesheet
    app.setStyleSheet("""
        QMainWindow {
            background-color: #f5f5f5;
        }
        QGroupBox {
            font-weight: bold;
            border: 1px solid #ddd;
            border-radius: 6px;
            margin-top: 12px;
            padding-top: 12px;
        }
        QGroupBox::title {
            subcontrol-origin: margin;
            left: 12px;
            padding: 0 8px;
        }
        QTreeWidget {
            border: 1px solid #ddd;
            border-radius: 4px;
            background-color: white;
        }
        QTreeWidget::item {
            padding: 4px;
        }
        QPushButton {
            padding: 6px 16px;
            border: 1px solid #ccc;
            border-radius: 4px;
            background-color: white;
        }
        QPushButton:hover {
            background-color: #f0f0f0;
        }
    """)

    window = IconManagerWindow()
    window.show()

    sys.exit(app.exec())


if __name__ == "__main__":
    main()
