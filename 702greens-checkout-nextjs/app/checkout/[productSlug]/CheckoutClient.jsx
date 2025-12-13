'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ChevronDown, ChevronUp, ShoppingBag, Loader2, Tag, Search, HelpCircle } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { FloatingLabelInput } from '@/components/ui/FloatingLabelInput';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

// Lazy load Stripe Elements - NOT during SSR for performance
const StripeCheckout = dynamic(() => import('./StripeCheckout'), {
    ssr: false,
    loading: () => (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100px', marginBottom: '1.5rem' }}>
            <Loader2 size={30} style={{ animation: 'spin 1s linear infinite', color: '#9ca3af' }} />
        </div>
    )
});

const API_URL = '/api';

export default function CheckoutClient({ products, initialProduct, initialPriceId, productSlug }) {
    // Products State
    const [productsLoading] = useState(false);
    const [productsError] = useState(null);

    // Form State
    const [email, setEmail] = useState('');
    const [delivery, setDelivery] = useState({
        country: 'US',
        firstName: '',
        lastName: '',
        company: '',
        address: '',
        apartment: '',
        city: '',
        state: '',
        zip: '',
        phone: '',
        smsOptIn: false
    });

    // Billing Address State
    const [sameAsShipping, setSameAsShipping] = useState(true);
    const [billingAddress, setBillingAddress] = useState({
        country: 'US',
        firstName: '',
        lastName: '',
        company: '',
        address: '',
        apartment: '',
        city: '',
        state: '',
        zip: '',
        phone: ''
    });

    const [selectedPriceId, setSelectedPriceId] = useState(initialPriceId);

    // Payment State
    const [clientSecret, setClientSecret] = useState('');
    const [isSetupMode, setIsSetupMode] = useState(false);
    const [stripeCustomerId, setStripeCustomerId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showSummaryMobile, setShowSummaryMobile] = useState(false);
    const [shippingLoading, setShippingLoading] = useState(false);
    const prevAddressComplete = useRef(false);

    // Add-on State
    const [selectedAddOnId, setSelectedAddOnId] = useState(null);
    const [oneTimeQuantity, setOneTimeQuantity] = useState(1);

    // Discount State
    const [discountCode, setDiscountCode] = useState('');
    const [appliedDiscount, setAppliedDiscount] = useState(null);
    const [discountError, setDiscountError] = useState('');
    const [discountLoading, setDiscountLoading] = useState(false);

    // Tooltip State
    const [showTooltip, setShowTooltip] = useState(false);

    // Validation State
    const [errors, setErrors] = useState({});

    // Shipping loading effect
    useEffect(() => {
        const isAddressComplete = delivery.address?.trim() && delivery.city?.trim() && delivery.state && delivery.zip?.trim();

        if (isAddressComplete && !prevAddressComplete.current) {
            setShippingLoading(true);
            const timer = setTimeout(() => {
                setShippingLoading(false);
            }, 1000);
            return () => clearTimeout(timer);
        }

        prevAddressComplete.current = !!isAddressComplete;
    }, [delivery.address, delivery.city, delivery.state, delivery.zip]);

    // Debounced Lead Capture
    const debouncedCapture = useCallback((data) => {
        const handler = setTimeout(() => {
            if (data.email) {
                fetch(`/api/capture-lead`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                }).catch(console.error);
            }
        }, 800);
        return () => clearTimeout(handler);
    }, []);

    const captureTimeoutRef = useRef(null);

    const triggerCapture = (overrides = {}) => {
        if (captureTimeoutRef.current) {
            captureTimeoutRef.current();
        }
        const data = {
            email,
            ...delivery,
            billingAddress: sameAsShipping ? null : billingAddress,
            sameAsShipping,
            ...overrides
        };
        captureTimeoutRef.current = debouncedCapture(data);
    };

    // Initialize Checkout
    const initializeCheckout = async () => {
        if (!selectedPriceId) return;

        try {
            setLoading(true);
            setError(null);
            setClientSecret('');

            const res = await fetch(`/api/create-subscription`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    priceId: selectedPriceId,
                    email,
                    delivery,
                    addOnPriceIds: selectedAddOnId ? [selectedAddOnId] : [],
                    quantity: oneTimeQuantity,
                    discount: appliedDiscount
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to initialize checkout');

            setClientSecret(data.clientSecret);
            setIsSetupMode(data.isSetup === true);
            if (data.customerId) {
                setStripeCustomerId(data.customerId);
            }
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Initialize on mount
    useEffect(() => {
        if (selectedPriceId && !clientSecret) {
            initializeCheckout();
        }
    }, [selectedPriceId]);

    // Re-initialize when discount changes
    useEffect(() => {
        if (!selectedPriceId) return;
        if (clientSecret && !appliedDiscount) return;

        const timeoutId = setTimeout(() => {
            initializeCheckout();
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [appliedDiscount, oneTimeQuantity]);

    // Get current product
    const currentProduct = products.find(p => p.id === selectedPriceId) || initialProduct;
    const selectedAddOnProduct = null; // Add-ons disabled currently

    // Calculate totals
    let subtotal = 0;
    if (currentProduct) {
        if (currentProduct.interval === 'one_time') {
            subtotal += currentProduct.price * oneTimeQuantity;
        } else {
            subtotal += currentProduct.price;
        }
    }

    // Calculate discount
    let discountAmount = 0;
    if (appliedDiscount) {
        if (appliedDiscount.discountMethod === 'percentage') {
            discountAmount = subtotal * (appliedDiscount.discountValue / 100);
        } else if (appliedDiscount.discountMethod === 'fixed_amount') {
            discountAmount = appliedDiscount.discountValue;
        }
    }

    const total = Math.max(0, subtotal - discountAmount);

    // Recurring calculation
    let recurringSubtotal = 0;
    let recurringIntervalText = '';

    const recurringProduct = [currentProduct, selectedAddOnProduct].find(p => p && p.interval !== 'one_time');

    if (recurringProduct) {
        const count = recurringProduct.interval_count || 1;
        const unit = recurringProduct.interval === 'month' ? 'month' : 'week';
        const unitPlural = count > 1 ? `${unit}s` : unit;
        recurringIntervalText = `every ${count} ${unitPlural}`;
    }

    if (currentProduct && currentProduct.interval !== 'one_time') {
        recurringSubtotal += currentProduct.price;
    }

    // Validate Discount Code
    const validateDiscountCode = async () => {
        if (!discountCode.trim()) {
            setDiscountError('Please enter a discount code');
            return;
        }

        setDiscountLoading(true);
        setDiscountError('');

        try {
            const [res] = await Promise.all([
                fetch(`/api/validate-discount`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code: discountCode, orderTotal: subtotal })
                }),
                new Promise(resolve => setTimeout(resolve, 1000))
            ]);

            const data = await res.json();

            if (!data.valid) {
                setDiscountError(data.error || 'Invalid discount code');
                setAppliedDiscount(null);
            } else {
                setAppliedDiscount(data.discount);
                setDiscountError('');
            }
        } catch (err) {
            console.error('Error validating discount:', err);
            setDiscountError('Failed to validate code');
        } finally {
            setDiscountLoading(false);
        }
    };

    // Google Maps Autocomplete - Deferred Loading
    const addressInputRef = useRef(null);
    const autocompleteRef = useRef(null);
    const [mapsLoaded, setMapsLoaded] = useState(false);

    const loadGoogleMapsOnFocus = useCallback(() => {
        if (mapsLoaded) return;
        setMapsLoaded(true);
    }, [mapsLoaded]);

    useEffect(() => {
        if (!mapsLoaded) return;

        const loadGoogleMapsScript = () => {
            if (window.google && window.google.maps) {
                initAutocomplete();
                return;
            }

            if (document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')) {
                const checkGoogle = setInterval(() => {
                    if (window.google && window.google.maps) {
                        clearInterval(checkGoogle);
                        initAutocomplete();
                    }
                }, 100);
                return;
            }

            const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
            if (!apiKey) {
                console.warn('Google Maps API key not configured');
                return;
            }

            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
            script.async = true;
            script.defer = true;
            script.onload = () => initAutocomplete();
            document.head.appendChild(script);
        };

        const initAutocomplete = () => {
            if (!addressInputRef.current || !window.google) return;

            autocompleteRef.current = new window.google.maps.places.Autocomplete(addressInputRef.current, {
                types: ['address'],
                componentRestrictions: { country: 'us' },
                fields: ['address_components', 'formatted_address'],
            });

            autocompleteRef.current.addListener('place_changed', handlePlaceSelect);
        };

        const handlePlaceSelect = () => {
            const place = autocompleteRef.current.getPlace();
            if (!place.address_components) return;

            const addressComponents = place.address_components;
            let streetNumber = '';
            let route = '';
            let city = '';
            let state = '';
            let zip = '';
            let country = '';

            for (const component of addressComponents) {
                const types = component.types;
                if (types.includes('street_number')) {
                    streetNumber = component.long_name;
                }
                if (types.includes('route')) {
                    route = component.long_name;
                }
                if (types.includes('locality')) {
                    city = component.long_name;
                }
                if (types.includes('administrative_area_level_1')) {
                    state = component.short_name;
                }
                if (types.includes('postal_code')) {
                    zip = component.long_name;
                }
                if (types.includes('country')) {
                    country = component.short_name;
                }
            }

            const newAddress = `${streetNumber} ${route}`.trim();

            setDelivery(prev => {
                const updated = {
                    ...prev,
                    address: newAddress,
                    city: city,
                    state: state,
                    zip: zip,
                    country: country || 'US'
                };
                triggerCapture(updated);
                return updated;
            });
        };

        loadGoogleMapsScript();
    }, [mapsLoaded]);

    // Validation
    const handleBlur = (field, value) => {
        if (value && value.trim() !== '') {
            if (field === 'email') {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(value)) {
                    triggerCapture();
                    return;
                }
            }

            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
        triggerCapture();
    };

    const validateForm = () => {
        const newErrors = {};
        let isValid = true;

        if (!email || !email.trim()) {
            newErrors.email = 'Enter an email';
            isValid = false;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            newErrors.email = 'Enter a valid email';
            isValid = false;
        }

        if (!delivery.firstName || !delivery.firstName.trim()) {
            newErrors.firstName = 'Enter a first name';
            isValid = false;
        }

        if (!delivery.lastName || !delivery.lastName.trim()) {
            newErrors.lastName = 'Enter a last name';
            isValid = false;
        }

        if (!delivery.address || !delivery.address.trim()) {
            newErrors.address = 'Enter an address';
            isValid = false;
        }

        if (!delivery.city || !delivery.city.trim()) {
            newErrors.city = 'Enter a city';
            isValid = false;
        }

        if (!delivery.zip || !delivery.zip.trim()) {
            newErrors.zip = 'Enter a ZIP code';
            isValid = false;
        }

        if (!delivery.phone || !delivery.phone.trim()) {
            newErrors.phone = 'Enter a phone number';
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    // US States list
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
        <>
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .pac-container {
                    border-radius: 8px;
                    margin-top: 4px;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                    border: 1px solid #e5e7eb;
                    font-family: inherit;
                }
                .pac-item { padding: 8px 12px; cursor: pointer; font-family: inherit; }
                .pac-item:hover { background-color: #f3f4f6; }
                .pac-item-query { font-size: 14px; color: #111827; }

                @media (max-width: 960px) {
                    .checkout-container { flex-direction: column; }
                    .checkout-left, .checkout-right {
                        flex: 1 1 100% !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        padding: 1.5rem !important;
                        justify-content: center !important;
                    }
                    .checkout-left > div { padding-left: 0 !important; padding-right: 0 !important; margin: 0 auto !important; }
                    .checkout-right {
                        min-height: auto !important;
                        border-left: none !important;
                        border-top: 1px solid #e5e7eb;
                        background-color: #fafafa;
                    }
                    .mobile-summary-toggle { display: block !important; }
                    .mobile-summary-content { display: block !important; }
                    .desktop-summary { display: none !important; }
                    .mobile-bottom-summary { display: block !important; }
                }
                @media (min-width: 961px) {
                    .mobile-summary-content { display: none !important; }
                    .mobile-bottom-summary { display: none !important; }
                }
            `}</style>

            {/* Background Decorations */}
            <div style={{
                position: 'fixed', bottom: '-5%', right: '-5%',
                width: '600px', height: '600px',
                backgroundImage: 'url(/greens-scattered.png)',
                backgroundSize: 'contain', backgroundRepeat: 'no-repeat',
                opacity: 0.08, pointerEvents: 'none', zIndex: 0, transform: 'rotate(-15deg)'
            }} />
            <div style={{
                position: 'fixed', top: '10%', left: '-5%',
                width: '400px', height: '400px',
                backgroundImage: 'url(/greens-scattered.png)',
                backgroundSize: 'contain', backgroundRepeat: 'no-repeat',
                opacity: 0.06, pointerEvents: 'none', zIndex: 0, transform: 'rotate(120deg)'
            }} />

            <div className="checkout-container" style={{
                display: 'flex', flexWrap: 'wrap',
                minHeight: 'calc(100vh - 140px)',
                width: '100%', maxWidth: '100%',
                margin: '0', padding: '0',
                position: 'relative', zIndex: 1
            }}>
                {/* Left Column: Form */}
                <div className="checkout-left" style={{
                    flex: '1 1 550px',
                    padding: '4rem 0 4rem 2rem',
                    backgroundColor: '#ffffff',
                    display: 'flex', justifyContent: 'flex-end',
                    borderRight: '1px solid #e5e7eb',
                    maxWidth: '100%'
                }}>
                    <div style={{ width: '100%', maxWidth: '560px', paddingRight: '2rem' }}>

                        {/* Mobile Order Summary Toggle */}
                        <div className="mobile-summary-toggle" style={{ marginBottom: '2rem', display: 'none' }}>
                            <button
                                onClick={() => setShowSummaryMobile(!showSummaryMobile)}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '1rem', background: '#f8f9fa', border: '1px solid #e5e7eb', borderRadius: 8 }}
                            >
                                <ShoppingBag size={20} />
                                <span style={{ flex: 1, textAlign: 'left' }}>{showSummaryMobile ? 'Hide' : 'Show'} order summary</span>
                                <span style={{ fontWeight: 'bold' }}>${total.toFixed(2)}</span>
                                {showSummaryMobile ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </button>
                        </div>

                        <div>
                            {/* Express Checkout - Lazy Loaded */}
                            <StripeCheckout
                                total={total}
                                currentProduct={currentProduct}
                                selectedAddOnId={selectedAddOnId}
                                selectedPriceId={selectedPriceId}
                                email={email}
                                delivery={delivery}
                                appliedDiscount={appliedDiscount}
                                oneTimeQuantity={oneTimeQuantity}
                                clientSecret={clientSecret}
                                isSetupMode={isSetupMode}
                                stripeCustomerId={stripeCustomerId}
                                setStripeCustomerId={setStripeCustomerId}
                                billingAddress={billingAddress}
                                setBillingAddress={setBillingAddress}
                                sameAsShipping={sameAsShipping}
                                setSameAsShipping={setSameAsShipping}
                                onCapture={triggerCapture}
                                onValidate={validateForm}
                                loading={loading}
                            />

                            {/* Contact Section */}
                            <section style={{ marginBottom: '2.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Contact</h2>
                                    <Link href="/login" style={{ fontSize: '0.875rem', color: 'var(--color-primary)', textDecoration: 'underline' }}>Log in</Link>
                                </div>
                                <Input
                                    placeholder="Email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    onBlur={() => handleBlur('email', email)}
                                    error={errors.email}
                                />
                            </section>

                            {/* Delivery Section */}
                            <section style={{ marginBottom: '2.5rem' }}>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Delivery</h2>

                                <Select
                                    label="Country/Region"
                                    options={[{ value: 'US', label: 'United States' }]}
                                    value={delivery.country}
                                    onChange={(e) => setDelivery({ ...delivery, country: e.target.value })}
                                />

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <Input
                                        placeholder="First name"
                                        value={delivery.firstName}
                                        onChange={(e) => setDelivery({ ...delivery, firstName: e.target.value })}
                                        onBlur={() => handleBlur('firstName', delivery.firstName)}
                                        error={errors.firstName}
                                    />
                                    <Input
                                        placeholder="Last name"
                                        value={delivery.lastName}
                                        onChange={(e) => setDelivery({ ...delivery, lastName: e.target.value })}
                                        onBlur={() => handleBlur('lastName', delivery.lastName)}
                                        error={errors.lastName}
                                    />
                                </div>

                                <Input
                                    placeholder="Company (optional)"
                                    value={delivery.company}
                                    onChange={(e) => setDelivery({ ...delivery, company: e.target.value })}
                                    onBlur={() => triggerCapture()}
                                />

                                <Input
                                    ref={addressInputRef}
                                    placeholder="Address"
                                    value={delivery.address}
                                    onChange={(e) => setDelivery({ ...delivery, address: e.target.value })}
                                    onFocus={loadGoogleMapsOnFocus}
                                    onBlur={() => handleBlur('address', delivery.address)}
                                    error={errors.address}
                                    rightIcon={<Search size={18} />}
                                />

                                <Input
                                    placeholder="Apartment, suite, etc. (optional)"
                                    value={delivery.apartment}
                                    onChange={(e) => setDelivery({ ...delivery, apartment: e.target.value })}
                                    onBlur={() => triggerCapture()}
                                />

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                    <Input
                                        placeholder="City"
                                        value={delivery.city}
                                        onChange={(e) => setDelivery({ ...delivery, city: e.target.value })}
                                        onBlur={() => handleBlur('city', delivery.city)}
                                        error={errors.city}
                                    />
                                    <Select
                                        placeholder="State"
                                        value={delivery.state}
                                        onChange={(e) => setDelivery({ ...delivery, state: e.target.value })}
                                        onBlur={() => handleBlur('state', delivery.state)}
                                        options={usStates}
                                        error={errors.state}
                                    />
                                    <Input
                                        placeholder="ZIP code"
                                        value={delivery.zip}
                                        onChange={(e) => setDelivery({ ...delivery, zip: e.target.value })}
                                        onBlur={() => handleBlur('zip', delivery.zip)}
                                        error={errors.zip}
                                    />
                                </div>

                                <Input
                                    placeholder="Phone"
                                    value={delivery.phone}
                                    onChange={(e) => setDelivery({ ...delivery, phone: e.target.value })}
                                    onBlur={() => handleBlur('phone', delivery.phone)}
                                    error={errors.phone}
                                    rightIcon={<HelpCircle size={18} color="#9ca3af" />}
                                />
                            </section>

                            {/* Shipping Method */}
                            <section style={{ marginBottom: '2.5rem' }}>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Shipping method</h2>

                                {(!delivery.address || !delivery.city || !delivery.state || !delivery.zip) ? (
                                    <div style={{
                                        padding: '1.5rem',
                                        backgroundColor: '#f9fafb',
                                        borderRadius: 'var(--radius-md)',
                                        color: '#6b7280',
                                        textAlign: 'center',
                                        fontSize: '0.95rem'
                                    }}>
                                        Enter your shipping address to view available shipping methods.
                                    </div>
                                ) : (
                                    <>
                                        {currentProduct?.interval !== 'one_time' ? (
                                            <>
                                                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', color: '#111827' }}>First shipment</h3>
                                                <div style={{
                                                    padding: '1rem',
                                                    backgroundColor: '#f0fdf4',
                                                    border: '1px solid #166534',
                                                    borderRadius: 'var(--radius-md)',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    marginBottom: '1.5rem'
                                                }}>
                                                    <div>
                                                        <div style={{ fontWeight: 500, color: '#111827' }}>Standard</div>
                                                        <div style={{ fontSize: '0.875rem', color: '#4b5563' }}>(3-5 business days)</div>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ textDecoration: 'line-through', color: '#6b7280', fontSize: '0.85rem' }}>$3.50</div>
                                                        <div style={{ fontWeight: 700, color: '#111827' }}>FREE</div>
                                                    </div>
                                                </div>

                                                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', color: '#111827' }}>Recurring shipments</h3>
                                                <div style={{
                                                    padding: '1rem',
                                                    backgroundColor: '#f9fafb',
                                                    border: '1px solid #e5e7eb',
                                                    borderRadius: 'var(--radius-md)',
                                                    color: '#374151',
                                                    fontSize: '0.95rem'
                                                }}>
                                                    Local Delivery · Free shipping for the first 4 weeks, followed by $14.00 every 4 weeks
                                                </div>
                                            </>
                                        ) : (
                                            <div style={{
                                                padding: '1rem',
                                                backgroundColor: '#f0fdf4',
                                                border: '1px solid #166534',
                                                borderRadius: 'var(--radius-md)',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                            }}>
                                                <div>
                                                    <div style={{ fontWeight: 500, color: '#111827' }}>Standard</div>
                                                    <div style={{ fontSize: '0.875rem', color: '#4b5563' }}>(3-5 business days)</div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ textDecoration: 'line-through', color: '#6b7280', fontSize: '0.85rem' }}>$3.50</div>
                                                    <div style={{ fontWeight: 700, color: '#111827' }}>FREE</div>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </section>

                            {/* Error Message */}
                            {error && !clientSecret && (
                                <div style={{ marginTop: '1rem', padding: '1rem', background: '#fee2e2', color: '#991b1b', borderRadius: 'var(--radius-md)' }}>
                                    Error loading checkout: {error}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Order Summary - Desktop Only */}
                <div className="checkout-right desktop-summary" style={{
                    flex: '1 1 450px',
                    backgroundColor: '#f4f4f5',
                    padding: '4rem 2rem 4rem 0',
                    display: 'flex',
                    justifyContent: 'flex-start',
                    alignItems: 'flex-start',
                    borderLeft: '1px solid #e5e7eb',
                    height: 'auto',
                    minHeight: '100%',
                    maxWidth: '100%',
                    position: 'relative'
                }}>
                    <div style={{
                        position: 'sticky',
                        top: '2rem',
                        width: '100%',
                        maxWidth: '450px',
                        paddingLeft: '2rem'
                    }}>
                        {productsLoading ? (
                            <div style={{ textAlign: 'center', padding: '2rem' }}>
                                <p style={{ color: 'var(--color-text-muted)' }}>Loading products...</p>
                            </div>
                        ) : productsError ? (
                            <div style={{ padding: '1rem', background: '#fee2e2', color: '#991b1b', borderRadius: 'var(--radius-md)' }}>
                                Error loading products: {productsError}
                            </div>
                        ) : !currentProduct ? (
                            <div style={{ textAlign: 'center', padding: '2rem' }}>
                                <p style={{ color: 'var(--color-text-muted)' }}>No product selected</p>
                            </div>
                        ) : (
                            <>
                                {/* Product Display */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
                                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                        <div style={{ position: 'relative' }}>
                                            <div style={{
                                                width: 72, height: 72,
                                                borderRadius: 'var(--radius-md)',
                                                border: '1px solid var(--color-border)',
                                                background: '#f9fafb',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                overflow: 'hidden'
                                            }}>
                                                {currentProduct.image ? (
                                                    <img src={currentProduct.image} alt={currentProduct.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <ShoppingBag size={32} color="var(--color-text-muted)" />
                                                )}
                                            </div>
                                            <span style={{
                                                position: 'absolute', top: -10, right: -10,
                                                background: 'var(--color-text-muted)', color: 'white',
                                                fontSize: '0.75rem', fontWeight: 600,
                                                width: 24, height: 24, borderRadius: '50%',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                border: '2px solid white'
                                            }}>1</span>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>{currentProduct.name}</h3>
                                            {currentProduct.description && (
                                                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>{currentProduct.description}</p>
                                            )}
                                            {currentProduct.interval === 'one_time' && (
                                                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>One-time Purchase</p>
                                            )}
                                        </div>
                                        <div style={{ fontWeight: 600, fontSize: '1.125rem' }}>
                                            ${(currentProduct.interval === 'one_time' ? currentProduct.price * oneTimeQuantity : currentProduct.price).toFixed(2)}
                                        </div>
                                    </div>
                                </div>

                                {/* Discount Code */}
                                <div style={{ marginBottom: '2rem' }}>
                                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                                        <FloatingLabelInput
                                            label="Discount code or gift card"
                                            value={discountCode}
                                            onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                                            disabled={discountLoading || appliedDiscount}
                                        />
                                        <Button
                                            onClick={validateDiscountCode}
                                            disabled={discountLoading || appliedDiscount || !discountCode}
                                            className={`btn-apply-discount ${discountCode ? 'active' : ''}`}
                                            style={{
                                                width: 'auto', padding: '0 1.5rem', height: '48px',
                                                fontSize: '0.95rem', borderRadius: 'var(--radius-md)',
                                                whiteSpace: 'nowrap', fontWeight: 600
                                            }}
                                        >
                                            {discountLoading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : appliedDiscount ? 'Applied' : 'Apply'}
                                        </Button>
                                    </div>
                                    {discountError && (
                                        <div style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.5rem' }}>{discountError}</div>
                                    )}
                                    {appliedDiscount && (
                                        <div style={{ color: '#166534', fontSize: '0.875rem', marginTop: '0.5rem', fontWeight: 500 }}>
                                            ✓ {appliedDiscount.code} applied!
                                        </div>
                                    )}
                                </div>

                                {/* Totals */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                                        <span>Subtotal</span>
                                        <span style={{ color: 'var(--color-text-main)', fontWeight: 500 }}>${subtotal.toFixed(2)}</span>
                                    </div>
                                    {appliedDiscount && discountAmount > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#166534' }}>
                                            <span>Discount ({appliedDiscount.code})</span>
                                            <span style={{ fontWeight: 600 }}>-${discountAmount.toFixed(2)}</span>
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                                        <span>Shipping</span>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                                            {(!delivery.address || !delivery.city || !delivery.state || !delivery.zip) ? (
                                                <span style={{ fontSize: '0.8rem' }}>Enter shipping address</span>
                                            ) : shippingLoading ? (
                                                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                                            ) : (
                                                <>
                                                    <span style={{ textDecoration: 'line-through', color: '#6b7280', marginRight: '0.5rem', fontSize: '0.9rem' }}>
                                                        {currentProduct?.interval !== 'one_time' ? '$14.00' : '$3.50'}
                                                    </span>
                                                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#166534' }}>FREE</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-border)', alignItems: 'baseline' }}>
                                        <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>Total</span>
                                        <div style={{ textAlign: 'right' }}>
                                            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginRight: '0.5rem' }}>USD</span>
                                            <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-primary)' }}>${total.toFixed(2)}</span>
                                        </div>
                                    </div>

                                    {recurringSubtotal > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <span>Recurring subtotal</span>
                                                <div
                                                    onMouseEnter={() => setShowTooltip(true)}
                                                    onMouseLeave={() => setShowTooltip(false)}
                                                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', position: 'relative' }}
                                                >
                                                    <HelpCircle size={14} color="var(--color-text-muted)" />
                                                    {showTooltip && (
                                                        <div style={{
                                                            position: 'absolute', bottom: '100%', left: '50%',
                                                            transform: 'translateX(-50%)', marginBottom: '0.75rem',
                                                            backgroundColor: '#1f2937', color: '#fff',
                                                            padding: '0.75rem', borderRadius: '0.375rem',
                                                            fontSize: '0.8rem', width: '200px', textAlign: 'center',
                                                            zIndex: 50, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                                            lineHeight: '1.4', pointerEvents: 'none'
                                                        }}>
                                                            Does not include shipping, tax, duties, or any applicable discounts.
                                                            <div style={{
                                                                position: 'absolute', top: '100%', left: '50%',
                                                                transform: 'translateX(-50%)',
                                                                borderWidth: '6px', borderStyle: 'solid',
                                                                borderColor: '#1f2937 transparent transparent transparent'
                                                            }} />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <span>${recurringSubtotal.toFixed(2)} {recurringIntervalText}</span>
                                        </div>
                                    )}

                                    {delivery.address && delivery.city && delivery.state && delivery.zip && !shippingLoading && (() => {
                                        const shippingSavings = currentProduct?.interval !== 'one_time' ? 14.00 : 3.50;
                                        const totalSavings = shippingSavings + discountAmount;
                                        return (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                                                <Tag size={16} />
                                                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>TOTAL SAVINGS</span>
                                                <span style={{ fontWeight: 700, fontSize: '0.9rem', marginLeft: '0.5rem' }}>${totalSavings.toFixed(2)}</span>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
