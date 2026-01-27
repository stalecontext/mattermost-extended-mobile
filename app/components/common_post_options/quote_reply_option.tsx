// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {stripQuotes} from '@discord_replies/utils';
import React, {useCallback} from 'react';
import {defineMessages} from 'react-intl';

import {BaseOption} from '@components/common_post_options';
import {SNACK_BAR_TYPE} from '@constants/snack_bar';
import {useServerUrl} from '@context/server';
import DatabaseManager from '@database/manager';
import {getCurrentTeamId} from '@queries/servers/system';
import {getUserById} from '@queries/servers/user';
import {dismissBottomSheet} from '@screens/navigation';
import DiscordRepliesStore from '@store/discord_replies_store';
import {showSnackBar} from '@utils/snack_bar';

import type {PendingDiscordReply} from '@discord_replies/types';
import type PostModel from '@typings/database/models/servers/post';
import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    post: PostModel;
    bottomSheetId: AvailableScreens;
    rootId?: string;
};

const messages = defineMessages({
    quoteReply: {
        id: 'mobile.post_options.quote_reply',
        defaultMessage: 'Quote Reply',
    },
});

const QuoteReplyOption = ({post, bottomSheetId, rootId = ''}: Props) => {
    const serverUrl = useServerUrl();

    const handleQuoteReply = useCallback(() => {
        // Dismiss without awaiting - don't block the UI
        dismissBottomSheet(bottomSheetId);

        // Build pending reply with info we have synchronously
        let hasImage = false;
        let hasVideo = false;
        if (post.metadata?.files) {
            for (const file of post.metadata.files) {
                if (file.mime_type?.startsWith('image/')) {
                    hasImage = true;
                } else if (file.mime_type?.startsWith('video/')) {
                    hasVideo = true;
                }
            }
        }

        const pendingReply: PendingDiscordReply = {
            postId: post.id,
            userId: post.userId,
            username: '',
            nickname: '',
            text: stripQuotes(post.message),
            hasImage,
            hasVideo,
            channelId: post.channelId,
            teamId: '',
        };

        // Toggle immediately for instant feedback
        const result = DiscordRepliesStore.togglePendingReply(
            serverUrl,
            post.channelId,
            rootId,
            pendingReply,
        );

        if (result === 'max_reached') {
            showSnackBar({barType: SNACK_BAR_TYPE.DISCORD_REPLY_MAX_REACHED});
        } else if (result === 'added') {
            // Fetch user info async and update the reply
            try {
                const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
                Promise.all([
                    getUserById(database, post.userId),
                    getCurrentTeamId(database),
                ]).then(([user, teamId]) => {
                    DiscordRepliesStore.updatePendingReply(
                        serverUrl,
                        post.channelId,
                        rootId,
                        post.id,
                        {
                            username: user?.username || '',
                            nickname: user?.nickname || '',
                            teamId,
                        },
                    );
                }).catch(() => {
                    // Ignore - reply already added, just missing user info
                });
            } catch {
                // Ignore - reply already added
            }
        }
    }, [bottomSheetId, post, rootId, serverUrl]);

    return (
        <BaseOption
            message={messages.quoteReply}
            iconName='format-quote-open'
            onPress={handleQuoteReply}
            testID='post_options.quote_reply.option'
        />
    );
};

export default QuoteReplyOption;
