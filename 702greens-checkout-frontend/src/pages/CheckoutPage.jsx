import React, { useState, useEffect, useCallback, useRef } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, ExpressCheckoutElement } from '@stripe/react-stripe-js';
import { ChevronDown, ChevronUp, ShoppingBag, Loader2, Tag, Search, HelpCircle } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import CheckoutForm from '../components/CheckoutForm';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { FloatingLabelInput } from '../components/ui/FloatingLabelInput';


const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

if (!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY) {
    console.error("🚨 Missing VITE_STRIPE_PUBLISHABLE_KEY! Payment Element will not load.");
}
const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:4242' : '/api');

const PRODUCT_MAPPING = {
    'single-one-time': 'price_1SX65ECFLmsUiqyI2JaMIb12',
    'single-bi-weekly': 'price_1SX65BCFLmsUiqyIbFXwFSgi',
    'double-nutrition': 'price_1SX659CFLmsUiqyIl8cIM77T',
    'single-nutrition': 'price_1SX655CFLmsUiqyIVMOAdbxd'
};

export default function CheckoutPage() {
    const location = useLocation();
    const { productSlug } = useParams();
    // Products State
    const [products, setProducts] = useState([]);
    const [productsLoading, setProductsLoading] = useState(true);
    const [productsError, setProductsError] = useState(null);

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

    const [selectedPriceId, setSelectedPriceId] = useState(''); // Store Stripe Price ID

    // Payment State
    const [clientSecret, setClientSecret] = useState(''); // Changed from null
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showSummaryMobile, setShowSummaryMobile] = useState(false);
    const [shippingLoading, setShippingLoading] = useState(false);
    const prevAddressComplete = useRef(false);

    // Add-on State
    const [selectedAddOnId, setSelectedAddOnId] = useState(null);
    const [addOnLoadingId, setAddOnLoadingId] = useState(null);
    const [oneTimeQuantity, setOneTimeQuantity] = useState(1);

    // Discount State
    const [discountCode, setDiscountCode] = useState('');
    const [appliedDiscount, setAppliedDiscount] = useState(null);
    const [discountError, setDiscountError] = useState('');
    const [discountLoading, setDiscountLoading] = useState(false);

    // Tooltip State
    const [showTooltip, setShowTooltip] = useState(false);

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


    // Debounced Capture Function
    const debouncedCapture = useCallback((data) => {
        const handler = setTimeout(() => {
            if (data.email) {
                fetch(`${API_URL}/capture-lead`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                }).catch(console.error);
            }
        }, 800);

        return () => clearTimeout(handler);
    }, []);

    // Ref to store the latest timeout cleaner
    const captureTimeoutRef = useRef(null);

    const triggerCapture = (overrides = {}) => {
        if (captureTimeoutRef.current) {
            captureTimeoutRef.current(); // Clear previous timeout
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

    const handleSubmit = async (event) => {
        event.preventDefault();
        // Payment submission is handled by CheckoutForm inside Elements
    };

    // Fetch products on mount
    useEffect(() => {
        const fetchProducts = async () => {
            try {
                setProductsLoading(true);
                const res = await fetch(`${API_URL}/products`);
                if (!res.ok) throw new Error('Failed to fetch products');
                const data = await res.json();
                setProducts(data);
                setProducts(data);

                // Handle Product Selection via URL Slug or Default
                if (productSlug && PRODUCT_MAPPING[productSlug]) {
                    setSelectedPriceId(PRODUCT_MAPPING[productSlug]);
                } else if (data.length > 0) {
                    setSelectedPriceId(data[0].id);
                }
            } catch (err) {
                console.error('Error fetching products:', err);
                setProductsError(err.message);
            } finally {
                setProductsLoading(false);
            }
        };

        fetchProducts();
    }, []);

    // Handle Autofill from Login
    useEffect(() => {
        if (location.state?.customerData) {
            const { customerData } = location.state;
            setEmail(customerData.email || '');

            const newDelivery = {
                ...delivery,
                firstName: customerData.firstName || '',
                lastName: customerData.lastName || '',
                phone: customerData.phone || '',
                company: customerData.company || ''
            };

            if (customerData.address) {
                newDelivery.address = customerData.address.address || '';
                newDelivery.apartment = customerData.address.apartment || '';
                newDelivery.city = customerData.address.city || '';
                newDelivery.state = customerData.address.state || '';
                newDelivery.zip = customerData.address.zip || '';
                newDelivery.country = customerData.address.country || 'US';
            }

            setDelivery(newDelivery);
        }
    }, [location.state]);

    // Initialize Subscription
    const initializeCheckout = async () => {
        if (!selectedPriceId) return; // Email is no longer required for initialization

        try {
            setLoading(true);
            setError(null);

            const res = await fetch(`${API_URL}/create-subscription`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    priceId: selectedPriceId, // Send Stripe Price ID
                    email,
                    delivery,
                    addOnPriceIds: selectedAddOnId ? [selectedAddOnId] : [], // Send Array with single Add-on Price ID
                    quantity: oneTimeQuantity, // Send Quantity for One-time product
                    discount: appliedDiscount // Send applied discount object
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to initialize checkout');

            setClientSecret(data.clientSecret);
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Trigger initialization on mount or when price changes
    useEffect(() => {
        if (selectedPriceId && !clientSecret) {
            initializeCheckout();
        }
    }, [selectedPriceId]);

    // Re-initialize when discount is applied/removed
    useEffect(() => {
        if (selectedPriceId) {
            initializeCheckout();
        }
    }, [appliedDiscount, oneTimeQuantity]); // Re-init on discount or quantity change

    // Re-initialize if critical params change (optional, but careful not to loop)
    // For now, we only init once on mount/price selection to get the Intent.
    // Subsequent updates (adding email, address) should ideally update the intent,
    // but our current backend makes a NEW intent each time.
    // To support Express Checkout on load, we init once.
    // If the user types email manually, we might want to update the existing intent rather than create new.
    // BUT for this task, the goal is just to show Express Checkout.

    /*
    const debouncedInit = useCallback(() => {
        const timer = setTimeout(() => {
             if (email.includes('@') && email.includes('.')) {
                 initializeCheckout();
             }
        }, 1000);
        return () => clearTimeout(timer);
    }, [email, selectedPriceId]);
    */

    // Get current selected product
    const currentProduct = products.find(p => p.id === selectedPriceId) || null;

    // Find suitable add-on products
    // If current is One-time: Add-ons are Subscriptions
    // If current is Subscription: Add-on is One-time
    const subscriptionProducts = products.filter(p => p.interval !== 'one_time');
    const oneTimeProduct = products.find(p => p.interval === 'one_time');

    let availableAddOns = [];
    /*
    if (currentProduct && currentProduct.interval === 'one_time') {
        availableAddOns = subscriptionProducts.filter(p => p.id !== selectedPriceId);
    } else if (currentProduct && currentProduct.interval !== 'one_time') {
        availableAddOns = oneTimeProduct ? [oneTimeProduct] : [];
    }
    */

    // Calculate total price
    const selectedAddOnProduct = availableAddOns.find(p => p.id === selectedAddOnId);

    let subtotal = 0;
    if (currentProduct) {
        if (currentProduct.interval === 'one_time') {
            subtotal += currentProduct.price * oneTimeQuantity;
        } else {
            subtotal += currentProduct.price;
        }
    }
    if (selectedAddOnProduct) {
        if (selectedAddOnProduct.interval === 'one_time') {
            subtotal += selectedAddOnProduct.price * oneTimeQuantity;
        } else {
            subtotal += selectedAddOnProduct.price;
        }
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (appliedDiscount) {
        if (appliedDiscount.discountMethod === 'percentage') {
            discountAmount = subtotal * (appliedDiscount.discountValue / 100);
        } else if (appliedDiscount.discountMethod === 'fixed_amount') {
            discountAmount = appliedDiscount.discountValue;
        }
    }

    // Calculate total with discount
    const total = Math.max(0, subtotal - discountAmount);

    // Calculate Recurring Subtotal (excluding one-time add-ons)
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
    if (selectedAddOnProduct && selectedAddOnProduct.interval !== 'one_time') {
        recurringSubtotal += selectedAddOnProduct.price;
    }

    const toggleAddOn = async (productId) => {
        setAddOnLoadingId(productId);
        // Simulate a small delay for better UX (loading state)
        await new Promise(resolve => setTimeout(resolve, 600));

        setSelectedAddOnId(prev => {
            if (prev === productId) {
                return null; // Deselect if already selected
            } else {
                return productId; // Select new (replacing old)
            }
        });
        setAddOnLoadingId(null);
    };

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
                fetch(`${API_URL}/validate-discount`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code: discountCode, orderTotal: subtotal })
                }),
                new Promise(resolve => setTimeout(resolve, 1000)) // Enforce 1s loading state
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

    // Google Maps Autocomplete
    const addressInputRef = useRef(null);
    const autocompleteRef = useRef(null);

    useEffect(() => {
        const loadGoogleMapsScript = () => {
            if (window.google && window.google.maps) {
                initAutocomplete();
                return;
            }

            if (document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')) {
                // Script already loading/loaded, wait for it
                const checkGoogle = setInterval(() => {
                    if (window.google && window.google.maps) {
                        clearInterval(checkGoogle);
                        initAutocomplete();
                    }
                }, 100);
                return;
            }

            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places`;
            script.async = true;
            script.defer = true;
            script.onload = () => initAutocomplete();
            document.head.appendChild(script);
        };

        const initAutocomplete = () => {
            if (!addressInputRef.current || !window.google) return;

            autocompleteRef.current = new window.google.maps.places.Autocomplete(addressInputRef.current, {
                types: ['address'],
                componentRestrictions: { country: 'us' }, // Restrict to US for now as per country state
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
                // Trigger capture with new data immediately
                triggerCapture(updated);
                return updated;
            });
        };

        loadGoogleMapsScript();
    }, []);

    // Validation State
    const [errors, setErrors] = useState({});

    const handleBlur = (field, value, label) => {
        // Lazy Validation: Only CLEAR errors on blur, never SET them.

        // If value exists, check if we can clear the error
        if (value && value.trim() !== '') {
            // Email Validation (only clear if regex matches)
            if (field === 'email') {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(value)) {
                    // Do nothing (don't set error, but don't clear it if it exists? 
                    // Actually better to just leave it. If they entered invalid email, 
                    // and we don't show error, they think it's fine.
                    // But user asked for "no red borders" on simple blur. 
                    // Let's strictly rely on Submit for showing errors.
                    triggerCapture();
                    return;
                }
            }

            // Clear error if it exists
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

        if (!delivery.state) {
            // State is a select, might be empty string
            // Assuming state is required
            // If state is empty string, it's invalid
            if (!delivery.state) {
                // No specific error UI for select yet, but logic holds
                // Could add error state for select if needed, or just rely on blocking
            }
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

    return (
        <Layout>
            <style>
                {`
                    @keyframes float {
                        0% { transform: translateY(0px); }
                        50% { transform: translateY(-10px); }
                        100% { transform: translateY(0px); }
                    }
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                    @keyframes slideDown {
                        from {
                            opacity: 0;
                            transform: translateY(-10px);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }
                    /* Hide Google Maps Logo if desired or style it */
                    .pac-container {
                        border-radius: 8px;
                        margin-top: 4px;
                        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                        border: 1px solid #e5e7eb;
                        font-family: inherit;
                    }
                    .pac-item {
                        padding: 8px 12px;
                        cursor: pointer;
                        font-family: inherit;
                    }
                    .pac-item:hover {
                        background-color: #f3f4f6;
                    }
                    .pac-item-query {
                        font-size: 14px;
                        color: #111827;
                    }

                    /* Responsive Layout */
                    @media (max-width: 960px) {
                        .checkout-container {
                            flex-direction: column;
                        }
                        .checkout-left, .checkout-right {
                            flex: 1 1 100% !important;
                            width: 100% !important;
                            max-width: 100% !important;
                            padding: 2rem !important;
                        }
                        .checkout-right {
                            min-height: auto !important;
                            border-left: none !important;
                            border-top: 1px solid #e5e7eb;
                            background-color: #fafafa;
                        }
                        .mobile-summary-toggle {
                            display: block !important;
                        }
                        .mobile-summary-content {
                            display: block !important;
                        }
                        .desktop-summary {
                            display: none !important;
                        }
                        .mobile-hidden {
                            display: none !important;
                        }
                    }
                    @media (min-width: 961px) {
                        .mobile-summary-content {
                            display: none !important;
                        }
                    }
                `}
            </style>
            {/* Static Background Decoration - Bottom Right */}
            <div style={{
                position: 'fixed',
                bottom: '-5%',
                right: '-5%',
                width: '600px',
                height: '600px',
                backgroundImage: 'url(/greens-scattered.png)',
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                opacity: 0.08,
                pointerEvents: 'none',
                zIndex: 0,
                transform: 'rotate(-15deg)'
            }} />

            {/* Static Background Decoration - Top Left */}
            <div style={{
                position: 'fixed',
                top: '10%',
                left: '-5%',
                width: '400px',
                height: '400px',
                backgroundImage: 'url(/greens-scattered.png)',
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                opacity: 0.06,
                pointerEvents: 'none',
                zIndex: 0,
                transform: 'rotate(120deg)'
            }} />

            {/* Static Background Decoration - Middle Right */}
            <div style={{
                position: 'fixed',
                top: '40%',
                right: '-10%',
                width: '300px',
                height: '300px',
                backgroundImage: 'url(/greens-scattered.png)',
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                opacity: 0.05,
                pointerEvents: 'none',
                zIndex: 0,
                transform: 'rotate(45deg)'
            }} />

            <div className="checkout-container" style={{
                display: 'flex',
                flexWrap: 'wrap',
                minHeight: 'calc(100vh - 140px)', // Adjust for header
                width: '100%',
                maxWidth: '100%', // Full width
                margin: '0',
                padding: '0',
                position: 'relative',
                zIndex: 1
            }}>

                {/* Left Column: Form */}
                <div className="checkout-left" style={{
                    flex: '1 1 550px', // Take up more space
                    padding: '4rem 0 4rem 2rem', // Reduced padding, alignment via max-width
                    backgroundColor: '#ffffff',
                    display: 'flex',
                    justifyContent: 'flex-end', // Align content to the right (towards center)
                    borderRight: '1px solid #e5e7eb',
                    maxWidth: '100%'
                }}>
                    <div style={{
                        width: '100%',
                        maxWidth: '560px', // Squeezed max width
                        paddingRight: '2rem', // Gutter
                    }}>


                        {/* Breadcrumbs */}


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

                            {/* Mobile Order Summary Content - Accordion Style */}
                            {showSummaryMobile && (
                                <div className="mobile-summary-content" style={{
                                    marginTop: '1rem',
                                    padding: '1.5rem',
                                    backgroundColor: '#fafafa',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: 8,
                                    animation: 'slideDown 0.3s ease-out'
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
                                            <div style={{ marginBottom: '1.5rem' }}>
                                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                                                    <div style={{ position: 'relative' }}>
                                                        <div style={{
                                                            width: 60,
                                                            height: 60,
                                                            borderRadius: 'var(--radius-md)',
                                                            border: '1px solid var(--color-border)',
                                                            background: '#fff',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            overflow: 'hidden'
                                                        }}>
                                                            {currentProduct.image ? (
                                                                <img src={currentProduct.image} alt={currentProduct.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                            ) : (
                                                                <ShoppingBag size={24} color="var(--color-text-muted)" />
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.25rem' }}>{currentProduct.name}</div>
                                                        {currentProduct.description && (
                                                            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                                                                {currentProduct.description}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div style={{ fontWeight: 600 }}>${(currentProduct.interval === 'one_time' ? currentProduct.price * oneTimeQuantity : currentProduct.price).toFixed(2)}</div>
                                                </div>
                                            </div>

                                            {/* Add-on Products - Mobile */}
                                            {/* Add-on Products - Mobile
                                        {availableAddOns.length > 0 && (
                                            <div style={{
                                                marginBottom: '1.5rem',
                                                padding: '1rem',
                                                backgroundColor: '#f9fafb',
                                                border: '1px solid var(--color-border)',
                                                borderRadius: 'var(--radius-md)',
                                            }}>
                                                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem', color: '#111827' }}>Add to this order</h4>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                                                    {availableAddOns.map(product => (
                                                        <div key={product.id} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                                                            <div style={{
                                                                width: 50,
                                                                height: 50,
                                                                borderRadius: 'var(--radius-md)',
                                                                border: '1px solid var(--color-border)',
                                                                background: '#ffffff',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                overflow: 'hidden',
                                                                flexShrink: 0
                                                            }}>
                                                                {product.image ? (
                                                                    <img src={product.image} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                ) : (
                                                                    <ShoppingBag size={20} color="var(--color-text-muted)" />
                                                                )}
                                                            </div>
                                                            <div style={{ flex: 1 }}>
                                                                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{product.name}</div>
                                                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>${product.price.toFixed(2)}</div>
                                                            </div>
                                                            <Button
                                                                variant={selectedAddOnId === product.id ? "outline" : "secondary"}
                                                                onClick={() => toggleAddOn(product.id)}
                                                                disabled={addOnLoadingId === product.id}
                                                                style={{
                                                                    width: '80px',
                                                                    height: '36px',
                                                                    fontSize: '0.8rem',
                                                                    fontWeight: 600,
                                                                    borderRadius: 'var(--radius-md)',
                                                                    borderColor: selectedAddOnId === product.id ? '#ef4444' : 'var(--color-border)',
                                                                    color: selectedAddOnId === product.id ? '#ef4444' : 'var(--color-text-main)',
                                                                    backgroundColor: selectedAddOnId === product.id ? '#fff' : '#fff'
                                                                }}
                                                            >
                                                                {addOnLoadingId === product.id ? (
                                                                    <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                                                                ) : selectedAddOnId === product.id ? (
                                                                    'Remove'
                                                                ) : (
                                                                    'Add'
                                                                )}
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        */}

                                            {/* Discount Code - Mobile */}
                                            <div style={{ marginBottom: '1.5rem' }}>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
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
                                                            width: 'auto',
                                                            padding: '0 1.25rem',
                                                            height: '48px',
                                                            fontSize: '0.875rem',
                                                            borderRadius: 'var(--radius-md)',
                                                            whiteSpace: 'nowrap',
                                                            fontWeight: 600
                                                        }}
                                                    >
                                                        {discountLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : appliedDiscount ? 'Applied' : 'Apply'}
                                                    </Button>
                                                </div>
                                                {discountError && (
                                                    <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                                                        {discountError}
                                                    </div>
                                                )}
                                                {appliedDiscount && (
                                                    <div style={{ color: '#166534', fontSize: '0.8rem', marginTop: '0.5rem', fontWeight: 500 }}>
                                                        ✓ {appliedDiscount.code} applied!
                                                    </div>
                                                )}
                                            </div>

                                            {/* Totals */}
                                            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                                    <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Subtotal</span>
                                                    <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>${subtotal.toFixed(2)}</span>
                                                </div>
                                                {appliedDiscount && discountAmount > 0 && (
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.9rem', color: '#166534' }}>
                                                        <span>Discount ({appliedDiscount.code})</span>
                                                        <span style={{ fontWeight: 600 }}>
                                                            -${discountAmount.toFixed(2)}
                                                        </span>
                                                    </div>
                                                )}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                                    <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Shipping</span>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                                                        {(!delivery.address || !delivery.city || !delivery.state || !delivery.zip) ? (
                                                            <span style={{ fontSize: '0.8rem' }}>Enter shipping address</span>
                                                        ) : shippingLoading ? (
                                                            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                                                        ) : (
                                                            <>
                                                                {(currentProduct?.interval !== 'one_time' || (selectedAddOnProduct && selectedAddOnProduct.interval !== 'one_time')) ? (
                                                                    <>
                                                                        <span style={{ textDecoration: 'line-through', color: '#6b7280', marginRight: '0.5rem', fontSize: '0.9rem' }}>
                                                                            $14.00
                                                                        </span>
                                                                        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#166534' }}>FREE</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <span style={{ textDecoration: 'line-through', color: '#6b7280', marginRight: '0.5rem', fontSize: '0.9rem' }}>
                                                                            $3.50
                                                                        </span>
                                                                        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#166534' }}>FREE</span>
                                                                    </>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid #e5e7eb' }}>
                                                    <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>Total</span>
                                                    <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>${total.toFixed(2)}</span>
                                                </div>

                                                {/* Recurring Subtotal - Mobile */}
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
                                                                        position: 'absolute',
                                                                        bottom: '100%',
                                                                        left: '50%',
                                                                        transform: 'translateX(-50%)',
                                                                        marginBottom: '0.75rem',
                                                                        backgroundColor: '#1f2937',
                                                                        color: '#fff',
                                                                        padding: '0.75rem',
                                                                        borderRadius: '0.375rem',
                                                                        fontSize: '0.8rem',
                                                                        width: '200px',
                                                                        textAlign: 'center',
                                                                        zIndex: 50,
                                                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                                                                        lineHeight: '1.4',
                                                                        pointerEvents: 'none'
                                                                    }}>
                                                                        Does not include shipping, tax, duties, or any applicable discounts.
                                                                        <div style={{
                                                                            position: 'absolute',
                                                                            top: '100%',
                                                                            left: '50%',
                                                                            transform: 'translateX(-50%)',
                                                                            borderWidth: '6px',
                                                                            borderStyle: 'solid',
                                                                            borderColor: '#1f2937 transparent transparent transparent'
                                                                        }} />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <span>
                                                            ${recurringSubtotal.toFixed(2)} {recurringIntervalText}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        <div>
                            {/* Express Checkout */}
                            {clientSecret ? (
                                <Elements key={`express-${clientSecret}`} stripe={stripePromise} options={{
                                    clientSecret,
                                    appearance: {
                                        theme: 'stripe',
                                        variables: {
                                            colorPrimary: '#0f392b',
                                            colorBackground: '#ffffff',
                                            colorText: '#0f392b',
                                            borderRadius: '10px',
                                        }
                                    },
                                    paymentMethodOrder: ['card', 'apple_pay', 'google_pay', 'link', 'cashapp', 'affirm', 'afterpay_clearpay'],
                                }}>
                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <div style={{ marginBottom: '1rem', textAlign: 'center', color: '#6b7280', fontSize: '0.875rem' }}>
                                            Express checkout
                                        </div>
                                        <div style={{ marginBottom: '1.5rem' }}>
                                            <ExpressCheckoutElement options={{ buttonTheme: { applePay: 'black', googlePay: 'black' }, height: 48 }} />
                                        </div>
                                        <div style={{ marginBottom: '1.5rem', textAlign: 'center', color: '#6b7280', fontSize: '0.8rem', lineHeight: '1.4' }}>
                                            By continuing with your payment, you agree to the future charges listed on this page and the cancellation policy.
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                                            <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }}></div>
                                            <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>OR</div>
                                            <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }}></div>
                                        </div>
                                    </div>
                                </Elements>
                            ) : (
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100px', marginBottom: '1.5rem' }}>
                                    <Loader2 size={30} style={{ animation: 'spin 1s linear infinite', color: '#9ca3af' }} />
                                </div>
                            )}

                            {/* Contact Section */}
                            <section style={{ marginBottom: '2.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Contact</h2>
                                    <Link to="/login" state={{ from: location }} style={{ fontSize: '0.875rem', color: 'var(--color-primary)', textDecoration: 'underline' }}>Log in</Link>
                                </div>

                                <Input
                                    placeholder="Email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    onBlur={() => handleBlur('email', email, 'email')}
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
                                        onBlur={() => handleBlur('firstName', delivery.firstName, 'first name')}
                                        error={errors.firstName}
                                    />
                                    <Input
                                        placeholder="Last name"
                                        value={delivery.lastName}
                                        onChange={(e) => setDelivery({ ...delivery, lastName: e.target.value })}
                                        onBlur={() => handleBlur('lastName', delivery.lastName, 'last name')}
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
                                    onBlur={() => handleBlur('address', delivery.address, 'address')}
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
                                        onBlur={() => handleBlur('city', delivery.city, 'city')}
                                        error={errors.city}
                                    />
                                    <Select
                                        placeholder="State"
                                        value={delivery.state}
                                        onChange={(e) => setDelivery({ ...delivery, state: e.target.value })}
                                        onBlur={() => handleBlur('state', delivery.state, 'state')}
                                        options={[
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
                                        ]}
                                        error={errors.state}
                                    />
                                    <Input
                                        placeholder="ZIP code"
                                        value={delivery.zip}
                                        onChange={(e) => setDelivery({ ...delivery, zip: e.target.value })}
                                        onBlur={() => handleBlur('zip', delivery.zip, 'ZIP code')}
                                        error={errors.zip}
                                    />
                                </div>

                                <Input
                                    placeholder="Phone"
                                    value={delivery.phone}
                                    onChange={(e) => setDelivery({ ...delivery, phone: e.target.value })}
                                    onBlur={() => handleBlur('phone', delivery.phone, 'phone number')}
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
                                        {/* Shipping Logic: Show Subscription Shipping if ANY subscription product is present (Main or Add-on) */}
                                        {(currentProduct?.interval !== 'one_time' || (selectedAddOnProduct && selectedAddOnProduct.interval !== 'one_time')) ? (
                                            /* Subscription Layout (Free Shipping) */
                                            <>
                                                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', color: '#111827' }}>First shipment</h3>
                                                <div style={{
                                                    padding: '1rem',
                                                    backgroundColor: '#f0fdf4', // Light green background
                                                    border: '1px solid #166534', // Dark green border
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
                                                    border: '1px solid #e5e7eb', // Light gray border
                                                    borderRadius: 'var(--radius-md)',
                                                    color: '#374151',
                                                    fontSize: '0.95rem'
                                                }}>
                                                    Local Delivery · Free shipping for the first 4 weeks, followed by $14.00 every 4 weeks
                                                </div>
                                            </>
                                        ) : (
                                            /* One-time Purchase Layout ($3.50 -> FREE) */
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
                                        <Elements key={`payment-${clientSecret}`} stripe={stripePromise} options={{
                                            clientSecret,
                                            appearance: {
                                                theme: 'stripe',
                                                variables: {
                                                    colorPrimary: '#0f392b',
                                                    colorBackground: '#ffffff',
                                                    colorText: '#0f392b',
                                                    borderRadius: '10px',
                                                }
                                            },
                                            paymentMethodOrder: ['card', 'apple_pay', 'google_pay', 'link', 'cashapp', 'affirm', 'afterpay_clearpay'],
                                        }}>
                                            <CheckoutForm
                                                billingAddress={billingAddress}
                                                setBillingAddress={setBillingAddress}
                                                sameAsShipping={sameAsShipping}
                                                setSameAsShipping={setSameAsShipping}
                                                onCapture={triggerCapture}
                                                onValidate={validateForm}
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
                                        {loading ? 'Initializing secure checkout...' : 'Please enter your email to load payment options.'}
                                    </div>
                                )}
                            </section>

                            {/* Global Initialization Error */}
                            {error && !clientSecret && (
                                <div style={{ marginTop: '1rem', padding: '1rem', background: '#fee2e2', color: '#991b1b', borderRadius: 'var(--radius-md)' }}>
                                    Error loading checkout: {error}
                                </div>
                            )}
                        </div>
                    </div>

                </div>

                {/* Right Column: Order Summary - Desktop Only */}
                <div className={`checkout-right desktop-summary`} style={{
                    flex: '1 1 450px',
                    backgroundColor: '#f4f4f5', // Slightly darker grey background
                    padding: '4rem 2rem 4rem 0', // Reduced padding
                    display: 'flex',
                    justifyContent: 'flex-start', // Align content to the left (towards center)
                    alignItems: 'flex-start', // Prevent stretching, enables sticky child
                    borderLeft: '1px solid #e5e7eb',
                    height: 'auto',
                    minHeight: '100%',
                    maxWidth: '100%',
                    position: 'relative' // Ensure stacking context if needed
                }}>
                    <div style={{
                        position: 'sticky',
                        top: '2rem',
                        width: '100%',
                        maxWidth: '450px', // Squeezed max width
                        paddingLeft: '2rem' // Gutter
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
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
                                    {/* Main Product */}
                                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                        <div style={{ position: 'relative' }}>
                                            <div style={{
                                                width: 72,
                                                height: 72,
                                                borderRadius: 'var(--radius-md)',
                                                border: '1px solid var(--color-border)',
                                                background: '#f9fafb',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                overflow: 'hidden'
                                            }}>
                                                {currentProduct.image ? (
                                                    <img src={currentProduct.image} alt={currentProduct.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <ShoppingBag size={32} color="var(--color-text-muted)" />
                                                )}
                                            </div>
                                            <span style={{
                                                position: 'absolute',
                                                top: -10,
                                                right: -10,
                                                background: 'var(--color-text-muted)',
                                                color: 'white',
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                width: 24,
                                                height: 24,
                                                borderRadius: '50%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                border: '2px solid white'
                                            }}>1</span>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>{currentProduct.name}</h3>
                                            {currentProduct.description && (
                                                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>{currentProduct.description}</p>
                                            )}
                                            {currentProduct.interval === 'one_time' && (
                                                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                                                    One-time Purchase
                                                </p>
                                            )}
                                        </div>
                                        <div style={{ fontWeight: 600, fontSize: '1.125rem' }}>
                                            ${(currentProduct.interval === 'one_time' ? currentProduct.price * oneTimeQuantity : currentProduct.price).toFixed(2)}
                                        </div>
                                    </div>

                                    {/* Quantity Selector for Main Product (if One-time) */}
                                    {currentProduct.interval === 'one_time' && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', marginLeft: '88px' }}>
                                            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Quantity:</span>
                                            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                                                <button
                                                    onClick={() => setOneTimeQuantity(Math.max(1, oneTimeQuantity - 1))}
                                                    style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', border: 'none', cursor: 'pointer', color: 'var(--color-text-main)' }}
                                                >-</button>
                                                <div style={{ width: 40, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 600, borderLeft: '1px solid var(--color-border)', borderRight: '1px solid var(--color-border)' }}>
                                                    {oneTimeQuantity}
                                                </div>
                                                <button
                                                    onClick={() => setOneTimeQuantity(oneTimeQuantity + 1)}
                                                    style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', border: 'none', cursor: 'pointer', color: 'var(--color-text-main)' }}
                                                >+</button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Add-on Products (if selected) */}
                                    {selectedAddOnProduct && (
                                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                            <div style={{ position: 'relative' }}>
                                                <div style={{
                                                    width: 72,
                                                    height: 72,
                                                    borderRadius: 'var(--radius-md)',
                                                    border: '1px solid var(--color-border)',
                                                    background: '#f9fafb',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    overflow: 'hidden'
                                                }}>
                                                    {selectedAddOnProduct.image ? (
                                                        <img src={selectedAddOnProduct.image} alt={selectedAddOnProduct.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    ) : (
                                                        <ShoppingBag size={32} color="var(--color-text-muted)" />
                                                    )}
                                                </div>
                                                <span style={{
                                                    position: 'absolute',
                                                    top: -10,
                                                    right: -10,
                                                    background: 'var(--color-text-muted)',
                                                    color: 'white',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    width: 24,
                                                    height: 24,
                                                    borderRadius: '50%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    border: '2px solid white'
                                                }}>1</span>
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>{selectedAddOnProduct.name}</h3>
                                                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                                                    Subscription Add-on
                                                </p>
                                            </div>
                                            <div style={{ fontWeight: 600, fontSize: '1.125rem' }}>
                                                ${(selectedAddOnProduct.interval === 'one_time' ? selectedAddOnProduct.price * oneTimeQuantity : selectedAddOnProduct.price).toFixed(2)}
                                            </div>
                                        </div>
                                    )}

                                    {/* Quantity Selector for Add-on Product (if One-time) */}
                                    {selectedAddOnProduct && selectedAddOnProduct.interval === 'one_time' && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', marginLeft: '88px' }}>
                                            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Quantity:</span>
                                            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                                                <button
                                                    onClick={() => setOneTimeQuantity(Math.max(1, oneTimeQuantity - 1))}
                                                    style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', border: 'none', cursor: 'pointer', color: 'var(--color-text-main)' }}
                                                >-</button>
                                                <div style={{ width: 40, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 600, borderLeft: '1px solid var(--color-border)', borderRight: '1px solid var(--color-border)' }}>
                                                    {oneTimeQuantity}
                                                </div>
                                                <button
                                                    onClick={() => setOneTimeQuantity(oneTimeQuantity + 1)}
                                                    style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', border: 'none', cursor: 'pointer', color: 'var(--color-text-main)' }}
                                                >+</button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Plan Selector (Quick Switch) - Hide if product is pre-selected via URL */}
                                {!productSlug && (
                                    <div style={{ marginBottom: '2rem' }}>
                                        <Select
                                            label="Change Plan"
                                            value={selectedPriceId}
                                            onChange={(e) => {
                                                setSelectedPriceId(e.target.value);
                                                setClientSecret(null); // Force reset to prevent paying for old plan
                                            }}
                                            options={products.map(product => ({
                                                value: product.id,
                                                label: `${product.name} ($${product.price.toFixed(2)})`
                                            }))}
                                        />
                                    </div>
                                )}

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
                                                width: 'auto',
                                                padding: '0 1.5rem',
                                                height: '48px',
                                                fontSize: '0.95rem',
                                                borderRadius: 'var(--radius-md)',
                                                whiteSpace: 'nowrap',
                                                fontWeight: 600
                                            }}
                                        >
                                            {discountLoading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : appliedDiscount ? 'Applied' : 'Apply'}
                                        </Button>
                                    </div>
                                    {discountError && (
                                        <div style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                                            {discountError}
                                        </div>
                                    )}
                                    {appliedDiscount && (
                                        <div style={{ color: '#166534', fontSize: '0.875rem', marginTop: '0.5rem', fontWeight: 500 }}>
                                            ✓ {appliedDiscount.code} applied!
                                        </div>
                                    )}
                                </div>

                                {/* Add-on Feature Box
                            {availableAddOns.length > 0 && (
                                <div style={{
                                    marginBottom: '2rem',
                                    padding: '1.25rem',
                                    backgroundColor: '#f9fafb',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: 'var(--radius-md)',
                                }}>
                                    <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: '#111827' }}>Add to this order</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {availableAddOns.map(product => (
                                            <div key={product.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <div style={{
                                                    width: 60,
                                                    height: 60,
                                                    borderRadius: 'var(--radius-md)',
                                                    border: '1px solid var(--color-border)',
                                                    background: '#ffffff',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    overflow: 'hidden',
                                                    flexShrink: 0
                                                }}>
                                                    {product.image ? (
                                                        <img src={product.image} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    ) : (
                                                        <ShoppingBag size={24} color="var(--color-text-muted)" />
                                                    )}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{product.name}</div>
                                                    <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>${product.price.toFixed(2)}</div>
                                                </div>
                                                <Button
                                                    variant={selectedAddOnId === product.id ? "outline" : "secondary"}
                                                    onClick={() => toggleAddOn(product.id)}
                                                    disabled={addOnLoadingId === product.id}
                                                    style={{
                                                        width: '100px',
                                                        height: '40px',
                                                        fontSize: '0.9rem',
                                                        fontWeight: 600,
                                                        borderRadius: 'var(--radius-md)',
                                                        borderColor: selectedAddOnId === product.id ? '#ef4444' : 'var(--color-border)',
                                                        color: selectedAddOnId === product.id ? '#ef4444' : 'var(--color-text-main)',
                                                        backgroundColor: selectedAddOnId === product.id ? '#fff' : '#fff'
                                                    }}
                                                >
                                                    {addOnLoadingId === product.id ? (
                                                        <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                                                    ) : selectedAddOnId === product.id ? (
                                                        'Remove'
                                                    ) : (
                                                        'Add'
                                                    )}
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            */}

                                {/* Totals */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                                        <span>Subtotal</span>
                                        <span style={{ color: 'var(--color-text-main)', fontWeight: 500 }}>
                                            ${subtotal.toFixed(2)}
                                        </span>
                                    </div>
                                    {appliedDiscount && discountAmount > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#166534' }}>
                                            <span>Discount ({appliedDiscount.code})</span>
                                            <span style={{ fontWeight: 600 }}>
                                                -${discountAmount.toFixed(2)}
                                            </span>
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
                                                    {/* Shipping Cost Display Logic */}
                                                    {(currentProduct?.interval !== 'one_time' || (selectedAddOnProduct && selectedAddOnProduct.interval !== 'one_time')) ? (
                                                        /* Subscription Shipping ($14.00 -> FREE) */
                                                        <>
                                                            <span style={{ textDecoration: 'line-through', color: '#6b7280', marginRight: '0.5rem', fontSize: '0.9rem' }}>
                                                                $14.00
                                                            </span>
                                                            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#166534' }}>FREE</span>
                                                        </>
                                                    ) : (
                                                        /* One-time Shipping ($3.50 -> FREE) */
                                                        <>
                                                            <span style={{ textDecoration: 'line-through', color: '#6b7280', marginRight: '0.5rem', fontSize: '0.9rem' }}>
                                                                $3.50
                                                            </span>
                                                            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#166534' }}>FREE</span>
                                                        </>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-border)', alignItems: 'baseline' }}>
                                        <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>Total</span>
                                        <div style={{ textAlign: 'right' }}>
                                            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginRight: '0.5rem' }}>USD</span>
                                            <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                                                ${total.toFixed(2)}
                                            </span>
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
                                                            position: 'absolute',
                                                            bottom: '100%',
                                                            left: '50%',
                                                            transform: 'translateX(-50%)',
                                                            marginBottom: '0.75rem',
                                                            backgroundColor: '#1f2937',
                                                            color: '#fff',
                                                            padding: '0.75rem',
                                                            borderRadius: '0.375rem',
                                                            fontSize: '0.8rem',
                                                            width: '200px',
                                                            textAlign: 'center',
                                                            zIndex: 50,
                                                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                                                            lineHeight: '1.4',
                                                            pointerEvents: 'none'
                                                        }}>
                                                            Does not include shipping, tax, duties, or any applicable discounts.
                                                            {/* Arrow */}
                                                            <div style={{
                                                                position: 'absolute',
                                                                top: '100%',
                                                                left: '50%',
                                                                transform: 'translateX(-50%)',
                                                                borderWidth: '6px',
                                                                borderStyle: 'solid',
                                                                borderColor: '#1f2937 transparent transparent transparent'
                                                            }} />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <span>
                                                ${recurringSubtotal.toFixed(2)} {recurringIntervalText}
                                            </span>
                                        </div>
                                    )}

                                    {delivery.address && delivery.city && delivery.state && delivery.zip && !shippingLoading && (() => {
                                        const shippingSavings = (currentProduct?.interval !== 'one_time' || (selectedAddOnProduct && selectedAddOnProduct.interval !== 'one_time')) ? 14.00 : 3.50;
                                        const totalSavings = shippingSavings + discountAmount;
                                        return (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                                                <Tag size={16} />
                                                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>TOTAL SAVINGS</span>
                                                <span style={{ fontWeight: 700, fontSize: '0.9rem', marginLeft: '0.5rem' }}>
                                                    ${totalSavings.toFixed(2)}
                                                </span>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </>
                        )}
                    </div>
                </div>

            </div>


        </Layout >
    );
}
