// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Text, TouchableOpacity, View} from 'react-native';
import Svg, {Path} from 'react-native-svg';

import {fetchAndSwitchToThread} from '@actions/remote/thread';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {dismissBottomSheet} from '@screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type PostModel from '@typings/database/models/servers/post';
import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    post: PostModel;
    bottomSheetId: AvailableScreens;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 48,
        gap: 12,
    },
    iconContainer: {
        marginRight: 16,
    },
    labelContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    label: {
        flexShrink: 1,
        justifyContent: 'center',
    },
    labelText: {
        color: theme.centerChannelColor,
        ...typography('Body', 200),
    },
}));

// Custom thread icon matching the plugin's design
// 3 horizontal lines with a chevron pointing right
const ThreadIcon = ({color}: {color: string}) => (
    <Svg
        width={24}
        height={24}
        viewBox='0 0 16 16'
        fill='none'
    >
        {/* Top line */}
        <Path
            d='M5 4h9'
            stroke={color}
            strokeWidth={2}
            strokeLinecap='round'
        />
        {/* Chevron */}
        <Path
            d='M2 6l3 2-3 2'
            stroke={color}
            strokeWidth={2}
            strokeLinecap='round'
            strokeLinejoin='round'
        />
        {/* Middle line (shorter on left) */}
        <Path
            d='M8 8h6'
            stroke={color}
            strokeWidth={2}
            strokeLinecap='round'
        />
        {/* Bottom line */}
        <Path
            d='M5 12h9'
            stroke={color}
            strokeWidth={2}
            strokeLinecap='round'
        />
    </Svg>
);

const CreateThreadOption = ({post, bottomSheetId}: Props) => {
    const serverUrl = useServerUrl();
    const intl = useIntl();
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const handleCreateThread = useCallback(async () => {
        const rootId = post.rootId || post.id;
        await dismissBottomSheet(bottomSheetId);
        fetchAndSwitchToThread(serverUrl, rootId);
    }, [bottomSheetId, post, serverUrl]);

    const iconColor = changeOpacity(theme.centerChannelColor, 0.64);

    return (
        <TouchableOpacity onPress={handleCreateThread}>
            <View
                testID='post_options.create_thread.option'
                style={styles.container}
            >
                <View style={styles.labelContainer}>
                    <View style={styles.iconContainer}>
                        <ThreadIcon color={iconColor}/>
                    </View>
                    <View style={styles.label}>
                        <Text
                            style={styles.labelText}
                            testID='post_options.create_thread.option.label'
                            numberOfLines={1}
                        >
                            {intl.formatMessage({
                                id: 'mobile.post_info.create_thread',
                                defaultMessage: 'Create Thread',
                            })}
                        </Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
};

export default CreateThreadOption;
