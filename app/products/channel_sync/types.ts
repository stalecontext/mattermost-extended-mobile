// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * Response from the should-sync endpoint
 */
export type ShouldSyncResponse = {
    should_sync: boolean;
    reason?: string;
};

/**
 * A channel that the user hasn't joined yet, shown in Quick Join section
 */
export type QuickJoinChannel = {
    id: string;
    name: string;
    display_name: string;
    purpose: string;
    insert_after: string; // channel ID after which to insert this Quick Join channel
};

/**
 * Extended category with Quick Join channels
 */
export type SyncedCategory = CategoryWithChannels & {
    quick_join?: QuickJoinChannel[];
};

/**
 * WebSocket event payload for channel sync refresh
 */
export type ChannelSyncRefreshEvent = {
    user_id?: string;
    team_id?: string;
};
