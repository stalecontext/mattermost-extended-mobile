// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import MemberPanel from '@swipe_navigation/components/member_panel';
import useSwipeGesture from '@swipe_navigation/components/swipe_container/use_swipe_gesture';
import {CHANNEL_ANIMATION_DURATION, MEMBER_PANEL_WIDTH} from '@swipe_navigation/constants';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {DeviceEventEmitter, Dimensions, StyleSheet, View} from 'react-native';
import {GestureDetector} from 'react-native-gesture-handler';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    withTiming,
} from 'react-native-reanimated';

import {Navigation as NavigationConstants, Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import DatabaseManager from '@database/manager';
import {setCurrentChannelId} from '@queries/servers/system';
import Channel from '@screens/channel';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        overflow: 'hidden',
    },
    contentWrapper: {
        flex: 1,
        width: SCREEN_WIDTH,
    },
    memberPanelContainer: {
        position: 'absolute',
        right: -MEMBER_PANEL_WIDTH,
        top: 0,
        bottom: 0,
        width: MEMBER_PANEL_WIDTH,
    },
});

type PhoneChannelViewProps = {
    currentChannelId: string;
};

const PhoneChannelView = ({currentChannelId}: PhoneChannelViewProps) => {
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const [displayedChannelId, setDisplayedChannelId] = useState<string | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const isSwipingBack = useRef(false);

    const handleSwipeBack = useCallback(() => {
        isSwipingBack.current = true;
        setIsClosing(true); // Immediately allow touches to pass through

        // Immediately hide the view - don't wait for database
        setDisplayedChannelId(null);
        setIsVisible(false);

        // Clear current channel in background
        setTimeout(async () => {
            try {
                const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
                await setCurrentChannelId(operator, '');
            } catch {
                // Silently handle errors
            }
        }, 0);
    }, [serverUrl]);

    const {
        translateX,
        panGesture,
    } = useSwipeGesture({
        onSwipeBack: handleSwipeBack,
        enabled: isVisible && !isClosing,
    });

    // Handle channel changes
    useEffect(() => {
        // Ignore if we're in the middle of a swipe-back (already handled)
        if (isSwipingBack.current) {
            isSwipingBack.current = false;
            return;
        }

        if (currentChannelId && !displayedChannelId) {
            // Channel selected - slide in from right
            setDisplayedChannelId(currentChannelId);
            setIsClosing(false);
            translateX.value = SCREEN_WIDTH;
            setIsVisible(true);
            translateX.value = withTiming(0, {duration: CHANNEL_ANIMATION_DURATION});
        } else if (currentChannelId && displayedChannelId && currentChannelId !== displayedChannelId) {
            // Different channel selected - instant switch (already visible)
            setDisplayedChannelId(currentChannelId);
            setIsClosing(false);
        } else if (!currentChannelId && displayedChannelId) {
            // Programmatic close (navigation event) - animate out
            setIsClosing(true);
            translateX.value = withTiming(SCREEN_WIDTH, {duration: CHANNEL_ANIMATION_DURATION}, (finished) => {
                if (finished) {
                    runOnJS(setDisplayedChannelId)(null);
                    runOnJS(setIsVisible)(false);
                    runOnJS(setIsClosing)(false);
                }
            });
        }
    }, [currentChannelId, displayedChannelId, translateX]);

    // Listen for navigation events to close channel view
    useEffect(() => {
        const listener = DeviceEventEmitter.addListener(
            NavigationConstants.NAVIGATION_HOME,
            (screenId: string) => {
                if (screenId !== Screens.CHANNEL && displayedChannelId) {
                    // Another screen requested (threads, drafts) - clear channel view
                    handleSwipeBack();
                }
            },
        );

        return () => listener.remove();
    }, [displayedChannelId, handleSwipeBack]);

    const animatedContentStyle = useAnimatedStyle(() => ({
        transform: [{translateX: translateX.value}],
    }));

    const animatedPanelStyle = useAnimatedStyle(() => ({
        transform: [{translateX: translateX.value}],
    }));

    // Don't render if no channel to display
    if (!displayedChannelId) {
        return null;
    }

    return (
        <GestureDetector gesture={panGesture}>
            <View
                style={styles.container}
                pointerEvents='box-none'
            >
                <Animated.View
                    style={[styles.contentWrapper, {backgroundColor: theme.centerChannelBg}, animatedContentStyle]}
                    pointerEvents={isClosing ? 'none' : 'auto'}
                >
                    <Channel
                        componentId={Screens.HOME}
                        isTabletView={true}
                        onSwipeBack={handleSwipeBack}
                    />
                </Animated.View>
                <Animated.View
                    style={[
                        styles.memberPanelContainer,
                        {backgroundColor: theme.sidebarBg},
                        animatedPanelStyle,
                    ]}
                >
                    <MemberPanel
                        channelId={displayedChannelId}
                        componentId={Screens.HOME}
                    />
                </Animated.View>
            </View>
        </GestureDetector>
    );
};

export default PhoneChannelView;
