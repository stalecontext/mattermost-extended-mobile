// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {StyleSheet, Text, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {changeOpacity} from '@utils/theme';
import {typography} from '@utils/typography';

export type EncryptedPlaceholderReason = 'no_keys' | 'no_access' | 'decrypt_error';

type Props = {
    reason: EncryptedPlaceholderReason;
    testID?: string;
}

const messages = defineMessages({
    title: {
        id: 'encryption.placeholder.title',
        defaultMessage: 'Encrypted Message',
    },
    no_keys: {
        id: 'encryption.placeholder.no_keys',
        defaultMessage: 'You have not registered encryption keys for this server.',
    },
    no_access: {
        id: 'encryption.placeholder.no_access',
        defaultMessage: 'You do not have the keys required to decrypt this message.',
    },
    decrypt_error: {
        id: 'encryption.placeholder.decrypt_error',
        defaultMessage: 'There was an error decrypting this message.',
    },
});

const getStyles = (theme: Theme) => StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.04),
        borderRadius: 4,
        paddingVertical: 12,
        paddingHorizontal: 16,
        gap: 12,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: changeOpacity('#9333EA', 0.12),
        alignItems: 'center',
        justifyContent: 'center',
    },
    textContainer: {
        flex: 1,
    },
    title: {
        ...typography('Body', 200, 'SemiBold'),
        color: theme.centerChannelColor,
    },
    description: {
        ...typography('Body', 75),
        color: changeOpacity(theme.centerChannelColor, 0.64),
        marginTop: 2,
    },
});

export default function EncryptedPlaceholder({reason, testID}: Props) {
    const theme = useTheme();
    const intl = useIntl();
    const styles = getStyles(theme);

    return (
        <View
            style={styles.container}
            testID={testID}
        >
            <View style={styles.iconContainer}>
                <CompassIcon
                    name='lock-outline'
                    size={20}
                    color='#9333EA'
                />
            </View>
            <View style={styles.textContainer}>
                <Text style={styles.title}>
                    {intl.formatMessage(messages.title)}
                </Text>
                <Text style={styles.description}>
                    {intl.formatMessage(messages[reason])}
                </Text>
            </View>
        </View>
    );
}
