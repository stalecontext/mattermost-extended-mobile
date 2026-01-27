// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet} from 'react-native';
import Animated, {interpolate, useAnimatedStyle, type SharedValue} from 'react-native-reanimated';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';

type BackPreviewProps = {
    translateX: SharedValue<number>;
};

const styles = StyleSheet.create({
    iconContainer: {
        position: 'absolute',
        left: 8,
        top: '50%',
        marginTop: -20,
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
        zIndex: 10,
    },
});

const BackPreview = ({translateX}: BackPreviewProps) => {
    const theme = useTheme();

    const animatedIconStyle = useAnimatedStyle(() => {
        // Only show when swiping right (translateX > 0)
        const opacity = interpolate(
            translateX.value,
            [0, 30, 80],
            [0, 0.5, 1],
            'clamp',
        );

        const scale = interpolate(
            translateX.value,
            [0, 60, 120],
            [0.6, 0.8, 1],
            'clamp',
        );

        return {
            opacity,
            transform: [{scale}],
        };
    });

    return (
        <Animated.View style={[styles.iconContainer, animatedIconStyle]}>
            <CompassIcon
                name='chevron-left'
                size={24}
                color={theme.sidebarHeaderTextColor}
            />
        </Animated.View>
    );
};

export default BackPreview;
