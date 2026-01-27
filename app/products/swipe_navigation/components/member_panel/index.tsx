// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchChannelMembersFromPlugin} from '@member_list/actions/remote';
import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import React, {useEffect, useState, useCallback, useRef} from 'react';
import {useIntl} from 'react-intl';
import {SectionList, StyleSheet, Text, View} from 'react-native';

import Emoji from '@components/emoji';
import Loading from '@components/loading';
import ProfilePicture from '@components/profile_picture';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import NetworkManager from '@managers/network_manager';
import {observeTeammateNameDisplay} from '@queries/servers/user';
import {openUserProfileModal} from '@screens/navigation';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {displayUsername} from '@utils/user';

import {UserStatus, type MemberSection, type MemberWithStatus, type UserStatusType} from '../../types';

import type {WithDatabaseArgs} from '@typings/database/database';
import type {AvailableScreens} from '@typings/screens/navigation';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.sidebarBg,
    },
    header: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.sidebarHeaderTextColor,
    },
    headerText: {
        color: theme.sidebarHeaderTextColor,
        ...typography('Heading', 300),
    },
    sectionHeader: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: theme.sidebarBg,
    },
    sectionHeaderText: {
        color: theme.sidebarHeaderTextColor,
        ...typography('Body', 75, 'SemiBold'),
        opacity: 0.72,
    },
    memberRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    memberInfo: {
        marginLeft: 12,
        flex: 1,
    },
    memberName: {
        color: theme.sidebarText,
        ...typography('Body', 200),
    },
    memberStatusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
        gap: 4,
    },
    memberStatusText: {
        color: theme.sidebarText,
        ...typography('Body', 75),
        opacity: 0.64,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        color: theme.sidebarText,
        ...typography('Body', 200),
        textAlign: 'center',
        paddingHorizontal: 16,
        marginTop: 20,
        opacity: 0.72,
    },
}));

type MemberPanelProps = {
    channelId: string;
    componentId?: AvailableScreens;
    onMemberPress?: () => void;
    teammateNameDisplay?: string;
};

const MemberPanel = ({
    channelId,
    componentId,
    onMemberPress,
    teammateNameDisplay = 'username',
}: MemberPanelProps) => {
    const intl = useIntl();
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const styles = getStyleSheet(theme);

    const [members, setMembers] = useState<MemberWithStatus[]>([]);
    const [loading, setLoading] = useState(true);
    const isMounted = useRef(true);

    const fetchMembers = useCallback(async () => {
        try {
            const client = NetworkManager.getClient(serverUrl);
            const {data, error} = await fetchChannelMembersFromPlugin(client, channelId, 0, 200);

            if (!isMounted.current) {
                return;
            }

            if (error || !data) {
                setLoading(false);
                return;
            }

            // Map plugin response to MemberWithStatus
            const mappedMembers: MemberWithStatus[] = data.members.map((member) => ({
                id: member.user_id,
                username: member.username,
                nickname: member.nickname,
                firstName: member.first_name,
                lastName: member.last_name,
                status: (member.status as UserStatusType) || UserStatus.Offline,
                lastPictureUpdate: 0, // Not provided by plugin
                customStatus: member.custom_status ? {
                    emoji: member.custom_status.emoji,
                    text: member.custom_status.text,
                } : undefined,
            }));

            // Sort by status (online first, then offline)
            const sortedMembers = mappedMembers.sort((a, b) => {
                const statusOrder = {
                    [UserStatus.Online]: 0,
                    [UserStatus.Away]: 1,
                    [UserStatus.Dnd]: 2,
                    [UserStatus.Offline]: 3,
                };
                return statusOrder[a.status] - statusOrder[b.status];
            });

            setMembers(sortedMembers);
        } catch {
            // Silently handle errors
        } finally {
            if (isMounted.current) {
                setLoading(false);
            }
        }
    }, [serverUrl, channelId]);

    // Fetch members on mount and when channelId changes
    useEffect(() => {
        isMounted.current = true;
        setLoading(true);
        fetchMembers();

        return () => {
            isMounted.current = false;
        };
    }, [fetchMembers]);

    const handleMemberPress = useCallback((member: MemberWithStatus) => {
        openUserProfileModal(intl, theme, {
            userId: member.id,
            location: componentId ?? Screens.CHANNEL,
        });
        onMemberPress?.();
    }, [intl, theme, componentId, onMemberPress]);

    const sections: MemberSection[] = React.useMemo(() => {
        const online: MemberWithStatus[] = [];
        const offline: MemberWithStatus[] = [];

        members.forEach((member) => {
            if (member.status === UserStatus.Online ||
                member.status === UserStatus.Away ||
                member.status === UserStatus.Dnd) {
                online.push(member);
            } else {
                offline.push(member);
            }
        });

        const result: MemberSection[] = [];

        if (online.length > 0) {
            result.push({
                title: intl.formatMessage(
                    {id: 'swipe_navigation.member_panel.online', defaultMessage: 'Online - {count}'},
                    {count: online.length},
                ),
                data: online,
            });
        }

        if (offline.length > 0) {
            result.push({
                title: intl.formatMessage(
                    {id: 'swipe_navigation.member_panel.offline', defaultMessage: 'Offline - {count}'},
                    {count: offline.length},
                ),
                data: offline,
            });
        }

        return result;
    }, [members, intl]);

    const renderSectionHeader = useCallback(({section}: {section: MemberSection}) => (
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>
                {section.title}
            </Text>
        </View>
    ), [styles]);

    const renderItem = useCallback(({item}: {item: MemberWithStatus}) => {
        const displayName = displayUsername(
            {
                id: item.id,
                username: item.username,
                nickname: item.nickname,
                first_name: item.firstName,
                last_name: item.lastName,
            } as UserProfile,
            intl.locale,
            teammateNameDisplay,
        );

        const hasCustomStatus = item.customStatus && (item.customStatus.emoji || item.customStatus.text);

        return (
            <TouchableWithFeedback
                onPress={() => handleMemberPress(item)}
                style={styles.memberRow}
                type='opacity'
            >
                <ProfilePicture
                    author={{
                        id: item.id,
                        status: item.status,
                    } as UserProfile}
                    size={32}
                    showStatus={true}
                    statusSize={12}
                />
                <View style={styles.memberInfo}>
                    <Text
                        style={styles.memberName}
                        numberOfLines={1}
                    >
                        {displayName || item.username}
                    </Text>
                    {hasCustomStatus && (
                        <View style={styles.memberStatusRow}>
                            {item.customStatus?.emoji && (
                                <Emoji
                                    emojiName={item.customStatus.emoji}
                                    size={14}
                                />
                            )}
                            {item.customStatus?.text && (
                                <Text
                                    style={styles.memberStatusText}
                                    numberOfLines={1}
                                >
                                    {item.customStatus.text}
                                </Text>
                            )}
                        </View>
                    )}
                </View>
            </TouchableWithFeedback>
        );
    }, [intl.locale, teammateNameDisplay, styles, handleMemberPress]);

    const keyExtractor = useCallback((item: MemberWithStatus) => item.id, []);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerText}>
                    {intl.formatMessage(
                        {id: 'swipe_navigation.member_panel.title', defaultMessage: 'Members ({count})'},
                        {count: members.length},
                    )}
                </Text>
            </View>
            {loading ? (
                <View style={styles.loadingContainer}>
                    <Loading color={theme.sidebarText}/>
                </View>
            ) : (
                <SectionList
                    sections={sections}
                    renderSectionHeader={renderSectionHeader}
                    renderItem={renderItem}
                    keyExtractor={keyExtractor}
                    stickySectionHeadersEnabled={true}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>
                            {intl.formatMessage({
                                id: 'swipe_navigation.member_panel.no_members',
                                defaultMessage: 'No members found',
                            })}
                        </Text>
                    }
                />
            )}
        </View>
    );
};

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => ({
    teammateNameDisplay: observeTeammateNameDisplay(database),
}));

export default withDatabase(enhanced(MemberPanel));
