// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    parseIconValue,
    getMdiIconPath,
    decodeSvgFromBase64,
    sanitizeSvg,
    normalizeSvgColors,
    extractSvgPaths,
} from '@custom_channel_icons/icon_libraries';
import {useCustomChannelIcon} from '@custom_channel_icons/store';
import React, {useMemo} from 'react';
import {type StyleProp, type ViewStyle} from 'react-native';
import Svg, {Path} from 'react-native-svg';

import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {changeOpacity} from '@utils/theme';

type Props = {
    customIcon: string;
    size?: number;
    style?: StyleProp<ViewStyle>;
    isActive?: boolean;
    isUnread?: boolean;
    isMuted?: boolean;
    isOnCenterBg?: boolean;
};

const CustomChannelIcon = ({
    customIcon,
    size = 18,
    style,
    isActive = false,
    isUnread = false,
    isMuted = false,
    isOnCenterBg = false,
}: Props) => {
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const {format, name} = useMemo(() => parseIconValue(customIcon), [customIcon]);

    // For customsvg format, fetch from server store
    const serverIcon = useCustomChannelIcon(serverUrl, format === 'customsvg' ? name : '');

    // Determine the icon color based on state
    const color = useMemo(() => {
        if (isMuted) {
            return isOnCenterBg ?
                changeOpacity(theme.centerChannelColor, 0.32) :
                changeOpacity(theme.sidebarText, 0.32);
        }
        if (isUnread) {
            return isOnCenterBg ? theme.centerChannelColor : theme.sidebarUnreadText;
        }
        if (isActive) {
            return isOnCenterBg ? theme.centerChannelColor : theme.sidebarText;
        }
        return isOnCenterBg ?
            changeOpacity(theme.centerChannelColor, 0.72) :
            changeOpacity(theme.sidebarText, 0.4);
    }, [theme, isActive, isUnread, isMuted, isOnCenterBg]);

    // Render MDI icon (filled path, 24x24 viewBox)
    if (format === 'mdi' && name) {
        const path = getMdiIconPath(name);
        if (path) {
            return (
                <Svg
                    width={size}
                    height={size}
                    viewBox='0 0 24 24'
                    style={style}
                >
                    <Path
                        d={path}
                        fill={color}
                    />
                </Svg>
            );
        }
    }

    // Render custom SVG from base64 (legacy format: svg:base64)
    if (format === 'svg' && name) {
        try {
            let svgContent = decodeSvgFromBase64(name);
            svgContent = sanitizeSvg(svgContent);
            svgContent = normalizeSvgColors(svgContent);

            const paths = extractSvgPaths(svgContent);
            if (paths.length > 0) {
                return (
                    <Svg
                        width={size}
                        height={size}
                        viewBox='0 0 24 24'
                        style={style}
                    >
                        {paths.map((d, i) => (
                            <Path
                                key={i}
                                d={d}
                                fill={color}
                            />
                        ))}
                    </Svg>
                );
            }
        } catch {
            // Fall through to return null
        }
    }

    // Render server-stored custom SVG (customsvg:id)
    if (format === 'customsvg' && serverIcon) {
        try {
            let svgContent = decodeSvgFromBase64(serverIcon.svg);
            svgContent = sanitizeSvg(svgContent);

            if (serverIcon.normalize_color) {
                svgContent = normalizeSvgColors(svgContent);
            }

            const paths = extractSvgPaths(svgContent);
            if (paths.length > 0) {
                return (
                    <Svg
                        width={size}
                        height={size}
                        viewBox='0 0 24 24'
                        style={style}
                    >
                        {paths.map((d, i) => (
                            <Path
                                key={i}
                                d={d}
                                fill={serverIcon.normalize_color ? color : undefined}
                            />
                        ))}
                    </Svg>
                );
            }
        } catch {
            // Fall through to return null
        }
    }

    // TODO: Add support for lucide, tabler, feather, simple, fontawesome formats
    // These would require adding their respective icon packages

    return null;
};

export default React.memo(CustomChannelIcon);
