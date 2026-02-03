// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {defineMessages} from 'react-intl';

import Tag from '@components/tag';
import {PostPriorityType} from '@constants/post';

type Props = {
    label: PostPriority['priority'];
};

const messages = defineMessages({
    urgent: {
        id: 'post_priority.label.urgent',
        defaultMessage: 'URGENT',
    },
    important: {
        id: 'post_priority.label.important',
        defaultMessage: 'IMPORTANT',
    },
    encrypted: {
        id: 'post_priority.label.encrypted',
        defaultMessage: 'ENCRYPTED',
    },
});

const PostPriorityLabel = ({label}: Props) => {
    if (label === PostPriorityType.STANDARD) {
        return null;
    }

    if (label === PostPriorityType.ENCRYPTED) {
        return (
            <Tag
                message={messages.encrypted}
                icon='lock-outline'
                type='encrypted'
                size='xs'
                testID='encrypted_post_priority_label'
                uppercase={true}
            />
        );
    }

    const isUrgent = label === PostPriorityType.URGENT; // else it is important

    return (
        <Tag
            message={isUrgent ? messages.urgent : messages.important}
            icon={isUrgent ? 'alert-outline' : 'alert-circle-outline'}
            type={isUrgent ? 'danger' : 'info'}
            size='xs'
            testID={`${label}_post_priority_label`}
            uppercase={true}
        />
    );
};

export default PostPriorityLabel;
