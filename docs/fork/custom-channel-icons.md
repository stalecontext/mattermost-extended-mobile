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
├── actions/
│   ├── remote.ts         # API actions
│   └── websocket.ts      # WebSocket event handlers
└── icon_libraries/
    ├── index.ts          # Re-exports
    ├── types.ts          # Icon format types and parseIconValue
    ├── mdi_icons.ts      # Material Design Icons path lookup
    └── svg_utils.ts      # SVG processing utilities
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

type IconFormat = 'mdi' | 'lucide' | 'tabler' | 'feather' | 'simple' | 'fontawesome' | 'svg' | 'customsvg' | 'none';
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
- `mdi:icon-name` - Material Design Icons (fully supported)
- `lucide:icon-name` - Lucide icons (TODO: not yet implemented)
- `tabler:icon-name` - Tabler icons (TODO: not yet implemented)
- `feather:icon-name` - Feather icons (TODO: not yet implemented)
- `simple:icon-name` - Simple (brand) icons (TODO: not yet implemented)
- `fontawesome:icon-name` - Font Awesome icons (TODO: not yet implemented)
- `svg:base64content` - Custom SVG (base64-encoded, fully supported)
- `customsvg:id` - Server-stored custom SVG (fully supported)

This format is compatible with the web app implementation.

## Icon Rendering

Custom icons are rendered in the sidebar via the `ChannelIcon` component:

1. **Channel props sync**: The `props` field (containing `custom_icon`) is synced to the database via the channel transformer
2. **ChannelItem extracts icon**: The `custom_icon` value is extracted from `channel.props?.custom_icon`
3. **ChannelIcon renders**: If a custom icon is present (and channel is not archived/draft/shared), it renders via `CustomChannelIcon`
4. **CustomChannelIcon parses format**: Uses `parseIconValue` to determine the icon format
5. **Format-specific rendering**:
   - MDI icons: Uses `@mdi/js` to get SVG path data
   - Custom SVGs: Decodes base64, sanitizes, and renders via `react-native-svg`
   - Server icons: Fetches from `CustomChannelIconsStore` and renders

## Database Changes

The `Channel` model now includes a `props` field (JSON) to store channel properties including `custom_icon`.

Schema version: 18 (migration adds `props` column to Channel table)

## Dependencies

- `@mdi/js` - Material Design Icons path data (~7400 icons)
- `react-native-svg` - SVG rendering (already in project)
