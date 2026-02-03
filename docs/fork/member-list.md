# Member List Plugin Support

## Overview

This feature adds mobile support for the `com.github.mattermost-member-list` server plugin that provides efficient member fetching for channels. The plugin is primarily used to power the member panel in the Discord-style swipe navigation.

## Plugin Functionality

The server plugin provides:
- **Efficient Member Fetching**: Optimized endpoint for fetching channel members with status
- **Status Grouping**: Members pre-sorted by online status (online, away, dnd, offline)
- **Pagination Support**: Handles large channels efficiently

### API Endpoint

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/plugins/com.github.mattermost-member-list/api/v1/channel/{channelId}/members` | GET | Get channel members with status |

### Response Format

```typescript
// GET /channel/{channelId}/members
interface MemberListResponse {
    members: ChannelMember[];
    total_count: number;
}

interface ChannelMember {
    user_id: string;
    username: string;
    nickname: string;
    first_name: string;
    last_name: string;
    status: 'online' | 'away' | 'dnd' | 'offline';
    profile_image_url?: string;
    position?: string;
    roles: string;
}
```

---

## Implementation

### File Structure

```
app/products/member_list/
├── constants.ts              # Plugin ID, API routes
├── types.ts                  # TypeScript types
├── index.ts                  # Re-exports
├── client/
│   └── rest.ts               # ClientMix for API calls
└── actions/
    └── remote.ts             # fetchChannelMembersFromPlugin
```

### Modified Files

| File | Purpose |
|------|---------|
| `tsconfig.json` | Added `@member_list/*` path alias |
| `babel.config.js` | Added `@member_list` alias |
| `app/client/rest/index.ts` | Added `ClientMemberListMix` to client |

---

## Key Implementation Details

### Usage in Swipe Navigation

The member panel in swipe navigation uses this plugin for efficient member fetching:

```typescript
// In member_panel/index.tsx
import {fetchChannelMembersFromPlugin} from '@member_list/actions/remote';

useEffect(() => {
    fetchChannelMembersFromPlugin(serverUrl, channelId)
        .then(setMembers);
}, [serverUrl, channelId]);
```

### Fallback Behavior

If the plugin is not installed, the member panel falls back to the standard Mattermost API:
1. Fetch channel members via `/channels/{channelId}/members`
2. Fetch user profiles separately
3. Fetch statuses separately

The plugin provides a more efficient single-endpoint solution.

### Status Grouping

Members are grouped by status for display:

```typescript
const onlineMembers = members.filter(m =>
    ['online', 'away', 'dnd'].includes(m.status)
);
const offlineMembers = members.filter(m =>
    m.status === 'offline'
);
```

---

## User Experience

### Member Panel Display

1. Swipe left on channel content
2. Member panel slides in from right
3. Shows "Online" section with active members
4. Shows "Offline" section with inactive members
5. Tap any member to view their profile

### Performance

- Single API call fetches all needed data
- No waterfall of profile/status requests
- Instant display of member list

---

## Configuration

### Path Aliases

```javascript
// tsconfig.json
"@member_list/*": ["app/products/member_list/*"]

// babel.config.js
'@member_list': './app/products/member_list'
```

---

## Graceful Degradation

When the plugin is not installed:
- No errors shown to user
- Falls back to standard API calls
- Member panel still functions (slightly slower)
- Logged at debug level for troubleshooting
