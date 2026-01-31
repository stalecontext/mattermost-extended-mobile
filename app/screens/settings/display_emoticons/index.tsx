// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {Preferences} from '@constants';
import {getDisplayNamePreferenceAsBool} from '@helpers/api/preference';
import {queryDisplayNamePreferences} from '@queries/servers/preference';
import {observeCurrentUserId} from '@queries/servers/system';

import DisplayEmoticons from './display_emoticons';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    return {
        currentUserId: observeCurrentUserId(database),
        renderEmoticonsAsEmoji: queryDisplayNamePreferences(database).
            observeWithColumns(['value']).pipe(
                switchMap(
                    (preferences) => of$(getDisplayNamePreferenceAsBool(preferences, Preferences.RENDER_EMOTICONS_AS_EMOJI, true)),
                ),
            ),
    };
});

export default withDatabase(enhanced(DisplayEmoticons));
