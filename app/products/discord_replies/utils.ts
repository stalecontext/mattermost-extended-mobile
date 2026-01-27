// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {DiscordReplyData, PendingDiscordReply} from './types';

/**
 * Formats a single reply into a Discord-style quote block
 * Format: >[@username](permalink): text
 */
function formatSingleReply(reply: PendingDiscordReply, serverUrl: string): string {
    const displayName = reply.nickname || reply.username;
    const permalink = `${serverUrl}/_redirect/pl/${reply.postId}`;

    let content = reply.text;
    if (!content) {
        if (reply.hasImage) {
            content = '[image]';
        } else if (reply.hasVideo) {
            content = '[video]';
        } else {
            content = '[attachment]';
        }
    }

    // Truncate long text
    const maxLength = 100;
    if (content.length > maxLength) {
        content = content.substring(0, maxLength) + '...';
    }

    // Remove newlines for cleaner quote display
    content = content.replace(/\n/g, ' ');

    return `>[@${displayName}](${permalink}): ${content}`;
}

/**
 * Formats all pending replies into a quote block to prepend to the message
 */
export function formatAllDiscordReplies(replies: PendingDiscordReply[], serverUrl: string): string {
    if (replies.length === 0) {
        return '';
    }

    return replies.map((reply) => formatSingleReply(reply, serverUrl)).join('\n');
}

/**
 * Converts pending replies to the API format for post.props.discord_replies
 */
export function pendingRepliesToApiFormat(replies: PendingDiscordReply[]): DiscordReplyData[] {
    return replies.map((reply) => ({
        post_id: reply.postId,
        user_id: reply.userId,
        username: reply.username,
        nickname: reply.nickname,
        text: reply.text,
        has_image: reply.hasImage,
        has_video: reply.hasVideo,
    }));
}
