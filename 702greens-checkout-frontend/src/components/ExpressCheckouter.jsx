import React, { useState } from 'react';
import { ExpressCheckoutElement, useStripe, useElements } from '@stripe/react-stripe-js';

export default function ExpressCheckouter({ isSetupMode }) {
    const stripe = useStripe();
    const elements = useElements();
    const [errorMessage, setErrorMessage] = useState(null);

    const onConfirm = async (event) => {
        if (!stripe || !elements) {
            return;
        }

        const { error } = isSetupMode
            ? await stripe.confirmSetup({
                elements,
                confirmParams: {
                    return_url: window.location.origin + '/success',
                },
            })
            : await stripe.confirmPayment({
                elements,
                confirmParams: {
                    return_url: window.location.origin + '/success',
                },
            });

        if (error) {
            setErrorMessage(error.message);
        }
    };

    return (
        <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ marginBottom: '1rem', textAlign: 'center', color: '#6b7280', fontSize: '0.875rem' }}>
                Express checkout
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
                <ExpressCheckoutElement
                    onConfirm={onConfirm}
                    options={{ buttonTheme: { applePay: 'black', googlePay: 'black' }, height: 48 }}
                />
            </div>
            {errorMessage && (
                <div style={{ padding: '0.75rem', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '0.375rem', marginBottom: '1rem', textAlign: 'center', fontSize: '0.875rem' }}>
                    {errorMessage}
                </div>
            )}
            <div style={{ marginBottom: '1.5rem', textAlign: 'center', color: '#6b7280', fontSize: '0.8rem', lineHeight: '1.4' }}>
                By continuing with your payment, you agree to the future charges listed on this page and the cancellation policy.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }}></div>
                <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>OR</div>
                <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }}></div>
            </div>
        </div>
    );
}
