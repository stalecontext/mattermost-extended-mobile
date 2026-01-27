// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect, useState} from 'react';
import {BehaviorSubject, type Observable} from 'rxjs';

import type {ChannelReadersResponse, PluginPermissions} from '../types';

/**
 * Default permissions when plugin is not installed or not accessible
 */
const DEFAULT_PERMISSIONS: PluginPermissions = {
    can_view_receipts: false,
    is_admin: false,
    enable_channel_indicator: false,
    enable_post_action: false,
    enable_dropdown_menu: false,
    enable_last_seen: false,
    enable_in_direct_messages: false,
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

class ReadReceiptsStoreSingleton {
    // Permissions per server
    private permissions: Map<string, BehaviorSubject<PluginPermissions>> = new Map();

    // Channel followers (readers) cache
    private channelFollowers: Map<string, BehaviorSubject<ChannelReadersResponse | undefined>> = new Map();

    private getPermissionsSubject(serverUrl: string): BehaviorSubject<PluginPermissions> {
        const key = makeServerKey(serverUrl);
        if (!this.permissions.has(key)) {
            this.permissions.set(key, new BehaviorSubject<PluginPermissions>(DEFAULT_PERMISSIONS));
        }
        return this.permissions.get(key)!;
    }

    private getChannelFollowersSubject(serverUrl: string, channelId: string): BehaviorSubject<ChannelReadersResponse | undefined> {
        const key = makeChannelKey(serverUrl, channelId);
        if (!this.channelFollowers.has(key)) {
            this.channelFollowers.set(key, new BehaviorSubject<ChannelReadersResponse | undefined>(undefined));
        }
        return this.channelFollowers.get(key)!;
    }

    // Permissions methods
    setPermissions(serverUrl: string, permissions: PluginPermissions): void {
        const subject = this.getPermissionsSubject(serverUrl);
        subject.next(permissions);
    }

    getPermissions(serverUrl: string): PluginPermissions {
        const subject = this.getPermissionsSubject(serverUrl);
        return subject.getValue();
    }

    observePermissions(serverUrl: string): Observable<PluginPermissions> {
        return this.getPermissionsSubject(serverUrl).asObservable();
    }

    // Channel followers methods
    setChannelFollowers(serverUrl: string, channelId: string, response: ChannelReadersResponse): void {
        const subject = this.getChannelFollowersSubject(serverUrl, channelId);
        subject.next(response);
    }

    getChannelFollowers(serverUrl: string, channelId: string): ChannelReadersResponse | undefined {
        const subject = this.getChannelFollowersSubject(serverUrl, channelId);
        return subject.getValue();
    }

    observeChannelFollowers(serverUrl: string, channelId: string): Observable<ChannelReadersResponse | undefined> {
        return this.getChannelFollowersSubject(serverUrl, channelId).asObservable();
    }

    /**
     * Clean up all state for a given server (e.g., on logout)
     */
    clearServer(serverUrl: string): void {
        // Clear permissions for this server
        const permKey = makeServerKey(serverUrl);
        const permSubject = this.permissions.get(permKey);
        if (permSubject) {
            permSubject.complete();
            this.permissions.delete(permKey);
        }

        // Clear all channel followers for this server
        const keysToDelete: string[] = [];
        for (const key of this.channelFollowers.keys()) {
            if (key.startsWith(serverUrl + ':')) {
                keysToDelete.push(key);
            }
        }
        for (const key of keysToDelete) {
            const subject = this.channelFollowers.get(key);
            subject?.complete();
            this.channelFollowers.delete(key);
        }
    }

    /**
     * Clear channel followers for a specific channel
     */
    clearChannel(serverUrl: string, channelId: string): void {
        const key = makeChannelKey(serverUrl, channelId);
        const subject = this.channelFollowers.get(key);
        if (subject) {
            subject.next(undefined);
        }
    }
}

const ReadReceiptsStore = new ReadReceiptsStoreSingleton();
export default ReadReceiptsStore;

/**
 * React hook to subscribe to read receipts permissions for a server
 */
export function useReadReceiptsPermissions(serverUrl: string): PluginPermissions {
    const [permissions, setPermissions] = useState<PluginPermissions>(
        () => ReadReceiptsStore.getPermissions(serverUrl),
    );

    useEffect(() => {
        const subscription = ReadReceiptsStore.observePermissions(serverUrl).subscribe(setPermissions);
        return () => subscription.unsubscribe();
    }, [serverUrl]);

    return permissions;
}

/**
 * React hook to subscribe to channel followers for a channel
 */
export function useChannelFollowers(serverUrl: string, channelId: string): ChannelReadersResponse | undefined {
    const [followers, setFollowers] = useState<ChannelReadersResponse | undefined>(
        () => ReadReceiptsStore.getChannelFollowers(serverUrl, channelId),
    );

    useEffect(() => {
        const subscription = ReadReceiptsStore.observeChannelFollowers(serverUrl, channelId).subscribe(setFollowers);
        return () => subscription.unsubscribe();
    }, [serverUrl, channelId]);

    return followers;
}
