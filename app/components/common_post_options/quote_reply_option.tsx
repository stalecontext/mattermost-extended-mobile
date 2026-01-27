// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

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

    const handleQuoteReply = useCallback(async () => {
        await dismissBottomSheet(bottomSheetId);

        try {
            const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
            const user = await getUserById(database, post.userId);
            const teamId = await getCurrentTeamId(database);

            const pendingReply: PendingDiscordReply = {
                postId: post.id,
                userId: post.userId,
                username: user?.username || '',
                nickname: user?.nickname || '',
                text: post.message,
                hasImage: false,
                hasVideo: false,
                channelId: post.channelId,
                teamId,
            };

            // Check for images/videos in metadata
            if (post.metadata?.files) {
                for (const file of post.metadata.files) {
                    if (file.mime_type?.startsWith('image/')) {
                        pendingReply.hasImage = true;
                    } else if (file.mime_type?.startsWith('video/')) {
                        pendingReply.hasVideo = true;
                    }
                }
            }

            const added = DiscordRepliesStore.addPendingReply(
                serverUrl,
                post.channelId,
                rootId,
                pendingReply,
            );

            if (added) {
                showSnackBar({barType: SNACK_BAR_TYPE.DISCORD_REPLY_ADDED});
            } else {
                showSnackBar({barType: SNACK_BAR_TYPE.DISCORD_REPLY_MAX_REACHED});
            }
        } catch {
            // Error getting user info, still try to add with available data
            showSnackBar({barType: SNACK_BAR_TYPE.DISCORD_REPLY_MAX_REACHED});
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
