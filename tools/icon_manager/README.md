# Icon Manager

A GUI tool for managing app icons in the Mattermost Mobile project. Converts SVG files to PNG icons at various resolutions for Android and iOS platforms.

## Features

- **SVG to PNG conversion** with automatic padding detection and cropping
- **Multi-platform support** for Android (mipmap) and iOS (appiconset)
- **Override support** - assign different SVGs or PNGs to specific icons
- **Before/after preview** - see exactly what icons will look like
- **Export/Import workflow** - export icons for manual editing, import from ZIP
- **Adaptive icon layer replacement** - dedicated tab for Android foreground/background layers with density previews
- **Configuration persistence** - save your SVG and override settings

## Tabs

The application has two main tabs:

1. **SVG Conversion** - The main workflow for converting SVG files to PNG icons
2. **Adaptive Icons** - Dedicated interface for replacing Android adaptive icon layers and notification icons

## Requirements

- Python 3.10+
- PyQt6
- PyQt6-svg (for SVG rendering)

Install dependencies:
```bash
pip install PyQt6 PyQt6-svg
```

## Usage

```bash
cd tools/icon_manager
python main.py
```

## Project Structure

```
tools/icon_manager/
├── main.py               # Entry point - run this
├── README.md             # This file
├── __init__.py           # Package exports
├── core/                 # Core data structures
│   ├── __init__.py
│   ├── constants.py      # Paths, colors, theme
│   ├── models.py         # IconBounds, IconTarget, Config
│   └── adaptive_icons.py # Adaptive icon layer replacement
├── rendering/            # Image processing
│   ├── __init__.py
│   └── renderer.py       # SVG/PNG rendering utilities
└── ui/                   # User interface
    ├── __init__.py
    ├── icons.py          # SVG icons for UI
    ├── widgets.py        # Reusable UI components
    ├── adaptive_tab.py   # Adaptive icon layer replacement tab
    └── main_window.py    # Main application window (tabbed)
```

## Basic Workflow

1. **Load a default SVG** - Click "Browse SVG..." to select your master icon SVG
2. **Review targets** - The table shows all icon targets found in the project
3. **Select icons** - Check the icons you want to generate (use "All", "None", "Android", "iOS" buttons)
4. **Generate** - Click "Generate & Replace Selected Icons"

## Using Overrides

Some icons may need different artwork (e.g., round icons, notification icons). You can assign overrides:

1. Select one or more icons in the table
2. Click "Set Override..." or right-click → "Set Override SVG..."
3. Choose an SVG or PNG file
4. The override column shows which icons have custom sources

## Export/Import Workflow

For manual touch-ups (e.g., in Photoshop/GIMP):

1. **Export Current** - Exports existing icons as-is for reference
2. **Export Generated** - Generates icons from SVG and exports them
3. Edit the exported PNGs as needed
4. ZIP the folder (keeping manifest.json)
5. **Import from ZIP** - Restores edited icons to their original locations

## Adaptive Icon Layer Replacement

The **Adaptive Icons** tab provides a dedicated interface for replacing Android adaptive icon layers and notification icons:

### Features
- **Density previews** - See current icons for all densities (mdpi through xxxhdpi)
- **Separate layers** - Replace foreground, background, or notification icons independently
- **PNG or SVG sources** - Use either PNG or SVG files as source (SVG is rendered at each density)
- **Per-density overrides** - Override specific densities with custom files
- **Automatic scaling** - Source is scaled/rendered to each density's required size
- **Context menus** - Right-click previews to open folder/file or copy path

### Basic Workflow
1. Switch to the **"Adaptive Icons"** tab
2. In the desired section (Foreground, Background, or Notification):
   - Click **"Select PNG..."** to use a PNG source, OR
   - Click **"Select SVG..."** to use an SVG source
3. Choose a high-resolution source (432×432 for adaptive layers, 192×192 for notification)
4. Review the current icons in the preview area
5. Click **"Replace All"** to replace across all densities

### Per-Density Overrides
For fine-grained control, you can override specific densities with custom files:

1. Click **"▶ Per-Density Overrides"** to expand the override section
2. For each density you want to customize, click **"Set Override..."**
3. Select a PNG or SVG file for that specific density
4. The override path appears next to the density name
5. Click **"Clear"** to remove an override and use the default source

This is useful when:
- Lower densities need a simplified version of the icon
- You have pre-made PNGs at specific sizes
- The SVG needs adjustments at certain densities

### When to Use the Adaptive Icons Tab
- You have pre-made foreground/background/notification files
- You want to replace layers without going through the full SVG conversion workflow
- You need to update just one layer while keeping the others
- You want per-density control over icon files

### Target Files
- **Foreground**: `ic_launcher_foreground.png` - The icon artwork with transparency
- **Background**: `ic_launcher_background.png` - The solid or gradient background
- **Notification**: `ic_notification.png` - Status bar icon (white silhouette on transparent)

### Target Directories
Files are replaced in:
- `android/app/src/main/res/mipmap-*/`
- `assets/base/release/icons/android/mipmap-*/`

### Density Sizes

**Adaptive Icon Layers (108dp base):**
| Density | Size |
|---------|------|
| mdpi | 108×108 |
| hdpi | 162×162 |
| xhdpi | 216×216 |
| xxhdpi | 324×324 |
| xxxhdpi | 432×432 |

**Notification Icons (48dp base, 24dp visible):**
| Density | Size |
|---------|------|
| mdpi | 48×48 |
| hdpi | 72×72 |
| xhdpi | 96×96 |
| xxhdpi | 144×144 |
| xxxhdpi | 192×192 |

## Saving Configuration

Click "Save Config" to save:
- Default SVG path
- All override assignments
- Enabled/disabled state for each icon
- Last browsed directory

Configuration is saved to `tools/icon_manager/icon_manager_config.json`.

## Icon Locations

The tool scans these directories for icon targets:

### Android
- `android/app/src/main/res/mipmap-*/`
  - `ic_launcher.png` - Main launcher icon
  - `ic_launcher_round.png` - Round launcher icon
  - `ic_launcher_foreground.png` - Adaptive icon foreground

### iOS
- `ios/Mattermost/Images.xcassets/AppIcon.appiconset/`
  - Various sizes defined in `Contents.json`

### Assets (for distribution)
- `assets/base/release/icons/android/`
- `assets/base/release/icons/ios/`

## Technical Details

### SVG Padding Detection

The tool automatically detects and crops padding from SVG files:
1. Renders SVG to a 512×512 image
2. Scans for non-transparent pixels (alpha > 10)
3. Calculates content bounding box
4. Uses transform matrices to render only the content area

### Adaptive Icon Support

Android adaptive icons (`ic_launcher_foreground.png`) have specific content bounds:
- The tool detects the existing content area
- New content is rendered into the same area
- Maintains compatibility with the adaptive icon system

### PNG Override Rendering

When using PNG overrides:
1. Source PNG is scanned for content bounds
2. Content is cropped to remove padding
3. Scaled to fit target area while maintaining aspect ratio
4. Centered in the destination bounds
