// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Material Design Icons - All 7400+ icons from @mdi/js
// https://materialdesignicons.com - Apache 2.0 / MIT License

import * as mdiIcons from '@mdi/js';

// Build an index of kebab-case icon names to their path data
// mdiAccountAlert -> account-alert
const MDI_ICON_MAP: Record<string, string> = {};

function mdiNameToIconName(mdiName: string): string {
    return mdiName.
        replace(/^mdi/, '').
        replace(/([a-z])([A-Z])/g, '$1-$2').
        toLowerCase();
}

// Build the map on first import
for (const [key, value] of Object.entries(mdiIcons)) {
    if (key.startsWith('mdi') && typeof value === 'string') {
        const iconName = mdiNameToIconName(key);
        MDI_ICON_MAP[iconName] = value;
    }
}

/**
 * Get the SVG path data for an MDI icon by name
 * @param name The kebab-case icon name (e.g., "account-alert")
 * @returns The SVG path data string, or undefined if not found
 */
export function getMdiIconPath(name: string): string | undefined {
    return MDI_ICON_MAP[name];
}

/**
 * Check if an MDI icon exists
 * @param name The kebab-case icon name
 */
export function hasMdiIcon(name: string): boolean {
    return name in MDI_ICON_MAP;
}
