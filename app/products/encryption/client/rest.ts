// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {API_BASE} from '../constants';

import type {
    EncryptionPublicKey,
    EncryptionPublicKeysRequest,
    EncryptionStatus,
} from '../types';

export interface ClientEncryptionMix {
    getEncryptionRoute: () => string;
    getEncryptionStatus: () => Promise<EncryptionStatus>;
    getMyPublicKey: () => Promise<EncryptionPublicKey>;
    registerPublicKey: (publicKey: string) => Promise<EncryptionPublicKey>;
    getPublicKeysByUserIds: (userIds: string[]) => Promise<EncryptionPublicKey[]>;
    getChannelMemberKeys: (channelId: string) => Promise<EncryptionPublicKey[]>;
}

const ClientEncryption = (superclass: any) => class extends superclass {
    getEncryptionRoute = () => API_BASE;

    getEncryptionStatus = async (): Promise<EncryptionStatus> => {
        return this.doFetch(
            `${this.getEncryptionRoute()}/status`,
            {method: 'get'},
        );
    };

    getMyPublicKey = async (): Promise<EncryptionPublicKey> => {
        return this.doFetch(
            `${this.getEncryptionRoute()}/publickey`,
            {method: 'get'},
        );
    };

    registerPublicKey = async (publicKey: string): Promise<EncryptionPublicKey> => {
        return this.doFetch(
            `${this.getEncryptionRoute()}/publickey`,
            {method: 'post', body: {public_key: publicKey}},
        );
    };

    getPublicKeysByUserIds = async (userIds: string[]): Promise<EncryptionPublicKey[]> => {
        const body: EncryptionPublicKeysRequest = {user_ids: userIds};
        return this.doFetch(
            `${this.getEncryptionRoute()}/publickeys`,
            {method: 'post', body},
        );
    };

    getChannelMemberKeys = async (channelId: string): Promise<EncryptionPublicKey[]> => {
        return this.doFetch(
            `${this.getEncryptionRoute()}/channel/${channelId}/keys`,
            {method: 'get'},
        );
    };
};

export default ClientEncryption;
