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
import {displayUsername} from '@utils/user';

import type {DiscordReplyData} from '@discord_replies/types';
import type UserModel from '@typings/database/models/servers/user';

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
    teammateNameDisplay: string;
    users: Record<string, UserModel>;
};

const DiscordReplyPreview = ({replies, teammateNameDisplay, users}: Props) => {
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
                // Look up user by ID first, then by username
                const user = users[reply.user_id] || users[`username:${reply.username}`];
                const displayName = user ?displayUsername(user, undefined, teammateNameDisplay) :(reply.nickname || reply.username);
                const truncatedText = reply.text.length > MAX_PREVIEW_LENGTH ?reply.text.substring(0, MAX_PREVIEW_LENGTH) + '...' :reply.text;

                let mediaIndicator = '';
                if (reply.has_image) {
                    mediaIndicator = ' [image]';
                } else if (reply.has_video) {
                    mediaIndicator = ' [video]';
                }

                // Use user.id if available, otherwise fall back to reply.user_id
                const authorId = user?.id || reply.user_id;

                return (
                    <TouchableOpacity
                        key={reply.post_id}
                        style={styles.replyRow}
                        onPress={() => handleNavigateToPost(reply.post_id)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.avatar}>
                            {authorId ? (
                                <ProfilePicture
                                    author={{id: authorId} as UserProfile}
                                    size={AVATAR_SIZE}
                                    showStatus={false}
                                />
                            ) : (
                                <View style={{width: AVATAR_SIZE, height: AVATAR_SIZE}}/>
                            )}
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
