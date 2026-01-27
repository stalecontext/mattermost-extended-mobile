# Fork Customizations

This fork of mattermost-mobile includes custom features that extend the official Mattermost mobile app.

## Features

### Discord-Style Multi-Quote Replies
Allows users to select multiple posts (up to 10) to quote-reply to in a single message, similar to Discord's reply system.

**Documentation:** [discord-replies.md](./discord-replies.md)

**Status:** Implemented

### Channel Sync Plugin Support
Mobile support for the `com.example.channel-sync` server plugin that syncs sidebar categories from a Site Admin to all users, with Quick Join channels shown inline.

**Documentation:** [channel-sync.md](./channel-sync.md)

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
