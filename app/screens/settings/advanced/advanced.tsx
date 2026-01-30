// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {Alert, TouchableOpacity} from 'react-native';

import {setExtraSessionProps} from '@actions/remote/entry/common';
import SettingContainer from '@components/settings/container';
import SettingOption from '@components/settings/option';
import SettingSeparator from '@components/settings/separator';
import {Screens} from '@constants';
import {useServerUrl} from '@context/server';
import DatabaseManager from '@database/manager';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {usePreventDoubleTap} from '@hooks/utils';
import PushNotifications from '@init/push_notifications';
import {goToScreen, popTopScreen} from '@screens/navigation';
import {gotoSettingsScreen} from '@screens/settings/config';
import {deleteFileCache, getAllFilesInCachesDirectory, getFormattedFileSize} from '@utils/file';
import {logDebug} from '@utils/log';

import type {AvailableScreens} from '@typings/screens/navigation';
import type {FileInfo} from 'expo-file-system';

const EMPTY_FILES: FileInfo[] = [];

type AdvancedSettingsProps = {
    componentId: AvailableScreens;
    isDevMode: boolean;
};
const AdvancedSettings = ({
    componentId,
    isDevMode,
}: AdvancedSettingsProps) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const [dataSize, setDataSize] = useState<number | undefined>(0);
    const [files, setFiles] = useState<FileInfo[]>(EMPTY_FILES);

    const getAllCachedFiles = useCallback(async () => {
        const {totalSize = 0, files: cachedFiles} = await getAllFilesInCachesDirectory(serverUrl);
        setDataSize(totalSize);
        setFiles(cachedFiles || EMPTY_FILES);
    }, [serverUrl]);

    const onPressDeleteData = usePreventDoubleTap(useCallback(async () => {
        try {
            if (files.length > 0) {
                const {formatMessage} = intl;

                Alert.alert(
                    formatMessage({id: 'settings.advanced.delete_data', defaultMessage: 'Delete local files'}),
                    formatMessage({
                        id: 'settings.advanced.delete_message.confirmation',
                        defaultMessage: '\nThis will delete all files downloaded through the app for this server. Please confirm to proceed.\n',
                    }),
                    [
                        {text: formatMessage({id: 'settings.advanced.cancel', defaultMessage: 'Cancel'}), style: 'cancel'},
                        {
                            text: formatMessage({id: 'settings.advanced.delete', defaultMessage: 'Delete'}),
                            style: 'destructive',
                            onPress: async () => {
                                await deleteFileCache(serverUrl);
                                getAllCachedFiles();
                            },
                        },
                    ],
                    {cancelable: false},
                );
            }
        } catch (e) {
            //do nothing
        }
    }, [files.length, getAllCachedFiles, intl, serverUrl]));

    const onPressHapticFeedback = usePreventDoubleTap(useCallback(() => {
        const screen = Screens.SETTINGS_HAPTIC_FEEDBACK;
        const title = intl.formatMessage({id: 'settings.advanced.haptic_feedback', defaultMessage: 'Haptic Feedback'});

        gotoSettingsScreen(screen, title);
    }, [intl]));

    const onPressComponentLibrary = useCallback(() => {
        const screen = Screens.COMPONENT_LIBRARY;
        const title = intl.formatMessage({id: 'settings.advanced_settings.component_library', defaultMessage: 'Component library'});

        goToScreen(screen, title);
    }, [intl]);

    const onPressReregisterNotifications = usePreventDoubleTap(useCallback(async () => {
        try {
            const {formatMessage} = intl;

            Alert.alert(
                formatMessage({id: 'settings.advanced.reregister_notifications', defaultMessage: 'Re-register Push Notifications'}),
                formatMessage({
                    id: 'settings.advanced.reregister_notifications.confirmation',
                    defaultMessage: 'This will re-register your device for push notifications. Please confirm to proceed.',
                }),
                [
                    {text: formatMessage({id: 'settings.advanced.cancel', defaultMessage: 'Cancel'}), style: 'cancel'},
                    {
                        text: formatMessage({id: 'settings.advanced.reregister', defaultMessage: 'Re-register'}),
                        onPress: async () => {
                            // Step 1: Re-register with Firebase/APNS
                            await PushNotifications.registerIfNeeded();

                            // Step 2: Send device token to all connected servers
                            const serverUrls = Object.keys(DatabaseManager.serverDatabases);
                            logDebug('[AdvancedSettings] Re-registering push notifications for servers:', serverUrls);

                            // Wait a moment for the token to be generated
                            await new Promise((resolve) => setTimeout(resolve, 2000));

                            // Send to all servers
                            await Promise.all(
                                serverUrls.map((url) => setExtraSessionProps(url)),
                            );

                            Alert.alert(
                                formatMessage({id: 'settings.advanced.reregister_notifications.success_title', defaultMessage: 'Success'}),
                                formatMessage({id: 'settings.advanced.reregister_notifications.success_message', defaultMessage: 'Push notifications have been re-registered. You may need to restart the app for changes to take effect.'}),
                            );
                        },
                    },
                ],
                {cancelable: false},
            );
        } catch (e) {
            logDebug('[AdvancedSettings] Error re-registering notifications:', e);
        }
    }, [intl]));

    useEffect(() => {
        getAllCachedFiles();
    }, []);

    const close = useCallback(() => {
        popTopScreen(componentId);
    }, [componentId]);

    useAndroidHardwareBackHandler(componentId, close);

    const hasData = Boolean(dataSize && dataSize > 0);

    return (
        <SettingContainer testID='advanced_settings'>
            <React.Fragment key='delete_data'>
                <TouchableOpacity
                    onPress={onPressDeleteData}
                    disabled={!hasData}
                    activeOpacity={hasData ? 1 : 0}
                >
                    <SettingOption
                        destructive={true}
                        icon='trash-can-outline'
                        info={getFormattedFileSize(dataSize || 0)}
                        label={intl.formatMessage({id: 'settings.advanced.delete_data', defaultMessage: 'Delete local files'})}
                        testID='advanced_settings.delete_data.option'
                        type='none'
                    />
                    <SettingSeparator/>
                </TouchableOpacity>
            </React.Fragment>
            <React.Fragment key='haptic_feedback'>
                <SettingOption
                    action={onPressHapticFeedback}
                    label={intl.formatMessage({id: 'settings.advanced.haptic_feedback', defaultMessage: 'Haptic Feedback'})}
                    testID='advanced_settings.haptic_feedback.option'
                    type='arrow'
                />
                <SettingSeparator/>
            </React.Fragment>
            <React.Fragment key='reregister_notifications'>
                <TouchableOpacity
                    onPress={onPressReregisterNotifications}
                >
                    <SettingOption
                        icon='bell-ring-outline'
                        label={intl.formatMessage({id: 'settings.advanced.reregister_notifications', defaultMessage: 'Re-register Push Notifications'})}
                        testID='advanced_settings.reregister_notifications.option'
                        type='none'
                    />
                    <SettingSeparator/>
                </TouchableOpacity>
            </React.Fragment>
            {isDevMode && (
                <React.Fragment key='component_library'>
                    <TouchableOpacity
                        onPress={onPressComponentLibrary}
                    >
                        <SettingOption
                            label={intl.formatMessage({id: 'settings.advanced.component_library', defaultMessage: 'Component library'})}
                            testID='advanced_settings.component_library.option'
                            type='none'
                        />
                        <SettingSeparator/>
                    </TouchableOpacity>
                </React.Fragment>
            )}
        </SettingContainer>
    );
};

export default AdvancedSettings;
