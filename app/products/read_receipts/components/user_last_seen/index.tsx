// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useState} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Text, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {fetchUserLastChannel} from '@read_receipts/actions/remote';
import {useReadReceiptsPermissions} from '@read_receipts/store';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type {UserLastChannelResponse} from '@read_receipts/types';

const messages = defineMessages({
    lastSeenIn: {
        id: 'read_receipts.last_seen_in',
        defaultMessage: 'Last seen in {channel}',
    },
    dmWith: {
        id: 'read_receipts.dm_with',
        defaultMessage: 'DM with {user}',
    },
});

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        gap: 12,
    },
    iconContainer: {
        width: 24,
        alignItems: 'center',
    },
    text: {
        color: changeOpacity(theme.centerChannelColor, 0.72),
        ...typography('Body', 200),
        flex: 1,
    },
}));

type Props = {
    userId: string;
};

function formatRelativeTime(intl: ReturnType<typeof useIntl>, timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
        return intl.formatMessage(
            {id: 'read_receipts.days_ago', defaultMessage: '{count, plural, one {# day ago} other {# days ago}}'},
            {count: days},
        );
    }
    if (hours > 0) {
        return intl.formatMessage(
            {id: 'read_receipts.hours_ago', defaultMessage: '{count, plural, one {# hour ago} other {# hours ago}}'},
            {count: hours},
        );
    }
    if (minutes > 0) {
        return intl.formatMessage(
            {id: 'read_receipts.minutes_ago', defaultMessage: '{count, plural, one {# minute ago} other {# minutes ago}}'},
            {count: minutes},
        );
    }
    return intl.formatMessage({id: 'read_receipts.just_now', defaultMessage: 'Just now'});
}

function getChannelDisplayName(lastChannel: UserLastChannelResponse): string {
    const {channel_type, display_name, other_username, other_nickname, other_first_name, other_last_name} = lastChannel;

    // For DMs, show the other user's name
    if (channel_type === 'D') {
        if (other_nickname) {
            return other_nickname;
        }
        if (other_first_name || other_last_name) {
            return `${other_first_name || ''} ${other_last_name || ''}`.trim();
        }
        return other_username || display_name;
    }

    return display_name;
}

function UserLastSeen({userId}: Props) {
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const intl = useIntl();
    const styles = getStyleSheet(theme);

    const permissions = useReadReceiptsPermissions(serverUrl);
    const [lastChannel, setLastChannel] = useState<UserLastChannelResponse | null>(null);
    const [loading, setLoading] = useState(true);

    const shouldShow = permissions.can_view_receipts && permissions.enable_last_seen;

    useEffect(() => {
        if (!shouldShow || !userId) {
            setLoading(false);
            return;
        }

        const fetchLastSeen = async () => {
            setLoading(true);
            const result = await fetchUserLastChannel(serverUrl, userId);
            if (result.lastChannel) {
                setLastChannel(result.lastChannel);
            }
            setLoading(false);
        };

        fetchLastSeen();
    }, [shouldShow, serverUrl, userId]);

    if (!shouldShow || loading || !lastChannel) {
        return null;
    }

    const channelName = getChannelDisplayName(lastChannel);
    const isDm = lastChannel.channel_type === 'D';

    // Format the channel name based on type
    let formattedChannel: string;
    if (isDm) {
        formattedChannel = intl.formatMessage(messages.dmWith, {user: channelName});
    } else if (lastChannel.channel_type === 'G') {
        // Group message - just show the display name
        formattedChannel = channelName;
    } else {
        // Public or private channel
        formattedChannel = `#${channelName}`;
    }

    const relativeTime = formatRelativeTime(intl, lastChannel.last_viewed_at);

    return (
        <View style={styles.container}>
            <View style={styles.iconContainer}>
                <CompassIcon
                    color={changeOpacity(theme.centerChannelColor, 0.48)}
                    name='eye-outline'
                    size={20}
                />
            </View>
            <Text
                style={styles.text}
                numberOfLines={2}
                testID='user_profile.last_seen'
            >
                {intl.formatMessage(messages.lastSeenIn, {channel: formattedChannel})}
                {' '}
                <Text style={{color: changeOpacity(theme.centerChannelColor, 0.56)}}>
                    ({relativeTime})
                </Text>
            </Text>
        </View>
    );
}

export default UserLastSeen;
