// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {logDebug} from '@utils/log';

import ReadReceiptsStore from '../store/read_receipts_store';

import {fetchChannelFollowers} from './remote';

/**
 * Handle new post event - refresh channel followers if we're tracking that channel
 */
export async function handlePostCreatedForReadReceipts(
    serverUrl: string,
    msg: WebSocketMessage,
): Promise<void> {
    try {
        const data = msg.data as {channel_id?: string};
        const channelId = data.channel_id || msg.broadcast?.channel_id;

        if (!channelId) {
            return;
        }

        // Only refresh if we're already tracking this channel's followers
        const currentFollowers = ReadReceiptsStore.getChannelFollowers(serverUrl, channelId);
        if (currentFollowers) {
            logDebug('[ReadReceipts] New post in tracked channel, refreshing followers', channelId);
            fetchChannelFollowers(serverUrl, channelId);
        }
    } catch (error) {
        logDebug('[ReadReceipts.handlePostCreatedForReadReceipts] Error:', error);
    }
}
