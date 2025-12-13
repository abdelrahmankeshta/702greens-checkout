'use client';

import { useState } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

export default function CheckoutPaymentForm({
    billingAddress,
    setBillingAddress,
    sameAsShipping,
    setSameAsShipping,
    onCapture,
    onValidate,
    isSetupMode
}) {
    const stripe = useStripe();
    const elements = useElements();

    const [isProcessing, setIsProcessing] = useState(false);
    const [message, setMessage] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!stripe || !elements) {
            return;
        }

        // Validate form before proceeding
        if (onValidate && !onValidate()) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        setIsProcessing(true);
        setMessage(null);

        let result;
        if (isSetupMode) {
            result = await stripe.confirmSetup({
                elements,
                confirmParams: {
                    return_url: window.location.origin + '/success',
                },
            });
        } else {
            result = await stripe.confirmPayment({
                elements,
                confirmParams: {
                    return_url: window.location.origin + '/success',
                },
            });
        }

        const { error } = result;

        if (error) {
            setMessage(error.message || 'Payment failed');
            setIsProcessing(false);
        }
    };

    const usStates = [
        { value: '', label: 'State' },
        { value: 'AL', label: 'Alabama' },
        { value: 'AK', label: 'Alaska' },
        { value: 'AZ', label: 'Arizona' },
        { value: 'AR', label: 'Arkansas' },
        { value: 'CA', label: 'California' },
        { value: 'CO', label: 'Colorado' },
        { value: 'CT', label: 'Connecticut' },
        { value: 'DE', label: 'Delaware' },
        { value: 'DC', label: 'District Of Columbia' },
        { value: 'FL', label: 'Florida' },
        { value: 'GA', label: 'Georgia' },
        { value: 'HI', label: 'Hawaii' },
        { value: 'ID', label: 'Idaho' },
        { value: 'IL', label: 'Illinois' },
        { value: 'IN', label: 'Indiana' },
        { value: 'IA', label: 'Iowa' },
        { value: 'KS', label: 'Kansas' },
        { value: 'KY', label: 'Kentucky' },
        { value: 'LA', label: 'Louisiana' },
        { value: 'ME', label: 'Maine' },
        { value: 'MD', label: 'Maryland' },
        { value: 'MA', label: 'Massachusetts' },
        { value: 'MI', label: 'Michigan' },
        { value: 'MN', label: 'Minnesota' },
        { value: 'MS', label: 'Mississippi' },
        { value: 'MO', label: 'Missouri' },
        { value: 'MT', label: 'Montana' },
        { value: 'NE', label: 'Nebraska' },
        { value: 'NV', label: 'Nevada' },
        { value: 'NH', label: 'New Hampshire' },
        { value: 'NJ', label: 'New Jersey' },
        { value: 'NM', label: 'New Mexico' },
        { value: 'NY', label: 'New York' },
        { value: 'NC', label: 'North Carolina' },
        { value: 'ND', label: 'North Dakota' },
        { value: 'OH', label: 'Ohio' },
        { value: 'OK', label: 'Oklahoma' },
        { value: 'OR', label: 'Oregon' },
        { value: 'PA', label: 'Pennsylvania' },
        { value: 'RI', label: 'Rhode Island' },
        { value: 'SC', label: 'South Carolina' },
        { value: 'SD', label: 'South Dakota' },
        { value: 'TN', label: 'Tennessee' },
        { value: 'TX', label: 'Texas' },
        { value: 'UT', label: 'Utah' },
        { value: 'VT', label: 'Vermont' },
        { value: 'VA', label: 'Virginia' },
        { value: 'WA', label: 'Washington' },
        { value: 'WV', label: 'West Virginia' },
        { value: 'WI', label: 'Wisconsin' },
        { value: 'WY', label: 'Wyoming' }
    ];

    return (
        <form onSubmit={handleSubmit}>
            <PaymentElement
                options={{
                    layout: 'tabs',
                    wallets: {
                        applePay: 'auto',
                        googlePay: 'auto',
                    },
                }}
            />

            {/* Billing Address Section */}
            <div style={{ marginTop: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: '#111827' }}>Billing address</h3>

                <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    marginBottom: '1rem',
                    cursor: 'pointer',
                    userSelect: 'none'
                }}>
                    <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '4px',
                        border: `1px solid ${sameAsShipping ? 'var(--color-primary)' : '#d1d5db'}`,
                        background: sameAsShipping ? 'var(--color-primary)' : '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease'
                    }}>
                        {sameAsShipping && <Check size={14} color="#fff" strokeWidth={3} />}
                    </div>
                    <input
                        type="checkbox"
                        checked={sameAsShipping}
                        onChange={(e) => {
                            setSameAsShipping(e.target.checked);
                            if (onCapture) onCapture({ sameAsShipping: e.target.checked });
                        }}
                        style={{ display: 'none' }}
                    />
                    <span style={{ fontSize: '0.95rem', color: '#374151' }}>Use shipping address as billing address</span>
                </label>

                {!sameAsShipping && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', animation: 'fadeIn 0.3s ease-in-out' }}>
                        <style>{`
                            @keyframes fadeIn {
                                from { opacity: 0; transform: translateY(-5px); }
                                to { opacity: 1; transform: translateY(0); }
                            }
                        `}</style>

                        <Select
                            label="Country/Region"
                            options={[{ value: 'US', label: 'United States' }]}
                            value={billingAddress.country}
                            onChange={(e) => setBillingAddress({ ...billingAddress, country: e.target.value })}
                        />

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <Input
                                placeholder="First name"
                                value={billingAddress.firstName}
                                onChange={(e) => setBillingAddress({ ...billingAddress, firstName: e.target.value })}
                                onBlur={() => onCapture && onCapture()}
                            />
                            <Input
                                placeholder="Last name"
                                value={billingAddress.lastName}
                                onChange={(e) => setBillingAddress({ ...billingAddress, lastName: e.target.value })}
                                onBlur={() => onCapture && onCapture()}
                            />
                        </div>

                        <Input
                            placeholder="Address"
                            value={billingAddress.address}
                            onChange={(e) => setBillingAddress({ ...billingAddress, address: e.target.value })}
                            onBlur={() => onCapture && onCapture()}
                        />

                        <Input
                            placeholder="Apartment, suite, etc. (optional)"
                            value={billingAddress.apartment}
                            onChange={(e) => setBillingAddress({ ...billingAddress, apartment: e.target.value })}
                            onBlur={() => onCapture && onCapture()}
                        />

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                            <Input
                                placeholder="City"
                                value={billingAddress.city}
                                onChange={(e) => setBillingAddress({ ...billingAddress, city: e.target.value })}
                                onBlur={() => onCapture && onCapture()}
                            />
                            <Select
                                options={usStates}
                                value={billingAddress.state}
                                onChange={(e) => {
                                    const newState = e.target.value;
                                    setBillingAddress({ ...billingAddress, state: newState });
                                    if (onCapture) onCapture({ billingAddress: { ...billingAddress, state: newState } });
                                }}
                            />
                            <Input
                                placeholder="ZIP code"
                                value={billingAddress.zip}
                                onChange={(e) => setBillingAddress({ ...billingAddress, zip: e.target.value })}
                                onBlur={() => onCapture && onCapture()}
                            />
                        </div>
                    </div>
                )}
            </div>

            {message && (
                <div style={{
                    color: '#991b1b',
                    backgroundColor: '#fee2e2',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    marginTop: '1rem',
                    fontSize: '0.875rem'
                }}>
                    {message}
                </div>
            )}

            <Button
                type="submit"
                disabled={!stripe || isProcessing}
                className="btn-place-order"
                style={{ marginTop: '1.5rem', width: '100%', height: '48px', fontWeight: 600, fontSize: '1rem', borderRadius: 'var(--radius-md)' }}
            >
                {isProcessing ? 'Processing...' : 'Place Order'}
            </Button>
        </form>
    );
}
