// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchChannelFollowers} from '@read_receipts/actions/remote';
import React, {useCallback, useEffect, useState} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {FlatList, Text, View} from 'react-native';

import Loading from '@components/loading';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import BottomSheet from '@screens/bottom_sheet';
import ReaderItem from '@screens/post_readers/reader_item';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type {Reader} from '@read_receipts/types';

const messages = defineMessages({
    title: {
        id: 'read_receipts.channel_readers_title',
        defaultMessage: 'Following',
    },
    noReaders: {
        id: 'read_receipts.no_channel_readers',
        defaultMessage: 'No one is following this channel',
    },
});

type Props = {
    channelId: string;
    teammateNameDisplay: string;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        color: changeOpacity(theme.centerChannelColor, 0.56),
        ...typography('Body', 200),
    },
    listContent: {
        paddingBottom: 20,
    },
}));

function ChannelReaders({channelId, teammateNameDisplay}: Props) {
    const theme = useTheme();
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const isTablet = useIsTablet();
    const styles = getStyleSheet(theme);

    const [loading, setLoading] = useState(true);
    const [readers, setReaders] = useState<Reader[]>([]);

    useEffect(() => {
        const loadReaders = async () => {
            setLoading(true);
            const result = await fetchChannelFollowers(serverUrl, channelId);
            if (result.followers) {
                setReaders(result.followers.readers);
            }
            setLoading(false);
        };

        loadReaders();
    }, [serverUrl, channelId]);

    const renderReader = useCallback(({item}: {item: Reader}) => (
        <ReaderItem
            reader={item}
            teammateNameDisplay={teammateNameDisplay}
        />
    ), [teammateNameDisplay]);

    const keyExtractor = useCallback((item: Reader) => item.user_id, []);

    const renderContent = useCallback(() => {
        if (loading) {
            return (
                <View style={styles.loadingContainer}>
                    <Loading color={theme.buttonBg}/>
                </View>
            );
        }

        if (readers.length === 0) {
            return (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>
                        {intl.formatMessage(messages.noReaders)}
                    </Text>
                </View>
            );
        }

        const ListComponent = isTablet ? FlatList : require('@gorhom/bottom-sheet').BottomSheetFlatList;

        return (
            <ListComponent
                data={readers}
                renderItem={renderReader}
                keyExtractor={keyExtractor}
                contentContainerStyle={styles.listContent}
            />
        );
    }, [loading, readers, isTablet, renderReader, keyExtractor, intl, styles, theme.buttonBg]);

    return (
        <BottomSheet
            renderContent={renderContent}
            closeButtonId='close-channel-readers'
            componentId={Screens.CHANNEL_READERS}
            initialSnapIndex={1}
            snapPoints={[1, '50%', '80%']}
            testID='channel_readers'
        />
    );
}

export default ChannelReaders;
