// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {combineLatest, of as of$} from 'rxjs';
import {map} from 'rxjs/operators';

import {queryUsersById, queryUsersByUsername, observeTeammateNameDisplay} from '@queries/servers/user';

import DiscordReplyPreview from './discord_reply_preview';

import type {DiscordReplyData} from '@discord_replies/types';
import type {WithDatabaseArgs} from '@typings/database/database';
import type UserModel from '@typings/database/models/servers/user';

type OwnProps = {
    replies: DiscordReplyData[];
};

function buildUsersMap(byId: UserModel[], byUsername: UserModel[]): Record<string, UserModel> {
    const usersMap: Record<string, UserModel> = {};

    // Add users by ID
    byId.forEach((user) => {
        usersMap[user.id] = user;
    });

    // Add users by username (map username to user for fallback lookup)
    byUsername.forEach((user) => {
        usersMap[user.id] = user;
        usersMap[`username:${user.username}`] = user;
    });

    return usersMap;
}

const enhanced = withObservables(
    ['replies'],
    ({database, replies}: WithDatabaseArgs & OwnProps) => {
        // Collect user IDs and usernames from replies
        const userIds = replies.
            map((r) => r.user_id).
            filter((id) => id && id.length > 0);
        const usernames = replies.
            filter((r) => !r.user_id || r.user_id.length === 0).
            map((r) => r.username).
            filter((u) => u && u.length > 0);

        // Query users by ID and username
        const usersById$ = userIds.length > 0 ?queryUsersById(database, userIds).observe() :of$([]);

        const usersByUsername$ = usernames.length > 0 ?queryUsersByUsername(database, usernames).observe() :of$([]);

        // Combine into a single users map
        const users$ = combineLatest([usersById$, usersByUsername$]).pipe(
            map(([byId, byUsername]) => buildUsersMap(byId, byUsername)),
        );

        return {
            teammateNameDisplay: observeTeammateNameDisplay(database),
            users: users$,
        };
    },
);

export default withDatabase(enhanced(DiscordReplyPreview));
