// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {TouchableOpacity} from 'react-native';

import CompassIcon from '@components/compass_icon';
import Emoji from '@components/emoji';
import {EMOJI_CATEGORY_ICONS} from '@constants/emoji';
import {usePreventDoubleTap} from '@hooks/utils';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

type Props = {
    currentIndex: number;
    icon: string;
    index: number;
    scrollToIndex: (index: number) => void;
    theme: Theme;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 2,
    },
    icon: {
        color: changeOpacity(theme.centerChannelColor, 0.56),
    },
    selectedContainer: {
        backgroundColor: changeOpacity(theme.buttonBg, 0.08),
        borderRadius: 4,
    },
    selected: {
        color: theme.buttonBg,
    },
}));

// Check if the icon is one of the known MDI icons used for standard emoji categories
const knownMdiIcons = new Set(Object.values(EMOJI_CATEGORY_ICONS));
const isMdiIcon = (icon: string) => knownMdiIcons.has(icon);

const EmojiCategoryBarIcon = ({currentIndex, icon, index, scrollToIndex, theme}: Props) => {
    const style = getStyleSheet(theme);
    const onPress = usePreventDoubleTap(useCallback(() => scrollToIndex(index), [index, scrollToIndex]));

    return (
        <TouchableOpacity
            onPress={onPress}
            style={[style.container, currentIndex === index ? style.selectedContainer : undefined]}
        >
            {isMdiIcon(icon) ? (
                <CompassIcon
                    name={icon}
                    size={20}
                    style={[style.icon, currentIndex === index ? style.selected : undefined]}
                />
            ) : (
                <Emoji
                    emojiName={icon}
                    size={18}
                />
            )}
        </TouchableOpacity>
    );
};

export default EmojiCategoryBarIcon;

