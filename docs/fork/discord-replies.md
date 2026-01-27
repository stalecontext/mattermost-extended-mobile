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
└── utils.ts          # Quote formatting helpers

app/store/
└── discord_replies_store.ts   # Ephemeral state singleton

app/components/
├── post_list/post/discord_reply_preview/
│   └── index.tsx     # Shows quoted posts above a post
├── common_post_options/
│   └── quote_reply_option.tsx  # "Quote Reply" menu option
└── post_draft/discord_replies_bar/
    ├── index.tsx     # Container with "Replying to" header
    └── reply_chip.tsx # Individual quote chip
```

### Modified Files

| File | Purpose |
|------|---------|
| `tsconfig.json` | Added `@discord_replies/*` path alias |
| `babel.config.js` | Added `@discord_replies` alias |
| `app/components/post_list/post/post.tsx` | Renders DiscordReplyPreview |
| `app/components/common_post_options/index.ts` | Exports QuoteReplyOption |
| `app/screens/post_options/post_options.tsx` | Adds Quote Reply to menu |
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

### QuoteReplyOption (`app/components/common_post_options/quote_reply_option.tsx`)

Post menu option that:
1. Fetches post author info from database
2. Creates PendingDiscordReply with post metadata
3. Adds to store (checks for duplicates and max limit)
4. Shows snackbar confirmation

**Integration:** Added to `post_options.tsx` using same condition as Reply option (`canReply`).

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
   - Long-press a post → "Quote Reply"
   - Snackbar confirms "Quote added"
   - Chip appears above composer

2. **Managing quotes:**
   - Tap chip → Navigate to original post
   - Tap X on chip → Remove that quote
   - Tap "Clear all" → Remove all quotes
   - Max 10 quotes enforced with error snackbar

3. **Sending:**
   - Type message and send
   - Quotes formatted as markdown links
   - `discord_replies` metadata attached
   - Pending quotes cleared

4. **Viewing:**
   - Posts with `discord_replies` show previews above content
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

- [ ] Add quote from channel post
- [ ] Add quote from thread reply
- [ ] Add multiple quotes (2-3)
- [ ] Verify 10-quote limit with error snackbar
- [ ] Remove individual quote via chip X
- [ ] Clear all quotes
- [ ] Tap chip to navigate to post
- [ ] Send message with quotes
- [ ] Verify sent post shows reply previews
- [ ] Tap preview to navigate to quoted post
- [ ] Verify quotes cleared after send
- [ ] Test with posts containing images/videos (media indicators)

---

## Future Enhancements

- Drag to reorder quotes
- Quote preview in composer (expandable)
- Quote from search results
- Server-side plugin integration for richer rendering
