// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {defineMessage, useIntl} from 'react-intl';

import SettingContainer from '@components/settings/container';
import SettingItem from '@components/settings/item';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {usePreventDoubleTap} from '@hooks/utils';
import {goToScreen, popTopScreen} from '@screens/navigation';
import {gotoSettingsScreen} from '@screens/settings/config';
import {getUserTimezoneProps} from '@utils/user';

import type UserModel from '@typings/database/models/servers/user';
import type {AvailableScreens} from '@typings/screens/navigation';

const ON_OFF_FORMAT = [
    defineMessage({
        id: 'display_settings.on',
        defaultMessage: 'On',
    }),
    defineMessage({
        id: 'display_settings.off',
        defaultMessage: 'Off',
    }),
];

const TIME_FORMAT = [
    defineMessage({
        id: 'display_settings.clock.standard',
        defaultMessage: '12-hour',
    }),
    defineMessage({
        id: 'display_settings.clock.military',
        defaultMessage: '24-hour',
    }),
];

const TIMEZONE_FORMAT = [
    defineMessage({
        id: 'display_settings.tz.auto',
        defaultMessage: 'Auto',
    }),
    defineMessage({
        id: 'display_settings.tz.manual',
        defaultMessage: 'Manual',
    }),
];

type DisplayProps = {
    componentId: AvailableScreens;
    currentUser?: UserModel;
    hasMilitaryTimeFormat: boolean;
    isCRTEnabled: boolean;
    isCRTSwitchEnabled: boolean;
    isThemeSwitchingEnabled: boolean;
    renderEmoticonsAsEmoji: boolean;
}

const Display = ({componentId, currentUser, hasMilitaryTimeFormat, isCRTEnabled, isCRTSwitchEnabled, isThemeSwitchingEnabled, renderEmoticonsAsEmoji}: DisplayProps) => {
    const intl = useIntl();
    const theme = useTheme();
    const timezone = useMemo(() => getUserTimezoneProps(currentUser), [currentUser?.timezone]);

    const goToThemeSettings = usePreventDoubleTap(useCallback(() => {
        const screen = Screens.SETTINGS_DISPLAY_THEME;
        const title = intl.formatMessage({id: 'display_settings.theme', defaultMessage: 'Theme'});
        goToScreen(screen, title);
    }, [intl]));

    const goToClockDisplaySettings = usePreventDoubleTap(useCallback(() => {
        const screen = Screens.SETTINGS_DISPLAY_CLOCK;
        const title = intl.formatMessage({id: 'display_settings.clockDisplay', defaultMessage: 'Clock Display'});
        gotoSettingsScreen(screen, title);
    }, [intl]));

    const goToTimezoneSettings = usePreventDoubleTap(useCallback(() => {
        const screen = Screens.SETTINGS_DISPLAY_TIMEZONE;
        const title = intl.formatMessage({id: 'display_settings.timezone', defaultMessage: 'Timezone'});
        gotoSettingsScreen(screen, title);
    }, [intl]));

    const goToCRTSettings = usePreventDoubleTap(useCallback(() => {
        const screen = Screens.SETTINGS_DISPLAY_CRT;
        const title = intl.formatMessage({id: 'display_settings.crt', defaultMessage: 'Collapsed Reply Threads'});
        gotoSettingsScreen(screen, title);
    }, [intl]));

    const goToEmoticonsSettings = usePreventDoubleTap(useCallback(() => {
        const screen = Screens.SETTINGS_DISPLAY_EMOTICONS;
        const title = intl.formatMessage({id: 'display_settings.emoticons', defaultMessage: 'Render emoticons as emojis'});
        gotoSettingsScreen(screen, title);
    }, [intl]));

    const close = useCallback(() => {
        popTopScreen(componentId);
    }, [componentId]);

    useAndroidHardwareBackHandler(componentId, close);

    return (
        <SettingContainer testID='display_settings'>
            {isThemeSwitchingEnabled && (
                <SettingItem
                    optionName='theme'
                    onPress={goToThemeSettings}
                    info={theme.type!}
                    testID='display_settings.theme.option'
                />
            )}
            <SettingItem
                optionName='clock'
                onPress={goToClockDisplaySettings}
                info={intl.formatMessage(hasMilitaryTimeFormat ? TIME_FORMAT[1] : TIME_FORMAT[0])}
                testID='display_settings.clock_display.option'
            />
            <SettingItem
                optionName='timezone'
                onPress={goToTimezoneSettings}
                info={intl.formatMessage(timezone.useAutomaticTimezone ? TIMEZONE_FORMAT[0] : TIMEZONE_FORMAT[1])}
                testID='display_settings.timezone.option'
            />
            {isCRTSwitchEnabled && (
                <SettingItem
                    optionName='crt'
                    onPress={goToCRTSettings}
                    info={intl.formatMessage(isCRTEnabled ? ON_OFF_FORMAT[0] : ON_OFF_FORMAT[1])}
                    testID='display_settings.crt.option'
                />
            )}
            <SettingItem
                optionName='emoticons'
                onPress={goToEmoticonsSettings}
                info={intl.formatMessage(renderEmoticonsAsEmoji ? ON_OFF_FORMAT[0] : ON_OFF_FORMAT[1])}
                testID='display_settings.emoticons.option'
            />
        </SettingContainer>
    );
};

export default Display;
