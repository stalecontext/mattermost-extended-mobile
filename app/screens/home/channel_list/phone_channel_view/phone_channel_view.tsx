// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import MemberPanel from '@swipe_navigation/components/member_panel';
import useSwipeGesture from '@swipe_navigation/components/swipe_container/use_swipe_gesture';
import {CHANNEL_ANIMATION_DURATION, MEMBER_PANEL_WIDTH, SWIPE_THRESHOLD_PERCENT, SWIPE_VELOCITY_THRESHOLD} from '@swipe_navigation/constants';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {DeviceEventEmitter, Dimensions, StyleSheet, View} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';

import {Navigation as NavigationConstants, Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import DatabaseManager from '@database/manager';
import {setCurrentChannelId} from '@queries/servers/system';
import Channel from '@screens/channel';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

// Width of the right edge hit area for swipe-to-reopen gesture
const EDGE_HIT_WIDTH = 30;

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
    edgeHitArea: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: EDGE_HIT_WIDTH,
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

    // Track the last closed channel ID for swipe-to-reopen
    const lastClosedChannelIdRef = useRef<string | null>(null);

    // Shared value for edge swipe gesture
    const edgeSwipeProgress = useSharedValue(0);

    // Ref to hold the animation function for closing
    const animateOutRef = useRef<(() => void) | null>(null);

    const handleSwipeBack = useCallback(() => {
        isSwipingBack.current = true;
        animateOutRef.current?.();
    }, []);

    // Function to reopen the last closed channel
    const reopenLastChannel = useCallback(async () => {
        const channelToReopen = lastClosedChannelIdRef.current;
        if (!channelToReopen) {
            return;
        }

        try {
            const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
            await setCurrentChannelId(operator, channelToReopen);
        } catch {
            // Silently handle errors
        }
    }, [serverUrl]);

    // Gesture for swiping from right edge to reopen channel
    const edgeSwipeGesture = Gesture.Pan().
        activeOffsetX(-10). // Only activate on leftward swipes
        failOffsetY([-30, 30]). // Fail if vertical movement
        onUpdate((event) => {
            'worklet';

            // Track the swipe progress (negative translationX = swiping left)
            if (event.translationX < 0) {
                edgeSwipeProgress.value = Math.abs(event.translationX);
            }
        }).
        onEnd((event) => {
            'worklet';
            const threshold = SCREEN_WIDTH * SWIPE_THRESHOLD_PERCENT;

            // Check if swipe was significant enough
            if (Math.abs(event.translationX) > threshold || Math.abs(event.velocityX) > SWIPE_VELOCITY_THRESHOLD) {
                if (event.translationX < 0) {
                    // Swiping left - reopen channel
                    runOnJS(reopenLastChannel)();
                }
            }

            // Reset progress
            edgeSwipeProgress.value = 0;
        });

    const {
        translateX,
        panGesture,
    } = useSwipeGesture({
        onSwipeBack: handleSwipeBack,
        enabled: isVisible && !isClosing,
    });

    // Callback to clear database after animation completes
    const clearDatabaseChannel = useCallback(() => {
        setTimeout(async () => {
            try {
                const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
                await setCurrentChannelId(operator, '');
            } catch {
                // Silently handle errors
            } finally {
                // Only reset the flag after database update completes
                isSwipingBack.current = false;
            }
        }, 0);
    }, [serverUrl]);

    // Populate the animation ref with the close animation logic
    useEffect(() => {
        animateOutRef.current = () => {
            setIsClosing(true);

            // Store the channel ID before closing for potential reopen
            if (displayedChannelId) {
                lastClosedChannelIdRef.current = displayedChannelId;
            }

            // Animate the channel sliding right
            translateX.value = withTiming(SCREEN_WIDTH, {duration: CHANNEL_ANIMATION_DURATION}, (finished) => {
                'worklet';
                if (finished) {
                    runOnJS(setDisplayedChannelId)(null);
                    runOnJS(setIsVisible)(false);
                    runOnJS(setIsClosing)(false);
                    runOnJS(clearDatabaseChannel)();
                }
            });
        };
    }, [displayedChannelId, translateX, clearDatabaseChannel]);

    // Handle channel changes
    useEffect(() => {
        // Ignore if we're in the middle of a swipe-back (already handled)
        // The flag will be reset by the animation completion handler
        if (isSwipingBack.current) {
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

    // When no channel is displayed, show edge hit area for swipe-to-reopen
    if (!displayedChannelId) {
        // Only show edge hit area if there's a channel to reopen
        if (!lastClosedChannelIdRef.current) {
            return null;
        }

        return (
            <GestureDetector gesture={edgeSwipeGesture}>
                <View
                    style={styles.edgeHitArea}
                    pointerEvents='box-only'
                />
            </GestureDetector>
        );
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
