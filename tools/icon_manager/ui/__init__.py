"""UI components and main window."""

from .widgets import IconPreviewLabel, ComparisonWidget, SvgInputWidget
from .main_window import IconManagerWindow
from .adaptive_tab import AdaptiveIconTab
from .icons import get_icon

__all__ = [
    'IconPreviewLabel',
    'ComparisonWidget',
    'SvgInputWidget',
    'IconManagerWindow',
    'AdaptiveIconTab',
    'get_icon',
]
