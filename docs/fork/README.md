# Fork Customizations

This fork of mattermost-mobile includes custom features that extend the official Mattermost mobile app.

## Features

### Discord-Style Multi-Quote Replies
Allows users to select multiple posts (up to 10) to quote-reply to in a single message, similar to Discord's reply system.

**Documentation:** [discord-replies.md](./discord-replies.md)

**Status:** Implemented

### Discord-Style Swipe Navigation
Replaces the default iOS edge-swipe navigation with Discord-style swipe gestures on phones. Swipe right to slide the channel away and reveal the channel list underneath. Swipe left to open a member panel showing online/offline channel members.

**Documentation:** [swipe-navigation.md](./swipe-navigation.md)

**Status:** Implemented

### AI Agents (mattermost-ai) Support
Full mobile UI for interacting with LLM-powered AI agents. Supports streaming responses with animated cursor, expandable reasoning/thinking displays, tool call approvals (Accept/Reject/Edit), citations and annotations, and Stop/Regenerate controls.

**Documentation:** [agents.md](./agents.md)

**Status:** Implemented

### Read Receipts Plugin Support
Mobile support for the `com.github.mattermost-read-receipts` server plugin that tracks who has read posts and channels. Features include "View who read this" post menu option, "X following" channel indicator, and "Last Seen" in user profiles.

**Documentation:** [read-receipts.md](./read-receipts.md)

**Status:** Implemented

### Channel Sync Plugin Support
Mobile support for the `com.example.channel-sync` server plugin that syncs sidebar categories from a Site Admin to all users, with Quick Join channels shown inline.

**Documentation:** [channel-sync.md](./channel-sync.md)

**Status:** Implemented

### Emoji Categorizer Plugin Support
Mobile support for the `com.github.mattermost-emoji-categorizer` server plugin that organizes custom emojis into collaborative categories. Categories appear in the emoji picker after "Recently Used" with custom emoji icons in the category bar.

**Documentation:** [emoji-categorizer.md](./emoji-categorizer.md)

**Status:** Implemented

### Emoji Usage Tracker Plugin Support
Mobile support for the `com.github.mattermost-emoji-usage` server plugin that tracks emoji usage frequency. Adds a sync button to the emoji picker that populates "Recently Used" based on actual usage history.

**Documentation:** [emoji-usage.md](./emoji-usage.md)

**Status:** Implemented

### Member List Plugin Support
Mobile support for the `com.github.mattermost-member-list` server plugin for efficient channel member fetching. Used to power the member panel in swipe navigation.

**Documentation:** [member-list.md](./member-list.md)

**Status:** Implemented

### Encryption Feature Flag Support
Mobile support for the server-side `Encryption` feature flag and key management APIs. Enables end-to-end encryption capabilities including key registration, status tracking, and fetching channel member keys.

**Documentation:** [encryption.md](./encryption.md)

**Status:** Implemented

---

## Architecture Patterns Used

### Products Architecture
Custom features are implemented as "products" in `app/products/`, following the pattern established by `agents/`, `calls/`, and `playbooks/`. Each product can have:
- `types.ts` - Type definitions
- `constants.ts` - Feature constants
- `utils.ts` - Utility functions
- `client/rest.ts` - API client extensions (if needed)

### Ephemeral State Management
For transient UI state that doesn't need persistence, we use singleton stores in `app/store/` following the pattern from `ephemeral_store.ts`. These use RxJS BehaviorSubjects for reactive updates.

### Component Patterns
- **Post options**: Add to `app/components/common_post_options/` and export from `index.ts`
- **Post decorations**: Add components to `app/components/post_list/post/` and integrate in `post.tsx`
- **Draft input extensions**: Add to `app/components/post_draft/` and integrate in `draft_input.tsx`

---

## Development Notes

### Windows Development
This fork is primarily developed on Windows. Key differences:
- Use `npm install --ignore-scripts` to skip Unix-only preinstall scripts
- Metro bundler works normally
- Android development works; iOS requires macOS

### Path Aliases
When adding new products, update both:
- `tsconfig.json` - For TypeScript resolution
- `babel.config.js` - For runtime resolution

Example for a new product `@myfeature/*`:
```javascript
// tsconfig.json
"@myfeature/*": ["app/products/myfeature/*"]

// babel.config.js
'@myfeature': './app/products/myfeature'
```

### Localization
Only modify `assets/base/i18n/en.json`. Use `defineMessages()` in code and the translation ID will be extracted. Snackbar messages are defined in `app/constants/snack_bar.ts`.
