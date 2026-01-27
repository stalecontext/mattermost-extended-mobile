// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {Text, View} from 'react-native';

import {Preferences} from '@constants';
import ProfilePicture from '@components/profile_picture';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type {Reader} from '@read_receipts/types';

type Props = {
    reader: Reader;
    teammateNameDisplay: string;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 20,
    },
    profilePicture: {
        marginRight: 12,
    },
    info: {
        flex: 1,
    },
    displayName: {
        color: theme.centerChannelColor,
        ...typography('Body', 200, 'SemiBold'),
    },
    username: {
        color: changeOpacity(theme.centerChannelColor, 0.64),
        ...typography('Body', 75),
    },
    readAt: {
        color: changeOpacity(theme.centerChannelColor, 0.56),
        ...typography('Body', 75),
        marginLeft: 'auto',
    },
}));

/**
 * Get display name for a reader based on teammate display name setting
 */
function getReaderDisplayName(reader: Reader, teammateNameDisplay: string): string {
    const fullName = [reader.first_name, reader.last_name].filter(Boolean).join(' ');

    if (teammateNameDisplay === Preferences.DISPLAY_PREFER_NICKNAME) {
        return reader.nickname || fullName || reader.username;
    }
    if (teammateNameDisplay === Preferences.DISPLAY_PREFER_FULL_NAME) {
        return fullName || reader.username;
    }
    return reader.username;
}

function ReaderItem({reader, teammateNameDisplay}: Props) {
    const theme = useTheme();
    const intl = useIntl();
    const styles = getStyleSheet(theme);

    const displayName = getReaderDisplayName(reader, teammateNameDisplay);

    // Format relative time
    const formatRelativeTime = (timestamp: number): string => {
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
    };

    return (
        <View style={styles.container}>
            <View style={styles.profilePicture}>
                <ProfilePicture
                    source={reader.profile_url}
                    size={32}
                    showStatus={false}
                />
            </View>
            <View style={styles.info}>
                <Text
                    style={styles.displayName}
                    numberOfLines={1}
                >
                    {displayName}
                </Text>
                <Text
                    style={styles.username}
                    numberOfLines={1}
                >
                    @{reader.username}
                </Text>
            </View>
            <Text style={styles.readAt}>
                {formatRelativeTime(reader.read_at)}
            </Text>
        </View>
    );
}

export default ReaderItem;
