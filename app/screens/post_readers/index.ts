// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import {observeTeammateNameDisplay} from '@queries/servers/user';

import PostReaders from './post_readers';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => ({
    teammateNameDisplay: observeTeammateNameDisplay(database),
}));

export default withDatabase(enhanced(PostReaders));
