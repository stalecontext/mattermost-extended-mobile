// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * Custom status info from the plugin API
 */
export type CustomStatusInfo = {
    emoji: string;
    text: string;
    expires_at?: number; // Unix milliseconds, 0 if no expiration
};

/**
 * Member info from the plugin API
 */
export type MemberInfo = {
    user_id: string;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    nickname: string;
    position: string;
    roles: string;
    status: string; // online, away, dnd, offline
    last_activity_at: number; // Unix milliseconds
    custom_status?: CustomStatusInfo; // User's manually set status
};

/**
 * Response from the plugin API
 */
export type MembersResponse = {
    members: MemberInfo[];
    total_count: number;
};
