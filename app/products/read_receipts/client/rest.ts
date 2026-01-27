// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {API_BASE} from '../constants';

import type {
    BatchChannelReadersRequest,
    BatchChannelReadersResponse,
    ChannelReadersResponse,
    PluginPermissions,
    PostReadersResponse,
    UserLastChannelResponse,
} from '../types';

export interface ClientReadReceiptsMix {
    getReadReceiptsRoute: () => string;
    getReadReceiptsPermissions: () => Promise<PluginPermissions>;
    getPostReaders: (postId: string) => Promise<PostReadersResponse>;
    getChannelReaders: (channelId: string) => Promise<ChannelReadersResponse>;
    getBatchChannelReaders: (channelIds: string[]) => Promise<BatchChannelReadersResponse>;
    getUserLastChannel: (userId: string) => Promise<UserLastChannelResponse>;
    reportChannelView: (channelId: string) => Promise<void>;
}

const ClientReadReceipts = (superclass: any) => class extends superclass {
    getReadReceiptsRoute = () => API_BASE;

    getReadReceiptsPermissions = async (): Promise<PluginPermissions> => {
        return this.doFetch(
            `${this.getReadReceiptsRoute()}/permissions`,
            {method: 'get'},
        );
    };

    getPostReaders = async (postId: string): Promise<PostReadersResponse> => {
        return this.doFetch(
            `${this.getReadReceiptsRoute()}/post/${postId}/readers`,
            {method: 'get'},
        );
    };

    getChannelReaders = async (channelId: string): Promise<ChannelReadersResponse> => {
        return this.doFetch(
            `${this.getReadReceiptsRoute()}/channel/${channelId}/readers`,
            {method: 'get'},
        );
    };

    getBatchChannelReaders = async (channelIds: string[]): Promise<BatchChannelReadersResponse> => {
        const body: BatchChannelReadersRequest = {channel_ids: channelIds};
        return this.doFetch(
            `${this.getReadReceiptsRoute()}/channels/readers`,
            {method: 'post', body},
        );
    };

    getUserLastChannel = async (userId: string): Promise<UserLastChannelResponse> => {
        return this.doFetch(
            `${this.getReadReceiptsRoute()}/user/${userId}/last-channel`,
            {method: 'get'},
        );
    };

    reportChannelView = async (channelId: string): Promise<void> => {
        return this.doFetch(
            `${this.getReadReceiptsRoute()}/channel-view`,
            {method: 'post', body: {channel_id: channelId}},
        );
    };
};

export default ClientReadReceipts;
