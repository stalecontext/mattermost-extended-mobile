// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Image} from 'expo-image';
import React, {useMemo} from 'react';
import {Text, View} from 'react-native';

import {buildAbsoluteUrl} from '@actions/remote/file';
import {Preferences} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type {Reader} from '@read_receipts/types';

type Props = {
    reader: Reader;
    teammateNameDisplay: string;
};

const AVATAR_SIZE = 32;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 20,
    },
    avatarContainer: {
        marginRight: 12,
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        borderRadius: AVATAR_SIZE / 2,
        backgroundColor: theme.centerChannelBg,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    avatar: {
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        borderRadius: AVATAR_SIZE / 2,
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
    const serverUrl = useServerUrl();
    const styles = getStyleSheet(theme);

    const displayName = getReaderDisplayName(reader, teammateNameDisplay);

    // Build profile image URL - use profile_url if provided, otherwise fall back to standard user image endpoint
    const imageUri = useMemo(() => {
        const profilePath = reader.profile_url || `/api/v4/users/${reader.user_id}/image`;
        return buildAbsoluteUrl(serverUrl, profilePath);
    }, [serverUrl, reader.profile_url, reader.user_id]);

    return (
        <View style={styles.container}>
            <View style={styles.avatarContainer}>
                <Image
                    source={{uri: imageUri}}
                    style={styles.avatar}
                    cachePolicy='memory-disk'
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
                    {`@${reader.username}`}
                </Text>
            </View>
        </View>
    );
}

export default ReaderItem;
