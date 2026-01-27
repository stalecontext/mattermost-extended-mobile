// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import MemberPanel from '@swipe_navigation/components/member_panel';
import useSwipeGesture from '@swipe_navigation/components/swipe_container/use_swipe_gesture';
import {MEMBER_PANEL_WIDTH} from '@swipe_navigation/constants';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {DeviceEventEmitter, Dimensions, StyleSheet} from 'react-native';
import {GestureDetector} from 'react-native-gesture-handler';
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
const ANIMATION_DURATION = 300;

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
    const isSwipingBack = useRef(false);

    const handleSwipeBack = useCallback(async () => {
        isSwipingBack.current = true;

        // Clear current channel to trigger close
        try {
            const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
            await setCurrentChannelId(operator, '');
        } catch {
            // Silently handle errors
        }
    }, [serverUrl]);

    const {
        translateX,
        panGesture,
        closePanel,
    } = useSwipeGesture({
        onSwipeBack: handleSwipeBack,
        enabled: isVisible,
    });

    // Handle channel changes
    useEffect(() => {
        if (currentChannelId && !displayedChannelId) {
            // Channel selected - slide in from right
            setDisplayedChannelId(currentChannelId);
            translateX.value = SCREEN_WIDTH;
            setIsVisible(true);
            translateX.value = withTiming(0, {duration: ANIMATION_DURATION});
        } else if (currentChannelId && displayedChannelId && currentChannelId !== displayedChannelId) {
            // Different channel selected - instant switch (already visible)
            setDisplayedChannelId(currentChannelId);
        } else if (!currentChannelId && displayedChannelId) {
            // Channel cleared
            if (isSwipingBack.current) {
                // Swipe already handled the animation, just clean up after animation completes
                isSwipingBack.current = false;

                // Wait for swipe animation to complete
                const timeout = setTimeout(() => {
                    setDisplayedChannelId(null);
                    setIsVisible(false);
                    translateX.value = SCREEN_WIDTH;
                }, ANIMATION_DURATION);
                return () => clearTimeout(timeout);
            }

            // Programmatic close (navigation event) - animate out
            translateX.value = withTiming(SCREEN_WIDTH, {duration: ANIMATION_DURATION}, (finished) => {
                if (finished) {
                    runOnJS(setDisplayedChannelId)(null);
                    runOnJS(setIsVisible)(false);
                }
            });
        }
        return undefined;
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

    const handleMemberPress = useCallback(() => {
        closePanel();
    }, [closePanel]);

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
        <Animated.View style={styles.container}>
            <GestureDetector gesture={panGesture}>
                <Animated.View style={[styles.contentWrapper, {backgroundColor: theme.centerChannelBg}, animatedContentStyle]}>
                    <Channel
                        componentId={Screens.HOME}
                        isTabletView={true}
                        onSwipeBack={handleSwipeBack}
                    />
                </Animated.View>
            </GestureDetector>
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
                    onMemberPress={handleMemberPress}
                />
            </Animated.View>
        </Animated.View>
    );
};

export default PhoneChannelView;
