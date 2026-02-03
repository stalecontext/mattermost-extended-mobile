// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export type IconFormat = 'mdi' | 'lucide' | 'tabler' | 'feather' | 'simple' | 'fontawesome' | 'svg' | 'customsvg' | 'none';

export type ParsedIconValue = {
    format: IconFormat;
    name: string;
};

/**
 * Parse an icon value string into format and name
 * Formats: mdi:icon-name, lucide:icon-name, svg:base64, customsvg:id, etc.
 */
export function parseIconValue(value: string): ParsedIconValue {
    if (!value) {
        return {format: 'none', name: ''};
    }
    if (value.startsWith('mdi:')) {
        return {format: 'mdi', name: value.slice(4)};
    }
    if (value.startsWith('lucide:')) {
        return {format: 'lucide', name: value.slice(7)};
    }
    if (value.startsWith('tabler:')) {
        return {format: 'tabler', name: value.slice(7)};
    }
    if (value.startsWith('feather:')) {
        return {format: 'feather', name: value.slice(8)};
    }
    if (value.startsWith('simple:')) {
        return {format: 'simple', name: value.slice(7)};
    }
    if (value.startsWith('fontawesome:')) {
        return {format: 'fontawesome', name: value.slice(12)};
    }
    if (value.startsWith('customsvg:')) {
        return {format: 'customsvg', name: value.slice(10)};
    }
    if (value.startsWith('svg:')) {
        return {format: 'svg', name: value.slice(4)};
    }
    return {format: 'none', name: ''};
}

/**
 * Format an icon value for storage
 */
export function formatIconValue(format: IconFormat, name: string): string {
    if (format === 'none' || !name) {
        return '';
    }
    if (format === 'svg') {
        return `svg:${name}`;
    }
    if (format === 'customsvg') {
        return `customsvg:${name}`;
    }
    return `${format}:${name}`;
}
