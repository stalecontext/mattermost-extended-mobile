# Discord-Style Multi-Quote Replies

## Overview

This feature allows users to quote-reply to multiple posts (up to 10) in a single message, similar to Discord's reply system. The implementation stores pending replies in ephemeral state, displays them as chips above the composer, and formats them as quote blocks when sending.

## Plugin Compatibility

This feature is designed to work with a server-side plugin that processes the `discord_replies` post prop. The mobile app:
1. Stores reply metadata in `post.props.discord_replies`
2. Formats quotes in the message body as markdown links

### Data Format

```typescript
// Stored in post.props.discord_replies
interface DiscordReplyData {
    post_id: string;    // ID of the quoted post
    user_id: string;    // Author's user ID
    username: string;   // Author's username
    nickname: string;   // Author's display name/nickname
    text: string;       // Quoted message text
    has_image: boolean; // Post contains images
    has_video: boolean; // Post contains videos
}
```

### Message Format

Quotes are prepended to the message as markdown:
```
>[@username](https://server/_redirect/pl/postId): quoted text...

Actual message content here
```

---

## Implementation

### File Structure

```
app/products/discord_replies/
├── types.ts          # Type definitions
├── constants.ts      # MAX_DISCORD_REPLIES = 10
└── utils.ts          # Quote formatting helpers + stripDiscordReplyQuotes

app/store/
└── discord_replies_store.ts   # Ephemeral state singleton

app/components/
├── post_list/post/discord_reply_preview/
│   └── index.tsx     # Shows quoted posts above a post
├── common_post_options/
│   ├── reply_option.tsx        # "Reply" button (now does quote-reply)
│   ├── create_thread_option.tsx # "Create Thread" button (opens thread)
│   └── quote_reply_option.tsx   # "Quote Reply" option (alias)
└── post_draft/discord_replies_bar/
    ├── index.tsx     # Container with "Replying to" header
    └── reply_chip.tsx # Individual quote chip
```

### Modified Files

| File | Purpose |
|------|---------|
| `tsconfig.json` | Added `@discord_replies/*` path alias |
| `babel.config.js` | Added `@discord_replies` alias |
| `app/components/post_list/post/post.tsx` | Renders DiscordReplyPreview, tap adds to replies |
| `app/components/post_list/post/body/message/message.tsx` | Strips blockquotes when discord_replies exists |
| `app/components/common_post_options/index.ts` | Exports ReplyOption, CreateThreadOption |
| `app/components/common_post_options/reply_option.tsx` | Now does quote-reply (was: open thread) |
| `app/components/common_post_options/create_thread_option.tsx` | Opens thread (new file) |
| `app/screens/post_options/post_options.tsx` | Reply for quote, CreateThread for thread |
| `app/components/post_draft/draft_input/draft_input.tsx` | Renders DiscordRepliesBar |
| `app/hooks/handle_send_message.ts` | Formats quotes and attaches props |
| `app/constants/snack_bar.ts` | Snackbar types for feedback |
| `assets/base/i18n/en.json` | Translation strings |

---

## Component Details

### DiscordRepliesStore (`app/store/discord_replies_store.ts`)

Singleton ephemeral store using RxJS BehaviorSubjects for reactive state.

**Key Pattern:** Uses composite key `${serverUrl}:${channelId}:${rootId}` to scope pending replies per channel/thread context.

```typescript
// API
addPendingReply(serverUrl, channelId, rootId, reply): boolean
removePendingReply(serverUrl, channelId, rootId, postId): void
clearPendingReplies(serverUrl, channelId, rootId): void
getPendingReplies(serverUrl, channelId, rootId): PendingDiscordReply[]
observePendingReplies(serverUrl, channelId, rootId): Observable<PendingDiscordReply[]>
clearServer(serverUrl): void  // Cleanup on logout
```

### ReplyOption (`app/components/common_post_options/reply_option.tsx`)

The **Reply** button now performs quote-reply (matching the plugin):
1. Fetches post author info from database
2. Creates PendingDiscordReply with post metadata
3. Adds to store (checks for duplicates and max limit)
4. Shows snackbar confirmation

**Integration:** In `post_options.tsx`, shown when `canReply` is true.

### CreateThreadOption (`app/components/common_post_options/create_thread_option.tsx`)

New button that provides the **original Reply behavior** - opens the thread view:
1. Gets the post's root ID (or post ID if root)
2. Calls `fetchAndSwitchToThread()` to open thread

**Integration:** In `post_options.tsx`, shown when `canReply` is true.

### Tap-to-Reply (`app/components/post_list/post/post.tsx`)

Tapping on a post now adds it to the pending replies queue (matching the plugin's click-to-reply):
- Only works in CHANNEL and PERMALINK screens
- Excludes system posts, deleted posts, pending posts, BoR posts
- Shows snackbar confirmation

### DiscordRepliesBar (`app/components/post_draft/discord_replies_bar/`)

Horizontal scrollable bar showing pending quote chips:
- Header: "Replying to" with "Clear all" link
- Chips: Avatar + username + remove button
- Tap chip to navigate to original post via `showPermalink()`

**Integration:** Added to `draft_input.tsx` above the Header component.

### DiscordReplyPreview (`app/components/post_list/post/discord_reply_preview/`)

Displays quoted posts above a post that has `discord_replies` in its props:
- Vertical connector line (2px, 30% opacity)
- Small avatar (16px)
- Username (link color)
- Truncated preview text (100 chars max)
- Tap to navigate to original post

**Integration:** Added to `post.tsx` after PreHeader, conditionally rendered when `post.props.discord_replies` is a non-empty array.

### Send Integration (`app/hooks/handle_send_message.ts`)

Modified `doSubmitMessage()` to:
1. Get pending replies from store
2. Format as quote block using `formatAllDiscordReplies()`
3. Prepend to message with double newline separator
4. Attach `discord_replies` array to `post.props`
5. Clear pending replies after successful send

---

## User Flow

1. **Adding quotes:**
   - **Tap a post** → Adds to quote queue (in channel/permalink view)
   - **Long-press a post → "Reply"** → Adds to quote queue
   - Snackbar confirms "Quote added"
   - Chip appears above composer

2. **Opening threads:**
   - Long-press a post → **"Create Thread"** → Opens thread view
   - (This was the original Reply behavior)

3. **Managing quotes:**
   - Tap chip → Navigate to original post
   - Tap X on chip → Remove that quote
   - Tap "Clear all" → Remove all quotes
   - Max 10 quotes enforced with error snackbar

4. **Sending:**
   - Type message and send
   - Quotes formatted as markdown links
   - `discord_replies` metadata attached
   - Pending quotes cleared

5. **Viewing:**
   - Posts with `discord_replies` show previews above content
   - **Blockquote text is hidden** (only visual preview shown)
   - Tap preview to navigate to quoted post

---

## Styling

### Colors
- Connector line: `theme.centerChannelColor` at 30% opacity
- Username: `theme.linkColor`
- Preview text: `theme.centerChannelColor` at 70% opacity
- Chip border: `theme.centerChannelColor`

### Sizes
- Preview avatar: 16px
- Chip avatar: 20px
- Preview font: 12px
- Max chip width: 150px
- Max preview length: 100 characters

---

## Localization Keys

```json
{
  "mobile.discord_replies.clear_all": "Clear all",
  "mobile.discord_replies.replying_to": "Replying to",
  "mobile.post_options.quote_reply": "Quote Reply",
  "snack.bar.discord_reply.added": "Quote added",
  "snack.bar.discord_reply.max_reached": "Maximum 10 quotes reached"
}
```

---

## Testing Checklist

### Adding Quotes
- [ ] **Tap post** in channel → Adds to queue with snackbar
- [ ] **Long-press → Reply** → Adds to queue with snackbar
- [ ] Add quote from thread reply
- [ ] Add multiple quotes (2-3)
- [ ] Verify 10-quote limit with error snackbar

### Thread Access
- [ ] **Long-press → Create Thread** → Opens thread view
- [ ] Verify "Create Thread" has correct icon

### Managing Quotes
- [ ] Remove individual quote via chip X
- [ ] Clear all quotes
- [ ] Tap chip to navigate to post

### Sending
- [ ] Send message with quotes
- [ ] Verify quotes cleared after send

### Viewing Received Posts
- [ ] Posts with `discord_replies` show reply previews
- [ ] **Blockquote is hidden** in message text (only preview shown)
- [ ] Tap preview to navigate to quoted post
- [ ] Test with posts containing images/videos (media indicators)

---

## Future Enhancements

- Drag to reorder quotes
- Quote preview in composer (expandable)
- Quote from search results
- Server-side plugin integration for richer rendering
