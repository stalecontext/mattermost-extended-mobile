// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Keyboard, Text, TouchableOpacity, View} from 'react-native';

import {buildAbsoluteUrl} from '@actions/remote/file';
import ProfilePicture from '@components/profile_picture';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {fetchChannelFollowers} from '@read_receipts/actions/remote';
import {useChannelFollowers, useReadReceiptsPermissions} from '@read_receipts/store';
import {bottomSheetModalOptions, showModal, showModalOverCurrentContext} from '@screens/navigation';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type {Reader} from '@read_receipts/types';
import type {AvailableScreens} from '@typings/screens/navigation';

const messages = defineMessages({
    followersCount: {
        id: 'read_receipts.followers_count',
        defaultMessage: '{count, plural, one {# following} other {# following}}',
    },
    title: {
        id: 'read_receipts.channel_readers_title',
        defaultMessage: 'Following',
    },
});

const MAX_AVATARS = 5;
const AVATAR_SIZE = 24;
const AVATAR_OVERLAP = -6;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        width: '100%',
    },
    avatarsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarWrapper: {
        borderWidth: 2,
        borderColor: theme.centerChannelBg,
        borderRadius: AVATAR_SIZE / 2 + 2,
        backgroundColor: theme.centerChannelBg,
    },
    avatarOverlap: {
        marginLeft: AVATAR_OVERLAP,
    },
    text: {
        color: theme.centerChannelColor,
        ...typography('Body', 75),
    },
}));

type Props = {
    channelId: string;
    channelType?: string;
    location?: AvailableScreens;
};

function ChannelFollowersIndicator({channelId, channelType, location = Screens.CHANNEL}: Props) {
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const intl = useIntl();
    const isTablet = useIsTablet();
    const styles = getStyleSheet(theme);

    const permissions = useReadReceiptsPermissions(serverUrl);
    const followers = useChannelFollowers(serverUrl, channelId);

    // Check if we should show the indicator
    const isDmOrGm = channelType === 'D' || channelType === 'G';
    const shouldShow = permissions.can_view_receipts &&
        permissions.enable_channel_indicator &&
        (!isDmOrGm || permissions.enable_in_direct_messages);

    // Fetch followers when showing
    useEffect(() => {
        if (shouldShow && channelId) {
            fetchChannelFollowers(serverUrl, channelId);
        }
    }, [shouldShow, serverUrl, channelId]);

    const handlePress = useCallback(() => {
        Keyboard.dismiss();
        const screen = Screens.CHANNEL_READERS;
        const passProps = {
            channelId,
            location,
        };
        const title = isTablet ? intl.formatMessage(messages.title) : '';

        if (isTablet) {
            showModal(screen, title, passProps, bottomSheetModalOptions(theme, 'close-channel-readers'));
        } else {
            showModalOverCurrentContext(screen, passProps, bottomSheetModalOptions(theme));
        }
    }, [channelId, location, isTablet, intl, theme]);

    // Build avatar sources
    const avatarSources = useMemo(() => {
        if (!followers?.readers) {
            return [];
        }
        return followers.readers.slice(0, MAX_AVATARS).map((reader: Reader) => ({
            userId: reader.user_id,
            source: reader.profile_url ? {uri: buildAbsoluteUrl(serverUrl, reader.profile_url)} : undefined,
        }));
    }, [followers?.readers, serverUrl]);

    if (!shouldShow || !followers || followers.readers.length === 0) {
        return null;
    }

    return (
        <TouchableOpacity
            onPress={handlePress}
            style={styles.container}
            testID='channel_followers_indicator'
        >
            <View style={styles.avatarsContainer}>
                {avatarSources.map((avatar, index) => (
                    <View
                        key={avatar.userId}
                        style={[
                            styles.avatarWrapper,
                            index > 0 && styles.avatarOverlap,
                        ]}
                    >
                        <ProfilePicture
                            source={avatar.source}
                            size={AVATAR_SIZE}
                            showStatus={false}
                        />
                    </View>
                ))}
            </View>
            <Text
                style={styles.text}
                testID='channel_followers_indicator.text'
            >
                {intl.formatMessage(messages.followersCount, {count: followers.readers.length})}
            </Text>
        </TouchableOpacity>
    );
}

export default ChannelFollowersIndicator;
