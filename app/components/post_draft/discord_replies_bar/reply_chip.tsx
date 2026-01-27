// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {Text, TouchableOpacity, View} from 'react-native';

import {showPermalink} from '@actions/remote/permalink';
import CompassIcon from '@components/compass_icon';
import ProfilePicture from '@components/profile_picture';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {usePreventDoubleTap} from '@hooks/utils';
import {makeStyleSheetFromTheme} from '@utils/theme';

import type {PendingDiscordReply} from '@discord_replies/types';

const AVATAR_SIZE = 20;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.centerChannelBg,
        borderWidth: 1,
        borderColor: theme.centerChannelColor,
        borderRadius: 16,
        paddingHorizontal: 8,
        paddingVertical: 4,
        marginRight: 8,
        maxWidth: 150,
    },
    avatar: {
        marginRight: 4,
    },
    username: {
        color: theme.centerChannelColor,
        fontSize: 12,
        fontWeight: '600',
        flex: 1,
    },
    removeButton: {
        marginLeft: 4,
        padding: 2,
    },
    removeIcon: {
        color: theme.centerChannelColor,
        opacity: 0.6,
    },
}));

type Props = {
    reply: PendingDiscordReply;
    onRemove: (postId: string) => void;
};

const ReplyChip = ({reply, onRemove}: Props) => {
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const styles = getStyleSheet(theme);

    const displayName = reply.nickname || reply.username;

    const handleNavigateToPost = usePreventDoubleTap(useCallback(() => {
        showPermalink(serverUrl, '', reply.postId);
    }, [serverUrl, reply.postId]));

    const handleRemove = useCallback(() => {
        onRemove(reply.postId);
    }, [onRemove, reply.postId]);

    return (
        <TouchableOpacity
            style={styles.chip}
            onPress={handleNavigateToPost}
            activeOpacity={0.7}
        >
            <View style={styles.avatar}>
                <ProfilePicture
                    author={{id: reply.userId} as UserProfile}
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
            <TouchableOpacity
                style={styles.removeButton}
                onPress={handleRemove}
                hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
            >
                <CompassIcon
                    name='close'
                    size={14}
                    style={styles.removeIcon}
                />
            </TouchableOpacity>
        </TouchableOpacity>
    );
};

export default ReplyChip;
