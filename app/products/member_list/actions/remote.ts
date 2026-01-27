// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {logError} from '@utils/log';

import type {ClientMemberListMix} from '../client/rest';
import type {MembersResponse} from '../types';

/**
 * Fetches channel members from the plugin API
 * @param client - The client instance with MemberListMix
 * @param channelId - The channel ID to fetch members for
 * @param page - Page number (default: 0)
 * @param perPage - Results per page (default: 200)
 * @returns Promise with members response or error
 */
export async function fetchChannelMembersFromPlugin(
    client: ClientMemberListMix,
    channelId: string,
    page = 0,
    perPage = 200,
): Promise<{data?: MembersResponse; error?: Error}> {
    try {
        const data = await client.getChannelMembersFromPlugin(channelId, page, perPage);
        return {data};
    } catch (error) {
        logError('[MemberList.fetchChannelMembersFromPlugin]', error);
        return {error: error as Error};
    }
}
