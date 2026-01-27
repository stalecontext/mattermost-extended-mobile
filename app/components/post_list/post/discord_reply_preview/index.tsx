// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {Text, TouchableOpacity, View} from 'react-native';

import {showPermalink} from '@actions/remote/permalink';
import ProfilePicture from '@components/profile_picture';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {usePreventDoubleTap} from '@hooks/utils';
import {makeStyleSheetFromTheme} from '@utils/theme';

import type {DiscordReplyData} from '@discord_replies/types';

const AVATAR_SIZE = 16;
const MAX_PREVIEW_LENGTH = 100;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        marginBottom: 0,
    },
    replyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    avatar: {
        marginRight: 4,
    },
    username: {
        color: theme.linkColor,
        fontSize: 12,
        fontWeight: '600',
        marginRight: 4,
    },
    previewText: {
        color: theme.centerChannelColor,
        fontSize: 12,
        opacity: 0.7,
        flex: 1,
    },
}));

type Props = {
    replies: DiscordReplyData[];
};

const DiscordReplyPreview = ({replies}: Props) => {
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const styles = getStyleSheet(theme);

    const handleNavigateToPost = usePreventDoubleTap(useCallback((postId: string) => {
        showPermalink(serverUrl, '', postId);
    }, [serverUrl]));

    if (!replies || replies.length === 0) {
        return null;
    }

    return (
        <View style={styles.container}>
            {replies.map((reply) => {
                const displayName = reply.nickname || reply.username;
                const truncatedText = reply.text.length > MAX_PREVIEW_LENGTH ?reply.text.substring(0, MAX_PREVIEW_LENGTH) + '...' :reply.text;

                let mediaIndicator = '';
                if (reply.has_image) {
                    mediaIndicator = ' [image]';
                } else if (reply.has_video) {
                    mediaIndicator = ' [video]';
                }

                return (
                    <TouchableOpacity
                        key={reply.post_id}
                        style={styles.replyRow}
                        onPress={() => handleNavigateToPost(reply.post_id)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.avatar}>
                            <ProfilePicture
                                author={{id: reply.user_id} as UserProfile}
                                size={AVATAR_SIZE}
                                showStatus={false}
                            />
                        </View>
                        <Text
                            style={styles.username}
                            numberOfLines={1}
                        >
                            {displayName}
                        </Text>
                        <Text
                            style={styles.previewText}
                            numberOfLines={1}
                        >
                            {truncatedText || mediaIndicator.trim()}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

export default DiscordReplyPreview;
