// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * A user who has read a post or channel
 */
export type Reader = {
    user_id: string;
    username: string;
    nickname: string;
    first_name?: string;
    last_name?: string;
    read_at: number; // Unix timestamp (ms)
    profile_url?: string; // /api/v4/users/{id}/image
};

/**
 * Response from GET /api/v1/post/{postId}/readers
 */
export type PostReadersResponse = {
    post_id: string;
    readers: Reader[];
};

/**
 * Response from GET /api/v1/channel/{channelId}/readers
 */
export type ChannelReadersResponse = {
    channel_id: string;
    latest_post_id: string;
    readers: Reader[];
    total_members: number;
};

/**
 * Request body for POST /api/v1/channels/readers
 */
export type BatchChannelReadersRequest = {
    channel_ids: string[];
};

/**
 * Response from POST /api/v1/channels/readers
 */
export type BatchChannelReadersResponse = {
    channels: Record<string, Reader[]>;
};

/**
 * Response from GET /api/v1/user/{userId}/last-channel
 */
export type UserLastChannelResponse = {
    user_id: string;
    channel_id: string;
    channel_name: string;
    display_name: string;
    channel_type: string; // "O"=public, "P"=private, "D"=DM, "G"=group
    last_viewed_at: number; // Unix timestamp (ms)
    team_id?: string;
    team_name?: string;
    other_user_id?: string; // DM only
    other_username?: string; // DM only
    other_first_name?: string; // DM only
    other_last_name?: string; // DM only
    other_nickname?: string; // DM only
};

/**
 * Plugin permissions and feature flags for the current user
 */
export type PluginPermissions = {
    can_view_receipts: boolean;
    is_admin: boolean;
    enable_channel_indicator: boolean;
    enable_post_action: boolean;
    enable_dropdown_menu: boolean;
    enable_last_seen: boolean;
    enable_in_direct_messages: boolean;
};

/**
 * Request body for POST /api/v1/channel-view
 */
export type ReportChannelViewRequest = {
    channel_id: string;
};
