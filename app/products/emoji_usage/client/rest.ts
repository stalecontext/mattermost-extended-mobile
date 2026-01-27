// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {API_BASE} from '../constants';

import type {EmojiEntry, EmojiUsageConfig, ResyncResponse} from '../types';

export interface ClientEmojiUsageMix {
    getEmojiUsageRoute: () => string;
    getEmojiUsage: () => Promise<EmojiEntry[]>;
    resyncEmojiUsage: () => Promise<ResyncResponse>;
    getEmojiUsageConfig: () => Promise<EmojiUsageConfig>;
}

const ClientEmojiUsage = (superclass: any) => class extends superclass {
    getEmojiUsageRoute = () => API_BASE;

    getEmojiUsage = async (): Promise<EmojiEntry[]> => {
        return this.doFetch(
            `${this.getEmojiUsageRoute()}/usage`,
            {method: 'get'},
        );
    };

    resyncEmojiUsage = async (): Promise<ResyncResponse> => {
        return this.doFetch(
            `${this.getEmojiUsageRoute()}/resync`,
            {method: 'post'},
        );
    };

    getEmojiUsageConfig = async (): Promise<EmojiUsageConfig> => {
        return this.doFetch(
            `${this.getEmojiUsageRoute()}/config`,
            {method: 'get'},
        );
    };
};

export default ClientEmojiUsage;
