// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {Text, TouchableOpacity, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import ProfilePicture from '@components/profile_picture';
import {useTheme} from '@context/theme';
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
    removeIcon: {
        marginLeft: 4,
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
    const styles = getStyleSheet(theme);

    const displayName = reply.nickname || reply.username;

    const handleRemove = useCallback(() => {
        onRemove(reply.postId);
    }, [onRemove, reply.postId]);

    return (
        <TouchableOpacity
            style={styles.chip}
            onPress={handleRemove}
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
            <CompassIcon
                name='close'
                size={14}
                style={styles.removeIcon}
            />
        </TouchableOpacity>
    );
};

export default ReplyChip;
