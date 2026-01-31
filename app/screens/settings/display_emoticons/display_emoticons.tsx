// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {defineMessage, useIntl} from 'react-intl';

import {savePreference} from '@actions/remote/preference';
import SettingBlock from '@components/settings/block';
import SettingContainer from '@components/settings/container';
import SettingOption from '@components/settings/option';
import SettingSeparator from '@components/settings/separator';
import {Preferences} from '@constants';
import {useServerUrl} from '@context/server';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useBackNavigation from '@hooks/navigate_back';
import {popTopScreen} from '@screens/navigation';

import type {AvailableScreens} from '@typings/screens/navigation';

const emoticonsDescription = defineMessage({
    id: 'settings_display.emoticons.desc',
    defaultMessage: 'When enabled, text emoticons like :) ;) :D will be rendered as emoji images.',
});

type Props = {
    componentId: AvailableScreens;
    currentUserId: string;
    renderEmoticonsAsEmoji: boolean;
}

const DisplayEmoticons = ({componentId, currentUserId, renderEmoticonsAsEmoji}: Props) => {
    const [isEnabled, setIsEnabled] = useState(renderEmoticonsAsEmoji);
    const serverUrl = useServerUrl();
    const intl = useIntl();

    const saveEmoticonsPreference = useCallback(async () => {
        popTopScreen(componentId);
        if (renderEmoticonsAsEmoji !== isEnabled) {
            const emoticonsPreference: PreferenceType = {
                category: Preferences.CATEGORIES.DISPLAY_SETTINGS,
                name: Preferences.RENDER_EMOTICONS_AS_EMOJI,
                user_id: currentUserId,
                value: String(isEnabled),
            };

            await savePreference(serverUrl, [emoticonsPreference]);
        }
    }, [componentId, renderEmoticonsAsEmoji, isEnabled, currentUserId, serverUrl]);

    useBackNavigation(saveEmoticonsPreference);
    useAndroidHardwareBackHandler(componentId, saveEmoticonsPreference);

    return (
        <SettingContainer testID='emoticons_display_settings'>
            <SettingBlock
                footerText={emoticonsDescription}
            >
                <SettingOption
                    action={setIsEnabled}
                    label={intl.formatMessage({id: 'settings_display.emoticons.label', defaultMessage: 'Render emoticons as emojis'})}
                    selected={isEnabled}
                    testID='settings_display.emoticons.toggle'
                    type='toggle'
                />
                <SettingSeparator/>
            </SettingBlock>
        </SettingContainer>
    );
};

export default DisplayEmoticons;
