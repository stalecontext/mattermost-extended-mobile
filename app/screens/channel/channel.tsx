// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {reportChannelView} from '@read_receipts/actions/remote';
import ReadReceiptsStore from '@read_receipts/store/read_receipts_store';
import SwipeContainer from '@swipe_navigation/components/swipe_container';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Platform, type LayoutChangeEvent, StyleSheet} from 'react-native';
import {KeyboardProvider} from 'react-native-keyboard-controller';
import {type Edge, SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';

import {storeLastViewedChannelIdAndServer, removeLastViewedChannelIdAndServer} from '@actions/app/global';
import FloatingCallContainer from '@calls/components/floating_call_container';
import FreezeScreen from '@components/freeze_screen';
import {useServerUrl} from '@context/server';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {useChannelSwitch} from '@hooks/channel_switch';
import {useIsTablet} from '@hooks/device';
import {useDefaultHeaderHeight} from '@hooks/header';
import {useTeamSwitch} from '@hooks/team_switch';
import {useIsScreenVisible} from '@hooks/use_screen_visibility';
import SecurityManager from '@managers/security_manager';
import {popTopScreen} from '@screens/navigation';
import EphemeralStore from '@store/ephemeral_store';

import ChannelContent from './channel_content';
import ChannelHeader from './header';
import useGMasDMNotice from './use_gm_as_dm_notice';

import type PreferenceModel from '@typings/database/models/servers/preference';
import type {AvailableScreens} from '@typings/screens/navigation';

type ChannelProps = {
    channelId: string;
    componentId?: AvailableScreens;
    showJoinCallBanner: boolean;
    isInACall: boolean;
    isCallsEnabledInChannel: boolean;
    groupCallsAllowed: boolean;
    showIncomingCalls: boolean;
    isTabletView?: boolean;
    dismissedGMasDMNotice: PreferenceModel[];
    currentUserId: string;
    channelType: ChannelType;
    hasGMasDMFeature: boolean;
    includeBookmarkBar?: boolean;
    includeChannelBanner: boolean;
    scheduledPostCount: number;
    onSwipeBack?: () => void;
};

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
});

const Channel = ({
    channelId,
    componentId,
    showJoinCallBanner,
    isInACall,
    isCallsEnabledInChannel,
    groupCallsAllowed,
    showIncomingCalls,
    isTabletView,
    dismissedGMasDMNotice,
    channelType,
    currentUserId,
    hasGMasDMFeature,
    includeBookmarkBar,
    includeChannelBanner,
    scheduledPostCount,
    onSwipeBack,
}: ChannelProps) => {
    useGMasDMNotice(currentUserId, channelType, dismissedGMasDMNotice, hasGMasDMFeature);
    const isTablet = useIsTablet();
    const serverUrl = useServerUrl();
    const insets = useSafeAreaInsets();
    const [shouldRenderPosts, setShouldRenderPosts] = useState(false);
    const switchingTeam = useTeamSwitch();
    const switchingChannels = useChannelSwitch();
    const defaultHeight = useDefaultHeaderHeight();
    const [containerHeight, setContainerHeight] = useState(0);
    const shouldRender = !switchingTeam && !switchingChannels && shouldRenderPosts && Boolean(channelId);
    const isVisible = useIsScreenVisible(componentId);
    const [isEmojiSearchFocused, setIsEmojiSearchFocused] = useState(false);

    const safeAreaViewEdges: Edge[] = useMemo(() => {
        // Use isTabletView prop if provided, otherwise use detected isTablet
        const useTabletLayout = isTabletView ?? isTablet;

        // On phones with swipe navigation (onSwipeBack provided), always include bottom edge
        // for proper home indicator padding
        if (onSwipeBack) {
            if (isEmojiSearchFocused) {
                return ['left', 'right'];
            }
            return ['left', 'right', 'bottom'];
        }
        if (useTabletLayout) {
            return ['left', 'right'];
        }
        if (isEmojiSearchFocused) {
            return ['left', 'right'];
        }
        return ['left', 'right', 'bottom'];
    }, [isTablet, isTabletView, isEmojiSearchFocused, onSwipeBack]);

    const handleBack = useCallback(() => {
        if (onSwipeBack) {
            onSwipeBack();
        } else {
            popTopScreen(componentId);
        }
    }, [componentId, onSwipeBack]);

    useAndroidHardwareBackHandler(componentId, handleBack);

    const useTabletLayoutForMargin = isTabletView ?? isTablet;
    const marginTop = defaultHeight + (useTabletLayoutForMargin ? 0 : -insets.top);
    useEffect(() => {
        // This is done so that the header renders
        // and the screen does not look totally blank
        const raf = requestAnimationFrame(() => {
            setShouldRenderPosts(Boolean(channelId));
        });

        // This is done to give time to the WS event
        const t = setTimeout(() => {
            EphemeralStore.removeSwitchingToChannel(channelId);
        }, 500);

        storeLastViewedChannelIdAndServer(channelId);

        // Report channel view for read receipts plugin (silent, non-blocking)
        const permissions = ReadReceiptsStore.getPermissions(serverUrl);
        if (permissions.can_view_receipts && permissions.enable_last_seen) {
            reportChannelView(serverUrl, channelId);
        }

        return () => {
            cancelAnimationFrame(raf);
            clearTimeout(t);
            removeLastViewedChannelIdAndServer();
            EphemeralStore.removeSwitchingToChannel(channelId);
        };
    }, [channelId, serverUrl]);

    const onLayout = useCallback((e: LayoutChangeEvent) => {
        setContainerHeight(e.nativeEvent.layout.height);
    }, []);

    const showFloatingCallContainer = showJoinCallBanner || isInACall || showIncomingCalls;

    const channelContent = (
        <>
            <ChannelHeader
                channelId={channelId}
                componentId={componentId}
                callsEnabledInChannel={isCallsEnabledInChannel}
                groupCallsAllowed={groupCallsAllowed}
                isTabletView={isTabletView}
                shouldRenderBookmarks={shouldRender}
                shouldRenderChannelBanner={includeChannelBanner}
            />
            {Platform.OS === 'ios' ? (
                <KeyboardProvider>
                    {shouldRender && (
                        <ChannelContent
                            channelId={channelId}
                            channelType={channelType}
                            marginTop={marginTop}
                            scheduledPostCount={scheduledPostCount}
                            containerHeight={containerHeight}
                            enabled={isVisible || shouldRender}
                            onEmojiSearchFocusChange={setIsEmojiSearchFocused}
                        />
                    )}
                </KeyboardProvider>
            ) : (
                shouldRender && (
                    <ChannelContent
                        channelId={channelId}
                        channelType={channelType}
                        marginTop={marginTop}
                        scheduledPostCount={scheduledPostCount}
                        containerHeight={containerHeight}
                        enabled={isVisible || shouldRender}
                        onEmojiSearchFocusChange={setIsEmojiSearchFocused}
                    />
                )
            )}
            {showFloatingCallContainer && shouldRender &&
                <FloatingCallContainer
                    channelId={channelId}
                    showJoinCallBanner={showJoinCallBanner}
                    showIncomingCalls={showIncomingCalls}
                    isInACall={isInACall}
                    includeBookmarkBar={includeBookmarkBar}
                    includeChannelBanner={includeChannelBanner}
                />
            }
        </>
    );

    return (
        <FreezeScreen>
            <SafeAreaView
                style={styles.flex}
                mode='margin'
                edges={safeAreaViewEdges}
                testID='channel.screen'
                onLayout={onLayout}
                nativeID={componentId ? SecurityManager.getShieldScreenId(componentId) : undefined}
            >
                {isTablet || onSwipeBack ? (
                    channelContent
                ) : (
                    <SwipeContainer
                        channelId={channelId}
                        componentId={componentId}
                        onSwipeBack={handleBack}
                        enabled={!isTablet}
                    >
                        {channelContent}
                    </SwipeContainer>
                )}
            </SafeAreaView>
        </FreezeScreen>
    );
};

export default Channel;
