// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {queryAllCustomEmojis} from '@queries/servers/custom_emoji';
import {EmojiIndicesByAlias} from '@utils/emoji';
import {logDebug, logError} from '@utils/log';

import type {ResyncResponse} from '../types';

/**
 * Sync recently used emojis from the emoji-usage plugin.
 * This fetches the user's emoji usage from the plugin and updates
 * the local recently used emojis list.
 *
 * @param serverUrl - The server URL
 * @returns Object with error if failed, empty object if successful
 */
export async function syncEmojiUsage(serverUrl: string): Promise<{error?: unknown; data?: ResyncResponse}> {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const data = await client.resyncEmojiUsage();

        if (data.error) {
            logError('[EmojiUsage.syncEmojiUsage] Plugin returned error:', data.error);
            return {error: data.error};
        }

        // Extract emoji names in order (already sorted by count from plugin)
        const rawEmojiNames = data.emojis.map((e) => e.name).filter((name) => name && name.length > 0);

        if (rawEmojiNames.length === 0) {
            logDebug('[EmojiUsage.syncEmojiUsage] No emojis returned from plugin');
            return {data};
        }

        // Get database to query custom emojis
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        // Get all custom emoji names from database
        const customEmojis = await queryAllCustomEmojis(database).fetch();
        const customEmojiNames = new Set(customEmojis.map((e) => e.name));

        // Filter to only include valid emojis (built-in or custom)
        const emojiNames = rawEmojiNames.filter((name) => {
            const isBuiltIn = EmojiIndicesByAlias.has(name);
            const isCustom = customEmojiNames.has(name);
            return isBuiltIn || isCustom;
        });

        logDebug('[EmojiUsage.syncEmojiUsage] Valid emojis:', emojiNames.length, 'of', rawEmojiNames.length, 'from plugin');

        if (emojiNames.length === 0) {
            logDebug('[EmojiUsage.syncEmojiUsage] No valid emojis found');
            return {data};
        }

        // First clear the existing list to ensure clean state
        await operator.handleSystem({
            systems: [{
                id: SYSTEM_IDENTIFIERS.RECENT_REACTIONS,
                value: JSON.stringify([]),
            }],
            prepareRecordsOnly: false,
        });

        // Then set the new list from the plugin
        await operator.handleSystem({
            systems: [{
                id: SYSTEM_IDENTIFIERS.RECENT_REACTIONS,
                value: JSON.stringify(emojiNames),
            }],
            prepareRecordsOnly: false,
        });

        logDebug('[EmojiUsage.syncEmojiUsage] Synced', emojiNames.length, 'emojis');
        return {data};
    } catch (error) {
        // Plugin may not be installed, silently fail
        logError('[EmojiUsage.syncEmojiUsage] Error:', error);
        return {error};
    }
}

/**
 * Fetch current emoji usage without triggering a full resync.
 * Use this for quick reads without scanning message history.
 *
 * @param serverUrl - The server URL
 * @returns Object with emoji names array or error
 */
export async function fetchEmojiUsage(serverUrl: string): Promise<{error?: unknown; emojiNames?: string[]}> {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const data = await client.getEmojiUsage();

        const emojiNames = data.map((e) => e.name).filter((name) => name && name.length > 0);
        return {emojiNames};
    } catch (error) {
        logError('[EmojiUsage.fetchEmojiUsage] Error:', error);
        return {error};
    }
}
