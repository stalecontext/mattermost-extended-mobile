"""
Adaptive icon layer replacement utilities.

This module handles copying source PNGs to all Android mipmap density folders
for adaptive icon foreground and background layers.
"""

from pathlib import Path
from typing import Literal

from PyQt6.QtCore import Qt
from PyQt6.QtGui import QImage

from .constants import ADAPTIVE_ICON_SIZES, ANDROID_RES_DIR, ASSETS_ANDROID_DIR


LayerType = Literal["foreground", "background"]


def get_layer_filename(layer: LayerType) -> str:
    """Get the filename for an adaptive icon layer."""
    return f"ic_launcher_{layer}.png"


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
    targets = []

    for base_dir in get_target_directories():
        if not base_dir.exists():
            continue
        for mipmap_dir, size in ADAPTIVE_ICON_SIZES.items():
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
