// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {MAX_DISCORD_REPLIES} from '@discord_replies/constants';
import {BehaviorSubject, type Observable} from 'rxjs';

import type {PendingDiscordReply} from '@discord_replies/types';

/**
 * Creates a unique key for storing pending replies per channel/thread context
 */
function makeKey(serverUrl: string, channelId: string, rootId: string): string {
    return `${serverUrl}:${channelId}:${rootId}`;
}

class DiscordRepliesStoreSingleton {
    private pendingReplies: Map<string, BehaviorSubject<PendingDiscordReply[]>> = new Map();

    private getSubject(serverUrl: string, channelId: string, rootId: string): BehaviorSubject<PendingDiscordReply[]> {
        const key = makeKey(serverUrl, channelId, rootId);
        if (!this.pendingReplies.has(key)) {
            this.pendingReplies.set(key, new BehaviorSubject<PendingDiscordReply[]>([]));
        }
        return this.pendingReplies.get(key)!;
    }

    /**
     * Toggle a pending reply - adds if not present, removes if already present.
     * Returns 'added', 'removed', or 'max_reached'.
     */
    togglePendingReply(serverUrl: string, channelId: string, rootId: string, reply: PendingDiscordReply): 'added' | 'removed' | 'max_reached' {
        const subject = this.getSubject(serverUrl, channelId, rootId);
        const current = subject.getValue();

        // Check if this reply already exists - if so, remove it
        const existingIndex = current.findIndex((r) => r.postId === reply.postId);
        if (existingIndex !== -1) {
            subject.next(current.filter((_, i) => i !== existingIndex));
            return 'removed';
        }

        // Check if we've hit the max limit
        if (current.length >= MAX_DISCORD_REPLIES) {
            return 'max_reached';
        }

        subject.next([...current, reply]);
        return 'added';
    }

    removePendingReply(serverUrl: string, channelId: string, rootId: string, postId: string): void {
        const subject = this.getSubject(serverUrl, channelId, rootId);
        const current = subject.getValue();
        const filtered = current.filter((r) => r.postId !== postId);
        if (filtered.length !== current.length) {
            subject.next(filtered);
        }
    }

    clearPendingReplies(serverUrl: string, channelId: string, rootId: string): void {
        const key = makeKey(serverUrl, channelId, rootId);
        const subject = this.pendingReplies.get(key);
        if (subject) {
            subject.next([]);
        }
    }

    getPendingReplies(serverUrl: string, channelId: string, rootId: string): PendingDiscordReply[] {
        const subject = this.getSubject(serverUrl, channelId, rootId);
        return subject.getValue();
    }

    observePendingReplies(serverUrl: string, channelId: string, rootId: string): Observable<PendingDiscordReply[]> {
        return this.getSubject(serverUrl, channelId, rootId).asObservable();
    }

    /**
     * Clean up all subjects for a given server (e.g., on logout)
     */
    clearServer(serverUrl: string): void {
        const keysToDelete: string[] = [];
        for (const key of this.pendingReplies.keys()) {
            if (key.startsWith(serverUrl + ':')) {
                keysToDelete.push(key);
            }
        }
        for (const key of keysToDelete) {
            const subject = this.pendingReplies.get(key);
            subject?.complete();
            this.pendingReplies.delete(key);
        }
    }
}

const DiscordRepliesStore = new DiscordRepliesStoreSingleton();
export default DiscordRepliesStore;
