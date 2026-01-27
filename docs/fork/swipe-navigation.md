# Discord-Style Swipe Navigation

## Overview

This feature replaces the default iOS edge-swipe-back gesture with Discord-style swipe navigation on phones:
- **Swipe right**: Slides the channel content away to reveal the channel list underneath
- **Swipe left**: Opens a member panel showing online/offline channel members

The implementation renders the channel content within the same screen as the channel list (not as a separate navigation screen), allowing for seamless sliding between views.

## Architecture

### Key Design Decision

Instead of pushing a separate Channel screen onto the navigation stack (the default Mattermost behavior), this implementation:
1. Renders the channel list normally
2. Overlays the channel content on top when a channel is selected
3. Uses gesture-driven animation to slide between views
4. The channel list remains live and interactive underneath

This approach enables true Discord-style behavior where the channel list is visible during the swipe gesture.

---

## Implementation

### File Structure

```
app/products/swipe_navigation/
├── index.ts              # Barrel exports
├── constants.ts          # Thresholds, dimensions, animation config
├── types.ts              # TypeScript definitions
└── components/
    ├── swipe_container/
    │   ├── index.tsx            # Wrapper with gesture handling (legacy, for other uses)
    │   └── use_swipe_gesture.ts # Pan gesture hook with reduced motion support
    ├── member_panel/
    │   └── index.tsx            # Right-side member list panel
    └── back_preview/
        └── index.tsx            # Back indicator (currently unused)

app/screens/home/channel_list/phone_channel_view/
├── index.tsx             # Database observer wrapper
└── phone_channel_view.tsx # Main phone channel overlay component
```

### Modified Files

| File | Purpose |
|------|---------|
| `tsconfig.json` | Added `@swipe_navigation/*` path alias |
| `babel.config.js` | Added `@swipe_navigation` alias |
| `app/screens/home/index.tsx` | Renders PhoneChannelView for phones |
| `app/screens/home/channel_list/channel_list.tsx` | Removed (PhoneChannelView moved to HomeScreen) |
| `app/actions/local/channel.ts` | Simplified - no longer pushes separate screen for phones |
| `app/screens/channel/channel.tsx` | Added `onSwipeBack` prop, tablet layout support |

---

## Component Details

### PhoneChannelView (`app/screens/home/channel_list/phone_channel_view/`)

The main component that renders channel content overlaid on the channel list.

**Key Features:**
- Observes `currentChannelId` from database to know when to show/hide
- Slides in from right when channel is selected
- Slides out when swiping back or channel is cleared
- Uses `pointerEvents='none'` when closing to allow immediate interaction with channel list
- Renders member panel for swipe-left gesture

**State Management:**
```typescript
displayedChannelId: string | null  // Currently shown channel
isVisible: boolean                  // Whether overlay is rendered
isClosing: boolean                  // Closing animation in progress
```

**Animation Flow:**
1. Channel selected → `currentChannelId` updates → slide in from right
2. Swipe right → immediate unmount, database update in background
3. Different channel → instant switch (no animation)

### useSwipeGesture (`app/products/swipe_navigation/components/swipe_container/use_swipe_gesture.ts`)

Custom hook for pan gesture handling using react-native-gesture-handler and reanimated.

**Features:**
- Horizontal pan gesture with vertical fail offset (allows scrolling)
- Modal-aware (disables when modals are open)
- Reduced motion support (uses `withTiming` instead of `withSpring`)
- Configurable thresholds for swipe completion

**Gesture Configuration:**
```typescript
activeOffsetX: [-15, 15]  // 15px horizontal before activating
failOffsetY: [-10, 10]    // Fail if vertical first
```

**Swipe Thresholds:**
- Distance: 40% of screen width
- Velocity: 400 units

### MemberPanel (`app/products/swipe_navigation/components/member_panel/`)

Right-side panel showing channel members grouped by online status.

**Features:**
- Fetches members on mount (preloaded)
- Groups into Online (online/away/dnd) and Offline sections
- ProfilePicture with status indicators
- Tap to open user profile modal

### Channel Component Changes (`app/screens/channel/channel.tsx`)

**New Props:**
```typescript
onSwipeBack?: () => void  // Custom back handler for phone swipe navigation
```

**Behavior:**
- When `onSwipeBack` is provided, uses it instead of `popTopScreen()`
- When `isTabletView` is provided, skips SafeAreaView bottom padding
- Android hardware back button respects `onSwipeBack`

---

## Navigation Flow

### Before (Default Mattermost)
```
HomeScreen (Tab.Navigator)
└── ChannelList (Tab)
    └── [User taps channel]
        └── Channel screen PUSHED onto navigation stack
            └── [User swipes edge] → Native pop gesture
```

### After (Discord-Style)
```
HomeScreen (Tab.Navigator)
├── ChannelList (Tab) ← Always visible underneath
└── PhoneChannelView (Overlay) ← Slides over channel list
    └── [User swipes right] → Overlay slides away, list visible
    └── [User swipes left] → Member panel opens
```

---

## Constants

```typescript
// app/products/swipe_navigation/constants.ts
SWIPE_THRESHOLD_PERCENT = 0.4      // 40% of screen to trigger
SWIPE_VELOCITY_THRESHOLD = 400    // Velocity to trigger
GESTURE_ACTIVE_OFFSET_X = 15      // Horizontal activation threshold
GESTURE_FAIL_OFFSET_Y = 10        // Vertical fail threshold
MEMBER_PANEL_WIDTH_PERCENT = 0.75 // 75% of screen width
SPRING_CONFIG = { damping: 20, stiffness: 200, mass: 1 }
```

---

## User Flow

1. **Opening a channel:**
   - Tap channel in list
   - `currentChannelId` updates in database
   - PhoneChannelView slides in from right (300ms)
   - Channel list stays rendered underneath

2. **Swiping back:**
   - Swipe right on channel content
   - Content slides with finger, revealing channel list
   - Release past threshold → view closes instantly
   - Channel list immediately interactive (no delay)

3. **Opening member panel:**
   - Swipe left on channel content
   - Member panel slides in from right
   - Shows online/offline members
   - Tap member to view profile

4. **Switching channels:**
   - While channel is open, tap another channel in list (visible during partial swipe)
   - Content switches instantly (no animation)

---

## Accessibility

- **Reduced Motion:** Respects system reduced motion preference
  - Uses `withTiming` (linear) instead of `withSpring` (bouncy)
  - 150ms duration for reduced motion animations
- **Screen Reader:** Member panel accessible, profile pictures have status announced

---

## Platform Behavior

| Platform | Behavior |
|----------|----------|
| Phone (iOS/Android) | Full swipe navigation enabled |
| Tablet | Uses existing side-by-side layout (AdditionalTabletView) |

---

## Known Limitations

1. **Member list accuracy:** Members are fetched on mount; may be slightly stale if users join/leave while viewing
2. **Gesture conflicts:** Very horizontal scrolling content (like code blocks) may conflict with swipe gesture
3. **Deep links:** Deep links to channels work but don't animate in

---

## Testing Checklist

### Swipe Back
- [ ] Swipe right reveals channel list
- [ ] Partial swipe snaps back if below threshold
- [ ] Fast swipe triggers even with small distance
- [ ] Channel list immediately scrollable after swipe
- [ ] Works from anywhere on the channel screen

### Channel Switching
- [ ] Tap channel while overlay visible → switches instantly
- [ ] Channel content fills full screen height
- [ ] Header and message input visible

### Member Panel
- [ ] Swipe left opens member panel
- [ ] Members grouped by status (Online/Offline)
- [ ] Status indicators visible on avatars
- [ ] Tap member opens profile modal
- [ ] Panel closes when swiping right

### Edge Cases
- [ ] Hardware back button (Android) closes channel
- [ ] Modal open → swipe disabled
- [ ] Keyboard open → keyboard dismisses on swipe start
- [ ] Reduced motion preference respected

---

## Future Enhancements

- Channel preview during swipe (show channel name/icon)
- Haptic feedback on threshold crossing
- Customizable swipe sensitivity
- Member panel search/filter
- Recent channels in member panel area
