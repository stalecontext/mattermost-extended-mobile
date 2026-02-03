// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetworkManager from '@managers/network_manager';
import {logError} from '@utils/log';

import EncryptionStore from '../store/encryption_store';

import type {EncryptionPublicKey, EncryptionStatus} from '../types';

/**
 * Fetches and stores the encryption status for the current session
 */
export async function fetchEncryptionStatus(serverUrl: string): Promise<{status?: EncryptionStatus; error?: unknown}> {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const status = await client.getEncryptionStatus();
        EncryptionStore.setStatus(serverUrl, status);
        return {status};
    } catch (error) {
        logError('[Encryption.fetchEncryptionStatus]', error);
        return {error};
    }
}

/**
 * Fetches and stores the current session's public key
 */
export async function fetchMyPublicKey(serverUrl: string): Promise<{key?: EncryptionPublicKey; error?: unknown}> {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const key = await client.getMyPublicKey();
        if (key.public_key) {
            EncryptionStore.setMyKey(serverUrl, key);
        } else {
            EncryptionStore.setMyKey(serverUrl, undefined);
        }
        return {key};
    } catch (error) {
        logError('[Encryption.fetchMyPublicKey]', error);
        return {error};
    }
}

/**
 * Registers a public key for the current session
 */
export async function registerPublicKey(serverUrl: string, publicKey: string): Promise<{key?: EncryptionPublicKey; error?: unknown}> {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const key = await client.registerPublicKey(publicKey);
        EncryptionStore.setMyKey(serverUrl, key);

        // Update status to reflect that we now have a key
        const currentStatus = EncryptionStore.getStatus(serverUrl);
        EncryptionStore.setStatus(serverUrl, {
            ...currentStatus,
            has_key: true,
        });

        return {key};
    } catch (error) {
        logError('[Encryption.registerPublicKey]', error);
        return {error};
    }
}

/**
 * Fetches public keys for multiple users
 */
export async function fetchPublicKeysByUserIds(serverUrl: string, userIds: string[]): Promise<{keys?: EncryptionPublicKey[]; error?: unknown}> {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const keys = await client.getPublicKeysByUserIds(userIds);
        return {keys};
    } catch (error) {
        logError('[Encryption.fetchPublicKeysByUserIds]', error);
        return {error};
    }
}

/**
 * Fetches and stores public keys for all members of a channel
 */
export async function fetchChannelMemberKeys(serverUrl: string, channelId: string): Promise<{keys?: EncryptionPublicKey[]; error?: unknown}> {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const keys = await client.getChannelMemberKeys(channelId);
        EncryptionStore.setChannelKeys(serverUrl, channelId, keys);
        return {keys};
    } catch (error) {
        logError('[Encryption.fetchChannelMemberKeys]', error);
        return {error};
    }
}

/**
 * Initializes encryption for a server - fetches status and my key
 */
export async function initializeEncryption(serverUrl: string): Promise<{status?: EncryptionStatus; key?: EncryptionPublicKey; error?: unknown}> {
    const statusResult = await fetchEncryptionStatus(serverUrl);
    if (statusResult.error) {
        return {error: statusResult.error};
    }

    // Only fetch my key if encryption is enabled
    if (statusResult.status?.enabled) {
        const keyResult = await fetchMyPublicKey(serverUrl);
        return {
            status: statusResult.status,
            key: keyResult.key,
            error: keyResult.error,
        };
    }

    return {status: statusResult.status};
}
