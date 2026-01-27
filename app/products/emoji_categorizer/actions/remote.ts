// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetworkManager from '@managers/network_manager';
import {logError} from '@utils/log';

import EmojiCategoriesStore from '../store/emoji_categories_store';

/**
 * Fetch emoji categories from the plugin and update the store
 */
export async function fetchEmojiCategories(serverUrl: string): Promise<{error?: unknown}> {
    // eslint-disable-next-line no-console
    console.log('[EmojiCategorizer.fetchEmojiCategories] Starting fetch for server:', serverUrl);
    try {
        const client = NetworkManager.getClient(serverUrl);
        // eslint-disable-next-line no-console
        console.log('[EmojiCategorizer.fetchEmojiCategories] Got client, calling getEmojiCategories...');
        const data = await client.getEmojiCategories();
        // eslint-disable-next-line no-console
        console.log('[EmojiCategorizer.fetchEmojiCategories] Got response:', JSON.stringify(data));

        EmojiCategoriesStore.setCategories(serverUrl, data.categories, data.version);
        // eslint-disable-next-line no-console
        console.log('[EmojiCategorizer.fetchEmojiCategories] Categories stored successfully');

        return {};
    } catch (error) {
        // Plugin may not be installed, silently fail
        logError('[EmojiCategorizer.fetchEmojiCategories] Error:', error);
        return {error};
    }
}

/**
 * Check if categories need to be refreshed based on version
 */
export async function refreshEmojiCategoriesIfNeeded(serverUrl: string, newVersion: number): Promise<void> {
    const currentVersion = EmojiCategoriesStore.getVersion(serverUrl);
    if (newVersion > currentVersion) {
        await fetchEmojiCategories(serverUrl);
    }
}
