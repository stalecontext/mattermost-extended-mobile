// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import DatabaseManager from '@database/manager';
import {getCurrentTeamId, getCurrentUserId} from '@queries/servers/system';
import {logDebug} from '@utils/log';

import ChannelSyncStore from '../store/channel_sync_store';

import {checkShouldSync, fetchSyncedCategories} from './remote';

import type {ChannelSyncRefreshEvent} from '../types';

/**
 * Handle the channel sync refresh WebSocket event
 * This is triggered when the admin changes the synced categories
 */
export async function handleChannelSyncRefreshEvent(
    serverUrl: string,
    msg: WebSocketMessage,
): Promise<void> {
    try {
        const data = msg.data as ChannelSyncRefreshEvent;

        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const currentUserId = await getCurrentUserId(database);

        // If the event is targeted to a specific user, check if it's for us
        if (data.user_id && data.user_id !== currentUserId) {
            return;
        }

        const currentTeamId = await getCurrentTeamId(database);

        // If the event is targeted to a specific team, check if it's the current team
        if (data.team_id && data.team_id !== currentTeamId) {
            // Still update sync state but don't refresh categories
            const {shouldSync} = await checkShouldSync(serverUrl);
            ChannelSyncStore.setSyncEnabled(serverUrl, data.team_id, shouldSync);
            return;
        }

        logDebug('[ChannelSync] Received refresh event, re-checking sync state');

        // Re-check if sync should be enabled
        const {shouldSync} = await checkShouldSync(serverUrl);
        ChannelSyncStore.setSyncEnabled(serverUrl, currentTeamId, shouldSync);

        if (shouldSync) {
            // Refresh categories from the plugin
            await fetchSyncedCategories(serverUrl, currentTeamId, true);
        }
    } catch (error) {
        logDebug('[ChannelSync.handleChannelSyncRefreshEvent] Error:', error);
    }
}
