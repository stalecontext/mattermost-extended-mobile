# Custom Channel Icons

Mobile support for the server-side `CustomChannelIcons` feature flag that enables custom SVG icons for channels.

## Feature Flag

This feature is controlled by the `CustomChannelIcons` feature flag on the server. When enabled:
- Users can set custom icons for channels (stored in channel props as `custom_icon`)
- System admins can create, update, and delete custom SVG icons server-wide
- All users can view and select from the available custom icons

The feature flag is exposed to mobile via `FeatureFlagCustomChannelIcons` in the client config.

## Architecture

### Product Structure

```
app/products/custom_channel_icons/
├── constants.ts           # API routes and WebSocket event names
├── types.ts              # TypeScript types
├── index.ts              # Re-exports
├── client/
│   └── rest.ts           # API client mixin
├── store/
│   ├── index.ts
│   └── custom_channel_icons_store.ts  # Ephemeral store with RxJS
└── actions/
    ├── remote.ts         # API actions
    └── websocket.ts      # WebSocket event handlers
```

### Path Alias

`@custom_channel_icons/*` → `app/products/custom_channel_icons/*`

## API Endpoints

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/api/v4/custom_channel_icons` | Get all icons | Authenticated |
| GET | `/api/v4/custom_channel_icons/{icon_id}` | Get single icon | Authenticated |
| POST | `/api/v4/custom_channel_icons` | Create icon | System Admin |
| PUT | `/api/v4/custom_channel_icons/{icon_id}` | Update icon | System Admin |
| DELETE | `/api/v4/custom_channel_icons/{icon_id}` | Delete icon | System Admin |

## Types

```typescript
type CustomChannelIcon = {
    id: string;
    name: string;
    svg: string;              // Base64-encoded SVG content
    normalize_color: boolean;  // Whether to normalize SVG colors
    create_at: number;
    update_at: number;
    delete_at: number;
    created_by: string;
};

type CustomChannelIconCreate = {
    name: string;
    svg: string;
    normalize_color: boolean;
};

type CustomChannelIconPatch = {
    name?: string;
    svg?: string;
    normalize_color?: boolean;
};
```

## WebSocket Events

| Event | Payload | Description |
|-------|---------|-------------|
| `custom_channel_icon_added` | `{ icon: CustomChannelIcon }` | New icon created |
| `custom_channel_icon_updated` | `{ icon: CustomChannelIcon }` | Icon updated |
| `custom_channel_icon_deleted` | `{ icon_id: string }` | Icon deleted |

## Usage

### Checking Feature Flag

```typescript
// In a component
const config = useServerConfig(serverUrl);
const isEnabled = config?.FeatureFlagCustomChannelIcons === 'true';
```

### Fetching Icons

```typescript
import {fetchCustomChannelIcons} from '@custom_channel_icons/actions/remote';

// Fetch all icons
const {icons, error} = await fetchCustomChannelIcons(serverUrl);
```

### Subscribing to Icons

```typescript
import {useCustomChannelIcons} from '@custom_channel_icons/store';

// In a component
const icons = useCustomChannelIcons(serverUrl);
```

### Handling WebSocket Events

```typescript
import {
    handleCustomChannelIconsWebSocket,
    isCustomChannelIconEvent,
} from '@custom_channel_icons/actions/websocket';

// In WebSocket handler
if (isCustomChannelIconEvent(event)) {
    handleCustomChannelIconsWebSocket(serverUrl, msg);
}
```

## Channel Icon Storage

Channels store their custom icon in the `props.custom_icon` field using a prefixed format:
- `mdi:icon-name` - Material Design Icons
- `lucide:icon-name` - Lucide icons
- `svg:base64content` - Custom SVG (base64-encoded)

This format is compatible with the web app implementation.
