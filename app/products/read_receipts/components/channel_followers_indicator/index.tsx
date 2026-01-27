// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Text, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {fetchChannelFollowers} from '@read_receipts/actions/remote';
import {useChannelFollowers, useReadReceiptsPermissions} from '@read_receipts/store';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

const messages = defineMessages({
    followersCount: {
        id: 'read_receipts.followers_count',
        defaultMessage: '{count, plural, one {# following} other {# following}}',
    },
});

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.04),
        paddingVertical: 8,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        width: '100%',
    },
    text: {
        color: changeOpacity(theme.centerChannelColor, 0.64),
        ...typography('Body', 75),
    },
}));

type Props = {
    channelId: string;
    channelType?: string;
};

function ChannelFollowersIndicator({channelId, channelType}: Props) {
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const intl = useIntl();
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

    if (!shouldShow || !followers || followers.readers.length === 0) {
        return null;
    }

    return (
        <View style={styles.container}>
            <CompassIcon
                color={changeOpacity(theme.centerChannelColor, 0.48)}
                name='eye-outline'
                size={16}
            />
            <Text
                style={styles.text}
                testID='channel_followers_indicator.text'
            >
                {intl.formatMessage(messages.followersCount, {count: followers.readers.length})}
            </Text>
        </View>
    );
}

export default ChannelFollowersIndicator;
