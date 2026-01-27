// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * An emoji entry with usage count
 */
export type EmojiEntry = {
    name: string;
    count: number;
};

/**
 * Response from the resync endpoint
 */
export type ResyncResponse = {
    emojis: EmojiEntry[];
    posts_scanned: number;
    reactions_found: number;
    unique_emojis: number;
    channels_scanned: number;
    error?: string;
};

/**
 * Plugin configuration
 */
export type EmojiUsageConfig = {
    max_recent_emojis: number;
};
