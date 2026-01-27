# Emoji Categorizer Plugin Support

## Overview

This feature adds mobile support for the `com.github.mattermost-emoji-categorizer` server plugin that allows organizing custom emojis into collaborative categories. Categories appear in the emoji picker after "Recently Used" with custom emoji icons.

## Plugin Functionality

The server plugin provides:
- **Custom Categories**: Create named categories to organize custom emojis
- **Emoji Icons**: Each category displays a custom emoji as its icon in the category bar
- **Shared Organization**: Categories are shared across all users on the server
- **Real-time Updates**: WebSocket events notify clients when categories change

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/plugins/com.github.mattermost-emoji-categorizer/api/v1/categories` | GET | Get all emoji categories |
| `/plugins/com.github.mattermost-emoji-categorizer/api/v1/categories` | POST | Save/update categories |
| `/plugins/com.github.mattermost-emoji-categorizer/api/v1/permissions` | GET | Check if user has permission |

### Response Format

```typescript
// GET /categories
{
  categories: EmojiCategory[];
  version: number;  // Incremented on each save for sync tracking
}

interface EmojiCategory {
  id: string;
  name: string;         // Display name (e.g., "Favorites")
  icon: string;         // Emoji name used as icon (e.g., "star", "cat-yes")
  emojiIds: string[];   // Array of emoji names in this category
  order: number;        // Display order (0-based)
}
```

### WebSocket Event

```typescript
// Event name
'custom_com.github.mattermost-emoji-categorizer_categories_updated'

// Payload
{
  version: number;  // New version number
}
```

---

## Implementation

### File Structure

```
app/products/emoji_categorizer/
├── constants.ts              # Plugin ID, API routes, WebSocket event
├── types.ts                  # TypeScript types (EmojiCategory, CategoriesData)
├── index.ts                  # Re-exports
├── client/
│   └── rest.ts               # ClientMix for API calls
├── store/
│   └── emoji_categories_store.ts  # Ephemeral state with RxJS observables
└── actions/
    ├── remote.ts             # fetchEmojiCategories, refreshEmojiCategoriesIfNeeded
    └── websocket.ts          # WebSocket event handler
```

### Modified Files

| File | Purpose |
|------|---------|
| `tsconfig.json` | Added `@emoji_categorizer/*` path alias |
| `babel.config.js` | Added `@emoji_categorizer` alias |
| `app/client/rest/index.ts` | Added `ClientEmojiCategorizerMix` to client |
| `app/constants/websocket.ts` | Added `EMOJI_CATEGORIES_UPDATED` event |
| `app/actions/websocket/event.ts` | Registered WebSocket handler |
| `app/screens/emoji_picker/picker/sections/index.tsx` | Integrated plugin categories (reactions picker) |
| `app/screens/emoji_picker/picker/sections/section_header.tsx` | Extended EmojiSection interface, removed left padding |
| `app/components/post_draft/custom_emoji_picker/emoji_sections/index.tsx` | Integrated plugin categories (compose picker) |
| `app/components/emoji_category_bar/icon.tsx` | Added emoji icon support for plugin categories |

---

## Key Implementation Details

### Dual Emoji Picker Integration

The mobile app has two separate emoji picker implementations:

1. **Reaction Picker** (`app/screens/emoji_picker/`) - Used when adding reactions to posts
2. **Compose Picker** (`app/components/post_draft/custom_emoji_picker/`) - Used in the message compose box

Both were updated to fetch and display plugin categories.

### Category Insertion

Plugin categories are inserted after "Recently Used" and before standard categories:

```typescript
// Find the position after "recent"
const recentIndex = sectionsArray.findIndex((s) => s.key === 'recent');
const insertIndex = recentIndex >= 0 ? recentIndex + 1 : 0;

// Insert plugin categories
sectionsArray.splice(insertIndex, 0, ...pluginSections);
```

### Emoji Icons in Category Bar

The category bar normally shows MDI icons. For plugin categories, we show the category's emoji as the icon:

```typescript
// Check if icon is a known MDI icon or an emoji name
const knownMdiIcons = new Set(Object.values(EMOJI_CATEGORY_ICONS));
const isMdiIcon = (icon: string) => knownMdiIcons.has(icon);

// Render either CompassIcon or Emoji component
{isMdiIcon(icon) ? (
    <CompassIcon name={icon} size={20} />
) : (
    <Emoji emojiName={icon} size={18} />
)}
```

### Ephemeral Store

Categories are stored in memory (not persisted) using RxJS BehaviorSubjects:

```typescript
class EmojiCategoriesStoreSingleton {
    private categories: Map<string, BehaviorSubject<EmojiCategory[]>>;
    private version: Map<string, number>;

    setCategories(serverUrl, categories, version): void
    getCategories(serverUrl): EmojiCategory[]
    observeCategories(serverUrl): Observable<EmojiCategory[]>
    getVersion(serverUrl): number
    clearServer(serverUrl): void  // Cleanup on logout
}
```

### Fetch on Mount

Each emoji picker fetches categories when it mounts:

```typescript
useEffect(() => {
    fetchEmojiCategories(serverUrl);
    const subscription = EmojiCategoriesStore.observeCategories(serverUrl)
        .subscribe(setPluginCategories);
    return () => subscription.unsubscribe();
}, [serverUrl]);
```

### WebSocket Updates

When categories are modified via the plugin, a WebSocket event triggers a refresh:

```typescript
export async function handleEmojiCategoriesUpdatedEvent(serverUrl, msg) {
    const data = msg.data as CategoriesUpdatedEvent;
    await refreshEmojiCategoriesIfNeeded(serverUrl, data.version);
}

// Only refetch if version is newer
export async function refreshEmojiCategoriesIfNeeded(serverUrl, newVersion) {
    const currentVersion = EmojiCategoriesStore.getVersion(serverUrl);
    if (newVersion > currentVersion) {
        await fetchEmojiCategories(serverUrl);
    }
}
```

---

## User Experience

### Category Display

1. Open emoji picker (reactions or compose)
2. "Recently Used" appears first (if any)
3. Plugin categories appear next with emoji icons
4. Standard categories follow (Smileys, People, etc.)

### Category Bar

- Standard categories show MDI icons
- Plugin categories show their configured emoji as the icon
- Tapping a category scrolls to that section

### Real-time Updates

- When admin modifies categories in the web app, mobile updates automatically
- No app restart required

---

## Testing Checklist

### Basic Functionality
- [ ] Plugin categories appear after "Recently Used"
- [ ] Categories show correct name and emojis
- [ ] Category bar shows emoji icons for plugin categories
- [ ] Tapping category icon scrolls to section

### Both Emoji Pickers
- [ ] Works in reaction picker (long-press post → add reaction)
- [ ] Works in compose picker (emoji button in message box)

### WebSocket Updates
- [ ] Modifying categories in web app updates mobile
- [ ] Version tracking prevents unnecessary refetches

### Edge Cases
- [ ] Empty categories are hidden
- [ ] Plugin not installed fails gracefully (silent error)
- [ ] Emoji names with hyphens work (e.g., "cat-yes")

---

## Configuration

### Path Aliases

```javascript
// tsconfig.json
"@emoji_categorizer/*": ["app/products/emoji_categorizer/*"]

// babel.config.js
'@emoji_categorizer': './app/products/emoji_categorizer'
```

### WebSocket Event

```typescript
// constants/websocket.ts
EMOJI_CATEGORIES_UPDATED: 'custom_com.github.mattermost-emoji-categorizer_categories_updated'
```
