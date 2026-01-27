// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import Preferences from '@constants/preferences';
import {getAdvanceSettingPreferenceAsBool} from '@helpers/api/preference';
import {queryAdvanceSettingsPreferences} from '@queries/servers/preference';

import HapticFeedbackSettings from './haptic_feedback';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    return {
        hapticFeedbackEnabled: queryAdvanceSettingsPreferences(database, Preferences.HAPTIC_FEEDBACK_ENABLED).
            observeWithColumns(['value']).
            pipe(
                switchMap((preferences) => of$(
                    getAdvanceSettingPreferenceAsBool(preferences, Preferences.HAPTIC_FEEDBACK_ENABLED, true),
                )),
            ),
    };
});

export default withDatabase(enhanced(HapticFeedbackSettings));
