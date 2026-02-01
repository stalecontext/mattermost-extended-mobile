"""
Main window for the Icon Manager application.
"""

import json
import shutil
import zipfile
from pathlib import Path

from PyQt6.QtWidgets import (
    QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QPushButton, QLabel, QFileDialog, QTableWidget, QTableWidgetItem,
    QMessageBox, QProgressDialog, QHeaderView,
    QAbstractItemView, QCheckBox, QMenu, QApplication
)
from PyQt6.QtCore import Qt
from PyQt6.QtGui import QImage, QColor, QIcon, QAction
from PyQt6.QtSvg import QSvgRenderer

from ..core import (
    COLORS, PROJECT_ROOT, CONFIG_PATH,
    ANDROID_RES_DIR, IOS_ASSETS_DIR, ASSETS_ANDROID_DIR, ASSETS_IOS_DIR,
    MIPMAP_SIZES, ANDROID_ICON_FILES,
    IconTarget, IconBounds, Config,
)
from ..rendering import (
    get_image_bounds, get_svg_content_bounds, load_icon_preview,
    render_svg_cropped, render_png_to_bounds,
)
from .widgets import SvgInputWidget, ComparisonWidget


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

        # Export/Import row
        export_row = QHBoxLayout()

        self.export_btn = QPushButton("Export Current...")
        self.export_btn.setProperty("secondary", True)
        self.export_btn.clicked.connect(self._export_icons)
        self.export_btn.setToolTip("Export current icons as-is for manual editing")
        export_row.addWidget(self.export_btn)

        self.export_generated_btn = QPushButton("Export Generated...")
        self.export_generated_btn.setProperty("secondary", True)
        self.export_generated_btn.clicked.connect(self._export_generated_icons)
        self.export_generated_btn.setToolTip("Generate icons from SVG and export for manual touch-ups")
        export_row.addWidget(self.export_generated_btn)

        self.import_btn = QPushButton("Import from ZIP...")
        self.import_btn.setProperty("secondary", True)
        self.import_btn.clicked.connect(self._import_icons)
        self.import_btn.setToolTip("Import edited icons from a ZIP file")
        export_row.addWidget(self.import_btn)

        export_row.addStretch()
        right_panel.addLayout(export_row)

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
        for mipmap_dir, size in MIPMAP_SIZES.items():
            mipmap_path = base_path / mipmap_dir
            if not mipmap_path.exists():
                continue
            for icon_file in ANDROID_ICON_FILES:
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

        # Refresh the preview (including info label)
        self._on_selection_changed()
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

        # Refresh the preview (including info label)
        self._on_selection_changed()
        self.status_label.setText(f"Cleared override for {len(rows)} icon(s)")

    def _save_config(self):
        self.config.default_svg = str(self.svg_input.svg_path) if self.svg_input.svg_path else None
        self.config.overrides = {}

        for target in self.targets:
            if target.override_path:
                self.config.overrides[target.rel_path] = str(target.override_path)

        self.config.save(CONFIG_PATH)
        self.status_label.setText(f"Config saved to {CONFIG_PATH.name}")

    def _export_icons(self):
        """Export selected icons to a folder for manual editing."""
        selected = self._get_selected_targets()
        if not selected:
            QMessageBox.warning(self, "No Selection", "Please select icons to export.")
            return

        folder = QFileDialog.getExistingDirectory(
            self, "Select Export Folder", self._get_browse_dir()
        )
        if not folder:
            return

        export_path = Path(folder)
        self._update_browse_dir(export_path / "dummy")

        manifest = {
            "description": "Icon export manifest - maps exported filenames to original paths",
            "project_root": str(PROJECT_ROOT),
            "icons": {}
        }

        progress = QProgressDialog("Exporting icons...", "Cancel", 0, len(selected), self)
        progress.setWindowModality(Qt.WindowModality.WindowModal)
        progress.setMinimumDuration(0)

        exported = 0
        for i, target in enumerate(selected):
            if progress.wasCanceled():
                break

            progress.setValue(i)
            QApplication.processEvents()

            rel_parts = Path(target.rel_path).parts
            safe_name = "_".join(rel_parts).replace("\\", "_").replace("/", "_")
            if not safe_name.endswith(".png"):
                safe_name = safe_name.replace(".png", "") + ".png"

            dest_file = export_path / safe_name

            try:
                shutil.copy2(target.path, dest_file)
                manifest["icons"][safe_name] = target.rel_path
                exported += 1
            except Exception as e:
                QMessageBox.warning(self, "Export Error", f"Failed to export {target.name}: {e}")

        progress.setValue(len(selected))

        manifest_path = export_path / "manifest.json"
        with open(manifest_path, "w") as f:
            json.dump(manifest, f, indent=2)

        QMessageBox.information(
            self, "Export Complete",
            f"Exported {exported} icons to:\n{export_path}\n\n"
            f"A manifest.json file was created to track original locations.\n\n"
            "To import edited icons:\n"
            "1. Edit the PNGs as needed\n"
            "2. ZIP the folder (including manifest.json)\n"
            "3. Use 'Import from ZIP...' to restore them"
        )
        self.status_label.setText(f"Exported {exported} icons to {export_path.name}")

    def _export_generated_icons(self):
        """Generate icons from SVG and export to a folder for manual touch-ups."""
        selected = self._get_selected_targets()
        if not selected:
            QMessageBox.warning(self, "No Selection", "Please select icons to export.")
            return

        missing = [t for t in selected if not t.override_path and not self.svg_input.svg_renderer]
        if missing:
            QMessageBox.warning(self, "Missing Source",
                f"{len(missing)} icons have no source (no default SVG or override).\n\n"
                "Please set a default SVG or assign overrides to all selected icons.")
            return

        folder = QFileDialog.getExistingDirectory(
            self, "Select Export Folder", self._get_browse_dir()
        )
        if not folder:
            return

        export_path = Path(folder)
        self._update_browse_dir(export_path / "dummy")

        manifest = {
            "description": "Icon export manifest - maps exported filenames to original paths",
            "project_root": str(PROJECT_ROOT),
            "generated": True,
            "icons": {}
        }

        progress = QProgressDialog("Generating and exporting icons...", "Cancel", 0, len(selected), self)
        progress.setWindowModality(Qt.WindowModality.WindowModal)
        progress.setMinimumDuration(0)

        svg_cache: dict[Path, tuple[QSvgRenderer, IconBounds]] = {}

        def get_svg_data(svg_path: Path) -> tuple[QSvgRenderer, IconBounds]:
            if svg_path not in svg_cache:
                renderer = QSvgRenderer(str(svg_path))
                bounds = get_svg_content_bounds(renderer)
                svg_cache[svg_path] = (renderer, bounds)
            return svg_cache[svg_path]

        exported = 0
        errors = []

        for i, target in enumerate(selected):
            if progress.wasCanceled():
                break

            progress.setValue(i)
            progress.setLabelText(f"Generating {target.name}...")
            QApplication.processEvents()

            rel_parts = Path(target.rel_path).parts
            safe_name = "_".join(rel_parts).replace("\\", "_").replace("/", "_")
            if not safe_name.endswith(".png"):
                safe_name = safe_name.replace(".png", "") + ".png"

            dest_file = export_path / safe_name

            try:
                if target.override_is_png:
                    source = QImage(str(target.override_path))
                    image = render_png_to_bounds(source, target)
                else:
                    svg_path = target.override_path or self.svg_input.svg_path
                    renderer, svg_bounds = get_svg_data(svg_path)
                    image = render_svg_cropped(renderer, target, svg_bounds)

                if not image.save(str(dest_file), "PNG"):
                    errors.append(f"Failed to save: {target.name}")
                else:
                    manifest["icons"][safe_name] = target.rel_path
                    exported += 1
            except Exception as e:
                errors.append(f"{target.name}: {e}")

        progress.setValue(len(selected))

        manifest_path = export_path / "manifest.json"
        with open(manifest_path, "w") as f:
            json.dump(manifest, f, indent=2)

        if errors:
            QMessageBox.warning(
                self, "Export Completed with Errors",
                f"Exported {exported}/{len(selected)} icons.\n\nErrors:\n" + "\n".join(errors[:10])
            )
        else:
            QMessageBox.information(
                self, "Export Complete",
                f"Generated and exported {exported} icons to:\n{export_path}\n\n"
                "These are the SVG-generated versions ready for touch-ups.\n\n"
                "To import after editing:\n"
                "1. Edit the PNGs as needed\n"
                "2. ZIP the folder (including manifest.json)\n"
                "3. Use 'Import from ZIP...' to apply them"
            )

        self.status_label.setText(f"Generated and exported {exported} icons")

    def _import_icons(self):
        """Import icons from a ZIP file using the manifest."""
        zip_path, _ = QFileDialog.getOpenFileName(
            self, "Select ZIP File", self._get_browse_dir(),
            "ZIP Files (*.zip);;All Files (*)"
        )
        if not zip_path:
            return

        self._update_browse_dir(Path(zip_path))

        try:
            with zipfile.ZipFile(zip_path, 'r') as zf:
                manifest_data = None
                manifest_name = None

                for name in zf.namelist():
                    if name.endswith("manifest.json"):
                        manifest_name = name
                        manifest_data = json.loads(zf.read(name).decode('utf-8'))
                        break

                if not manifest_data:
                    QMessageBox.warning(
                        self, "Invalid ZIP",
                        "No manifest.json found in ZIP file.\n\n"
                        "The ZIP must contain the manifest.json from the export."
                    )
                    return

                icons_map = manifest_data.get("icons", {})
                if not icons_map:
                    QMessageBox.warning(self, "Empty Manifest", "No icons found in manifest.")
                    return

                prefix = ""
                if manifest_name and "/" in manifest_name:
                    prefix = manifest_name.rsplit("/", 1)[0] + "/"

                found_icons = []
                for exported_name, rel_path in icons_map.items():
                    zip_name = prefix + exported_name
                    if zip_name in zf.namelist():
                        target_path = PROJECT_ROOT / rel_path
                        found_icons.append((zip_name, target_path, rel_path))

                if not found_icons:
                    QMessageBox.warning(self, "No Icons", "No matching icon files found in ZIP.")
                    return

                reply = QMessageBox.question(
                    self, "Confirm Import",
                    f"This will replace {len(found_icons)} icon files with versions from the ZIP.\n\n"
                    "This cannot be undone. Continue?",
                    QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
                )
                if reply != QMessageBox.StandardButton.Yes:
                    return

                progress = QProgressDialog("Importing icons...", "Cancel", 0, len(found_icons), self)
                progress.setWindowModality(Qt.WindowModality.WindowModal)
                progress.setMinimumDuration(0)

                imported = 0
                errors = []

                for i, (zip_name, target_path, rel_path) in enumerate(found_icons):
                    if progress.wasCanceled():
                        break

                    progress.setValue(i)
                    QApplication.processEvents()

                    try:
                        target_path.parent.mkdir(parents=True, exist_ok=True)
                        with zf.open(zip_name) as src, open(target_path, 'wb') as dst:
                            dst.write(src.read())
                        imported += 1
                    except Exception as e:
                        errors.append(f"{rel_path}: {e}")

                progress.setValue(len(found_icons))

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
                        self, "Import Completed with Errors",
                        f"Imported {imported}/{len(found_icons)} icons.\n\nErrors:\n" + "\n".join(errors[:10])
                    )
                else:
                    QMessageBox.information(
                        self, "Import Complete",
                        f"Successfully imported {imported} icons!"
                    )

                self.status_label.setText(f"Imported {imported} icons from ZIP")

        except zipfile.BadZipFile:
            QMessageBox.warning(self, "Invalid ZIP", "The selected file is not a valid ZIP archive.")
        except Exception as e:
            QMessageBox.warning(self, "Import Error", f"Failed to import: {e}")

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
                if target.override_is_png:
                    source = QImage(str(target.override_path))
                    image = render_png_to_bounds(source, target)
                else:
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
