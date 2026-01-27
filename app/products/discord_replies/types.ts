// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * Discord reply data as stored in post.props.discord_replies (from plugin)
 */
export interface DiscordReplyData {
    post_id: string;
    user_id: string;
    username: string;
    nickname: string;
    text: string;
    has_image: boolean;
    has_video: boolean;
}

/**
 * Pending reply stored in ephemeral store before sending
 */
export interface PendingDiscordReply {
    postId: string;
    userId: string;
    username: string;
    nickname: string;
    text: string;
    hasImage: boolean;
    hasVideo: boolean;
    channelId: string;
    teamId: string;
}
