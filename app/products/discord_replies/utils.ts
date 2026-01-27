// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {DiscordReplyData, PendingDiscordReply} from './types';

/**
 * Strip quote lines (lines starting with >) from a message.
 * Matches the desktop plugin's stripQuotes behavior:
 * - Filters out ALL lines starting with '>' (not just leading ones)
 * - Removes leading empty lines after filtering
 */
export function stripQuotes(message: string): string {
    const lines = message.split('\n');

    // Filter out all quote lines (matching desktop behavior)
    const nonQuoteLines = lines.filter((line) => !line.trim().startsWith('>'));

    // If everything was quotes, return the original message
    if (nonQuoteLines.length === 0) {
        return message;
    }

    // Remove leading empty lines
    while (nonQuoteLines.length > 0 && nonQuoteLines[0].trim() === '') {
        nonQuoteLines.shift();
    }

    return nonQuoteLines.join('\n');
}

/**
 * Clean text for use in quotes/previews - replaces markdown images/links with emojis
 * and escapes @mentions to prevent re-pinging.
 * Matches desktop plugin's cleanTextForPreview behavior.
 */
export function cleanTextForPreview(text: string): string {
    // Take only the first line
    let cleaned = text.split('\n')[0].trim();

    // Escape @mentions to prevent re-pinging (insert zero-width space after @)
    cleaned = cleaned.replace(/@([a-zA-Z0-9_\-.]+)/g, '@\u200B$1');

    // Replace any markdown images ![alt](url) - with or without closing )
    cleaned = cleaned.replace(/!\[[^\]]*\]\([^)]*\)?/g, '🖼️');
    cleaned = cleaned.replace(/!\[[^\]]*\]\([^\s]*/g, '🖼️');

    // Replace video links [▶️Video](url) with video emoji (before generic link replacement)
    cleaned = cleaned.replace(/\[▶️Video\]\([^)]*\)?/gi, '🎬');
    cleaned = cleaned.replace(/\[▶️Video\]\([^\s]*/gi, '🎬');

    // Replace markdown links [text](url) - with or without closing )
    cleaned = cleaned.replace(/\[[^\]]*\]\([^)]*\)?/g, '🔗');
    cleaned = cleaned.replace(/\[[^\]]*\]\([^\s]*/g, '🔗');

    // Replace bare URLs with link emoji
    cleaned = cleaned.replace(/https?:\/\/[^\s]+/gi, '🔗');
    cleaned = cleaned.replace(/www\.[^\s]+/gi, '🔗');

    // Clean up multiple consecutive emojis
    cleaned = cleaned.replace(/(🖼️\s*)+/g, '🖼️ ');
    cleaned = cleaned.replace(/(🎬\s*)+/g, '🎬 ');
    cleaned = cleaned.replace(/(🔗\s*)+/g, '🔗 ');

    return cleaned.trim();
}

/**
 * Format a preview with emoji prefix for media attachments.
 * Matches desktop plugin's formatMediaPreview behavior.
 */
function formatMediaPreview(text: string, hasImage: boolean, hasVideo: boolean, maxLength: number): string {
    let prefix = '';

    // Add emoji prefix for file attachments
    if (hasImage && hasVideo) {
        prefix = '🖼️🎬 ';
    } else if (hasImage) {
        prefix = '🖼️ ';
    } else if (hasVideo) {
        prefix = '🎬 ';
    }

    const cleaned = cleanTextForPreview(text);

    // If no text, just return the emoji
    if (!cleaned) {
        return prefix.trim() || '📎';
    }

    // Combine prefix with text, avoid duplicate emojis
    if (prefix && cleaned.startsWith('🖼️')) {
        return truncateText(cleaned, maxLength);
    }

    return truncateText((prefix + cleaned).trim(), maxLength);
}

/**
 * Truncate text to a maximum length with ellipsis
 */
function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
        return text;
    }
    return text.substring(0, maxLength - 3) + '...';
}

/**
 * Formats a single reply into a Discord-style quote block
 * Format: >[@username](permalink): text
 * Uses username (not nickname) in the link to match desktop plugin behavior
 */
function formatSingleReply(reply: PendingDiscordReply, serverUrl: string, teamName?: string): string {
    // Use team name in URL like desktop, fall back to _redirect if not available
    const permalink = teamName ? `${serverUrl}/${teamName}/pl/${reply.postId}` : `${serverUrl}/_redirect/pl/${reply.postId}`;

    // Use formatMediaPreview to clean and format the content (matching desktop)
    const content = formatMediaPreview(reply.text, reply.hasImage, reply.hasVideo, 100);

    // Use username (not nickname) in the link to match desktop plugin
    return `>[@${reply.username}](${permalink}): ${content}`;
}

/**
 * Formats all pending replies into a quote block to prepend to the message
 */
export function formatAllDiscordReplies(replies: PendingDiscordReply[], serverUrl: string, teamName?: string): string {
    if (replies.length === 0) {
        return '';
    }

    return replies.map((reply) => formatSingleReply(reply, serverUrl, teamName)).join('\n');
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
