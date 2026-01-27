// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
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
        const emojiNames = data.emojis.map((e) => e.name);

        if (emojiNames.length === 0) {
            logDebug('[EmojiUsage.syncEmojiUsage] No emojis returned from plugin');
            return {data};
        }

        // Update the local recently used emojis
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
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

        const emojiNames = data.map((e) => e.name);
        return {emojiNames};
    } catch (error) {
        logError('[EmojiUsage.fetchEmojiUsage] Error:', error);
        return {error};
    }
}
