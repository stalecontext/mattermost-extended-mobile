import React, {forwardRef} from 'react';
import {
    Platform,
    requireNativeComponent,
    TextInput,
    TextInputProps,
} from 'react-native';

interface AutofillTextInputProps extends TextInputProps {
    webDomain?: string;
}

const ComponentName = 'AutofillTextInput';

const RNAutofillTextInput =
    Platform.OS === 'android'
        ? requireNativeComponent<AutofillTextInputProps>(ComponentName)
        : null;

const AutofillTextInput = forwardRef<TextInput, AutofillTextInputProps>(
    ({webDomain, ...props}, ref) => {
        const extractDomain = (url?: string) => {
            if (!url) return undefined;
            // Remove protocol
            let hostname = url.replace(/^(https?:\/\/)?(www\.)?/, '');
            // Remove path/query/hash
            hostname = hostname.split(/[/?#]/)[0];
            return hostname;
        };

        const domain = extractDomain(webDomain);

        if (Platform.OS === 'android' && RNAutofillTextInput) {
            return (
                <RNAutofillTextInput
                    {...props}
                    webDomain={domain}
                    ref={ref as any}
                />
            );
        }

        return <TextInput {...props} ref={ref} />;
    },
);

AutofillTextInput.displayName = 'AutofillTextInput';

export default AutofillTextInput;