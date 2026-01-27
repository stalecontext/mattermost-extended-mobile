// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchChannelFollowers} from '@read_receipts/actions/remote';
import {useChannelFollowers, useReadReceiptsPermissions} from '@read_receipts/store';
import React, {useCallback, useEffect} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Keyboard, Text, TouchableOpacity} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {bottomSheetModalOptions, showModal, showModalOverCurrentContext} from '@screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

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

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: theme.centerChannelBg,
    },
    text: {
        color: changeOpacity(theme.centerChannelColor, 0.64),
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

    if (!shouldShow || !followers || followers.readers.length === 0) {
        return null;
    }

    return (
        <TouchableOpacity
            onPress={handlePress}
            style={styles.container}
            testID='channel_followers_indicator'
        >
            <CompassIcon
                color={changeOpacity(theme.centerChannelColor, 0.64)}
                name='eye-outline'
                size={16}
            />
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
