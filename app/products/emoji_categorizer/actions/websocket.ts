// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {logDebug} from '@utils/log';

import {refreshEmojiCategoriesIfNeeded} from './remote';

import type {CategoriesUpdatedEvent} from '../types';

/**
 * Handle the emoji categories updated WebSocket event
 * This is triggered when categories are modified via the plugin
 */
export async function handleEmojiCategoriesUpdatedEvent(
    serverUrl: string,
    msg: WebSocketMessage,
): Promise<void> {
    try {
        const data = msg.data as CategoriesUpdatedEvent;

        logDebug('[EmojiCategorizer] Received categories_updated event, version:', data.version);

        // Refresh categories if the version is newer
        await refreshEmojiCategoriesIfNeeded(serverUrl, data.version);
    } catch (error) {
        logDebug('[EmojiCategorizer.handleEmojiCategoriesUpdatedEvent] Error:', error);
    }
}
