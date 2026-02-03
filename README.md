<p align="center">
  <img src="docs/assets/logo-placeholder.png" alt="Mattermost Extended Mobile Logo" width="400">
</p>

<h1 align="center">Mattermost Extended Mobile</h1>

<p align="center">
  The mobile companion to <a href="https://github.com/stalecontext/mattermost-extended">Mattermost Extended</a>.<br>
  Discord-style features, plugin integrations, and enhanced UX for iOS and Android.
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#documentation">Documentation</a> •
  <a href="#contributing">Contributing</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/base-Mattermost%20Mobile%20v2.25.0-blue" alt="Base Version">
  <img src="https://img.shields.io/badge/license-Apache%202.0-green" alt="License">
  <img src="https://img.shields.io/badge/platform-iOS%20%7C%20Android-lightgrey" alt="Platform">
</p>

---

## Overview

This is the mobile app for the [Mattermost Extended](https://github.com/stalecontext/mattermost-extended) project. It adds several features to the Mattermost mobile app that aren't available in the upstream version, including Discord-style interactions, plugin integrations, and improved navigation.

<!-- SCREENSHOT: Main chat interface showing Discord-style reply chips and swipe navigation -->
<p align="center">
  <img src="docs/assets/screenshot-main-placeholder.png" alt="Mattermost Extended Mobile Interface" width="350">
</p>

---

## Features

### Discord-Style Multi-Quote Replies

Quote-reply to multiple posts (up to 10) in a single message, just like Discord.

<!-- SCREENSHOT: Draft composer showing reply chips with avatars, and a sent message with quote previews above it -->
<p align="center">
  <img src="docs/assets/screenshot-discord-replies-placeholder.png" alt="Discord-Style Multi-Quote Replies" width="350">
</p>

- Tap any post to add it to your reply queue
- Reply chips appear above the composer with remove buttons
- Sent messages show compact quote previews above the content
- Works with the companion server plugin for enhanced rendering

---

### Discord-Style Swipe Navigation

Fluid gesture-based navigation that feels like Discord.

<!-- SCREENSHOT: Partially swiped channel view revealing channel list underneath -->
<p align="center">
  <img src="docs/assets/screenshot-swipe-nav-placeholder.png" alt="Discord-Style Swipe Navigation" width="350">
</p>

- **Swipe right**: Slide channel away to reveal the channel list underneath
- **Swipe left**: Open member panel showing online/offline channel members
- Channel list stays live and interactive during swipe
- Respects system reduced motion preferences

---

### Read Receipts Plugin Support

See who has read your messages with the `mattermost-read-receipts` plugin.

<!-- SCREENSHOT: "X following" indicator above message input, and post readers modal with avatars and timestamps -->
<p align="center">
  <img src="docs/assets/screenshot-read-receipts-placeholder.png" alt="Read Receipts Plugin Support" width="350">
</p>

- **Post Readers**: Long-press a post to see who read it with timestamps
- **Channel Followers**: "X following" indicator shows real-time viewers
- **User Last Seen**: See what channel a user was last viewing in their profile
- All features respect server-side permission settings

---

### Channel Sync Plugin Support

Automatic sidebar organization with the `channel-sync` plugin.

<!-- SCREENSHOT: Sidebar showing synced categories with Quick Join channel suggestions inline -->
<p align="center">
  <img src="docs/assets/screenshot-channel-sync-placeholder.png" alt="Channel Sync Plugin Support" width="350">
</p>

- Site Admin's category organization synced to all users
- Quick Join channels appear inline in categories
- Join/Dismiss buttons for suggested channels
- Real-time updates via WebSocket

---

### Emoji Organization

Enhanced emoji management with two plugin integrations.

<!-- SCREENSHOT: Emoji picker showing custom category with emoji icon in category bar -->
<p align="center">
  <img src="docs/assets/screenshot-emoji-placeholder.png" alt="Emoji Organization" width="350">
</p>

**Emoji Categorizer** (`mattermost-emoji-categorizer`):
- Organize custom emojis into collaborative categories
- Categories appear after "Recently Used" with emoji icons
- Real-time sync when categories change

**Emoji Usage Tracker** (`mattermost-emoji-usage`):
- Sync button in emoji picker header
- Populates "Recently Used" from actual usage history
- Scans all message and reaction history

---

## Requirements

- **Server**: [Mattermost Extended](https://github.com/stalecontext/mattermost-extended) or Mattermost Server ESR 10.11.0+
- **iOS**: 16.0+
- **Android**: 7.0+
- **Push Notifications**: Self-compiled apps require your own [Mattermost Push Notification Service](https://github.com/mattermost/mattermost-push-proxy/releases)

---

## Installation

### Building from Source

```bash
# Clone the repository
git clone https://github.com/stalecontext/mattermost-extended-mobile.git
cd mattermost-extended-mobile

# Install dependencies (skip Unix-only scripts on Windows)
npm install --ignore-scripts

# iOS setup (macOS only)
npm run ios-gems
npm run pod-install

# Start Metro bundler
npm start

# Run on device/simulator
npm run ios       # iOS (macOS only)
npm run android   # Android
```

### TestFlight Deployment (iOS)

```bash
# Full build and deploy (auto-increments build number)
./scripts/deploy-testflight.sh

# Skip setup for faster subsequent builds
./scripts/deploy-testflight.sh --skip-setup

# Build only without deploying
./scripts/deploy-testflight.sh --build-only
```

See [TestFlight Setup](docs/fork/testflight-setup.md) for first-time configuration.

---

## Plugin Compatibility

| Plugin | Status | Description |
|--------|--------|-------------|
| `mattermost-read-receipts` | Supported | Post readers, channel followers, last seen |
| `channel-sync` | Supported | Admin-controlled sidebar categories |
| `mattermost-emoji-categorizer` | Supported | Custom emoji categories |
| `mattermost-emoji-usage` | Supported | Usage-based recently used emojis |
| `mattermost-member-list` | Supported | Efficient member fetching for swipe panel |

All plugins fail gracefully if not installed - features simply don't appear.

---

## Documentation

| Document | Description |
|----------|-------------|
| [Fork Overview](docs/fork/README.md) | Architecture patterns and development notes |
| [Discord Replies](docs/fork/discord-replies.md) | Multi-quote reply implementation |
| [Swipe Navigation](docs/fork/swipe-navigation.md) | Discord-style gesture navigation |
| [Read Receipts](docs/fork/read-receipts.md) | Read receipts plugin integration |
| [Channel Sync](docs/fork/channel-sync.md) | Channel sync plugin integration |
| [Emoji Categorizer](docs/fork/emoji-categorizer.md) | Emoji categorizer plugin integration |
| [Emoji Usage](docs/fork/emoji-usage.md) | Emoji usage tracker integration |
| [Member List](docs/fork/member-list.md) | Member list plugin integration |
| [TestFlight Setup](docs/fork/testflight-setup.md) | iOS deployment configuration |

---

## Project Structure

```
mattermost-mobile/
├── app/
│   ├── products/                    # Modular features
│   │   ├── discord_replies/         # Multi-quote replies
│   │   ├── swipe_navigation/        # Discord-style navigation
│   │   ├── channel_sync/            # Channel sync plugin
│   │   ├── read_receipts/           # Read receipts plugin
│   │   ├── emoji_categorizer/       # Emoji categorizer plugin
│   │   ├── emoji_usage/             # Emoji usage tracker
│   │   └── member_list/             # Member list plugin
│   │
│   ├── components/
│   │   ├── post_draft/
│   │   │   └── discord_replies_bar/ # Reply chips above composer
│   │   └── post_list/post/
│   │       └── discord_reply_preview/ # Quote previews above posts
│   │
│   └── store/
│       └── discord_replies_store.ts # Ephemeral state for replies
│
├── docs/fork/                       # Fork-specific documentation
└── scripts/                         # Build and deployment scripts
```

---

## Related Repositories

| Repository | Description |
|------------|-------------|
| [mattermost-extended](https://github.com/stalecontext/mattermost-extended) | Server fork with E2E encryption and more |
| [mattermost-extended-mobile](https://github.com/stalecontext/mattermost-extended-mobile) | This repository |
| [mattermost-extended-cloudron-app](https://github.com/stalecontext/mattermost-extended-cloudron-app) | Cloudron packaging |

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Run checks: `npm run fix && npm run tsc`
4. Test on device/simulator
5. Submit a pull request

### Development Notes

- **Windows**: Use `npm install --ignore-scripts` to skip Unix scripts
- **Hot reload**: ~3 seconds for JS/TS changes; native changes require rebuild
- **Path aliases**: Update both `tsconfig.json` and `babel.config.js`
- **Localization**: Only edit `assets/base/i18n/en.json`

---

## Troubleshooting

### "Cannot connect to the server"

This usually indicates an SSL certificate issue. Test your certificate at [SSL Labs](https://www.ssllabs.com/ssltest/index.html). Self-signed certificates are not supported.

### "Connecting..." bar doesn't clear

Ensure your server's reverse proxy (NGINX, etc.) is configured correctly for WebSocket connections. See [Mattermost docs](https://docs.mattermost.com/install/install-ubuntu-1604.html#configuring-nginx-as-a-proxy-for-mattermost-server).

### Plugin features not appearing

- Verify the plugin is installed and enabled on the server
- Check server logs for plugin errors
- Permissions may restrict visibility (e.g., read receipts)

---

## License

Licensed under the Apache License 2.0, the same terms as Mattermost. See [LICENSE](LICENSE) for details.

---

<p align="center">
  <a href="https://github.com/stalecontext/mattermost-extended-mobile">GitHub</a> •
  <a href="https://github.com/stalecontext/mattermost-extended-mobile/issues">Issues</a> •
  <a href="https://github.com/stalecontext/mattermost-extended-mobile/releases">Releases</a>
</p>
