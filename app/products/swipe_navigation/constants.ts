// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Dimensions} from 'react-native';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

/**
 * Swipe thresholds for triggering navigation actions
 */
export const SWIPE_THRESHOLD_PERCENT = 0.4; // 40% of screen width
export const SWIPE_VELOCITY_THRESHOLD = 400; // pixels per second

/**
 * Horizontal activation offset - gesture won't activate until moving this far horizontally
 */
export const GESTURE_ACTIVE_OFFSET_X = 15;

/**
 * Vertical fail offset - if gesture moves this far vertically first, it fails (allows scrolling)
 */
export const GESTURE_FAIL_OFFSET_Y = 10;

/**
 * Member panel width (as percentage of screen width)
 */
export const MEMBER_PANEL_WIDTH_PERCENT = 0.75;
export const MEMBER_PANEL_WIDTH = SCREEN_WIDTH * MEMBER_PANEL_WIDTH_PERCENT;

/**
 * Animation spring config
 */
export const SPRING_CONFIG = {
    damping: 20,
    stiffness: 200,
    mass: 1,
};

/**
 * Back preview gradient config
 */
export const BACK_PREVIEW_WIDTH = 80;
export const BACK_PREVIEW_OPACITY_START = 0;
export const BACK_PREVIEW_OPACITY_END = 0.5;
