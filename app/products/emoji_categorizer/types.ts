// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * A custom emoji category from the emoji categorizer plugin
 */
export type EmojiCategory = {
    id: string;
    name: string;
    icon: string; // Emoji name used as category icon (e.g., 'star', 'heart')
    emojiIds: string[]; // Array of emoji names in this category
    order: number;
};

/**
 * Categories data response from the plugin
 */
export type CategoriesData = {
    categories: EmojiCategory[];
    version: number;
};

/**
 * WebSocket event payload for categories update
 */
export type CategoriesUpdatedEvent = {
    version: number;
};
