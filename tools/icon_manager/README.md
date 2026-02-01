# Icon Manager

A GUI tool for managing app icons in the Mattermost Mobile project. Converts SVG files to PNG icons at various resolutions for Android and iOS platforms.

## Features

- **SVG to PNG conversion** with automatic padding detection and cropping
- **Multi-platform support** for Android (mipmap) and iOS (appiconset)
- **Override support** - assign different SVGs or PNGs to specific icons
- **Before/after preview** - see exactly what icons will look like
- **Export/Import workflow** - export icons for manual editing, import from ZIP
- **Configuration persistence** - save your SVG and override settings

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
│   └── models.py         # IconBounds, IconTarget, Config
├── rendering/            # Image processing
│   ├── __init__.py
│   └── renderer.py       # SVG/PNG rendering utilities
└── ui/                   # User interface
    ├── __init__.py
    ├── widgets.py        # Reusable UI components
    └── main_window.py    # Main application window
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
