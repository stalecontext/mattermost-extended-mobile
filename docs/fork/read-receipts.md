# Read Receipts Plugin Support

## Overview

This feature adds mobile support for the `com.github.mattermost-read-receipts` server plugin that tracks who has read posts and channels. The plugin provides visibility into user activity across channels.

## Plugin Functionality

The server plugin provides:
- **Post Readers**: See who has read a specific post
- **Channel Followers**: See who is currently viewing/following a channel (real-time)
- **User Last Seen**: See what channel a user was last viewing
- **Channel View Reporting**: Report when the current user views a channel for real-time tracking

All features are controlled by server-side permissions - the mobile app fetches permissions and conditionally shows UI.

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/plugins/com.github.mattermost-read-receipts/api/v1/permissions` | GET | Get user permissions for read receipts features |
| `/plugins/com.github.mattermost-read-receipts/api/v1/post/{postId}/readers` | GET | Get list of users who read a post |
| `/plugins/com.github.mattermost-read-receipts/api/v1/channel/{channelId}/readers` | GET | Get list of users currently viewing a channel |
| `/plugins/com.github.mattermost-read-receipts/api/v1/user/{userId}/last-channel` | GET | Get last channel a user was viewing |
| `/plugins/com.github.mattermost-read-receipts/api/v1/channel-view` | POST | Report that current user is viewing a channel |

### Response Formats

```typescript
// GET /permissions
interface PluginPermissions {
    can_view_receipts: boolean;      // Master toggle
    is_admin: boolean;
    enable_channel_indicator: boolean; // "X following" indicator
    enable_post_action: boolean;      // "View who read this" menu option
    enable_dropdown_menu: boolean;    // Alternative post menu integration
    enable_last_seen: boolean;        // "Last Seen" in user profile
    enable_in_direct_messages: boolean; // Show features in DMs/GMs
}

// GET /post/{postId}/readers
interface PostReadersResponse {
    readers: Reader[];
}

interface Reader {
    user_id: string;
    username: string;
    nickname: string;
    first_name: string;
    last_name: string;
    read_at: number;      // Timestamp
    profile_url?: string; // Avatar URL
}

// GET /channel/{channelId}/readers
interface ChannelReadersResponse {
    readers: Reader[];
}

// GET /user/{userId}/last-channel
interface UserLastChannelResponse {
    user_id: string;
    channel_id: string;
    channel_name: string;
    channel_type: string;          // 'O', 'P', 'D', 'G'
    display_name: string;
    team_id: string;
    team_name: string;
    last_viewed_at: number;
    // For DMs - the other user's info
    other_username?: string;
    other_nickname?: string;
    other_first_name?: string;
    other_last_name?: string;
}
```

---

## Implementation

### File Structure

```
app/products/read_receipts/
├── constants.ts              # Plugin ID, API routes
├── types/
│   └── index.ts              # TypeScript types
├── index.ts                  # Re-exports
├── client/
│   └── rest.ts               # ClientMix for API calls
├── store/
│   ├── index.ts              # Re-exports store and hooks
│   └── read_receipts_store.ts # Ephemeral state (permissions, channel followers)
├── actions/
│   ├── remote.ts             # API actions
│   └── websocket.ts          # WebSocket event handler for new posts
└── components/
    ├── post_readers_modal/
    │   ├── index.tsx         # BottomSheet modal showing readers list
    │   └── reader_item.tsx   # Individual reader row
    ├── channel_followers_indicator/
    │   └── index.tsx         # "X following" indicator above message input
    ├── user_last_seen/
    │   └── index.tsx         # "Last Seen" in user profile
    └── view_readers_option/
        └── index.tsx         # Post menu option
```

### Modified Files

| File | Purpose |
|------|---------|
| `tsconfig.json` | Added `@read_receipts/*` path alias |
| `babel.config.js` | Added `@read_receipts` alias |
| `app/client/rest/index.ts` | Added `ClientReadReceiptsMix` to client |
| `app/init/push_notifications.ts` | Fetch permissions on app launch |
| `app/actions/websocket/event.ts` | Handle POSTED events for follower refresh |
| `app/screens/post_options/post_options.tsx` | Added "View who read this" option |
| `app/screens/channel/channel.tsx` | Added channel view reporting |
| `app/screens/home/channel_list/categories_list/channel_list_content.tsx` | Added ChannelFollowersIndicator |
| `app/screens/user_profile/user_info.tsx` | Added UserLastSeen component |
| `app/constants/screens.ts` | Added POST_READERS and CHANNEL_READERS screens |
| `app/screens/index.tsx` | Registered new screens |

---

## Key Implementation Details

### Permissions Flow

1. App launches → `fetchReadReceiptsPermissions()` called
2. Permissions stored in `ReadReceiptsStore`
3. Components use `useReadReceiptsPermissions(serverUrl)` hook
4. Features conditionally render based on permissions
5. If plugin not installed, all permissions default to `false`

```typescript
// Graceful degradation when plugin not installed
try {
    const permissions = await client.getReadReceiptsPermissions();
    ReadReceiptsStore.setPermissions(serverUrl, permissions);
} catch {
    // Set defaults - all features disabled
    ReadReceiptsStore.setPermissions(serverUrl, DEFAULT_PERMISSIONS);
}
```

### Channel Followers Indicator

Shows "X following" with an eye icon above the message input area:

1. Component mounts → Fetch followers immediately
2. Poll every 5 seconds while app is active
3. Refresh on POSTED WebSocket events for tracked channels
4. Tap to open Channel Readers modal

```typescript
// Polling with AppState check
useEffect(() => {
    fetchChannelFollowers(serverUrl, channelId);

    const interval = setInterval(() => {
        if (AppState.currentState === 'active') {
            fetchChannelFollowers(serverUrl, channelId);
        }
    }, 5000);

    return () => clearInterval(interval);
}, [serverUrl, channelId]);
```

### User Last Seen

Displays in user profile with format matching the desktop plugin:
- **Channels**: "Reading #channel-name"
- **DMs**: "DMing @username"
- **Group Messages**: "In group: group-name"

Channel/user names are clickable links that navigate to the channel.

### Post Readers Modal

BottomSheet modal showing who read a post:
- User avatars with expo-image
- Display names and usernames
- Relative "read at" times
- Tap user row to open their profile

---

## Component Details

### ReadReceiptsStore (`app/products/read_receipts/store/read_receipts_store.ts`)

Singleton ephemeral store using RxJS BehaviorSubjects.

```typescript
// Permissions API
setPermissions(serverUrl, permissions): void
getPermissions(serverUrl): PluginPermissions
observePermissions(serverUrl): Observable<PluginPermissions>

// Channel Followers API
setChannelFollowers(serverUrl, channelId, response): void
getChannelFollowers(serverUrl, channelId): ChannelReadersResponse | undefined
observeChannelFollowers(serverUrl, channelId): Observable<ChannelReadersResponse | undefined>

// Hooks
useReadReceiptsPermissions(serverUrl): PluginPermissions
useChannelFollowers(serverUrl, channelId): ChannelReadersResponse | undefined

// Cleanup
clearServer(serverUrl): void
clearChannel(serverUrl, channelId): void
```

### ChannelFollowersIndicator (`app/products/read_receipts/components/channel_followers_indicator/`)

Displays "X following" above message input:
- Eye icon + count text
- Checks `enable_channel_indicator` permission
- Checks `enable_in_direct_messages` for DMs/GMs
- Background color matches channel background to prevent overlay

### UserLastSeen (`app/products/read_receipts/components/user_last_seen/`)

Displays in user profile matching Custom Status format:
- "Last Seen" title (small, lighter text)
- "Reading #channel" with clickable link
- Checks `enable_last_seen` permission

### ViewReadersOption (`app/products/read_receipts/components/view_readers_option/`)

Post menu option "View who read this":
- Eye icon
- Checks `enable_post_action` or `enable_dropdown_menu` permission
- Opens Post Readers modal

### PostReadersModal (`app/screens/post_readers/`)

BottomSheet showing post readers:
- FlatList of reader items
- Fetches data on mount
- Loading/empty states

---

## User Experience

### Viewing Post Readers
1. Long-press a post
2. Tap "View who read this"
3. Modal shows list of readers with timestamps

### Channel Followers
1. Open any channel
2. See "X following" indicator above message input
3. Tap to see full list of active viewers

### User Last Seen
1. Open a user's profile
2. See "Last Seen" section
3. Shows channel they were last viewing
4. Tap channel name to navigate there

---

## Styling

### Colors
- Indicator text: `theme.centerChannelColor` at 64% opacity
- Indicator icon: `theme.centerChannelColor` at 64% opacity
- Last Seen title: `theme.centerChannelColor` at 56% opacity
- Link text: `theme.linkColor`
- Reader item text: `theme.centerChannelColor`

### Typography
- Indicator: Body 75
- Last Seen title: Body 50 SemiBold
- Last Seen content: Body 200
- Reader name: Body 200 SemiBold
- Reader username: Body 75

---

## Localization Keys

```json
{
  "read_receipts.view_readers": "View who read this",
  "read_receipts.followers_count": "{count, plural, one {# following} other {# following}}",
  "read_receipts.channel_readers_title": "Following",
  "read_receipts.post_readers_title": "Read by",
  "read_receipts.last_seen": "Last Seen",
  "read_receipts.dming_user": "DMing",
  "read_receipts.in_group": "In group:",
  "read_receipts.reading": "Reading",
  "read_receipts.no_readers": "No one has read this yet",
  "read_receipts.read_at": "Read {time}"
}
```

---

## Testing Checklist

### Permissions
- [ ] Plugin installed → Features visible
- [ ] Plugin not installed → Features hidden (no errors)
- [ ] Permissions refreshed on app launch

### Post Readers
- [ ] "View who read this" appears in post menu
- [ ] Modal shows readers with avatars
- [ ] Empty state when no readers
- [ ] Tap reader to open profile

### Channel Followers
- [ ] "X following" shows above message input
- [ ] Count updates in real-time (5s polling)
- [ ] Updates when new posts arrive
- [ ] Tap opens Channel Readers modal
- [ ] Hidden when permission disabled
- [ ] Works in DMs when `enable_in_direct_messages` true

### User Last Seen
- [ ] Shows in user profile below custom status
- [ ] Correct format: "Reading #channel" / "DMing @user" / "In group: name"
- [ ] Channel/user name is clickable
- [ ] Navigates to channel on tap
- [ ] Hidden when permission disabled

### Edge Cases
- [ ] Handles plugin not installed gracefully
- [ ] No errors when permissions fetch fails
- [ ] Works across multiple servers
- [ ] Cleanup on logout (`clearServer`)

---

## Configuration

### Path Aliases

```javascript
// tsconfig.json
"@read_receipts/*": ["app/products/read_receipts/*"]

// babel.config.js
'@read_receipts': './app/products/read_receipts'
```

### WebSocket Events

The plugin doesn't send custom WebSocket events. Instead, we hook into the standard POSTED event to refresh channel followers when new posts arrive in tracked channels.

```typescript
// In event.ts POSTED handler
handlePostCreatedForReadReceipts(serverUrl, msg);
```
