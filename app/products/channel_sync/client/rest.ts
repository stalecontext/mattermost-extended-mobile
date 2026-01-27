// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {API_BASE} from '../constants';

import type {ShouldSyncResponse, SyncedCategoriesResponse} from '../types';

export interface ClientChannelSyncMix {
    getChannelSyncRoute: () => string;
    getShouldSync: () => Promise<ShouldSyncResponse>;
    getSyncedCategories: (teamId: string) => Promise<SyncedCategoriesResponse>;
    dismissQuickJoinChannel: (channelId: string) => Promise<void>;
}

const ClientChannelSync = (superclass: any) => class extends superclass {
    getChannelSyncRoute = () => API_BASE;

    getShouldSync = async (): Promise<ShouldSyncResponse> => {
        return this.doFetch(
            `${this.getChannelSyncRoute()}/should-sync`,
            {method: 'get'},
        );
    };

    getSyncedCategories = async (teamId: string): Promise<SyncedCategoriesResponse> => {
        return this.doFetch(
            `${this.getChannelSyncRoute()}/teams/${teamId}/categories`,
            {method: 'get'},
        );
    };

    dismissQuickJoinChannel = async (channelId: string): Promise<void> => {
        return this.doFetch(
            `${this.getChannelSyncRoute()}/quick-join/dismiss`,
            {method: 'post', body: {channel_id: channelId}},
        );
    };
};

export default ClientChannelSync;
