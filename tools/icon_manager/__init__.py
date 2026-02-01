"""
Icon Manager Tool for Mattermost Mobile

A GUI tool to convert SVG files to PNG icons at various resolutions
for Android and iOS platforms.

Usage:
    cd tools/icon_manager
    python main.py
"""

from .core import COLORS, Theme, PROJECT_ROOT, CONFIG_PATH, IconBounds, IconTarget, Config
from .rendering import (
    create_checkerboard,
    get_image_bounds,
    get_svg_content_bounds,
    load_icon_preview,
    render_png_to_bounds,
    render_svg_to_size,
    render_svg_cropped,
)
from .ui import IconPreviewLabel, ComparisonWidget, SvgInputWidget, IconManagerWindow

__all__ = [
    # Core
    'COLORS', 'Theme', 'PROJECT_ROOT', 'CONFIG_PATH',
    'IconBounds', 'IconTarget', 'Config',
    # Rendering
    'create_checkerboard', 'get_image_bounds', 'get_svg_content_bounds',
    'load_icon_preview', 'render_png_to_bounds', 'render_svg_to_size', 'render_svg_cropped',
    # UI
    'IconPreviewLabel', 'ComparisonWidget', 'SvgInputWidget', 'IconManagerWindow',
]
