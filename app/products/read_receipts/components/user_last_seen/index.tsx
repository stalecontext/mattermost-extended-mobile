// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchUserLastChannel} from '@read_receipts/actions/remote';
import {useReadReceiptsPermissions} from '@read_receipts/store';
import React, {useCallback, useEffect, useState} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Text, TouchableOpacity, View} from 'react-native';

import {switchToChannelById} from '@actions/remote/channel';
import FormattedText from '@components/formatted_text';
import {getFriendlyDate} from '@components/friendly_date';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import NetworkManager from '@managers/network_manager';
import {logDebug} from '@utils/log';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type {UserLastChannelResponse} from '@read_receipts/types';

const messages = defineMessages({
    lastSeen: {
        id: 'read_receipts.last_seen',
        defaultMessage: 'Last Seen',
    },
    dmingUser: {
        id: 'read_receipts.dming_user',
        defaultMessage: 'DMing',
    },
    inGroup: {
        id: 'read_receipts.in_group',
        defaultMessage: 'In group:',
    },
    reading: {
        id: 'read_receipts.reading',
        defaultMessage: 'Reading',
    },
});

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        marginVertical: 8,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    title: {
        color: changeOpacity(theme.centerChannelColor, 0.56),
        marginBottom: 2,
        ...typography('Body', 50, 'SemiBold'),
    },
    text: {
        color: theme.centerChannelColor,
        ...typography('Body', 200),
    },
    link: {
        color: theme.linkColor,
        ...typography('Body', 200),
    },
}));

type Props = {
    userId: string;
};

function getDisplayName(lastChannel: UserLastChannelResponse): string {
    const {other_username, other_nickname, other_first_name, other_last_name, display_name} = lastChannel;

    if (other_nickname) {
        return other_nickname;
    }
    if (other_first_name || other_last_name) {
        return `${other_first_name || ''} ${other_last_name || ''}`.trim();
    }
    return other_username || display_name;
}

function UserLastSeen({userId}: Props) {
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const intl = useIntl();
    const styles = getStyleSheet(theme);

    const permissions = useReadReceiptsPermissions(serverUrl);

    // last_activity_at from standard user status API (available to all users)
    const [lastActivityAt, setLastActivityAt] = useState<number | null>(null);

    // Channel info from plugin (only for users with read receipts permissions)
    const [lastChannel, setLastChannel] = useState<UserLastChannelResponse | null>(null);

    // Fetch user status for last_activity_at (always, for all users)
    useEffect(() => {
        if (!userId) {
            return;
        }

        const fetchUserStatus = async () => {
            try {
                const client = NetworkManager.getClient(serverUrl);
                const status = await client.getStatus(userId);
                if (status?.last_activity_at) {
                    setLastActivityAt(status.last_activity_at);
                }
            } catch (error) {
                logDebug('[UserLastSeen.fetchUserStatus]', error);
            }
        };

        fetchUserStatus();
    }, [serverUrl, userId]);

    // Fetch channel info from plugin (only when plugin is enabled and user has permissions)
    useEffect(() => {
        if (!permissions.enable_last_seen || !permissions.can_view_receipts || !userId) {
            return;
        }

        const fetchLastChannel = async () => {
            const result = await fetchUserLastChannel(serverUrl, userId);
            if (result.lastChannel) {
                setLastChannel(result.lastChannel);
            }
        };

        fetchLastChannel();
    }, [permissions.enable_last_seen, permissions.can_view_receipts, serverUrl, userId]);

    const handleChannelPress = useCallback(() => {
        if (lastChannel?.channel_id) {
            switchToChannelById(serverUrl, lastChannel.channel_id);
        }
    }, [serverUrl, lastChannel?.channel_id]);

    // Show nothing if we don't have last_activity_at
    if (!lastActivityAt) {
        return null;
    }

    const friendlyDate = getFriendlyDate(intl, lastActivityAt);

    // Check if we have channel info to show (plugin enabled + can_view_receipts + valid channel)
    const showChannelInfo = permissions.enable_last_seen &&
        permissions.can_view_receipts &&
        lastChannel?.channel_id;

    if (!showChannelInfo) {
        // Show just the timestamp (available to all users)
        return (
            <View style={styles.container}>
                <FormattedText
                    id={messages.lastSeen.id}
                    defaultMessage={messages.lastSeen.defaultMessage}
                    style={styles.title}
                    testID='user_profile.last_seen.title'
                />
                <View style={styles.row}>
                    <Text style={styles.text}>
                        {friendlyDate}
                    </Text>
                </View>
            </View>
        );
    }

    // Show channel info with navigation (for users with read receipts permissions)
    const isDm = lastChannel.channel_type === 'D';
    const isGroup = lastChannel.channel_type === 'G';

    let prefixText: string;
    let linkText: string;

    if (isDm) {
        prefixText = intl.formatMessage(messages.dmingUser) + ' ';
        linkText = `@${getDisplayName(lastChannel)}`;
    } else if (isGroup) {
        prefixText = intl.formatMessage(messages.inGroup) + ' ';
        linkText = lastChannel.display_name;
    } else {
        prefixText = intl.formatMessage(messages.reading) + ' ';
        linkText = `#${lastChannel.display_name}`;
    }

    const timeStamp = (
        <Text style={styles.text}>
            {' ' + friendlyDate.toLowerCase()}
        </Text>
    );

    return (
        <View style={styles.container}>
            <FormattedText
                id={messages.lastSeen.id}
                defaultMessage={messages.lastSeen.defaultMessage}
                style={styles.title}
                testID='user_profile.last_seen.title'
            />
            <View style={styles.row}>
                <Text style={styles.text}>
                    {prefixText}
                </Text>
                <TouchableOpacity onPress={handleChannelPress}>
                    <Text style={styles.link}>
                        {linkText}
                    </Text>
                </TouchableOpacity>
                {timeStamp}
            </View>
        </View>
    );
}

export default UserLastSeen;
