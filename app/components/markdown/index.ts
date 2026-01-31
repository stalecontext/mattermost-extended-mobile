// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import React from 'react';
import {of as of$} from 'rxjs';
import {switchMap} from 'rxjs/operators';

import {Preferences} from '@constants';
import {getDisplayNamePreferenceAsBool} from '@helpers/api/preference';
import {queryDisplayNamePreferences} from '@queries/servers/preference';
import {observeConfigBooleanValue, observeConfigIntValue} from '@queries/servers/system';

import Markdown from './markdown';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const enableLatex = observeConfigBooleanValue(database, 'EnableLatex');
    const enableInlineLatex = observeConfigBooleanValue(database, 'EnableInlineLatex');
    const maxNodes = observeConfigIntValue(database, 'MaxMarkdownNodes');
    const minimumHashtagLength = observeConfigIntValue(database, 'MinimumHashtagLength');
    const enableEmoticons = queryDisplayNamePreferences(database).
        observeWithColumns(['value']).pipe(
            switchMap(
                (preferences) => of$(getDisplayNamePreferenceAsBool(preferences, Preferences.RENDER_EMOTICONS_AS_EMOJI, true)),
            ),
        );

    return {
        enableLatex,
        enableInlineLatex,
        maxNodes,
        minimumHashtagLength,
        enableEmoticons,
    };
});

export default withDatabase(enhanced(React.memo(Markdown)));
