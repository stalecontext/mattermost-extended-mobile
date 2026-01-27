// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {API_BASE} from '../constants';

import type {MembersResponse} from '../types';

export interface ClientMemberListMix {
    getMemberListRoute: () => string;
    getChannelMembersFromPlugin: (channelId: string, page?: number, perPage?: number) => Promise<MembersResponse>;
}

const ClientMemberList = (superclass: any) => class extends superclass {
    getMemberListRoute = () => API_BASE;

    getChannelMembersFromPlugin = async (channelId: string, page = 0, perPage = 200): Promise<MembersResponse> => {
        return this.doFetch(
            `${this.getMemberListRoute()}/members?channel_id=${channelId}&page=${page}&per_page=${perPage}`,
            {method: 'get'},
        );
    };
};

export default ClientMemberList;
