// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';

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
        console.log('[EMOJI_SYNC] Starting sync...');
        const client = NetworkManager.getClient(serverUrl);
        const data = await client.resyncEmojiUsage();

        console.log('[EMOJI_SYNC] Raw response from plugin:', JSON.stringify(data, null, 2));

        if (data.error) {
            console.error('[EMOJI_SYNC] Plugin returned error:', data.error);
            return {error: data.error};
        }

        console.log('[EMOJI_SYNC] Number of emojis returned:', data.emojis?.length);

        // Extract emoji names in order (already sorted by count from plugin)
        // Use raw names - the plugin stores canonical emoji names from the server
        const emojiNames = data.emojis.map((e) => e.name).filter((name) => name && name.length > 0);

        console.log('[EMOJI_SYNC] Filtered emoji names count:', emojiNames.length);
        console.log('[EMOJI_SYNC] First 10 emoji names:', emojiNames.slice(0, 10));
        console.log('[EMOJI_SYNC] All emoji names:', emojiNames);

        if (emojiNames.length === 0) {
            console.log('[EMOJI_SYNC] No emojis to store');
            return {data};
        }

        // Update the local recently used emojis
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        console.log('[EMOJI_SYNC] Clearing existing list...');

        // First clear the existing list to ensure clean state
        await operator.handleSystem({
            systems: [{
                id: SYSTEM_IDENTIFIERS.RECENT_REACTIONS,
                value: JSON.stringify([]),
            }],
            prepareRecordsOnly: false,
        });

        const valueToStore = JSON.stringify(emojiNames);
        console.log('[EMOJI_SYNC] Storing new list:', valueToStore);

        // Then set the new list from the plugin
        await operator.handleSystem({
            systems: [{
                id: SYSTEM_IDENTIFIERS.RECENT_REACTIONS,
                value: valueToStore,
            }],
            prepareRecordsOnly: false,
        });

        console.log('[EMOJI_SYNC] Done! Synced', emojiNames.length, 'emojis');
        return {data};
    } catch (error) {
        console.error('[EMOJI_SYNC] Error:', error);
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
        console.error('[EmojiUsage.fetchEmojiUsage] Error:', error);
        return {error};
    }
}
