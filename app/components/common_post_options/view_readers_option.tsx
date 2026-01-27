// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Keyboard} from 'react-native';

import {BaseOption} from '@components/common_post_options';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {bottomSheetModalOptions, dismissBottomSheet, showModal, showModalOverCurrentContext} from '@screens/navigation';

import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    bottomSheetId: AvailableScreens;
    postId: string;
    location: AvailableScreens;
};

const messages = defineMessages({
    viewReaders: {
        id: 'read_receipts.view_readers',
        defaultMessage: 'View who read this',
    },
});

const ViewReadersOption = ({bottomSheetId, postId, location}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const isTablet = useIsTablet();

    const handlePress = useCallback(async () => {
        await dismissBottomSheet(bottomSheetId);

        Keyboard.dismiss();
        const screen = Screens.POST_READERS;
        const passProps = {
            postId,
            location,
        };
        const title = isTablet ? intl.formatMessage(messages.viewReaders) : '';

        if (isTablet) {
            showModal(screen, title, passProps, bottomSheetModalOptions(theme, 'close-post-readers'));
        } else {
            showModalOverCurrentContext(screen, passProps, bottomSheetModalOptions(theme));
        }
    }, [bottomSheetId, postId, location, isTablet, intl, theme]);

    return (
        <BaseOption
            message={messages.viewReaders}
            iconName='eye-outline'
            onPress={handlePress}
            testID='post_options.view_readers.option'
        />
    );
};

export default ViewReadersOption;
