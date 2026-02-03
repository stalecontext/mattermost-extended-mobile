// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {API_BASE} from '../constants';

import type {
    CustomChannelIcon,
    CustomChannelIconCreate,
    CustomChannelIconPatch,
} from '../types';

export interface ClientCustomChannelIconsMix {
    getCustomChannelIconsRoute: () => string;
    getCustomChannelIconRoute: (iconId: string) => string;
    getCustomChannelIcons: () => Promise<CustomChannelIcon[]>;
    getCustomChannelIcon: (iconId: string) => Promise<CustomChannelIcon>;
    createCustomChannelIcon: (icon: CustomChannelIconCreate) => Promise<CustomChannelIcon>;
    updateCustomChannelIcon: (iconId: string, patch: CustomChannelIconPatch) => Promise<CustomChannelIcon>;
    deleteCustomChannelIcon: (iconId: string) => Promise<{status: string}>;
}

const ClientCustomChannelIcons = (superclass: any) => class extends superclass {
    getCustomChannelIconsRoute = () => API_BASE;

    getCustomChannelIconRoute = (iconId: string) => `${this.getCustomChannelIconsRoute()}/${iconId}`;

    getCustomChannelIcons = async (): Promise<CustomChannelIcon[]> => {
        return this.doFetch(
            this.getCustomChannelIconsRoute(),
            {method: 'get'},
        );
    };

    getCustomChannelIcon = async (iconId: string): Promise<CustomChannelIcon> => {
        return this.doFetch(
            this.getCustomChannelIconRoute(iconId),
            {method: 'get'},
        );
    };

    createCustomChannelIcon = async (icon: CustomChannelIconCreate): Promise<CustomChannelIcon> => {
        return this.doFetch(
            this.getCustomChannelIconsRoute(),
            {method: 'post', body: icon},
        );
    };

    updateCustomChannelIcon = async (iconId: string, patch: CustomChannelIconPatch): Promise<CustomChannelIcon> => {
        return this.doFetch(
            this.getCustomChannelIconRoute(iconId),
            {method: 'put', body: patch},
        );
    };

    deleteCustomChannelIcon = async (iconId: string): Promise<{status: string}> => {
        return this.doFetch(
            this.getCustomChannelIconRoute(iconId),
            {method: 'delete'},
        );
    };
};

export default ClientCustomChannelIcons;
