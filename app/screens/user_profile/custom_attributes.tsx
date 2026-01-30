// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {View, StyleSheet, type ListRenderItem, type LayoutChangeEvent} from 'react-native';
import {FlatList} from 'react-native-gesture-handler';

import UserProfileLabel from './label';

import type {CustomAttribute} from '@typings/api/custom_profile_attributes';

type Props = {
    nickname?: string;
    position?: string;
    localTime?: string;
    customAttributes?: CustomAttribute[];
}

const renderAttribute: ListRenderItem<CustomAttribute> = ({item}) => (
    <UserProfileLabel
        title={item.name}
        description={item.value}
        testID={`custom_attribute.${item.id}`}
        type={item.type}
    />
);

const CustomAttributes = ({nickname, position, localTime, customAttributes}: Props) => {
    const {formatMessage} = useIntl();
    const [scrollEnabled, setScrollEnabled] = useState(false);
    const contentHeight = useRef(0);
    const layoutHeight = useRef(0);

    const updateScrollEnabled = () => {
        setScrollEnabled(contentHeight.current > layoutHeight.current);
    };

    const handleContentSizeChange = (w: number, h: number) => {
        contentHeight.current = h;
        updateScrollEnabled();
    };

    const handleLayout = (e: LayoutChangeEvent) => {
        layoutHeight.current = e.nativeEvent.layout.height;
        updateScrollEnabled();
    };

    // Combine standard and custom attributes
    const mergeAttributes: CustomAttribute[] = [];
    if (nickname) {
        mergeAttributes.push({
            id: 'nickname',
            name: formatMessage({id: 'channel_info.nickname', defaultMessage: 'Nickname'}),
            type: 'text',
            value: nickname,
        });
    }
    if (position) {
        mergeAttributes.push({
            id: 'position',
            name: formatMessage({id: 'channel_info.position', defaultMessage: 'Position'}),
            type: 'text',
            value: position,
        });
    }
    if (localTime) {
        mergeAttributes.push({
            id: 'local_time',
            name: formatMessage({id: 'channel_info.local_time', defaultMessage: 'Local Time'}),
            type: 'text',
            value: localTime,
        });
    }
    mergeAttributes.push(...(customAttributes ?? []));

    // remove any empty objects
    const attributes: CustomAttribute[] = mergeAttributes.filter((v: CustomAttribute) => v && Object.entries(v).length !== 0);
    return (
        <View style={styles.container}>
            <FlatList
                data={attributes}
                renderItem={renderAttribute}
                showsVerticalScrollIndicator={scrollEnabled}
                scrollEnabled={scrollEnabled}
                removeClippedSubviews={true}
                onContentSizeChange={handleContentSizeChange}
                onLayout={handleLayout}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: 12,
        flex: 1,
    },
});

export default CustomAttributes;
