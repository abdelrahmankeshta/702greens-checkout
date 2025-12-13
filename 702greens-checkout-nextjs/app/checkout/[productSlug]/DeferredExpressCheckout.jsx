'use client';

import { useState } from 'react';
import { ExpressCheckoutElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Loader2 } from 'lucide-react';

const API_URL = '/api';

// Deferred Intent Express Checkout - Creates intent on user click for instant display
export default function DeferredExpressCheckout({
    total,
    currentProduct,
    selectedAddOnId,
    selectedPriceId,
    email,
    delivery,
    appliedDiscount,
    oneTimeQuantity,
    setStripeCustomerId
}) {
    const stripe = useStripe();
    const elements = useElements();
    const [errorMessage, setErrorMessage] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const onConfirm = async (event) => {
        if (!stripe || !elements || isProcessing) {
            return;
        }

        setIsProcessing(true);
        setErrorMessage(null);

        const billingDetails = event.billingDetails;

        try {
            // 1. Create the subscription/payment intent on the server
            const res = await fetch(`${API_URL}/create-subscription`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    priceId: selectedPriceId,
                    email: billingDetails?.email || email || '',
                    delivery,
                    addOnPriceIds: selectedAddOnId ? [selectedAddOnId] : [],
                    quantity: oneTimeQuantity,
                    discount: appliedDiscount
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create payment');

            // Store customer ID for webhook logging
            if (data.customerId && setStripeCustomerId) {
                setStripeCustomerId(data.customerId);
            }

            // 2. Update the customer with billing details if we have them
            if (data.customerId && billingDetails && billingDetails.email) {
                try {
                    await fetch(`${API_URL}/update-customer`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            customerId: data.customerId,
                            email: billingDetails.email,
                            name: billingDetails.name,
                            phone: billingDetails.phone,
                            address: billingDetails.address
                        })
                    });
                } catch (err) {
                    // Silently continue - don't block payment
                }
            }

            // 3. Submit the elements to collect payment method
            const { error: submitError } = await elements.submit();
            if (submitError) {
                throw new Error(submitError.message);
            }

            // 4. Confirm the payment/setup
            const confirmResult = data.isSetup
                ? await stripe.confirmSetup({
                    clientSecret: data.clientSecret,
                    confirmParams: {
                        return_url: window.location.origin + '/success',
                    },
                })
                : await stripe.confirmPayment({
                    clientSecret: data.clientSecret,
                    confirmParams: {
                        return_url: window.location.origin + '/success',
                    },
                });

            if (confirmResult.error) {
                throw new Error(confirmResult.error.message);
            }

        } catch (err) {
            console.error('[DeferredExpressCheckout] Error:', err);
            setErrorMessage(err.message);
        } finally {
            setIsProcessing(false);
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
            {isProcessing && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
                    <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: '#0f392b' }} />
                    <span style={{ marginLeft: '0.5rem', color: '#6b7280' }}>Processing...</span>
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
