// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {logDebug} from '@utils/log';

import {WebSocketEvents} from '../constants';
import CustomChannelIconsStore from '../store/custom_channel_icons_store';

import type {CustomChannelIcon} from '../types';

type WebSocketMessage = {
    event: string;
    data: {
        icon?: CustomChannelIcon;
        icon_id?: string;
    };
};

/**
 * Handles WebSocket events for custom channel icons
 */
export function handleCustomChannelIconsWebSocket(serverUrl: string, msg: WebSocketMessage): void {
    const {event, data} = msg;

    switch (event) {
        case WebSocketEvents.CUSTOM_CHANNEL_ICON_ADDED:
            if (data.icon) {
                logDebug('[CustomChannelIcons] Icon added:', data.icon.id);
                CustomChannelIconsStore.addIcon(serverUrl, data.icon);
            }
            break;

        case WebSocketEvents.CUSTOM_CHANNEL_ICON_UPDATED:
            if (data.icon) {
                logDebug('[CustomChannelIcons] Icon updated:', data.icon.id);
                CustomChannelIconsStore.updateIcon(serverUrl, data.icon);
            }
            break;

        case WebSocketEvents.CUSTOM_CHANNEL_ICON_DELETED:
            if (data.icon_id) {
                logDebug('[CustomChannelIcons] Icon deleted:', data.icon_id);
                CustomChannelIconsStore.removeIcon(serverUrl, data.icon_id);
            }
            break;
    }
}

/**
 * Check if a WebSocket event is a custom channel icon event
 */
export function isCustomChannelIconEvent(event: string): boolean {
    return event === WebSocketEvents.CUSTOM_CHANNEL_ICON_ADDED ||
           event === WebSocketEvents.CUSTOM_CHANNEL_ICON_UPDATED ||
           event === WebSocketEvents.CUSTOM_CHANNEL_ICON_DELETED;
}
