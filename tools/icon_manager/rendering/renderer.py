"""
Image rendering utilities for the Icon Manager.

This module handles all SVG and PNG rendering operations including:
- Checkerboard pattern creation for transparency preview
- Image bounds detection
- SVG to PNG conversion with cropping
- PNG override rendering
"""

from pathlib import Path
from typing import Optional

from PyQt6.QtCore import Qt, QSize, QRectF
from PyQt6.QtGui import QPixmap, QImage, QPainter, QColor
from PyQt6.QtSvg import QSvgRenderer

from ..core import COLORS, IconBounds, IconTarget


def create_checkerboard(width: int, height: int, tile_size: int = 8) -> QPixmap:
    """Create a checkerboard pattern pixmap for transparency preview."""
    pixmap = QPixmap(width, height)
    painter = QPainter(pixmap)
    light = QColor(COLORS["checker_light"])
    dark = QColor(COLORS["checker_dark"])
    for y in range(0, height, tile_size):
        for x in range(0, width, tile_size):
            color = light if (x // tile_size + y // tile_size) % 2 == 0 else dark
            painter.fillRect(x, y, tile_size, tile_size, color)
    painter.end()
    return pixmap


def get_image_bounds(image: QImage) -> IconBounds:
    """Find the bounding box of non-transparent content in an image."""
    if image.isNull():
        return IconBounds()

    width = image.width()
    height = image.height()

    if image.format() != QImage.Format.Format_ARGB32:
        image = image.convertToFormat(QImage.Format.Format_ARGB32)

    min_x, min_y = width, height
    max_x, max_y = 0, 0

    for y in range(height):
        for x in range(width):
            pixel = image.pixel(x, y)
            alpha = (pixel >> 24) & 0xFF
            if alpha > 10:  # Threshold for "visible" pixels
                min_x = min(min_x, x)
                min_y = min(min_y, y)
                max_x = max(max_x, x)
                max_y = max(max_y, y)

    # If no visible content found, return full bounds
    if max_x < min_x or max_y < min_y:
        return IconBounds(0, 0, width, height, width, height)

    return IconBounds(
        x=min_x, y=min_y,
        width=max_x - min_x + 1,
        height=max_y - min_y + 1,
        image_width=width, image_height=height
    )


def get_svg_content_bounds(renderer: QSvgRenderer, render_size: int = 512) -> IconBounds:
    """Render SVG and find the bounds of its visible content."""
    image = QImage(render_size, render_size, QImage.Format.Format_ARGB32)
    image.fill(Qt.GlobalColor.transparent)

    painter = QPainter(image)
    painter.setRenderHint(QPainter.RenderHint.Antialiasing)
    painter.setRenderHint(QPainter.RenderHint.SmoothPixmapTransform)
    renderer.render(painter, QRectF(0, 0, render_size, render_size))
    painter.end()

    return get_image_bounds(image)


def load_icon_preview(path: Path, size: int = 48) -> QPixmap:
    """Load an icon and create a preview with checkerboard background."""
    result = create_checkerboard(size, size, 6)
    icon = QImage(str(path))
    if icon.isNull():
        return result

    scaled = icon.scaled(size, size,
                         Qt.AspectRatioMode.KeepAspectRatio,
                         Qt.TransformationMode.SmoothTransformation)
    painter = QPainter(result)
    x = (size - scaled.width()) // 2
    y = (size - scaled.height()) // 2
    painter.drawImage(x, y, scaled)
    painter.end()
    return result


def render_png_to_bounds(source: QImage, target: IconTarget) -> QImage:
    """Render a PNG override into the target's content bounds."""
    image = QImage(target.width, target.height, QImage.Format.Format_ARGB32)
    image.fill(Qt.GlobalColor.transparent)

    if source.isNull():
        return image

    # Determine destination rect
    if target.bounds and not target.bounds.is_full:
        dest_rect = QRectF(target.bounds.x, target.bounds.y,
                           target.bounds.width, target.bounds.height)
    else:
        dest_rect = QRectF(0, 0, target.width, target.height)

    # Find source content bounds and crop
    source_bounds = get_image_bounds(source)
    if not source_bounds.is_full and not source_bounds.is_empty:
        cropped = source.copy(source_bounds.x, source_bounds.y,
                              source_bounds.width, source_bounds.height)
    else:
        cropped = source

    # Scale to fit dest_rect while maintaining aspect ratio
    scaled = cropped.scaled(int(dest_rect.width()), int(dest_rect.height()),
                            Qt.AspectRatioMode.KeepAspectRatio,
                            Qt.TransformationMode.SmoothTransformation)

    # Center in dest_rect
    offset_x = dest_rect.x() + (dest_rect.width() - scaled.width()) / 2
    offset_y = dest_rect.y() + (dest_rect.height() - scaled.height()) / 2

    painter = QPainter(image)
    painter.setRenderHint(QPainter.RenderHint.SmoothPixmapTransform)
    painter.drawImage(int(offset_x), int(offset_y), scaled)
    painter.end()

    return image


def render_svg_to_size(renderer: QSvgRenderer, size: int, svg_bounds: Optional[IconBounds] = None) -> QImage:
    """
    Render an SVG to a square image of the given size, optionally cropping to content bounds.
    Used for preview rendering.
    """
    image = QImage(size, size, QImage.Format.Format_ARGB32)
    image.fill(Qt.GlobalColor.transparent)

    painter = QPainter(image)
    painter.setRenderHint(QPainter.RenderHint.Antialiasing)
    painter.setRenderHint(QPainter.RenderHint.SmoothPixmapTransform)

    if svg_bounds and not svg_bounds.is_full and not svg_bounds.is_empty:
        # Render with cropping applied
        svg_size = renderer.defaultSize()
        if svg_size.isEmpty():
            svg_size = QSize(svg_bounds.image_width, svg_bounds.image_height)

        scale_x = svg_size.width() / svg_bounds.image_width
        scale_y = svg_size.height() / svg_bounds.image_height
        content_x = svg_bounds.x * scale_x
        content_y = svg_bounds.y * scale_y
        content_w = svg_bounds.width * scale_x
        content_h = svg_bounds.height * scale_y

        scale = min(size / content_w, size / content_h)
        scaled_w = content_w * scale
        scaled_h = content_h * scale
        offset_x = (size - scaled_w) / 2
        offset_y = (size - scaled_h) / 2

        painter.translate(offset_x, offset_y)
        painter.scale(scale, scale)
        painter.translate(-content_x, -content_y)
        renderer.render(painter, QRectF(0, 0, svg_size.width(), svg_size.height()))
    else:
        # Render full SVG
        renderer.render(painter, QRectF(0, 0, size, size))

    painter.end()
    return image


def render_svg_cropped(renderer: QSvgRenderer, target: IconTarget, svg_bounds: IconBounds) -> QImage:
    """
    Render SVG to target size, cropping SVG padding and positioning within target bounds.

    If the target has content bounds (e.g., adaptive icon foreground), the SVG content
    is rendered into that specific area. The SVG's own padding is cropped out.
    """
    image = QImage(target.width, target.height, QImage.Format.Format_ARGB32)
    image.fill(Qt.GlobalColor.transparent)

    painter = QPainter(image)
    painter.setRenderHint(QPainter.RenderHint.Antialiasing)
    painter.setRenderHint(QPainter.RenderHint.SmoothPixmapTransform)

    # Determine where to render in the target image
    if target.bounds and not target.bounds.is_full:
        dest_rect = QRectF(target.bounds.x, target.bounds.y,
                           target.bounds.width, target.bounds.height)
    else:
        dest_rect = QRectF(0, 0, target.width, target.height)

    # If SVG has padding, we need to render only the content portion
    if not svg_bounds.is_full and not svg_bounds.is_empty:
        svg_size = renderer.defaultSize()
        if svg_size.isEmpty():
            svg_size = QSize(svg_bounds.image_width, svg_bounds.image_height)

        # Scale factors from render size to SVG viewBox
        scale_x = svg_size.width() / svg_bounds.image_width
        scale_y = svg_size.height() / svg_bounds.image_height

        # The content rect in SVG coordinates
        content_x = svg_bounds.x * scale_x
        content_y = svg_bounds.y * scale_y
        content_w = svg_bounds.width * scale_x
        content_h = svg_bounds.height * scale_y

        # Calculate scaling to fit content into dest_rect while maintaining aspect ratio
        scale = min(dest_rect.width() / content_w, dest_rect.height() / content_h)

        # Calculate the offset to center the content
        scaled_w = content_w * scale
        scaled_h = content_h * scale
        offset_x = dest_rect.x() + (dest_rect.width() - scaled_w) / 2
        offset_y = dest_rect.y() + (dest_rect.height() - scaled_h) / 2

        # Set up transform: translate to dest, scale, then translate to crop the content
        painter.translate(offset_x, offset_y)
        painter.scale(scale, scale)
        painter.translate(-content_x, -content_y)

        # Render the full SVG (the transform will crop/position it)
        renderer.render(painter, QRectF(0, 0, svg_size.width(), svg_size.height()))
    else:
        # No cropping needed, render directly to dest_rect
        renderer.render(painter, dest_rect)

    painter.end()
    return image
