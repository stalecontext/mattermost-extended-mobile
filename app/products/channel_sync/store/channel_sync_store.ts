// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BehaviorSubject, type Observable} from 'rxjs';

import type {QuickJoinChannel} from '../types';

/**
 * Creates a unique key for storing state per server/team context
 */
function makeKey(serverUrl: string, teamId: string): string {
    return `${serverUrl}:${teamId}`;
}

class ChannelSyncStoreSingleton {
    // Whether sync is enabled for a server/team
    private syncEnabled: Map<string, BehaviorSubject<boolean>> = new Map();

    // Quick Join channels for a server/team
    private quickJoinChannels: Map<string, BehaviorSubject<QuickJoinChannel[]>> = new Map();

    // Mapping of Quick Join channels to their category ID for rendering
    private quickJoinCategoryMap: Map<string, BehaviorSubject<Map<string, string>>> = new Map();

    private getSyncEnabledSubject(serverUrl: string, teamId: string): BehaviorSubject<boolean> {
        const key = makeKey(serverUrl, teamId);
        if (!this.syncEnabled.has(key)) {
            this.syncEnabled.set(key, new BehaviorSubject<boolean>(false));
        }
        return this.syncEnabled.get(key)!;
    }

    private getQuickJoinSubject(serverUrl: string, teamId: string): BehaviorSubject<QuickJoinChannel[]> {
        const key = makeKey(serverUrl, teamId);
        if (!this.quickJoinChannels.has(key)) {
            this.quickJoinChannels.set(key, new BehaviorSubject<QuickJoinChannel[]>([]));
        }
        return this.quickJoinChannels.get(key)!;
    }

    private getCategoryMapSubject(serverUrl: string, teamId: string): BehaviorSubject<Map<string, string>> {
        const key = makeKey(serverUrl, teamId);
        if (!this.quickJoinCategoryMap.has(key)) {
            this.quickJoinCategoryMap.set(key, new BehaviorSubject<Map<string, string>>(new Map()));
        }
        return this.quickJoinCategoryMap.get(key)!;
    }

    // Sync Enabled methods
    setSyncEnabled(serverUrl: string, teamId: string, enabled: boolean): void {
        const subject = this.getSyncEnabledSubject(serverUrl, teamId);
        subject.next(enabled);
    }

    isSyncEnabled(serverUrl: string, teamId: string): boolean {
        const subject = this.getSyncEnabledSubject(serverUrl, teamId);
        return subject.getValue();
    }

    observeSyncEnabled(serverUrl: string, teamId: string): Observable<boolean> {
        return this.getSyncEnabledSubject(serverUrl, teamId).asObservable();
    }

    // Quick Join Channels methods
    setQuickJoinChannels(serverUrl: string, teamId: string, channels: QuickJoinChannel[], categoryMap: Map<string, string>): void {
        const channelsSubject = this.getQuickJoinSubject(serverUrl, teamId);
        channelsSubject.next(channels);

        const mapSubject = this.getCategoryMapSubject(serverUrl, teamId);
        mapSubject.next(categoryMap);
    }

    getQuickJoinChannels(serverUrl: string, teamId: string): QuickJoinChannel[] {
        const subject = this.getQuickJoinSubject(serverUrl, teamId);
        return subject.getValue();
    }

    observeQuickJoinChannels(serverUrl: string, teamId: string): Observable<QuickJoinChannel[]> {
        return this.getQuickJoinSubject(serverUrl, teamId).asObservable();
    }

    getQuickJoinCategoryMap(serverUrl: string, teamId: string): Map<string, string> {
        const subject = this.getCategoryMapSubject(serverUrl, teamId);
        return subject.getValue();
    }

    observeQuickJoinCategoryMap(serverUrl: string, teamId: string): Observable<Map<string, string>> {
        return this.getCategoryMapSubject(serverUrl, teamId).asObservable();
    }

    /**
     * Remove a Quick Join channel from the list (after joining or dismissing)
     */
    removeQuickJoinChannel(serverUrl: string, teamId: string, channelId: string): void {
        const subject = this.getQuickJoinSubject(serverUrl, teamId);
        const current = subject.getValue();
        const filtered = current.filter((c) => c.id !== channelId);
        if (filtered.length !== current.length) {
            subject.next(filtered);
        }

        const mapSubject = this.getCategoryMapSubject(serverUrl, teamId);
        const currentMap = mapSubject.getValue();
        if (currentMap.has(channelId)) {
            const newMap = new Map(currentMap);
            newMap.delete(channelId);
            mapSubject.next(newMap);
        }
    }

    /**
     * Clean up all state for a given server (e.g., on logout)
     */
    clearServer(serverUrl: string): void {
        const keysToDelete: string[] = [];

        for (const key of this.syncEnabled.keys()) {
            if (key.startsWith(serverUrl + ':')) {
                keysToDelete.push(key);
            }
        }
        for (const key of keysToDelete) {
            const subject = this.syncEnabled.get(key);
            subject?.complete();
            this.syncEnabled.delete(key);
        }

        keysToDelete.length = 0;
        for (const key of this.quickJoinChannels.keys()) {
            if (key.startsWith(serverUrl + ':')) {
                keysToDelete.push(key);
            }
        }
        for (const key of keysToDelete) {
            const subject = this.quickJoinChannels.get(key);
            subject?.complete();
            this.quickJoinChannels.delete(key);
        }

        keysToDelete.length = 0;
        for (const key of this.quickJoinCategoryMap.keys()) {
            if (key.startsWith(serverUrl + ':')) {
                keysToDelete.push(key);
            }
        }
        for (const key of keysToDelete) {
            const subject = this.quickJoinCategoryMap.get(key);
            subject?.complete();
            this.quickJoinCategoryMap.delete(key);
        }
    }

    /**
     * Clean up all state for a given server and team
     */
    clearTeam(serverUrl: string, teamId: string): void {
        const key = makeKey(serverUrl, teamId);

        const syncSubject = this.syncEnabled.get(key);
        if (syncSubject) {
            syncSubject.complete();
            this.syncEnabled.delete(key);
        }

        const quickJoinSubject = this.quickJoinChannels.get(key);
        if (quickJoinSubject) {
            quickJoinSubject.complete();
            this.quickJoinChannels.delete(key);
        }

        const mapSubject = this.quickJoinCategoryMap.get(key);
        if (mapSubject) {
            mapSubject.complete();
            this.quickJoinCategoryMap.delete(key);
        }
    }
}

const ChannelSyncStore = new ChannelSyncStoreSingleton();
export default ChannelSyncStore;
