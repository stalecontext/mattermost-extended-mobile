# Encryption Feature Flag Support

Mobile support for the server-side end-to-end encryption feature flag and key management APIs.

## Overview

This product adds mobile support for the `Encryption` feature flag that enables end-to-end encryption for messages. When enabled, users can register public encryption keys tied to their sessions, and the mobile app can fetch keys for channel members to enable encrypted messaging.

## Feature Flag

The encryption feature is controlled by the `FeatureFlagEncryption` server config value:

```typescript
import {observeConfigBooleanValue} from '@queries/servers/system';

// Observe the feature flag
const isEncryptionEnabled = observeConfigBooleanValue(database, 'FeatureFlagEncryption');
```

## Architecture

### Directory Structure

```
app/products/encryption/
├── constants.ts           # API route constant
├── types.ts               # TypeScript types
├── index.ts               # Main exports
├── client/
│   └── rest.ts            # REST client mixin
├── store/
│   ├── index.ts           # Store exports
│   └── encryption_store.ts # Ephemeral state with React hooks
└── actions/
    └── remote.ts          # Remote API actions
```

### Path Alias

```typescript
import {EncryptionStatus} from '@encryption/types';
import EncryptionStore from '@encryption/store';
import {initializeEncryption} from '@encryption/actions/remote';
```

## API Endpoints

All endpoints are under `/api/v4/encryption`:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/status` | Get encryption status for current session |
| GET | `/publickey` | Get current session's public key |
| POST | `/publickey` | Register a public key for current session |
| POST | `/publickeys` | Get public keys for multiple users |
| GET | `/channel/{channel_id}/keys` | Get keys for all channel members |

## Types

### EncryptionStatus

```typescript
type EncryptionStatus = {
    enabled: boolean;      // Whether encryption is enabled server-wide
    can_encrypt: boolean;  // Whether current user can encrypt
    has_key: boolean;      // Whether current session has a registered key
    session_id: string;    // Current Mattermost session ID
};
```

### EncryptionPublicKey

```typescript
type EncryptionPublicKey = {
    user_id: string;
    session_id?: string;   // Session this key belongs to
    public_key: string;    // JWK format
    create_at: number;
    update_at?: number;
};
```

## Client Methods

The REST client provides these methods via the `ClientEncryptionMix`:

```typescript
const client = NetworkManager.getClient(serverUrl);

// Get encryption status
const status = await client.getEncryptionStatus();

// Get my public key
const myKey = await client.getMyPublicKey();

// Register a public key (JWK format)
const key = await client.registerPublicKey(publicKeyJwk);

// Get keys for specific users
const keys = await client.getPublicKeysByUserIds(['user1', 'user2']);

// Get keys for all channel members
const channelKeys = await client.getChannelMemberKeys(channelId);
```

## Store & Hooks

The ephemeral store tracks encryption state per server with RxJS observables:

### Store Methods

```typescript
import EncryptionStore from '@encryption/store';

// Status
EncryptionStore.setStatus(serverUrl, status);
EncryptionStore.getStatus(serverUrl);
EncryptionStore.observeStatus(serverUrl);

// My key
EncryptionStore.setMyKey(serverUrl, key);
EncryptionStore.getMyKey(serverUrl);
EncryptionStore.observeMyKey(serverUrl);

// Channel keys
EncryptionStore.setChannelKeys(serverUrl, channelId, keys);
EncryptionStore.getChannelKeys(serverUrl, channelId);
EncryptionStore.observeChannelKeys(serverUrl, channelId);

// Cleanup
EncryptionStore.clearServer(serverUrl);
EncryptionStore.clearChannel(serverUrl, channelId);
```

### React Hooks

```typescript
import {
    useEncryptionStatus,
    useEncryptionEnabled,
    useMyEncryptionKey,
    useChannelEncryptionKeys,
} from '@encryption/store';

function MyComponent({serverUrl, channelId}: Props) {
    // Get full encryption status
    const status = useEncryptionStatus(serverUrl);

    // Just check if enabled
    const enabled = useEncryptionEnabled(serverUrl);

    // Get my registered key
    const myKey = useMyEncryptionKey(serverUrl);

    // Get keys for channel members
    const channelKeys = useChannelEncryptionKeys(serverUrl, channelId);

    if (!enabled) {
        return null;
    }

    // ...
}
```

## Remote Actions

```typescript
import {
    fetchEncryptionStatus,
    fetchMyPublicKey,
    registerPublicKey,
    fetchPublicKeysByUserIds,
    fetchChannelMemberKeys,
    initializeEncryption,
} from '@encryption/actions/remote';

// Initialize encryption (fetches status + my key if enabled)
const {status, key, error} = await initializeEncryption(serverUrl);

// Fetch and store encryption status
const {status, error} = await fetchEncryptionStatus(serverUrl);

// Fetch and store my public key
const {key, error} = await fetchMyPublicKey(serverUrl);

// Register a new public key
const {key, error} = await registerPublicKey(serverUrl, publicKeyJwk);

// Fetch keys for specific users (not stored)
const {keys, error} = await fetchPublicKeysByUserIds(serverUrl, userIds);

// Fetch and store channel member keys
const {keys, error} = await fetchChannelMemberKeys(serverUrl, channelId);
```

## Usage Example

### Initializing Encryption on Login

```typescript
// In your login/entry flow
import {initializeEncryption} from '@encryption/actions/remote';

async function onLoginSuccess(serverUrl: string) {
    // This fetches status and my key if encryption is enabled
    const {status, error} = await initializeEncryption(serverUrl);

    if (error) {
        logError('[Login] Failed to initialize encryption', error);
        return;
    }

    if (status?.enabled && !status.has_key) {
        // User needs to register a key - prompt them or auto-generate
        // Key generation and registration would be handled by crypto code
    }
}
```

### Displaying Encryption Status in UI

```typescript
import {useEncryptionStatus} from '@encryption/store';

function EncryptionIndicator({serverUrl}: {serverUrl: string}) {
    const status = useEncryptionStatus(serverUrl);

    if (!status.enabled) {
        return null;
    }

    return (
        <View style={styles.indicator}>
            <Icon name={status.has_key ? 'lock' : 'lock-open'} />
            <Text>
                {status.has_key ? 'Encryption active' : 'Key not registered'}
            </Text>
        </View>
    );
}
```

### Fetching Channel Keys for Encryption

```typescript
import {fetchChannelMemberKeys} from '@encryption/actions/remote';
import {useChannelEncryptionKeys} from '@encryption/store';

function useChannelEncryption(serverUrl: string, channelId: string) {
    const keys = useChannelEncryptionKeys(serverUrl, channelId);

    useEffect(() => {
        // Fetch keys when entering a channel
        fetchChannelMemberKeys(serverUrl, channelId);
    }, [serverUrl, channelId]);

    return keys;
}
```

## Files Modified

| File | Change |
|------|--------|
| `types/api/config.d.ts` | Added `FeatureFlagEncryption` to `ClientConfig` |
| `tsconfig.json` | Added `@encryption/*` path alias |
| `babel.config.js` | Added `@encryption` path alias |
| `app/client/rest/index.ts` | Added `ClientEncryptionMix` to client |

## Server Requirements

This feature requires the Mattermost server to have:
1. The `Encryption` feature flag enabled in `FeatureFlags`
2. The encryption API endpoints available at `/api/v4/encryption/*`
3. The `EncryptionSessionKey` store for persisting keys

See the server implementation in:
- `server/public/model/feature_flags.go` - Feature flag definition
- `server/channels/api4/encryption.go` - API endpoints
- `server/public/model/encryption_key.go` - Data models
