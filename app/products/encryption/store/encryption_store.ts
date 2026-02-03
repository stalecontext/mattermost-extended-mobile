// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect, useState} from 'react';
import {BehaviorSubject, type Observable} from 'rxjs';

import type {EncryptionPublicKey, EncryptionStatus} from '../types';

/**
 * Default status when encryption status hasn't been fetched
 */
const DEFAULT_STATUS: EncryptionStatus = {
    enabled: false,
    can_encrypt: false,
    has_key: false,
    session_id: '',
};

/**
 * Creates a unique key for storing state per server context
 */
function makeServerKey(serverUrl: string): string {
    return serverUrl;
}

/**
 * Creates a unique key for storing state per server/channel context
 */
function makeChannelKey(serverUrl: string, channelId: string): string {
    return `${serverUrl}:${channelId}`;
}

class EncryptionStoreSingleton {
    // Encryption status per server
    private status: Map<string, BehaviorSubject<EncryptionStatus>> = new Map();

    // My public key per server
    private myKey: Map<string, BehaviorSubject<EncryptionPublicKey | undefined>> = new Map();

    // Channel member keys cache
    private channelKeys: Map<string, BehaviorSubject<EncryptionPublicKey[] | undefined>> = new Map();

    // User keys cache (keyed by serverUrl:userId)
    private userKeys: Map<string, BehaviorSubject<EncryptionPublicKey[] | undefined>> = new Map();

    private getStatusSubject(serverUrl: string): BehaviorSubject<EncryptionStatus> {
        const key = makeServerKey(serverUrl);
        if (!this.status.has(key)) {
            this.status.set(key, new BehaviorSubject<EncryptionStatus>(DEFAULT_STATUS));
        }
        return this.status.get(key)!;
    }

    private getMyKeySubject(serverUrl: string): BehaviorSubject<EncryptionPublicKey | undefined> {
        const key = makeServerKey(serverUrl);
        if (!this.myKey.has(key)) {
            this.myKey.set(key, new BehaviorSubject<EncryptionPublicKey | undefined>(undefined));
        }
        return this.myKey.get(key)!;
    }

    private getChannelKeysSubject(serverUrl: string, channelId: string): BehaviorSubject<EncryptionPublicKey[] | undefined> {
        const key = makeChannelKey(serverUrl, channelId);
        if (!this.channelKeys.has(key)) {
            this.channelKeys.set(key, new BehaviorSubject<EncryptionPublicKey[] | undefined>(undefined));
        }
        return this.channelKeys.get(key)!;
    }

    // Status methods
    setStatus(serverUrl: string, status: EncryptionStatus): void {
        const subject = this.getStatusSubject(serverUrl);
        subject.next(status);
    }

    getStatus(serverUrl: string): EncryptionStatus {
        const subject = this.getStatusSubject(serverUrl);
        return subject.getValue();
    }

    observeStatus(serverUrl: string): Observable<EncryptionStatus> {
        return this.getStatusSubject(serverUrl).asObservable();
    }

    // My key methods
    setMyKey(serverUrl: string, key: EncryptionPublicKey | undefined): void {
        const subject = this.getMyKeySubject(serverUrl);
        subject.next(key);
    }

    getMyKey(serverUrl: string): EncryptionPublicKey | undefined {
        const subject = this.getMyKeySubject(serverUrl);
        return subject.getValue();
    }

    observeMyKey(serverUrl: string): Observable<EncryptionPublicKey | undefined> {
        return this.getMyKeySubject(serverUrl).asObservable();
    }

    // Channel keys methods
    setChannelKeys(serverUrl: string, channelId: string, keys: EncryptionPublicKey[]): void {
        const subject = this.getChannelKeysSubject(serverUrl, channelId);
        subject.next(keys);
    }

    getChannelKeys(serverUrl: string, channelId: string): EncryptionPublicKey[] | undefined {
        const subject = this.getChannelKeysSubject(serverUrl, channelId);
        return subject.getValue();
    }

    observeChannelKeys(serverUrl: string, channelId: string): Observable<EncryptionPublicKey[] | undefined> {
        return this.getChannelKeysSubject(serverUrl, channelId).asObservable();
    }

    /**
     * Clean up all state for a given server (e.g., on logout)
     */
    clearServer(serverUrl: string): void {
        // Clear status for this server
        const statusKey = makeServerKey(serverUrl);
        const statusSubject = this.status.get(statusKey);
        if (statusSubject) {
            statusSubject.complete();
            this.status.delete(statusKey);
        }

        // Clear my key for this server
        const myKeySubject = this.myKey.get(statusKey);
        if (myKeySubject) {
            myKeySubject.complete();
            this.myKey.delete(statusKey);
        }

        // Clear all channel keys for this server
        const channelKeysToDelete: string[] = [];
        for (const key of this.channelKeys.keys()) {
            if (key.startsWith(serverUrl + ':')) {
                channelKeysToDelete.push(key);
            }
        }
        for (const key of channelKeysToDelete) {
            const subject = this.channelKeys.get(key);
            subject?.complete();
            this.channelKeys.delete(key);
        }

        // Clear all user keys for this server
        const userKeysToDelete: string[] = [];
        for (const key of this.userKeys.keys()) {
            if (key.startsWith(serverUrl + ':')) {
                userKeysToDelete.push(key);
            }
        }
        for (const key of userKeysToDelete) {
            const subject = this.userKeys.get(key);
            subject?.complete();
            this.userKeys.delete(key);
        }
    }

    /**
     * Clear channel keys for a specific channel
     */
    clearChannel(serverUrl: string, channelId: string): void {
        const key = makeChannelKey(serverUrl, channelId);
        const subject = this.channelKeys.get(key);
        if (subject) {
            subject.next(undefined);
        }
    }
}

const EncryptionStore = new EncryptionStoreSingleton();
export default EncryptionStore;

/**
 * React hook to subscribe to encryption status for a server
 */
export function useEncryptionStatus(serverUrl: string): EncryptionStatus {
    const [status, setStatus] = useState<EncryptionStatus>(
        () => EncryptionStore.getStatus(serverUrl),
    );

    useEffect(() => {
        const subscription = EncryptionStore.observeStatus(serverUrl).subscribe(setStatus);
        return () => subscription.unsubscribe();
    }, [serverUrl]);

    return status;
}

/**
 * React hook to subscribe to encryption enabled state
 */
export function useEncryptionEnabled(serverUrl: string): boolean {
    const status = useEncryptionStatus(serverUrl);
    return status.enabled;
}

/**
 * React hook to subscribe to my public key for a server
 */
export function useMyEncryptionKey(serverUrl: string): EncryptionPublicKey | undefined {
    const [key, setKey] = useState<EncryptionPublicKey | undefined>(
        () => EncryptionStore.getMyKey(serverUrl),
    );

    useEffect(() => {
        const subscription = EncryptionStore.observeMyKey(serverUrl).subscribe(setKey);
        return () => subscription.unsubscribe();
    }, [serverUrl]);

    return key;
}

/**
 * React hook to subscribe to channel member keys
 */
export function useChannelEncryptionKeys(serverUrl: string, channelId: string): EncryptionPublicKey[] | undefined {
    const [keys, setKeys] = useState<EncryptionPublicKey[] | undefined>(
        () => EncryptionStore.getChannelKeys(serverUrl, channelId),
    );

    useEffect(() => {
        const subscription = EncryptionStore.observeChannelKeys(serverUrl, channelId).subscribe(setKeys);
        return () => subscription.unsubscribe();
    }, [serverUrl, channelId]);

    return keys;
}
