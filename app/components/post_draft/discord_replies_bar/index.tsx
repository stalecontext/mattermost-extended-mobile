// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {ScrollView, Text, TouchableOpacity, View} from 'react-native';

import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import DiscordRepliesStore from '@store/discord_replies_store';
import {makeStyleSheetFromTheme} from '@utils/theme';

import ReplyChip from './reply_chip';

import type {PendingDiscordReply} from '@discord_replies/types';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    headerText: {
        color: theme.centerChannelColor,
        fontSize: 12,
        fontWeight: '600',
    },
    clearAllText: {
        color: theme.linkColor,
        fontSize: 12,
    },
    chipsContainer: {
        flexDirection: 'row',
    },
    scrollContent: {
        paddingRight: 8,
    },
}));

type Props = {
    channelId: string;
    rootId: string;
};

const DiscordRepliesBar = ({channelId, rootId}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const styles = getStyleSheet(theme);

    const [pendingReplies, setPendingReplies] = useState<PendingDiscordReply[]>([]);

    useEffect(() => {
        const subscription = DiscordRepliesStore.observePendingReplies(
            serverUrl,
            channelId,
            rootId,
        ).subscribe(setPendingReplies);

        return () => subscription.unsubscribe();
    }, [serverUrl, channelId, rootId]);

    const handleRemoveReply = useCallback((postId: string) => {
        DiscordRepliesStore.removePendingReply(serverUrl, channelId, rootId, postId);
    }, [serverUrl, channelId, rootId]);

    const handleClearAll = useCallback(() => {
        DiscordRepliesStore.clearPendingReplies(serverUrl, channelId, rootId);
    }, [serverUrl, channelId, rootId]);

    if (pendingReplies.length === 0) {
        return null;
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerText}>
                    {intl.formatMessage({
                        id: 'mobile.discord_replies.replying_to',
                        defaultMessage: 'Replying to',
                    })}
                </Text>
                <TouchableOpacity onPress={handleClearAll}>
                    <Text style={styles.clearAllText}>
                        {intl.formatMessage({
                            id: 'mobile.discord_replies.clear_all',
                            defaultMessage: 'Clear all',
                        })}
                    </Text>
                </TouchableOpacity>
            </View>
            <ScrollView
                horizontal={true}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                style={styles.chipsContainer}
            >
                {pendingReplies.map((reply) => (
                    <ReplyChip
                        key={reply.postId}
                        reply={reply}
                        onRemove={handleRemoveReply}
                    />
                ))}
            </ScrollView>
        </View>
    );
};

export default DiscordRepliesBar;
