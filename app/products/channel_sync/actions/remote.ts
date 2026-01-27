// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {storeCategories} from '@actions/local/category';
import {joinChannel} from '@actions/remote/channel';
import {forceLogoutIfNecessary} from '@actions/remote/session';
import NetworkManager from '@managers/network_manager';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug, logError} from '@utils/log';

import ChannelSyncStore from '../store/channel_sync_store';

import type {QuickJoinChannel, SyncedCategory} from '../types';
import type {CategoriesRequest} from '@actions/remote/category';

/**
 * Check if sync should be enabled for the current user
 */
export async function checkShouldSync(serverUrl: string): Promise<{shouldSync: boolean; error?: unknown}> {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const response = await client.getShouldSync();
        return {shouldSync: response.should_sync};
    } catch (error) {
        logDebug('[ChannelSync.checkShouldSync]', getFullErrorMessage(error));

        // If the plugin is not installed or returns an error, sync is disabled
        return {shouldSync: false, error};
    }
}

/**
 * Fetch synced categories from the plugin API and store them
 */
export async function fetchSyncedCategories(
    serverUrl: string,
    teamId: string,
    prune = false,
    fetchOnly = false,
): Promise<CategoriesRequest> {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const response = await client.getSyncedCategories(teamId);

        // Extract Quick Join channels and build category map
        const quickJoinChannels: QuickJoinChannel[] = [];
        const categoryMap = new Map<string, string>();

        // The API returns {categories: [...], order: [...], quick_join_enabled: bool}
        const syncedCategories = response.categories || [];

        const categories: CategoryWithChannels[] = syncedCategories.map((sc: SyncedCategory, index: number) => {
            // Collect Quick Join channels from this category
            if (sc.quick_join && sc.quick_join.length > 0) {
                for (const qj of sc.quick_join) {
                    quickJoinChannels.push(qj);
                    categoryMap.set(qj.id, sc.id);
                }
            }

            // Return the category without the quick_join field for storage
            // Use the array index as sort_order to ensure categories are in the admin's order
            // (the plugin returns categories in admin's order, but DM category keeps user's sort_order)
            const {quick_join: _, ...category} = sc;
            return {
                ...category,
                sort_order: index,
            };
        });

        // Store Quick Join channels in ephemeral store (only if quick join is enabled)
        if (response.quick_join_enabled) {
            ChannelSyncStore.setQuickJoinChannels(serverUrl, teamId, quickJoinChannels, categoryMap);
        } else {
            ChannelSyncStore.setQuickJoinChannels(serverUrl, teamId, [], new Map());
        }

        if (!fetchOnly) {
            await storeCategories(serverUrl, categories, prune);
        }

        return {categories};
    } catch (error) {
        logError('[ChannelSync.fetchSyncedCategories]', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
}

/**
 * Dismiss a Quick Join channel (user doesn't want to see it)
 */
export async function dismissQuickJoinChannel(
    serverUrl: string,
    teamId: string,
    channelId: string,
): Promise<{error?: unknown}> {
    try {
        const client = NetworkManager.getClient(serverUrl);
        await client.dismissQuickJoinChannel(channelId);

        // Remove from local store immediately for responsive UI
        ChannelSyncStore.removeQuickJoinChannel(serverUrl, teamId, channelId);

        return {};
    } catch (error) {
        logError('[ChannelSync.dismissQuickJoinChannel]', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
}

/**
 * Join a Quick Join channel
 */
export async function joinQuickJoinChannel(
    serverUrl: string,
    teamId: string,
    channelId: string,
): Promise<{error?: unknown}> {
    try {
        // Use the existing joinChannel action
        const result = await joinChannel(serverUrl, teamId, channelId);

        if (result.error) {
            return {error: result.error};
        }

        // Remove from Quick Join list after successful join
        ChannelSyncStore.removeQuickJoinChannel(serverUrl, teamId, channelId);

        return {};
    } catch (error) {
        logError('[ChannelSync.joinQuickJoinChannel]', getFullErrorMessage(error));
        return {error};
    }
}

/**
 * Initialize Channel Sync for a server/team
 * Called when switching teams or on initial load
 */
export async function initializeChannelSync(
    serverUrl: string,
    teamId: string,
): Promise<{syncEnabled: boolean; error?: unknown}> {
    // Check if sync should be enabled
    const {shouldSync, error} = await checkShouldSync(serverUrl);

    if (error) {
        // Plugin not installed or error - disable sync
        ChannelSyncStore.setSyncEnabled(serverUrl, teamId, false);
        return {syncEnabled: false, error};
    }

    // Update store with sync state
    ChannelSyncStore.setSyncEnabled(serverUrl, teamId, shouldSync);

    return {syncEnabled: shouldSync};
}
