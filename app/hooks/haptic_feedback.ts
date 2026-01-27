// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect} from 'react';

import Preferences from '@constants/preferences';
import {useServerUrl} from '@context/server';
import DatabaseManager from '@database/manager';
import {getAdvanceSettingPreferenceAsBool} from '@helpers/api/preference';
import {queryAdvanceSettingsPreferences} from '@queries/servers/preference';
import HapticFeedbackStore from '@store/haptic_feedback_store';

/**
 * Hook to initialize and sync the haptic feedback store with the database preference.
 * Should be used in a top-level component to ensure the store is always in sync.
 */
export function useInitHapticFeedbackStore() {
    const serverUrl = useServerUrl();

    useEffect(() => {
        const initStore = async () => {
            try {
                const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
                const preferences = await queryAdvanceSettingsPreferences(database, Preferences.HAPTIC_FEEDBACK_ENABLED).fetch();
                const enabled = getAdvanceSettingPreferenceAsBool(preferences, Preferences.HAPTIC_FEEDBACK_ENABLED, true);
                HapticFeedbackStore.setEnabled(enabled);
            } catch {
                // Default to enabled if preference fetch fails
                HapticFeedbackStore.setEnabled(true);
            }
        };

        initStore();
    }, [serverUrl]);
}
