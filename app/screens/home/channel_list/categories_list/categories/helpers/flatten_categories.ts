// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {UNREADS_CATEGORY} from '@constants/categories';

import type {QuickJoinChannel} from '@channel_sync/types';
import type CategoryModel from '@typings/database/models/servers/category';
import type ChannelModel from '@typings/database/models/servers/channel';

export type FlattenedItem =
    | {type: 'unreads_header'}
    | {type: 'header'; categoryId: string; category: CategoryModel}
    | {type: 'channel'; categoryId: string; categoryType: string; channelId: string; channel: ChannelModel}
    | {type: 'quick_join'; categoryId: string; channel: QuickJoinChannel};

export type CategoryData = {
    category: CategoryModel;
    sortedChannels: ChannelModel[];
    unreadIds: Set<string>;
    allUnreadChannels: ChannelModel[];
};

export const keyExtractor = (item: FlattenedItem): string => {
    if (item.type === 'unreads_header') {
        return 'unreads_header';
    }
    if (item.type === 'header') {
        return `h:${item.categoryId}`;
    }
    if (item.type === 'quick_join') {
        return `qj:${item.channel.id}`;
    }
    return `c:${item.channelId}`;
};

export const getItemType = (item: FlattenedItem): 'unreads_header' | 'header' | 'channel' | 'quick_join' => {
    return item.type;
};

export const flattenCategories = (
    categoriesData: CategoryData[],
    unreadsOnTop: boolean,
    quickJoinChannels: QuickJoinChannel[] = [],
    quickJoinCategoryMap: Map<string, string> = new Map(),
): FlattenedItem[] => {
    const result: FlattenedItem[] = [];

    // Build a map of insert_after channelId -> Quick Join channels for that position
    const quickJoinByInsertAfter = new Map<string, QuickJoinChannel[]>();
    for (const qj of quickJoinChannels) {
        const categoryId = quickJoinCategoryMap.get(qj.id);
        if (!categoryId) {
            continue;
        }
        const key = `${categoryId}:${qj.insert_after}`;
        const existing = quickJoinByInsertAfter.get(key) || [];
        existing.push(qj);
        quickJoinByInsertAfter.set(key, existing);
    }

    if (unreadsOnTop) {
        const allUnreadChannels: ChannelModel[] = [];
        const seenChannelIds = new Set<string>();

        for (const {allUnreadChannels: categoryUnreads} of categoriesData) {
            for (const channel of categoryUnreads) {
                if (!seenChannelIds.has(channel.id)) {
                    seenChannelIds.add(channel.id);
                    allUnreadChannels.push(channel);
                }
            }
        }

        if (allUnreadChannels.length > 0) {
            result.push({type: 'unreads_header'});

            for (const channel of allUnreadChannels) {
                result.push({
                    type: 'channel',
                    categoryId: UNREADS_CATEGORY,
                    categoryType: UNREADS_CATEGORY,
                    channelId: channel.id,
                    channel,
                });
            }
        }
    }

    for (const {category, sortedChannels, unreadIds} of categoriesData) {
        result.push({
            type: 'header',
            categoryId: category.id,
            category,
        });

        const channelsToShow = category.collapsed ? sortedChannels.filter((channel) => unreadIds.has(channel.id)) : sortedChannels;

        for (const channel of channelsToShow) {
            result.push({
                type: 'channel',
                categoryId: category.id,
                categoryType: category.type,
                channelId: channel.id,
                channel,
            });

            // Insert Quick Join channels after this channel
            const key = `${category.id}:${channel.id}`;
            const quickJoins = quickJoinByInsertAfter.get(key);
            if (quickJoins) {
                for (const qj of quickJoins) {
                    result.push({
                        type: 'quick_join',
                        categoryId: category.id,
                        channel: qj,
                    });
                }
            }
        }

        // Also insert Quick Join channels that should appear at the end of the category
        // (insert_after is empty or the channel doesn't exist)
        const endKey = `${category.id}:`;
        const endQuickJoins = quickJoinByInsertAfter.get(endKey);
        if (endQuickJoins) {
            for (const qj of endQuickJoins) {
                result.push({
                    type: 'quick_join',
                    categoryId: category.id,
                    channel: qj,
                });
            }
        }
    }

    return result;
};
