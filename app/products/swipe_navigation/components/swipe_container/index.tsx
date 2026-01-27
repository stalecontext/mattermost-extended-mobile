// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {Dimensions, StyleSheet, View} from 'react-native';
import {GestureDetector} from 'react-native-gesture-handler';
import Animated, {useAnimatedStyle} from 'react-native-reanimated';

import {useTheme} from '@context/theme';

import {MEMBER_PANEL_WIDTH} from '../../constants';
import BackPreview from '../back_preview';
import MemberPanel from '../member_panel';

import useSwipeGesture from './use_swipe_gesture';

import type {SwipeContainerProps} from '../../types';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

const styles = StyleSheet.create({
    container: {
        flex: 1,
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

const SwipeContainer = ({
    children,
    channelId,
    componentId,
    enabled = true,
    onSwipeBack,
    onMemberPanelOpen,
    onMemberPanelClose,
}: SwipeContainerProps) => {
    const theme = useTheme();

    const handleSwipeBack = useCallback(() => {
        onSwipeBack?.();
    }, [onSwipeBack]);

    const {
        translateX,
        panGesture,
        isPanelOpen,
        closePanel,
    } = useSwipeGesture({
        onSwipeBack: handleSwipeBack,
        onMemberPanelOpen,
        onMemberPanelClose,
        enabled,
    });

    const animatedContentStyle = useAnimatedStyle(() => {
        return {
            transform: [{translateX: translateX.value}],
        };
    });

    const animatedPanelStyle = useAnimatedStyle(() => {
        return {
            transform: [{translateX: translateX.value}],
        };
    });

    const handleMemberPress = useCallback(() => {
        // Close panel when a member is pressed (after navigating to their profile)
        closePanel();
    }, [closePanel]);

    return (
        <View style={styles.container}>
            <BackPreview translateX={translateX}/>
            <GestureDetector gesture={panGesture}>
                <Animated.View style={[styles.contentWrapper, animatedContentStyle]}>
                    {children}
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
                    channelId={channelId}
                    componentId={componentId}
                    isPanelOpen={isPanelOpen}
                    onMemberPress={handleMemberPress}
                />
            </Animated.View>
        </View>
    );
};

export default SwipeContainer;
