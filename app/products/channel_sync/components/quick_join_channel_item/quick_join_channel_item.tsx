// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {useIntl} from 'react-intl';
import {Text, TouchableOpacity, View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import Loading from '@components/loading';
import {HOME_PADDING} from '@constants/view';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {usePreventDoubleTap} from '@hooks/utils';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import {dismissQuickJoinChannel, joinQuickJoinChannel} from '../../actions/remote';

import type {QuickJoinChannel} from '../../types';

type Props = {
    channel: QuickJoinChannel;
    teamId: string;
    testID?: string;
};

const ROW_HEIGHT = 40;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: ROW_HEIGHT,
        ...HOME_PADDING,
    },
    iconContainer: {
        marginRight: 12,
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    icon: {
        color: changeOpacity(theme.sidebarText, 0.48),
    },
    textContainer: {
        flex: 1,
        marginRight: 8,
    },
    displayName: {
        color: changeOpacity(theme.sidebarText, 0.64),
        ...typography('Body', 200, 'Regular'),
    },
    actionsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    joinButton: {
        backgroundColor: theme.buttonBg,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 4,
    },
    joinButtonText: {
        color: theme.buttonColor,
        ...typography('Body', 75, 'SemiBold'),
    },
    dismissButton: {
        padding: 4,
    },
    dismissIcon: {
        color: changeOpacity(theme.sidebarText, 0.48),
    },
    loadingContainer: {
        width: 60,
        alignItems: 'center',
    },
}));

const QuickJoinChannelItem = ({channel, teamId, testID}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const serverUrl = useServerUrl();
    const {formatMessage} = useIntl();
    const [isJoining, setIsJoining] = useState(false);
    const [isDismissing, setIsDismissing] = useState(false);

    const handleJoin = usePreventDoubleTap(useCallback(async () => {
        setIsJoining(true);
        await joinQuickJoinChannel(serverUrl, teamId, channel.id);
        setIsJoining(false);
    }, [serverUrl, teamId, channel.id]));

    const handleDismiss = usePreventDoubleTap(useCallback(async () => {
        setIsDismissing(true);
        await dismissQuickJoinChannel(serverUrl, teamId, channel.id);
        setIsDismissing(false);
    }, [serverUrl, teamId, channel.id]));

    const isLoading = isJoining || isDismissing;

    return (
        <View
            style={styles.container}
            testID={testID}
        >
            <View style={styles.iconContainer}>
                <CompassIcon
                    name='globe'
                    size={18}
                    style={styles.icon}
                />
            </View>
            <View style={styles.textContainer}>
                <Text
                    style={styles.displayName}
                    numberOfLines={1}
                    ellipsizeMode='tail'
                >
                    {channel.display_name}
                </Text>
            </View>
            <View style={styles.actionsContainer}>
                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <Loading
                            size='small'
                            themeColor='sidebarText'
                        />
                    </View>
                ) : (
                    <>
                        <TouchableOpacity
                            style={styles.joinButton}
                            onPress={handleJoin}
                            testID={`${testID}.join`}
                        >
                            <Text style={styles.joinButtonText}>
                                {formatMessage({id: 'channel_sync.quick_join.join', defaultMessage: 'Join'})}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.dismissButton}
                            onPress={handleDismiss}
                            testID={`${testID}.dismiss`}
                        >
                            <CompassIcon
                                name='close'
                                size={18}
                                style={styles.dismissIcon}
                            />
                        </TouchableOpacity>
                    </>
                )}
            </View>
        </View>
    );
};

export default QuickJoinChannelItem;
