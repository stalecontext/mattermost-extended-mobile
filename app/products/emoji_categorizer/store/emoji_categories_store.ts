// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BehaviorSubject, type Observable} from 'rxjs';

import type {EmojiCategory} from '../types';

class EmojiCategoriesStoreSingleton {
    // Categories for each server
    private categories: Map<string, BehaviorSubject<EmojiCategory[]>> = new Map();

    // Version tracking for each server
    private version: Map<string, number> = new Map();

    private getCategoriesSubject(serverUrl: string): BehaviorSubject<EmojiCategory[]> {
        if (!this.categories.has(serverUrl)) {
            this.categories.set(serverUrl, new BehaviorSubject<EmojiCategory[]>([]));
        }
        return this.categories.get(serverUrl)!;
    }

    setCategories(serverUrl: string, categories: EmojiCategory[], version: number): void {
        const subject = this.getCategoriesSubject(serverUrl);

        // Sort by order
        const sorted = [...categories].sort((a, b) => a.order - b.order);
        subject.next(sorted);
        this.version.set(serverUrl, version);
    }

    getCategories(serverUrl: string): EmojiCategory[] {
        return this.getCategoriesSubject(serverUrl).getValue();
    }

    observeCategories(serverUrl: string): Observable<EmojiCategory[]> {
        return this.getCategoriesSubject(serverUrl).asObservable();
    }

    getVersion(serverUrl: string): number {
        return this.version.get(serverUrl) ?? 0;
    }

    /**
     * Clean up all state for a given server (e.g., on logout)
     */
    clearServer(serverUrl: string): void {
        const subject = this.categories.get(serverUrl);
        if (subject) {
            subject.complete();
            this.categories.delete(serverUrl);
        }
        this.version.delete(serverUrl);
    }
}

const EmojiCategoriesStore = new EmojiCategoriesStoreSingleton();
export default EmojiCategoriesStore;
