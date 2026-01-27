// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useState} from 'react';
import {useIntl} from 'react-intl';

import {savePreference} from '@actions/remote/preference';
import SettingContainer from '@components/settings/container';
import SettingOption from '@components/settings/option';
import Preferences from '@constants/preferences';
import {useServerUrl} from '@context/server';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useBackNavigation from '@hooks/navigate_back';
import {getCurrentUserId} from '@queries/servers/system';
import {popTopScreen} from '@screens/navigation';
import HapticFeedbackStore from '@store/haptic_feedback_store';

import type {WithDatabaseArgs} from '@typings/database/database';
import type {AvailableScreens} from '@typings/screens/navigation';

type Props = WithDatabaseArgs & {
    componentId: AvailableScreens;
    hapticFeedbackEnabled: boolean;
};

const HapticFeedback = ({
    componentId,
    database,
    hapticFeedbackEnabled,
}: Props) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const [enabled, setEnabled] = useState(hapticFeedbackEnabled);
    const [saving, setSaving] = useState(false);

    const close = useCallback(() => {
        popTopScreen(componentId);
    }, [componentId]);

    useAndroidHardwareBackHandler(componentId, close);

    const handleToggle = useCallback(async (value: boolean) => {
        setEnabled(value);
        HapticFeedbackStore.setEnabled(value);
        setSaving(true);
        try {
            const userId = await getCurrentUserId(database);
            const pref: PreferenceType = {
                user_id: userId,
                category: Preferences.CATEGORIES.ADVANCED_SETTINGS,
                name: Preferences.HAPTIC_FEEDBACK_ENABLED,
                value: String(value),
            };
            await savePreference(serverUrl, [pref]);
        } finally {
            setSaving(false);
        }
    }, [serverUrl, database]);

    useEffect(() => {
        HapticFeedbackStore.setEnabled(hapticFeedbackEnabled);
    }, [hapticFeedbackEnabled]);

    const canSaveSettings = enabled !== hapticFeedbackEnabled;

    const handleSave = useCallback(() => {
        if (canSaveSettings && !saving) {
            handleToggle(enabled);
        }
        close();
    }, [canSaveSettings, enabled, handleToggle, close, saving]);

    useBackNavigation(handleSave);

    return (
        <SettingContainer testID='haptic_feedback_settings'>
            <SettingOption
                label={intl.formatMessage({
                    id: 'settings.haptic_feedback.enable',
                    defaultMessage: 'Haptic Feedback',
                })}
                description={intl.formatMessage({
                    id: 'settings.haptic_feedback.enable.description',
                    defaultMessage: 'Vibrate when opening menus and interacting with buttons',
                })}
                action={handleToggle}
                testID='haptic_feedback_settings.enable.option'
                type='toggle'
                selected={enabled}
            />
        </SettingContainer>
    );
};

export default HapticFeedback;
