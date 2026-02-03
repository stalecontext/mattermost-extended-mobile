// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export const API_BASE = '/api/v4/custom_channel_icons';

export const WebSocketEvents = {
    CUSTOM_CHANNEL_ICON_ADDED: 'custom_channel_icon_added',
    CUSTOM_CHANNEL_ICON_UPDATED: 'custom_channel_icon_updated',
    CUSTOM_CHANNEL_ICON_DELETED: 'custom_channel_icon_deleted',
} as const;
