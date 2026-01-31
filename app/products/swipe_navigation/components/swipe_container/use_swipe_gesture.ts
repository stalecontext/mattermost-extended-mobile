// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useCallback} from 'react';
import {Dimensions, Keyboard} from 'react-native';
import {Gesture} from 'react-native-gesture-handler';
import {runOnJS, useReducedMotion, useSharedValue, withSpring, withTiming} from 'react-native-reanimated';

import NavigationStore from '@store/navigation_store';

import {
    GESTURE_ACTIVE_OFFSET_X,
    GESTURE_FAIL_OFFSET_Y,
    MEMBER_PANEL_WIDTH,
    SPRING_CONFIG,
    SWIPE_THRESHOLD_PERCENT,
    SWIPE_VELOCITY_THRESHOLD,
} from '../../constants';

import type {UseSwipeGestureReturn} from '../../types';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

type UseSwipeGestureProps = {
    onSwipeBack?: () => void;
    onMemberPanelOpen?: () => void;
    onMemberPanelClose?: () => void;
    enabled?: boolean;
};

const REDUCED_MOTION_DURATION = 150;

// Helper to animate with respect to reduced motion preference
function animateValue(value: number, isReducedMotion: boolean) {
    'worklet';
    if (isReducedMotion) {
        return withTiming(value, {duration: REDUCED_MOTION_DURATION});
    }
    return withSpring(value, SPRING_CONFIG);
}

export default function useSwipeGesture({
    onSwipeBack,
    onMemberPanelOpen,
    onMemberPanelClose,
    enabled = true,
}: UseSwipeGestureProps): UseSwipeGestureReturn {
    const translateX = useSharedValue(0);
    const isPanelOpen = useSharedValue(false);
    const canSwipe = useSharedValue(true); // Track if swipe is allowed (checked on JS thread)
    const reducedMotion = useReducedMotion();

    const dismissKeyboard = useCallback(() => {
        Keyboard.dismiss();
    }, []);

    const triggerSwipeBack = useCallback(() => {
        onSwipeBack?.();
    }, [onSwipeBack]);

    const triggerPanelOpen = useCallback(() => {
        onMemberPanelOpen?.();
    }, [onMemberPanelOpen]);

    const triggerPanelClose = useCallback(() => {
        onMemberPanelClose?.();
    }, [onMemberPanelClose]);

    // Check if swipe is allowed (runs on JS thread, updates shared value)
    const updateCanSwipe = useCallback(() => {
        canSwipe.value = !NavigationStore.hasModalsOpened();
    }, [canSwipe]);

    const openPanel = useCallback(() => {
        'worklet';
        translateX.value = animateValue(-MEMBER_PANEL_WIDTH, reducedMotion ?? false);
        isPanelOpen.value = true;
        runOnJS(triggerPanelOpen)();
    }, [isPanelOpen, reducedMotion, translateX, triggerPanelOpen]);

    const closePanel = useCallback(() => {
        'worklet';
        translateX.value = animateValue(0, reducedMotion ?? false);
        isPanelOpen.value = false;
        runOnJS(triggerPanelClose)();
    }, [isPanelOpen, reducedMotion, translateX, triggerPanelClose]);

    const panGesture = Gesture.Pan().
        activeOffsetX([-GESTURE_ACTIVE_OFFSET_X, GESTURE_ACTIVE_OFFSET_X]).
        failOffsetY([-GESTURE_FAIL_OFFSET_Y, GESTURE_FAIL_OFFSET_Y]).
        minPointers(1).
        maxPointers(1).
        enabled(enabled).
        onStart(() => {
            'worklet';

            // Check modal state on JS thread at gesture start
            runOnJS(updateCanSwipe)();
            runOnJS(dismissKeyboard)();
        }).
        onUpdate((event) => {
            'worklet';
            if (!canSwipe.value) {
                return;
            }

            const {translationX} = event;

            if (isPanelOpen.value) {
                // Panel is open - allow closing it (swipe right) but prevent swiping further left.
                const newTranslate = -MEMBER_PANEL_WIDTH + translationX;
                translateX.value = Math.min(0, Math.max(-MEMBER_PANEL_WIDTH, newTranslate));
            } else if (translationX > 0) {
                // Panel is closed, swiping right - going back
                // Apply some resistance as user swipes
                translateX.value = translationX * 0.8;
            } else {
                // Panel is closed, swiping left - opening panel
                // Clamp to panel width
                translateX.value = Math.max(-MEMBER_PANEL_WIDTH, translationX);
            }
        }).
        onEnd((event) => {
            'worklet';
            if (!canSwipe.value) {
                translateX.value = animateValue(isPanelOpen.value ? -MEMBER_PANEL_WIDTH : 0, reducedMotion ?? false);
                return;
            }

            const {translationX, velocityX} = event;
            const threshold = SCREEN_WIDTH * SWIPE_THRESHOLD_PERCENT;

            if (isPanelOpen.value) {
                // Panel is open - check if we should close it
                if (translationX > threshold || velocityX > SWIPE_VELOCITY_THRESHOLD) {
                    closePanel();
                } else {
                    // Snap back to open
                    translateX.value = animateValue(-MEMBER_PANEL_WIDTH, reducedMotion ?? false);
                }
            } else if (translationX > 0) {
                // Panel is closed, was swiping right (back)
                if (translationX > threshold || velocityX > SWIPE_VELOCITY_THRESHOLD) {
                    // Trigger back navigation
                    translateX.value = animateValue(SCREEN_WIDTH, reducedMotion ?? false);
                    runOnJS(triggerSwipeBack)();
                } else {
                    // Snap back to center
                    translateX.value = animateValue(0, reducedMotion ?? false);
                }
            } else if (Math.abs(translationX) > threshold || Math.abs(velocityX) > SWIPE_VELOCITY_THRESHOLD) {
                // Panel is closed, was swiping left (opening panel) - threshold reached
                openPanel();
            } else {
                // Panel is closed, was swiping left - snap back to center
                translateX.value = animateValue(0, reducedMotion ?? false);
            }
        });

    return {
        translateX,
        panGesture,
        isPanelOpen,
        openPanel,
        closePanel,
    };
}
