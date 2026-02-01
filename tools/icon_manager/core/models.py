"""
Data classes for the Icon Manager.
"""

import json
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional

from .constants import PROJECT_ROOT


@dataclass
class IconBounds:
    """Bounding box of non-transparent content in an image."""
    x: int = 0
    y: int = 0
    width: int = 0
    height: int = 0
    image_width: int = 0
    image_height: int = 0

    @property
    def is_full(self) -> bool:
        """Check if bounds cover the entire image (no padding)."""
        return (self.x == 0 and self.y == 0 and
                self.width == self.image_width and self.height == self.image_height)

    @property
    def is_empty(self) -> bool:
        """Check if bounds have zero area."""
        return self.width == 0 or self.height == 0


@dataclass
class IconTarget:
    """Represents a target icon file to generate."""
    name: str
    width: int
    height: int
    path: Path
    category: str
    bounds: Optional[IconBounds] = None
    override_path: Optional[Path] = None  # Can be SVG or PNG

    @property
    def rel_path(self) -> str:
        """Get the path relative to project root."""
        try:
            return str(self.path.relative_to(PROJECT_ROOT))
        except ValueError:
            return str(self.path)

    @property
    def override_is_png(self) -> bool:
        """Check if the override file is a PNG."""
        return self.override_path is not None and self.override_path.suffix.lower() == '.png'


@dataclass
class Config:
    """Saved configuration with SVG/PNG overrides."""
    default_svg: Optional[str] = None
    overrides: dict[str, str] = field(default_factory=dict)  # rel_path -> override_path
    disabled: list[str] = field(default_factory=list)  # rel_paths of disabled (unchecked) icons
    last_browse_dir: Optional[str] = None  # Remember last browsed folder

    def save(self, path: Path) -> None:
        """Save configuration to a JSON file."""
        data = {
            "default_svg": self.default_svg,
            "overrides": self.overrides,
            "disabled": self.disabled,
            "last_browse_dir": self.last_browse_dir
        }
        with open(path, "w") as f:
            json.dump(data, f, indent=2)

    @classmethod
    def load(cls, path: Path) -> "Config":
        """Load configuration from a JSON file."""
        if not path.exists():
            return cls()
        try:
            with open(path) as f:
                data = json.load(f)
            return cls(
                default_svg=data.get("default_svg"),
                overrides=data.get("overrides", {}),
                disabled=data.get("disabled", []),
                last_browse_dir=data.get("last_browse_dir")
            )
        except (json.JSONDecodeError, KeyError):
            return cls()
