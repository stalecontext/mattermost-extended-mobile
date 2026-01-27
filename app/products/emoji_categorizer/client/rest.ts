// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {API_BASE} from '../constants';

import type {CategoriesData} from '../types';

export interface ClientEmojiCategorizerMix {
    getEmojiCategorizerRoute: () => string;
    getEmojiCategories: () => Promise<CategoriesData>;
}

const ClientEmojiCategorizer = (superclass: any) => class extends superclass {
    getEmojiCategorizerRoute = () => API_BASE;

    getEmojiCategories = async (): Promise<CategoriesData> => {
        return this.doFetch(
            `${this.getEmojiCategorizerRoute()}/categories`,
            {method: 'get'},
        );
    };
};

export default ClientEmojiCategorizer;
