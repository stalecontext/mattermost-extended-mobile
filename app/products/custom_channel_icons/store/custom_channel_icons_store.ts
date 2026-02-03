// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect, useState} from 'react';
import {BehaviorSubject, type Observable} from 'rxjs';

import type {CustomChannelIcon} from '../types';

/**
 * Creates a unique key for storing state per server context
 */
function makeServerKey(serverUrl: string): string {
    return serverUrl;
}

class CustomChannelIconsStoreSingleton {
    // Icons per server
    private icons: Map<string, BehaviorSubject<CustomChannelIcon[]>> = new Map();

    // Loading state per server
    private loading: Map<string, BehaviorSubject<boolean>> = new Map();

    private getIconsSubject(serverUrl: string): BehaviorSubject<CustomChannelIcon[]> {
        const key = makeServerKey(serverUrl);
        if (!this.icons.has(key)) {
            this.icons.set(key, new BehaviorSubject<CustomChannelIcon[]>([]));
        }
        return this.icons.get(key)!;
    }

    private getLoadingSubject(serverUrl: string): BehaviorSubject<boolean> {
        const key = makeServerKey(serverUrl);
        if (!this.loading.has(key)) {
            this.loading.set(key, new BehaviorSubject<boolean>(false));
        }
        return this.loading.get(key)!;
    }

    // Icons methods
    setIcons(serverUrl: string, icons: CustomChannelIcon[]): void {
        const subject = this.getIconsSubject(serverUrl);
        subject.next(icons);
    }

    getIcons(serverUrl: string): CustomChannelIcon[] {
        const subject = this.getIconsSubject(serverUrl);
        return subject.getValue();
    }

    observeIcons(serverUrl: string): Observable<CustomChannelIcon[]> {
        return this.getIconsSubject(serverUrl).asObservable();
    }

    // Add a single icon
    addIcon(serverUrl: string, icon: CustomChannelIcon): void {
        const subject = this.getIconsSubject(serverUrl);
        const current = subject.getValue();

        // Check if already exists (avoid duplicates)
        if (!current.some((i) => i.id === icon.id)) {
            subject.next([...current, icon]);
        }
    }

    // Update a single icon
    updateIcon(serverUrl: string, icon: CustomChannelIcon): void {
        const subject = this.getIconsSubject(serverUrl);
        const current = subject.getValue();
        const index = current.findIndex((i) => i.id === icon.id);
        if (index !== -1) {
            const updated = [...current];
            updated[index] = icon;
            subject.next(updated);
        }
    }

    // Remove a single icon
    removeIcon(serverUrl: string, iconId: string): void {
        const subject = this.getIconsSubject(serverUrl);
        const current = subject.getValue();
        subject.next(current.filter((i) => i.id !== iconId));
    }

    // Get a specific icon by ID
    getIcon(serverUrl: string, iconId: string): CustomChannelIcon | undefined {
        const icons = this.getIcons(serverUrl);
        return icons.find((i) => i.id === iconId);
    }

    // Loading state methods
    setLoading(serverUrl: string, loading: boolean): void {
        const subject = this.getLoadingSubject(serverUrl);
        subject.next(loading);
    }

    isLoading(serverUrl: string): boolean {
        const subject = this.getLoadingSubject(serverUrl);
        return subject.getValue();
    }

    observeLoading(serverUrl: string): Observable<boolean> {
        return this.getLoadingSubject(serverUrl).asObservable();
    }

    /**
     * Clean up all state for a given server (e.g., on logout)
     */
    clearServer(serverUrl: string): void {
        const key = makeServerKey(serverUrl);

        const iconsSubject = this.icons.get(key);
        if (iconsSubject) {
            iconsSubject.complete();
            this.icons.delete(key);
        }

        const loadingSubject = this.loading.get(key);
        if (loadingSubject) {
            loadingSubject.complete();
            this.loading.delete(key);
        }
    }
}

const CustomChannelIconsStore = new CustomChannelIconsStoreSingleton();
export default CustomChannelIconsStore;

/**
 * React hook to subscribe to custom channel icons for a server
 */
export function useCustomChannelIcons(serverUrl: string): CustomChannelIcon[] {
    const [icons, setIcons] = useState<CustomChannelIcon[]>(
        () => CustomChannelIconsStore.getIcons(serverUrl),
    );

    useEffect(() => {
        const subscription = CustomChannelIconsStore.observeIcons(serverUrl).subscribe(setIcons);
        return () => subscription.unsubscribe();
    }, [serverUrl]);

    return icons;
}

/**
 * React hook to subscribe to a specific custom channel icon
 */
export function useCustomChannelIcon(serverUrl: string, iconId: string): CustomChannelIcon | undefined {
    const icons = useCustomChannelIcons(serverUrl);
    return icons.find((i) => i.id === iconId);
}

/**
 * React hook to get loading state
 */
export function useCustomChannelIconsLoading(serverUrl: string): boolean {
    const [loading, setLoading] = useState<boolean>(
        () => CustomChannelIconsStore.isLoading(serverUrl),
    );

    useEffect(() => {
        const subscription = CustomChannelIconsStore.observeLoading(serverUrl).subscribe(setLoading);
        return () => subscription.unsubscribe();
    }, [serverUrl]);

    return loading;
}
