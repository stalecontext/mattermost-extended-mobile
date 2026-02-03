// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * Custom channel icon stored server-side
 */
export type CustomChannelIcon = {
    id: string;
    name: string;
    svg: string; // Base64-encoded SVG content
    normalize_color: boolean;
    create_at: number;
    update_at: number;
    delete_at: number;
    created_by: string;
};

/**
 * Request body for creating a custom channel icon
 */
export type CustomChannelIconCreate = {
    name: string;
    svg: string;
    normalize_color: boolean;
};

/**
 * Request body for updating a custom channel icon
 */
export type CustomChannelIconPatch = {
    name?: string;
    svg?: string;
    normalize_color?: boolean;
};
