// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {LinearGradient} from 'expo-linear-gradient';
import React from 'react';
import {StyleSheet, View} from 'react-native';
import Animated, {interpolate, useAnimatedStyle, type SharedValue} from 'react-native-reanimated';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';

import {BACK_PREVIEW_WIDTH} from '../../constants';

type BackPreviewProps = {
    translateX: SharedValue<number>;
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: BACK_PREVIEW_WIDTH,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    gradient: {
        ...StyleSheet.absoluteFillObject,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

const BackPreview = ({translateX}: BackPreviewProps) => {
    const theme = useTheme();

    const animatedContainerStyle = useAnimatedStyle(() => {
        // Only show when swiping right (translateX > 0)
        const opacity = interpolate(
            translateX.value,
            [0, 50, 150],
            [0, 0.3, 1],
            'clamp',
        );

        return {
            opacity,
        };
    });

    const animatedIconStyle = useAnimatedStyle(() => {
        // Scale and translate the icon based on swipe progress
        const scale = interpolate(
            translateX.value,
            [0, 100, 200],
            [0.5, 0.8, 1],
            'clamp',
        );

        const iconTranslateX = interpolate(
            translateX.value,
            [0, 100],
            [-20, 0],
            'clamp',
        );

        return {
            transform: [
                {scale},
                {translateX: iconTranslateX},
            ],
        };
    });

    return (
        <Animated.View style={[styles.container, animatedContainerStyle]}>
            <View style={styles.gradient}>
                <LinearGradient
                    colors={['rgba(0,0,0,0.3)', 'transparent']}
                    start={{x: 0, y: 0.5}}
                    end={{x: 1, y: 0.5}}
                    style={StyleSheet.absoluteFill}
                />
            </View>
            <Animated.View style={[styles.iconContainer, animatedIconStyle]}>
                <CompassIcon
                    name='chevron-left'
                    size={28}
                    color={theme.sidebarHeaderTextColor}
                />
            </Animated.View>
        </Animated.View>
    );
};

export default BackPreview;
