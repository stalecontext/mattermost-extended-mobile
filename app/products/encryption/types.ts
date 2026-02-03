// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * Encryption status for the current session
 */
export type EncryptionStatus = {
    enabled: boolean;
    can_encrypt: boolean;
    has_key: boolean;
    session_id: string;
};

/**
 * Public encryption key for a user session
 */
export type EncryptionPublicKey = {
    user_id: string;
    session_id?: string;
    public_key: string;
    create_at: number;
    update_at?: number;
};

/**
 * Request body for registering a public key
 */
export type EncryptionPublicKeyRequest = {
    public_key: string;
};

/**
 * Request body for fetching multiple users' public keys
 */
export type EncryptionPublicKeysRequest = {
    user_ids: string[];
};
