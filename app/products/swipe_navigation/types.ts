// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {AvailableScreens} from '@typings/screens/navigation';
import type {ReactNode} from 'react';
import type {SharedValue} from 'react-native-reanimated';

/**
 * Swipe direction enum
 */
export const SwipeDirection = {
    None: 'none',
    Left: 'left', // Opens member panel
    Right: 'right', // Goes back
} as const;

export type SwipeDirectionType = typeof SwipeDirection[keyof typeof SwipeDirection];

/**
 * Swipe state for the container
 */
export type SwipeState = {
    isActive: boolean;
    direction: SwipeDirectionType;
    progress: number; // 0-1, how far the swipe has progressed
};

/**
 * Props for SwipeContainer component
 */
export type SwipeContainerProps = {
    children: ReactNode;
    channelId: string;
    componentId?: AvailableScreens;
    enabled?: boolean;
    onSwipeBack?: () => void;
    onMemberPanelOpen?: () => void;
    onMemberPanelClose?: () => void;
};

/**
 * Return type for useSwipeGesture hook
 */
export type UseSwipeGestureReturn = {
    translateX: SharedValue<number>;
    panGesture: ReturnType<typeof import('react-native-gesture-handler').Gesture.Pan>;
    isPanelOpen: SharedValue<boolean>;
    openPanel: () => void;
    closePanel: () => void;
};

/**
 * Member with status for the member panel
 */
export type MemberWithStatus = {
    id: string;
    username: string;
    nickname: string;
    firstName: string;
    lastName: string;
    status: UserStatusType;
    lastPictureUpdate: number;
};

/**
 * User status types (from Mattermost)
 */
export const UserStatus = {
    Online: 'online',
    Away: 'away',
    Dnd: 'dnd',
    Offline: 'offline',
} as const;

export type UserStatusType = typeof UserStatus[keyof typeof UserStatus];

/**
 * Section data for the member list
 */
export type MemberSection = {
    title: string;
    data: MemberWithStatus[];
};
