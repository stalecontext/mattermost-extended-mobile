// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Dimensions} from 'react-native';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

/**
 * Swipe thresholds for triggering navigation actions
 */
export const SWIPE_THRESHOLD_PERCENT = 0.25; // 25% of screen width - more responsive
export const SWIPE_VELOCITY_THRESHOLD = 300; // pixels per second - lower threshold for faster detection

/**
 * Horizontal activation offset - gesture won't activate until moving this far horizontally
 */
export const GESTURE_ACTIVE_OFFSET_X = 10; // Reduced from 15 for faster activation

/**
 * Vertical fail offset - if gesture moves this far vertically first, it fails (allows scrolling)
 * Higher value = more forgiving of diagonal swipes
 */
export const GESTURE_FAIL_OFFSET_Y = 30; // Increased from 10 for more diagonal tolerance

/**
 * Member panel width (as percentage of screen width)
 */
export const MEMBER_PANEL_WIDTH_PERCENT = 0.75;
export const MEMBER_PANEL_WIDTH = SCREEN_WIDTH * MEMBER_PANEL_WIDTH_PERCENT;

/**
 * Animation spring config - snappy and responsive
 */
export const SPRING_CONFIG = {
    damping: 28, // Higher damping = less bounce, faster settle
    stiffness: 400, // Higher stiffness = faster snap
    mass: 0.8, // Lower mass = faster response
};

/**
 * Channel slide animation duration (ms)
 */
export const CHANNEL_ANIMATION_DURATION = 200;

/**
 * Back preview gradient config
 */
export const BACK_PREVIEW_WIDTH = 80;
export const BACK_PREVIEW_OPACITY_START = 0;
export const BACK_PREVIEW_OPACITY_END = 0.5;
