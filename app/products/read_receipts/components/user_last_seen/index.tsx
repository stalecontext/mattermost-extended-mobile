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
    const [lastChannel, setLastChannel] = useState<UserLastChannelResponse | null>(null);

    // Fetch every time the component mounts
    useEffect(() => {
        if (!permissions.enable_last_seen || !userId) {
            return;
        }

        const fetchLastSeen = async () => {
            const result = await fetchUserLastChannel(serverUrl, userId);
            if (result.lastChannel) {
                setLastChannel(result.lastChannel);
            }
        };

        fetchLastSeen();
    }, [permissions.enable_last_seen, serverUrl, userId]);

    const handleChannelPress = useCallback(() => {
        if (lastChannel?.channel_id) {
            switchToChannelById(serverUrl, lastChannel.channel_id);
        }
    }, [serverUrl, lastChannel?.channel_id]);

    if (!permissions.enable_last_seen || !lastChannel || !lastChannel.channel_id) {
        return null;
    }

    const friendlyDate = getFriendlyDate(intl, lastChannel.last_viewed_at);
    const timeStamp = (
        <Text style={styles.text}>
            {' ' + friendlyDate.toLowerCase()}
        </Text>
    );

    if (!permissions.can_view_receipts) {
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
