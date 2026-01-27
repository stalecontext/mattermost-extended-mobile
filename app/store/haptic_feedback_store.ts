// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BehaviorSubject} from 'rxjs';

/**
 * HapticFeedbackStore
 *
 * Ephemeral store for haptic feedback preference.
 * Allows synchronous access to the preference value for the hapticFeedback utility function.
 */
class HapticFeedbackStore {
    private enabled$ = new BehaviorSubject<boolean>(true);

    /**
     * Set the haptic feedback enabled state
     */
    setEnabled(enabled: boolean) {
        this.enabled$.next(enabled);
    }

    /**
     * Get the current haptic feedback enabled state
     */
    isEnabled(): boolean {
        return this.enabled$.value;
    }

    /**
     * Observe changes to the haptic feedback enabled state
     */
    observeEnabled() {
        return this.enabled$.asObservable();
    }
}

export default new HapticFeedbackStore();
