// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {distinctUntilChanged} from 'rxjs/operators';

import {observeCurrentChannelId} from '@queries/servers/system';

import PhoneChannelView from './phone_channel_view';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    return {
        currentChannelId: observeCurrentChannelId(database).pipe(
            distinctUntilChanged(),
        ),
    };
});

export default withDatabase(enhanced(PhoneChannelView));
