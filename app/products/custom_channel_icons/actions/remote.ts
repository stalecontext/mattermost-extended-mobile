// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetworkManager from '@managers/network_manager';
import {logError} from '@utils/log';

import CustomChannelIconsStore from '../store/custom_channel_icons_store';

import type {
    CustomChannelIcon,
    CustomChannelIconCreate,
    CustomChannelIconPatch,
} from '../types';

/**
 * Fetches all custom channel icons and stores them
 */
export async function fetchCustomChannelIcons(serverUrl: string): Promise<{icons?: CustomChannelIcon[]; error?: unknown}> {
    try {
        CustomChannelIconsStore.setLoading(serverUrl, true);
        const client = NetworkManager.getClient(serverUrl);
        const icons = await client.getCustomChannelIcons();
        CustomChannelIconsStore.setIcons(serverUrl, icons);
        return {icons};
    } catch (error) {
        logError('[CustomChannelIcons.fetchCustomChannelIcons]', error);
        return {error};
    } finally {
        CustomChannelIconsStore.setLoading(serverUrl, false);
    }
}

/**
 * Fetches a single custom channel icon by ID
 */
export async function fetchCustomChannelIcon(serverUrl: string, iconId: string): Promise<{icon?: CustomChannelIcon; error?: unknown}> {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const icon = await client.getCustomChannelIcon(iconId);

        // Update the icon in the store
        CustomChannelIconsStore.updateIcon(serverUrl, icon);
        return {icon};
    } catch (error) {
        logError('[CustomChannelIcons.fetchCustomChannelIcon]', error);
        return {error};
    }
}

/**
 * Creates a new custom channel icon (admin only)
 */
export async function createCustomChannelIcon(
    serverUrl: string,
    icon: CustomChannelIconCreate,
): Promise<{icon?: CustomChannelIcon; error?: unknown}> {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const createdIcon = await client.createCustomChannelIcon(icon);
        CustomChannelIconsStore.addIcon(serverUrl, createdIcon);
        return {icon: createdIcon};
    } catch (error) {
        logError('[CustomChannelIcons.createCustomChannelIcon]', error);
        return {error};
    }
}

/**
 * Updates an existing custom channel icon (admin only)
 */
export async function updateCustomChannelIcon(
    serverUrl: string,
    iconId: string,
    patch: CustomChannelIconPatch,
): Promise<{icon?: CustomChannelIcon; error?: unknown}> {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const updatedIcon = await client.updateCustomChannelIcon(iconId, patch);
        CustomChannelIconsStore.updateIcon(serverUrl, updatedIcon);
        return {icon: updatedIcon};
    } catch (error) {
        logError('[CustomChannelIcons.updateCustomChannelIcon]', error);
        return {error};
    }
}

/**
 * Deletes a custom channel icon (admin only)
 */
export async function deleteCustomChannelIcon(serverUrl: string, iconId: string): Promise<{error?: unknown}> {
    try {
        const client = NetworkManager.getClient(serverUrl);
        await client.deleteCustomChannelIcon(iconId);
        CustomChannelIconsStore.removeIcon(serverUrl, iconId);
        return {};
    } catch (error) {
        logError('[CustomChannelIcons.deleteCustomChannelIcon]', error);
        return {error};
    }
}

/**
 * Initializes custom channel icons for a server - fetches all icons
 */
export async function initializeCustomChannelIcons(serverUrl: string): Promise<{icons?: CustomChannelIcon[]; error?: unknown}> {
    return fetchCustomChannelIcons(serverUrl);
}
