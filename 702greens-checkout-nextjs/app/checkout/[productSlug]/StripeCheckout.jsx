'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { Loader2 } from 'lucide-react';
import DeferredExpressCheckout from './DeferredExpressCheckout';
import ExpressCheckouter from './ExpressCheckouter';
import CheckoutPaymentForm from './CheckoutPaymentForm';

// Initialize Stripe - this is lazy loaded via dynamic()
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    console.error("🚨 Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY! Payment Element will not load.");
}

export default function StripeCheckout({
    total,
    currentProduct,
    selectedAddOnId,
    selectedPriceId,
    email,
    delivery,
    appliedDiscount,
    oneTimeQuantity,
    clientSecret,
    isSetupMode,
    stripeCustomerId,
    setStripeCustomerId,
    billingAddress,
    setBillingAddress,
    sameAsShipping,
    setSameAsShipping,
    onCapture,
    onValidate,
    loading
}) {
    const stripeAppearance = {
        theme: 'stripe',
        variables: {
            colorPrimary: '#0f392b',
            colorBackground: '#ffffff',
            colorText: '#0f392b',
            borderRadius: '10px',
        }
    };

    return (
        <>
            {/* Express Checkout - Deferred Intent Pattern for instant loading */}
            {currentProduct && total > 0 ? (
                <Elements
                    key={`express-deferred-${total}-${currentProduct.interval}`}
                    stripe={stripePromise}
                    options={{
                        mode: currentProduct.interval === 'one_time' ? 'payment' : 'subscription',
                        amount: Math.round(total * 100),
                        currency: 'usd',
                        appearance: stripeAppearance,
                        paymentMethodOrder: ['apple_pay', 'google_pay', 'link'],
                    }}
                >
                    <div style={{ marginBottom: '1.5rem' }}>
                        <DeferredExpressCheckout
                            total={total}
                            currentProduct={currentProduct}
                            selectedAddOnId={selectedAddOnId}
                            selectedPriceId={selectedPriceId}
                            email={email}
                            delivery={delivery}
                            appliedDiscount={appliedDiscount}
                            oneTimeQuantity={oneTimeQuantity}
                            setStripeCustomerId={setStripeCustomerId}
                        />
                    </div>
                </Elements>
            ) : total === 0 && currentProduct ? (
                // $0 checkout - use regular flow with clientSecret
                clientSecret ? (
                    <Elements
                        key={`express-${clientSecret}`}
                        stripe={stripePromise}
                        options={{
                            clientSecret,
                            appearance: stripeAppearance,
                        }}
                    >
                        <div style={{ marginBottom: '1.5rem' }}>
                            <ExpressCheckouter isSetupMode={isSetupMode} stripeCustomerId={stripeCustomerId} />
                        </div>
                    </Elements>
                ) : (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100px', marginBottom: '1.5rem' }}>
                        <Loader2 size={30} style={{ animation: 'spin 1s linear infinite', color: '#9ca3af' }} />
                    </div>
                )
            ) : (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100px', marginBottom: '1.5rem' }}>
                    <Loader2 size={30} style={{ animation: 'spin 1s linear infinite', color: '#9ca3af' }} />
                </div>
            )}

            {/* Payment Section */}
            <section style={{ marginBottom: '2.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Payment</h2>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                    All transactions are secure and encrypted.
                </p>

                {clientSecret ? (
                    <div style={{
                        padding: '1.5rem',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: '#fff'
                    }}>
                        <Elements
                            key={`payment-${clientSecret}`}
                            stripe={stripePromise}
                            options={{
                                clientSecret,
                                appearance: stripeAppearance,
                                paymentMethodOrder: ['card', 'apple_pay', 'google_pay', 'link', 'cashapp', 'affirm', 'afterpay_clearpay'],
                            }}
                        >
                            <CheckoutPaymentForm
                                billingAddress={billingAddress}
                                setBillingAddress={setBillingAddress}
                                sameAsShipping={sameAsShipping}
                                isSetupMode={isSetupMode}
                                setSameAsShipping={setSameAsShipping}
                                onCapture={onCapture}
                                onValidate={onValidate}
                            />
                        </Elements>
                    </div>
                ) : (
                    <div style={{
                        padding: '2rem',
                        textAlign: 'center',
                        background: '#f9fafb',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--color-text-muted)',
                        border: '1px dashed var(--color-border)'
                    }}>
                        {loading ? 'Initializing secure checkout...' : 'Loading payment options...'}
                    </div>
                )}
            </section>
        </>
    );
}
