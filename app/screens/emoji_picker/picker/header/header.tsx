// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {syncEmojiUsage} from '@emoji_usage/actions/remote';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {DeviceEventEmitter, type LayoutChangeEvent, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Animated, {Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming} from 'react-native-reanimated';

import CompassIcon from '@components/compass_icon';
import Loading from '@components/loading';
import SearchBar, {type SearchProps} from '@components/search';
import {Events} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {setEmojiSkinTone} from '@hooks/emoji_category_bar';
import {changeOpacity} from '@utils/theme';

import BottomSheetSearch from './bottom_sheet_search';
import SkinToneSelector from './skintone_selector';

type Props = SearchProps & {
    skinTone: string;
}

const styles = StyleSheet.create({
    flex: {flex: 1},
    row: {flexDirection: 'row'},
    syncButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        marginLeft: 8,
        borderRadius: 4,
    },
    syncButtonDisabled: {
        opacity: 0.6,
    },
    syncIcon: {
        marginRight: 4,
    },
    syncText: {
        fontSize: 12,
        fontWeight: '600',
    },
});

const PickerHeader = ({skinTone, ...props}: Props) => {
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const isTablet = useIsTablet();
    const containerWidth = useSharedValue(0);
    const isSearching = useSharedValue(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const syncRotation = useSharedValue(0);

    const syncTextColor = changeOpacity(theme.centerChannelColor, 0.72);
    const syncButtonBg = changeOpacity(theme.centerChannelColor, 0.08);

    const dynamicStyles = useMemo(() => ({
        syncButton: {backgroundColor: syncButtonBg},
        syncText: {color: syncTextColor},
    }), [syncButtonBg, syncTextColor]);

    useEffect(() => {
        const req = requestAnimationFrame(() => {
            setEmojiSkinTone(skinTone);
        });

        return () => cancelAnimationFrame(req);
    }, [skinTone]);

    const onBlur = useCallback(() => {
        isSearching.value = false;
    }, [isSearching]);

    const onFocus = useCallback(() => {
        isSearching.value = true;
    }, [isSearching]);

    const onLayout = useCallback((e: LayoutChangeEvent) => {
        containerWidth.value = e.nativeEvent.layout.width;
    }, [containerWidth]);

    const handleSync = useCallback(async () => {
        if (isSyncing) {
            return;
        }
        setIsSyncing(true);
        DeviceEventEmitter.emit(Events.EMOJI_USAGE_SYNCING, true);
        syncRotation.value = withRepeat(
            withTiming(360, {duration: 1000, easing: Easing.linear}),
            -1, // infinite repeats
        );
        try {
            await syncEmojiUsage(serverUrl);
        } finally {
            setIsSyncing(false);
            syncRotation.value = 0;
            DeviceEventEmitter.emit(Events.EMOJI_USAGE_SYNCING, false);
        }
    }, [isSyncing, serverUrl, syncRotation]);

    const syncAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{rotate: `${syncRotation.value}deg`}],
    }));

    let search;
    if (isTablet) {
        search = (
            <SearchBar
                {...props}
                onBlur={onBlur}
                onFocus={onFocus}
            />
        );
    } else {
        search = (
            <BottomSheetSearch
                {...props}
                onBlur={onBlur}
                onFocus={onFocus}
            />
        );
    }

    return (
        <View
            onLayout={onLayout}
            style={styles.row}
        >
            <View style={styles.flex}>
                {search}
            </View>
            <TouchableOpacity
                onPress={handleSync}
                style={[styles.syncButton, dynamicStyles.syncButton, isSyncing && styles.syncButtonDisabled]}
                disabled={isSyncing}
                testID='emoji_picker.header.sync_button'
            >
                {isSyncing ? (
                    <Loading
                        size='small'
                        color={syncTextColor}
                    />
                ) : (
                    <>
                        <Animated.View style={syncAnimatedStyle}>
                            <CompassIcon
                                name='sync'
                                size={14}
                                color={syncTextColor}
                                style={styles.syncIcon}
                            />
                        </Animated.View>
                        <Text style={[styles.syncText, dynamicStyles.syncText]}>{'SYNC'}</Text>
                    </>
                )}
            </TouchableOpacity>
            <SkinToneSelector
                skinTone={skinTone}
                containerWidth={containerWidth}
                isSearching={isSearching}
            />
        </View>
    );
};

export default PickerHeader;
