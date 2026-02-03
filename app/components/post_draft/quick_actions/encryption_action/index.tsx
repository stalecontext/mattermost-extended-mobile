// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {StyleSheet} from 'react-native';

import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {PostPriorityColors, PostPriorityType} from '@constants/post';
import {ICON_SIZE} from '@constants/post_draft';
import {useTheme} from '@context/theme';
import {changeOpacity} from '@utils/theme';

type Props = {
    testID?: string;
    postPriority: PostPriority;
    updatePostPriority: (postPriority: PostPriority) => void;
}

const style = StyleSheet.create({
    icon: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
    },
});

export default function EncryptionAction({
    testID,
    postPriority,
    updatePostPriority,
}: Props) {
    const theme = useTheme();

    const isEncrypted = postPriority.priority === PostPriorityType.ENCRYPTED;

    const handleToggle = useCallback(() => {
        const newPriority: PostPriority = {
            ...postPriority,
            priority: isEncrypted ? PostPriorityType.STANDARD : PostPriorityType.ENCRYPTED,
        };
        updatePostPriority(newPriority);
    }, [postPriority, isEncrypted, updatePostPriority]);

    const iconColor = isEncrypted
        ? PostPriorityColors.ENCRYPTED
        : changeOpacity(theme.centerChannelColor, 0.64);

    return (
        <TouchableWithFeedback
            testID={testID}
            onPress={handleToggle}
            style={style.icon}
            type='opacity'
        >
            <CompassIcon
                name='lock-outline'
                color={iconColor}
                size={ICON_SIZE}
            />
        </TouchableWithFeedback>
    );
}
