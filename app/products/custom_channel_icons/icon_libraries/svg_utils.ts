// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {decode as base64Decode} from 'base-64';

/**
 * Decode base64 string to SVG content
 */
export function decodeSvgFromBase64(base64: string): string {
    try {
        return decodeURIComponent(escape(base64Decode(base64)));
    } catch {
        try {
            return base64Decode(base64);
        } catch {
            return '';
        }
    }
}

/**
 * Sanitize SVG content for safe rendering
 * Removes script tags, event handlers, and javascript: URLs
 */
export function sanitizeSvg(content: string): string {
    return content.
        replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').
        replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '').
        replace(/javascript:/gi, '');
}

/**
 * Normalize SVG colors by replacing fill/stroke with currentColor
 * This allows the icon to inherit color from the parent
 */
export function normalizeSvgColors(svgContent: string): string {
    return svgContent.
        replace(/fill\s*=\s*["'](?!none|transparent)[^"']*["']/gi, 'fill="currentColor"').
        replace(/stroke\s*=\s*["'](?!none|transparent)[^"']*["']/gi, 'stroke="currentColor"').
        replace(/fill\s*:\s*(?!none|transparent)[^;}"']+/gi, 'fill: currentColor').
        replace(/stroke\s*:\s*(?!none|transparent)[^;}"']+/gi, 'stroke: currentColor');
}

/**
 * Extract viewBox from SVG content
 */
export function extractSvgViewBox(content: string): {x: number; y: number; width: number; height: number} | null {
    const viewBoxMatch = content.match(/viewBox\s*=\s*["']([^"']+)["']/i);
    if (viewBoxMatch) {
        const parts = viewBoxMatch[1].split(/\s+/).map(Number);
        if (parts.length === 4 && parts.every((n) => !isNaN(n))) {
            return {x: parts[0], y: parts[1], width: parts[2], height: parts[3]};
        }
    }

    // Try to extract from width/height attributes
    const widthMatch = content.match(/\bwidth\s*=\s*["'](\d+)/i);
    const heightMatch = content.match(/\bheight\s*=\s*["'](\d+)/i);
    if (widthMatch && heightMatch) {
        return {x: 0, y: 0, width: parseInt(widthMatch[1], 10), height: parseInt(heightMatch[1], 10)};
    }

    return null;
}

/**
 * Extract the inner content of an SVG element (everything between <svg> and </svg>)
 */
export function extractSvgInnerContent(content: string): string {
    const match = content.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
    return match ? match[1].trim() : '';
}

/**
 * Extract SVG path data from SVG content
 * Returns an array of path "d" attribute values
 */
export function extractSvgPaths(content: string): string[] {
    const paths: string[] = [];
    const pathRegex = /<path[^>]*\bd\s*=\s*["']([^"']+)["'][^>]*\/?>/gi;
    let match;
    while ((match = pathRegex.exec(content)) !== null) {
        paths.push(match[1]);
    }
    return paths;
}
