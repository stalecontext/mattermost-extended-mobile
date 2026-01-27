# Emoji Usage Tracker Plugin Support

Mobile support for the `com.github.mattermost-emoji-usage` server plugin that tracks emoji usage frequency and provides accurate "recently used" emojis.

## Overview

The Emoji Usage Tracker plugin tracks which emojis users use most frequently (both in messages and reactions) and provides a resync endpoint to populate the "Recently Used" emoji section based on actual usage history rather than just recent session activity.

## Server Plugin

**Plugin ID:** `com.github.mattermost-emoji-usage`

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/usage` | GET | Get current emoji usage (sorted by count) |
| `/api/v1/resync` | POST | Full historical resync - scans all messages and reactions |
| `/api/v1/config` | GET | Get plugin configuration |

### Response Types

```typescript
// GET /api/v1/usage
type EmojiEntry[] = {
    name: string;   // Emoji name (e.g., 'smile', '+1')
    count: number;  // Usage count
}[];

// POST /api/v1/resync
type ResyncResponse = {
    emojis: EmojiEntry[];
    posts_scanned: number;
    reactions_found: number;
    unique_emojis: number;
    channels_scanned: number;
    error?: string;
};

// GET /api/v1/config
type EmojiUsageConfig = {
    max_recent_emojis: number;  // Default: 27
};
```

## Mobile Implementation

### Architecture

```
app/products/emoji_usage/
├── constants.ts          # Plugin ID and API base path
├── types.ts              # TypeScript types for API responses
├── client/
│   └── rest.ts          # ClientMix for plugin API calls
├── actions/
│   └── remote.ts        # Sync action to update recently used emojis
└── index.ts             # Public exports
```

### How It Works

1. User taps the **sync button** (🔄) in the emoji picker header
2. Mobile app calls `POST /api/v1/resync` on the plugin
3. Plugin scans user's message and reaction history
4. Returns emojis sorted by usage frequency
5. Mobile app updates the local `recentReactions` system value
6. Emoji picker's "Recent" section immediately reflects the new order

### UI Changes

A sync button was added to both emoji picker headers:

1. **Post draft emoji picker** (`app/components/post_draft/custom_emoji_picker/emoji_picker_header/`)
2. **Reaction picker** (`app/screens/emoji_picker/picker/header/`)

The button:
- Shows a sync icon (🔄) that spins while syncing
- Displays a loading spinner during the sync operation
- Is positioned between the search bar and skin tone selector

### Integration Points

**ClientMix Registration:**
- Added to `app/client/rest/index.ts` with `ClientEmojiUsage` mixin

**Path Alias:**
- `@emoji_usage/*` → `app/products/emoji_usage/*`
- Registered in both `tsconfig.json` and `babel.config.js`

### Data Flow

```
[Sync Button Press]
        ↓
[syncEmojiUsage(serverUrl)]
        ↓
[POST /plugins/com.github.mattermost-emoji-usage/api/v1/resync]
        ↓
[Plugin scans all user messages and reactions]
        ↓
[Returns EmojiEntry[] sorted by count]
        ↓
[Extract emoji names in order]
        ↓
[operator.handleSystem() saves to RECENT_REACTIONS]
        ↓
[RxJS observable triggers UI update]
        ↓
[Emoji picker "Recent" section updates]
```

## Usage Notes

### When to Sync

Users should sync when:
- They want their "Recently Used" emojis to reflect their actual usage history
- After joining a new server (to populate based on existing history)
- If they notice the recent emojis don't match their preferences

### Sync Duration

The resync operation scans all accessible channels and can take several seconds depending on:
- Number of channels the user has access to
- Total number of posts and reactions
- Server performance

The UI shows a spinning indicator while the sync is in progress.

### Graceful Degradation

If the plugin is not installed:
- The sync button will still appear
- Pressing it will silently fail (logged at debug level)
- The app continues to use the built-in recently used tracking
