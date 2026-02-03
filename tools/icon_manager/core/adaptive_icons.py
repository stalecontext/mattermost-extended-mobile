"""
Adaptive icon layer replacement utilities.

This module handles copying source PNGs to all Android mipmap density folders
for adaptive icon foreground and background layers, and notification icons.
Also supports SVG sources with automatic rendering to PNG at each density.
"""

from pathlib import Path
from typing import Literal

from PyQt6.QtCore import Qt, QByteArray, QRectF
from PyQt6.QtGui import QImage, QPainter
from PyQt6.QtSvg import QSvgRenderer

from .constants import ADAPTIVE_ICON_SIZES, MIPMAP_SIZES, ANDROID_RES_DIR, ASSETS_ANDROID_DIR


LayerType = Literal["foreground", "background", "notification"]


def get_layer_filename(layer: LayerType) -> str:
    """Get the filename for an adaptive icon layer or notification icon."""
    if layer == "notification":
        return "ic_notification.png"
    return f"ic_launcher_{layer}.png"


def get_layer_sizes(layer: LayerType) -> dict[str, int]:
    """Get the size mapping for a layer type."""
    if layer == "notification":
        return MIPMAP_SIZES  # 48dp base (24dp actual icon)
    return ADAPTIVE_ICON_SIZES  # 108dp base


def get_target_directories() -> list[Path]:
    """Get all directories that contain adaptive icon layers."""
    return [ANDROID_RES_DIR, ASSETS_ANDROID_DIR]


def get_layer_targets(layer: LayerType) -> list[tuple[Path, int]]:
    """
    Get all target paths and sizes for a layer type.

    Returns:
        List of (path, size) tuples for each mipmap density.
    """
    filename = get_layer_filename(layer)
    sizes = get_layer_sizes(layer)
    targets = []

    for base_dir in get_target_directories():
        if not base_dir.exists():
            continue
        for mipmap_dir, size in sizes.items():
            target_path = base_dir / mipmap_dir / filename
            if target_path.parent.exists():
                targets.append((target_path, size))

    return targets


def replace_layer(source_path: Path, layer: LayerType) -> tuple[int, list[str]]:
    """
    Replace an adaptive icon layer across all mipmap densities.

    The source PNG is scaled to each density's required size.

    Args:
        source_path: Path to the source PNG file.
        layer: Either "foreground" or "background".

    Returns:
        Tuple of (success_count, error_messages).
    """
    source = QImage(str(source_path))
    if source.isNull():
        return 0, [f"Failed to load source image: {source_path}"]

    targets = get_layer_targets(layer)
    if not targets:
        return 0, ["No target directories found"]

    success = 0
    errors = []

    for target_path, size in targets:
        try:
            # Scale to target size
            scaled = source.scaled(
                size, size,
                Qt.AspectRatioMode.IgnoreAspectRatio,
                Qt.TransformationMode.SmoothTransformation
            )

            # Ensure parent directory exists
            target_path.parent.mkdir(parents=True, exist_ok=True)

            # Save the scaled image
            if scaled.save(str(target_path), "PNG"):
                success += 1
            else:
                errors.append(f"Failed to save: {target_path}")
        except Exception as e:
            errors.append(f"{target_path}: {e}")

    return success, errors


def get_layer_preview(layer: LayerType) -> Path | None:
    """
    Get the path to an existing layer file for preview.

    Returns the highest density version available.
    """
    filename = get_layer_filename(layer)

    # Check in order of preference (highest density first)
    density_order = ["mipmap-xxxhdpi", "mipmap-xxhdpi", "mipmap-xhdpi", "mipmap-hdpi", "mipmap-mdpi"]

    for base_dir in get_target_directories():
        if not base_dir.exists():
            continue
        for mipmap_dir in density_order:
            path = base_dir / mipmap_dir / filename
            if path.exists():
                return path

    return None


def render_svg_to_image(svg_path: Path, size: int) -> QImage | None:
    """
    Render an SVG file to a QImage at the specified size.

    Args:
        svg_path: Path to the SVG file.
        size: Target size (both width and height).

    Returns:
        QImage or None if rendering failed.
    """
    try:
        with open(svg_path, 'rb') as f:
            svg_data = f.read()

        renderer = QSvgRenderer(QByteArray(svg_data))
        if not renderer.isValid():
            return None

        image = QImage(size, size, QImage.Format.Format_ARGB32)
        image.fill(Qt.GlobalColor.transparent)

        painter = QPainter(image)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        painter.setRenderHint(QPainter.RenderHint.SmoothPixmapTransform)
        renderer.render(painter, QRectF(0, 0, size, size))
        painter.end()

        return image
    except Exception:
        return None


def replace_layer_from_svg(svg_path: Path, layer: LayerType) -> tuple[int, list[str]]:
    """
    Replace an adaptive icon layer from an SVG source.

    The SVG is rendered at each density's required size.

    Args:
        svg_path: Path to the source SVG file.
        layer: Layer type ("foreground", "background", or "notification").

    Returns:
        Tuple of (success_count, error_messages).
    """
    # Validate SVG
    try:
        with open(svg_path, 'rb') as f:
            svg_data = f.read()
        renderer = QSvgRenderer(QByteArray(svg_data))
        if not renderer.isValid():
            return 0, [f"Invalid SVG file: {svg_path}"]
    except Exception as e:
        return 0, [f"Failed to load SVG: {e}"]

    targets = get_layer_targets(layer)
    if not targets:
        return 0, ["No target directories found"]

    success = 0
    errors = []

    for target_path, size in targets:
        try:
            # Render SVG at target size
            image = render_svg_to_image(svg_path, size)
            if image is None:
                errors.append(f"Failed to render SVG at {size}x{size}")
                continue

            # Ensure parent directory exists
            target_path.parent.mkdir(parents=True, exist_ok=True)

            # Save the rendered image
            if image.save(str(target_path), "PNG"):
                success += 1
            else:
                errors.append(f"Failed to save: {target_path}")
        except Exception as e:
            errors.append(f"{target_path}: {e}")

    return success, errors


def replace_layer_with_overrides(
    source_path: Path,
    layer: LayerType,
    overrides: dict[str, Path] | None = None,
    is_svg: bool = False
) -> tuple[int, list[str]]:
    """
    Replace an adaptive icon layer with optional per-density overrides.

    Args:
        source_path: Default source file (PNG or SVG).
        layer: Layer type ("foreground", "background", or "notification").
        overrides: Dict mapping density names (e.g., "mipmap-xxhdpi") to override file paths.
        is_svg: If True, treat source_path as SVG.

    Returns:
        Tuple of (success_count, error_messages).
    """
    overrides = overrides or {}

    targets = get_layer_targets(layer)
    if not targets:
        return 0, ["No target directories found"]

    # Load default source
    if is_svg:
        default_source = None  # Will render on demand
    else:
        default_source = QImage(str(source_path))
        if default_source.isNull():
            return 0, [f"Failed to load source image: {source_path}"]

    success = 0
    errors = []

    for target_path, size in targets:
        density = target_path.parent.name
        override_path = overrides.get(density)

        try:
            if override_path and override_path.exists():
                # Use override file for this density
                override_ext = override_path.suffix.lower()
                if override_ext == '.svg':
                    image = render_svg_to_image(override_path, size)
                    if image is None:
                        errors.append(f"Failed to render override SVG for {density}")
                        continue
                else:
                    override_img = QImage(str(override_path))
                    if override_img.isNull():
                        errors.append(f"Failed to load override for {density}: {override_path}")
                        continue
                    image = override_img.scaled(
                        size, size,
                        Qt.AspectRatioMode.IgnoreAspectRatio,
                        Qt.TransformationMode.SmoothTransformation
                    )
            elif is_svg:
                # Render SVG at this density's size
                image = render_svg_to_image(source_path, size)
                if image is None:
                    errors.append(f"Failed to render SVG for {density}")
                    continue
            else:
                # Scale PNG to target size
                image = default_source.scaled(
                    size, size,
                    Qt.AspectRatioMode.IgnoreAspectRatio,
                    Qt.TransformationMode.SmoothTransformation
                )

            # Ensure parent directory exists
            target_path.parent.mkdir(parents=True, exist_ok=True)

            # Save the image
            if image.save(str(target_path), "PNG"):
                success += 1
            else:
                errors.append(f"Failed to save: {target_path}")
        except Exception as e:
            errors.append(f"{target_path}: {e}")

    return success, errors
