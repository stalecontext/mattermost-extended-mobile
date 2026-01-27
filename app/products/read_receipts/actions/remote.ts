// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {forceLogoutIfNecessary} from '@actions/remote/session';
import NetworkManager from '@managers/network_manager';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug, logError} from '@utils/log';

import ReadReceiptsStore from '../store/read_receipts_store';

import type {
    ChannelReadersResponse,
    PluginPermissions,
    PostReadersResponse,
    UserLastChannelResponse,
} from '../types';

/**
 * Fetch permissions for the read receipts plugin
 * Should be called after login/server connection
 */
export async function fetchReadReceiptsPermissions(serverUrl: string): Promise<{permissions?: PluginPermissions; error?: unknown}> {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const permissions = await client.getReadReceiptsPermissions();

        ReadReceiptsStore.setPermissions(serverUrl, permissions);

        return {permissions};
    } catch (error) {
        logDebug('[ReadReceipts.fetchPermissions]', getFullErrorMessage(error));

        // If the plugin is not installed or returns an error, set default (disabled) permissions
        const defaultPermissions: PluginPermissions = {
            can_view_receipts: false,
            is_admin: false,
            enable_channel_indicator: false,
            enable_post_action: false,
            enable_dropdown_menu: false,
            enable_last_seen: false,
            enable_in_direct_messages: false,
        };
        ReadReceiptsStore.setPermissions(serverUrl, defaultPermissions);

        return {permissions: defaultPermissions, error};
    }
}

/**
 * Fetch readers for a specific post
 */
export async function fetchPostReaders(
    serverUrl: string,
    postId: string,
): Promise<{readers?: PostReadersResponse; error?: unknown}> {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const readers = await client.getPostReaders(postId);

        return {readers};
    } catch (error) {
        logError('[ReadReceipts.fetchPostReaders]', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
}

/**
 * Fetch followers (readers with no unreads) for a channel
 */
export async function fetchChannelFollowers(
    serverUrl: string,
    channelId: string,
): Promise<{followers?: ChannelReadersResponse; error?: unknown}> {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const followers = await client.getChannelReaders(channelId);

        ReadReceiptsStore.setChannelFollowers(serverUrl, channelId, followers);

        return {followers};
    } catch (error) {
        logError('[ReadReceipts.fetchChannelFollowers]', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
}

/**
 * Fetch last visited channel for a user
 */
export async function fetchUserLastChannel(
    serverUrl: string,
    userId: string,
): Promise<{lastChannel?: UserLastChannelResponse; error?: unknown}> {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const lastChannel = await client.getUserLastChannel(userId);

        return {lastChannel};
    } catch (error) {
        logError('[ReadReceipts.fetchUserLastChannel]', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
}

/**
 * Report that the user is viewing a channel (for real-time tracking)
 * Silent failure - does not block UX on error
 */
export async function reportChannelView(
    serverUrl: string,
    channelId: string,
): Promise<{error?: unknown}> {
    try {
        const client = NetworkManager.getClient(serverUrl);
        await client.reportChannelView(channelId);

        return {};
    } catch (error) {
        // Silent failure - just log debug, don't block UX
        logDebug('[ReadReceipts.reportChannelView]', getFullErrorMessage(error));
        return {error};
    }
}
