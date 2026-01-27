# Channel Sync Plugin Support

## Overview

This feature adds mobile support for the `com.example.channel-sync` server plugin that syncs sidebar categories from a Site Admin to all users. The admin's category organization is replicated to all users (except blacklisted ones), with Quick Join channels shown inline for public channels users haven't joined yet.

## Plugin Functionality

The server plugin provides:
- **Category Sync**: Replicates admin's sidebar category organization to all users
- **Quick Join**: Shows public channels users haven't joined within their categories
- **Blacklist**: Excludes specific users from sync
- **WebSocket Events**: Triggers category refresh when admin changes organization

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/plugins/com.example.channel-sync/api/v1/should-sync` | GET | Check if current user should have synced categories |
| `/plugins/com.example.channel-sync/api/v1/teams/{teamId}/categories` | GET | Get synced categories with Quick Join channels |
| `/plugins/com.example.channel-sync/api/v1/quick-join/dismiss` | POST | Dismiss a Quick Join channel |

### Response Format

```typescript
// GET /teams/{teamId}/categories
{
  categories: SyncedCategory[];  // Categories in admin's order
  order: string[];               // Category ID order
  quick_join_enabled: boolean;   // Whether Quick Join is enabled
}

interface SyncedCategory {
  id: string;
  user_id: string;
  team_id: string;
  sort_order: number;
  sorting: string;
  type: string;
  display_name: string;
  muted: boolean;
  collapsed: boolean;
  channel_ids: string[];
  quick_join?: QuickJoinChannel[];  // Inline Quick Join channels
}

interface QuickJoinChannel {
  id: string;
  name: string;
  display_name: string;
  purpose: string;
  insert_after: string;  // Channel ID to insert after
}
```

---

## Implementation

### File Structure

```
app/products/channel_sync/
├── constants.ts              # Plugin ID, API routes, WebSocket event
├── types.ts                  # TypeScript types
├── index.ts                  # Re-exports
├── client/
│   └── rest.ts               # ClientMix for API calls
├── store/
│   └── channel_sync_store.ts # Ephemeral state (sync enabled, Quick Join channels)
├── actions/
│   ├── remote.ts             # API actions (checkShouldSync, fetchSyncedCategories, etc.)
│   └── websocket.ts          # WebSocket event handler
└── components/
    └── quick_join_channel_item/
        ├── index.ts
        └── quick_join_channel_item.tsx  # Inline Quick Join UI
```

### Modified Files

| File | Purpose |
|------|---------|
| `tsconfig.json` | Added `@channel_sync/*` path alias |
| `babel.config.js` | Added `@channel_sync` alias |
| `app/client/rest/index.ts` | Added `ClientChannelSyncMix` to client |
| `app/constants/websocket.ts` | Added `CHANNEL_SYNC_REFRESH` event |
| `app/actions/websocket/event.ts` | Registered WebSocket handler |
| `app/actions/remote/channel.ts` | Intercepts category fetching when sync enabled |
| `app/screens/home/channel_list/categories_list/categories/helpers/flatten_categories.ts` | Added `quick_join` item type |
| `app/screens/home/channel_list/categories_list/categories/helpers/observe_flattened_categories.ts` | Observes Quick Join channels |
| `app/screens/home/channel_list/categories_list/categories/categories.tsx` | Renders Quick Join items |

---

## Key Implementation Details

### Sync Check Flow

1. `fetchMyChannelsForTeam()` calls `initializeChannelSync()` FIRST
2. If sync enabled, skip fetching user's categories from standard API
3. Fetch synced categories from plugin instead
4. Store with `sort_order` based on array index (ensures admin's order)

```typescript
// In fetchMyChannelsForTeam (channel.ts)
const {syncEnabled} = await initializeChannelSync(serverUrl, teamId);

// Only fetch user categories if sync is disabled
const fetchPromises = [
    client.getMyChannels(...),
    client.getMyChannelMembers(...),
    syncEnabled ? null : client.getCategories('me', teamId),
];
```

### Category Ordering

The plugin returns categories in admin's order, but the DM category keeps the user's original `sort_order`. To fix this, we override `sort_order` with the array index:

```typescript
const categories = syncedCategories.map((sc, index) => ({
    ...sc,
    sort_order: index,  // Use position in array, not plugin's value
}));
```

### Quick Join Channels

Quick Join channels are stored in ephemeral state (not database) and inserted inline:

1. Plugin returns `quick_join` array per category with `insert_after` positioning
2. Store builds a map: `categoryId:channelId` → `QuickJoinChannel[]`
3. `flattenCategories()` inserts Quick Join items after their target channel
4. Keys include categoryId to avoid duplicates: `qj:${categoryId}:${channelId}`

### WebSocket Refresh

When admin changes categories, plugin broadcasts `channel_sync_refresh`:

```typescript
// websocket.ts
export async function handleChannelSyncRefreshEvent(serverUrl, msg) {
    // Re-check sync state
    const {shouldSync} = await checkShouldSync(serverUrl);
    ChannelSyncStore.setSyncEnabled(serverUrl, teamId, shouldSync);

    if (shouldSync) {
        // Refresh categories from plugin
        await fetchSyncedCategories(serverUrl, teamId, true);
    }
}
```

---

## Component Details

### ChannelSyncStore (`app/products/channel_sync/store/channel_sync_store.ts`)

Singleton ephemeral store using RxJS BehaviorSubjects.

```typescript
// API
setSyncEnabled(serverUrl, teamId, enabled): void
isSyncEnabled(serverUrl, teamId): boolean
observeSyncEnabled(serverUrl, teamId): Observable<boolean>

setQuickJoinChannels(serverUrl, teamId, channels, categoryMap): void
getQuickJoinChannels(serverUrl, teamId): QuickJoinChannel[]
observeQuickJoinChannels(serverUrl, teamId): Observable<QuickJoinChannel[]>
removeQuickJoinChannel(serverUrl, teamId, channelId): void

clearServer(serverUrl): void  // Cleanup on logout
```

### QuickJoinChannelItem (`app/products/channel_sync/components/quick_join_channel_item/`)

Renders a Quick Join channel with Join/Dismiss actions:

- Channel icon with "+" indicator
- Display name and purpose
- Join button (joins channel, removes from Quick Join)
- Dismiss button (hides channel permanently)

---

## User Experience

### For Regular Users

1. Categories automatically match admin's organization
2. Quick Join channels appear inline (if enabled)
3. Can still collapse/expand categories individually
4. DMs appear at admin-configured position

### For Blacklisted Users

- Categories behave normally (no sync)
- Can organize categories freely

### For Site Admin

- Their categories are the source of truth
- Changes propagate via WebSocket to all users
- Use plugin's notify endpoint to trigger refresh

---

## Testing Checklist

### Sync State
- [ ] New user sees admin's category organization
- [ ] Blacklisted user has normal categories
- [ ] Admin has normal categories (not synced)
- [ ] Sync disabled shows user's own categories

### Category Order
- [ ] Categories match admin's order
- [ ] DMs appear at admin's configured position
- [ ] Custom categories appear in correct order

### Quick Join
- [ ] Quick Join channels appear inline
- [ ] Join button works and removes from list
- [ ] Dismiss button hides channel permanently
- [ ] Quick Join disabled hides all suggestions

### WebSocket
- [ ] Admin changes trigger refresh
- [ ] Categories update without app restart

### Edge Cases
- [ ] No flash of user's categories on load
- [ ] No duplicate key warnings in list
- [ ] Handles plugin not installed gracefully

---

## Configuration

### Path Aliases

```javascript
// tsconfig.json
"@channel_sync/*": ["app/products/channel_sync/*"]

// babel.config.js
'@channel_sync': './app/products/channel_sync'
```

### WebSocket Event

```typescript
// constants/websocket.ts
CHANNEL_SYNC_REFRESH: 'custom_com.example.channel-sync_channel_sync_refresh'
```
