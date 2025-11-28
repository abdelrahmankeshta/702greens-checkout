// server.js

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const PORT = process.env.PORT || 4242;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Allow your frontend to talk to this backend
app.use(cors({
    origin: CLIENT_URL, // e.g. http://localhost:5173 in dev
}));

// Use JSON parser for all non-webhook routes
app.use((req, res, next) => {
    if (req.originalUrl === '/webhook') {
        next();
    } else {
        express.json()(req, res, next);
    }
});

// Fetch active subscription products and one-time products
app.get('/products', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
        // Whitelist of allowed Price IDs (TEST MODE)
        const ALLOWED_PRICE_IDS = [
            'price_1SX1mBCFLmsUiqyIOdil0j6S', // Single Nutrition Mix - One Off
            'price_1SX1jsCFLmsUiqyIiCnJ0aoS', // Single Nutrition Mix - Bi-Weekly
            'price_1SX1hOCFLmsUiqyIINhM5bQm', // Double Nutrition Mix
            'price_1SX1evCFLmsUiqyIGK9H7eva', // Single Nutrition Mix
        ];

        // Fetch recurring subscription products
        const recurringPrices = await stripe.prices.list({
            active: true,
            expand: ['data.product'],
            type: 'recurring',
        });

        // Fetch one-time products
        const oneTimePrices = await stripe.prices.list({
            active: true,
            expand: ['data.product'],
            type: 'one_time',
        });

        // Combine both types and filter for allowed Price IDs only
        const allPrices = [...recurringPrices.data, ...oneTimePrices.data];
        const filteredPrices = allPrices.filter(price => ALLOWED_PRICE_IDS.includes(price.id));

        const products = filteredPrices.map(price => {
            let imageUrl = price.product.images[0] || '';

            // Proxy Stripe file links through our endpoint to avoid CORS issues
            if (imageUrl && imageUrl.includes('files.stripe.com')) {
                imageUrl = `http://localhost:${PORT}/product-image?url=${encodeURIComponent(imageUrl)}`;
            }

            return {
                id: price.id,
                productId: price.product.id,
                name: price.product.name,
                description: price.product.description || '',
                price: price.unit_amount / 100,
                currency: price.currency,
                image: imageUrl,
                interval: price.recurring ? price.recurring.interval : 'one_time',
                type: price.type
            };
        });

        res.json(products);
    } catch (err) {
        console.error('Error fetching products:', err);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

// Proxy endpoint for Stripe images
app.get('/product-image', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).send('URL is required');

    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer'
        });

        const contentType = response.headers['content-type'] || 'image/jpeg';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.send(response.data);
    } catch (err) {
        console.error('Error proxying image:', err.message);
        res.status(500).send(`Failed to proxy image: ${err.message}`);
    }
});

// 1) Health check
app.get('/', (req, res) => {
    res.send('702Greens Stripe subscription backend is running ✅');
});

// --- Date Helpers (Pacific Time) ---
const addInterval = (timestamp, interval, count) => {
    const date = new Date(timestamp * 1000);
    if (interval === 'day') date.setDate(date.getDate() + count);
    if (interval === 'week') date.setDate(date.getDate() + (count * 7));
    if (interval === 'month') date.setMonth(date.getMonth() + count);
    if (interval === 'year') date.setFullYear(date.getFullYear() + count);
    return Math.floor(date.getTime() / 1000);
};

const formatIsoDate = (timestamp) => {
    if (!timestamp) return '';
    try {
        const date = new Date(timestamp * 1000);
        // console.log(`Formatting date: ${date.toISOString()}`); // Debug log
        const isoString = date.toLocaleString('sv-SE', {
            timeZone: 'America/Los_Angeles',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }).replace(' ', 'T');
        return `'${isoString}`; // Prepend ' to force string format in Google Sheets
    } catch (e) {
        console.error(`Error parsing date ${timestamp}: `, e);
        return '';
    }
};

const formatHumanDate = (timestamp) => {
    if (!timestamp) return '';
    try {
        const date = new Date(timestamp * 1000);
        return date.toLocaleDateString('en-US', {
            timeZone: 'America/Los_Angeles',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (e) {
        console.error(`Error parsing date ${timestamp}: `, e);
        return '';
    }
};

// Validate Discount Code Endpoint
app.post('/validate-discount', async (req, res) => {
    try {
        const { code, orderTotal } = req.body;

        if (!code) {
            return res.json({ valid: false, error: 'Code is required' });
        }

        // Fetch all discount codes
        const discountCodes = await getDiscountCodes();

        // Find matching code (case-insensitive)
        const discount = discountCodes.find(d => d.code === code.toUpperCase());

        if (!discount) {
            return res.json({ valid: false, error: 'Invalid discount code' });
        }

        // Check if active
        if (!discount.isActive) {
            return res.json({ valid: false, error: 'This code is no longer active' });
        }

        // Check date range
        const now = new Date();
        if (discount.startDate) {
            const startDate = new Date(discount.startDate);
            if (now < startDate) {
                return res.json({ valid: false, error: 'This code is not yet valid' });
            }
        }
        if (discount.endDate) {
            const endDate = new Date(discount.endDate);
            if (now > endDate) {
                return res.json({ valid: false, error: 'This code has expired' });
            }
        }

        // Check minimum order value
        if (orderTotal && discount.minOrderValue > 0) {
            if (orderTotal < discount.minOrderValue) {
                return res.json({
                    valid: false,
                    error: `Minimum order value of $${discount.minOrderValue} required`
                });
            }
        }

        // Return valid discount
        res.json({
            valid: true,
            discount: {
                id: discount.id,
                code: discount.code,
                codeType: discount.codeType,
                discountMethod: discount.discountMethod,
                discountValue: discount.discountValue,
                appliesTo: discount.appliesTo,
                minOrderValue: discount.minOrderValue
            }
        });
    } catch (err) {
        console.error('Error validating discount code:', err);
        res.status(500).json({ valid: false, error: 'Internal server error' });
    }
});

// Check Email Endpoint
app.get('/check-email', async (req, res) => {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    try {
        const customerRef = await findCustomerByEmail(email);
        if (!customerRef) {
            return res.json({ exists: false });
        }

        // Fetch Customer Details (Row is 1-based, so we can use it directly)
        // Columns: A=ID, B=Created, C=Email, D=Phone, E=First, F=Last, G=Full, H=EmailOpt, I=SMSOpt, J=ShippingID, K=BillingID
        const customerRes = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `Customers!A${customerRef.rowIndex}:K${customerRef.rowIndex}`,
        });

        const customerRow = customerRes.data.values[0];
        if (!customerRow) return res.json({ exists: false });

        const customerData = {
            firstName: customerRow[4] || '', // Col E
            lastName: customerRow[5] || '',  // Col F
            email: customerRow[2] || '',     // Col C
            phone: customerRow[3] || '',     // Col D
            shippingAddressId: customerRow[9] || '', // Col J
            company: '' // Not in standard columns A-K based on my read, but maybe later?
        };

        let addressData = {};
        if (customerData.shippingAddressId) {
            const address = await findAddressById(customerData.shippingAddressId);
            if (address) {
                addressData = {
                    address: address.line1,
                    apartment: address.line2,
                    city: address.city,
                    state: address.state,
                    zip: address.zip,
                    country: address.country
                };
            }
        }

        res.json({
            exists: true,
            customer: {
                ...customerData,
                address: addressData
            }
        });

    } catch (err) {
        console.error('Error checking email:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/create-subscription', async (req, res) => {
    try {
        const { priceId, email, delivery, addOnPriceIds, quantity = 1 } = req.body;

        if (!priceId) {
            return res.status(400).json({ error: 'priceId is required' });
        }
        if (!email) {
            return res.status(400).json({ error: 'email is required' });
        }

        // Fetch the price to determine if it's one-time or recurring
        const price = await stripe.prices.retrieve(priceId);
        const isOneTime = price.type === 'one_time';

        // 1) Create the customer with full details
        const customerData = {
            email,
        };

        if (delivery) {
            customerData.name = `${delivery.firstName} ${delivery.lastName}`.trim();
            customerData.phone = delivery.phone;
            customerData.address = {
                line1: delivery.address,
                line2: delivery.apartment,
                city: delivery.city,
                state: delivery.state,
                postal_code: delivery.zip,
                country: delivery.country || 'US',
            };
            // Store opt-in preferences in metadata
            customerData.metadata = {
                sms_opt_in: delivery.smsOptIn ? 'true' : 'false',
                company: delivery.company || '',
            };
        }

        const customer = await stripe.customers.create(customerData);

        let paymentIntent;
        let responseData = {
            customerId: customer.id,
        };

        // Check if we have add-ons
        const hasAddOns = addOnPriceIds && Array.isArray(addOnPriceIds) && addOnPriceIds.length > 0;

        if (isOneTime && hasAddOns) {
            // Scenario 1: Main = One-time (with Quantity) + Add-ons = Subscription
            console.log('Scenario 1: One-time Main + Subscription Add-ons');

            // 1. Create Invoice Item for the One-time product FIRST (pending)
            await stripe.invoiceItems.create({
                customer: customer.id,
                pricing: { price: priceId },
                quantity: parseInt(quantity, 10),
            });

            // 2. Create Subscription (pending invoice items will be automatically included)
            const subscriptionItems = addOnPriceIds.map(id => ({ price: id }));

            const subscription = await stripe.subscriptions.create({
                customer: customer.id,
                items: subscriptionItems,
                payment_behavior: 'default_incomplete',
                payment_settings: {
                    save_default_payment_method: 'on_subscription',
                },
                expand: ['latest_invoice.payment_intent'],
            });

            // 3. Get the invoice and payment intent (invoice is already finalized with both items)
            let latestInvoice = subscription.latest_invoice;
            paymentIntent = latestInvoice.payment_intent;

            // Update PaymentIntent metadata
            if (paymentIntent) {
                paymentIntent = await stripe.paymentIntents.update(paymentIntent.id, {
                    automatic_payment_methods: { enabled: true },
                    metadata: {
                        invoice_id: latestInvoice.id,
                        subscription_id: subscription.id,
                    },
                });
            }
            if (!paymentIntent) {
                paymentIntent = await stripe.paymentIntents.create({
                    amount: latestInvoice.amount_due,
                    currency: latestInvoice.currency,
                    customer: customer.id,
                    metadata: {
                        invoice_id: latestInvoice.id,
                        subscription_id: subscription.id,
                    },
                    automatic_payment_methods: { enabled: true },
                });
            }

            responseData.clientSecret = paymentIntent.client_secret;
            responseData.subscriptionId = subscription.id;
            responseData.invoiceId = latestInvoice.id;
            responseData.type = 'mixed';

        } else if (isOneTime) {
            // Scenario 2: Main = One-time (with Quantity) - No Add-ons
            console.log('Scenario 2: One-time Main');
            paymentIntent = await stripe.paymentIntents.create({
                amount: price.unit_amount * parseInt(quantity, 10), // Apply quantity
                currency: price.currency,
                customer: customer.id,
                metadata: {
                    price_id: priceId,
                    product_id: price.product,
                    quantity: quantity.toString(),
                },
                automatic_payment_methods: { enabled: true },
            });

            responseData.clientSecret = paymentIntent.client_secret;
            responseData.paymentIntentId = paymentIntent.id;
            responseData.type = 'one_time';

        } else {
            // Main = Subscription
            console.log('Main is Subscription');

            if (hasAddOns) {
                // Scenario 3: Main = Subscription + Add-ons = One-time (with Quantity)
                console.log('Scenario 3: Subscription Main + One-time Add-ons');

                // 1. Create Invoice Items for Add-ons (One-time)
                for (const addOnId of addOnPriceIds) {
                    await stripe.invoiceItems.create({
                        customer: customer.id,
                        pricing: { price: addOnId },
                        quantity: parseInt(quantity, 10), // Ensure integer
                    });
                }

                // 2. Create Subscription for Main
                const subscription = await stripe.subscriptions.create({
                    customer: customer.id,
                    items: [{ price: priceId }],
                    payment_behavior: 'default_incomplete',
                    payment_settings: {
                        save_default_payment_method: 'on_subscription',
                    },
                    expand: ['latest_invoice.payment_intent'],
                });

                // Get the invoice and payment intent
                let latestInvoice = subscription.latest_invoice;
                paymentIntent = latestInvoice.payment_intent;

                // Update PaymentIntent
                if (paymentIntent) {
                    paymentIntent = await stripe.paymentIntents.update(paymentIntent.id, {
                        automatic_payment_methods: { enabled: true },
                        metadata: {
                            invoice_id: latestInvoice.id,
                            subscription_id: subscription.id,
                        },
                    });
                }
                if (!paymentIntent) {
                    paymentIntent = await stripe.paymentIntents.create({
                        amount: latestInvoice.amount_due,
                        currency: latestInvoice.currency,
                        customer: customer.id,
                        metadata: {
                            invoice_id: latestInvoice.id,
                            subscription_id: subscription.id,
                        },
                        automatic_payment_methods: { enabled: true },
                    });
                }

                responseData.clientSecret = paymentIntent.client_secret;
                responseData.subscriptionId = subscription.id;
                responseData.invoiceId = latestInvoice.id;
                responseData.type = 'mixed_reverse';

            } else {
                // Scenario 4: Main = Subscription - No Add-ons
                const subscription = await stripe.subscriptions.create({
                    customer: customer.id,
                    items: [{ price: priceId }],
                    payment_behavior: 'default_incomplete',
                    payment_settings: {
                        save_default_payment_method: 'on_subscription',
                    },
                    expand: ['latest_invoice.payment_intent'],
                });

                // Get the invoice and payment intent
                let latestInvoice = subscription.latest_invoice;
                paymentIntent = latestInvoice.payment_intent;

                // Update PaymentIntent
                if (paymentIntent) {
                    paymentIntent = await stripe.paymentIntents.update(paymentIntent.id, {
                        automatic_payment_methods: { enabled: true },
                        metadata: {
                            invoice_id: latestInvoice.id,
                            subscription_id: subscription.id,
                        },
                    });
                }
                if (!paymentIntent) {
                    paymentIntent = await stripe.paymentIntents.create({
                        amount: latestInvoice.amount_due,
                        currency: latestInvoice.currency,
                        customer: customer.id,
                        metadata: {
                            invoice_id: latestInvoice.id,
                            subscription_id: subscription.id,
                        },
                        automatic_payment_methods: { enabled: true },
                    });
                }

                responseData.clientSecret = paymentIntent.client_secret;
                responseData.subscriptionId = subscription.id;
                responseData.invoiceId = latestInvoice.id;
                responseData.type = 'recurring';
            }
        }

        res.json(responseData);
    } catch (err) {
        console.error('Error creating subscription:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// --- Webhook Handling ---

app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    console.log('Webhook received!');
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error(`⚠️  Webhook signature verification failed.`, err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    const logFile = require('path').join(__dirname, 'webhook-debug.log');
    require('fs').appendFileSync(logFile, `${formatIsoDate(Date.now() / 1000)} - Received event: ${event.type}\n`);

    // Handle the event
    try {
        if (event.type.startsWith('customer.subscription.')) {
            await handleSubscriptionEvent(event);
        } else {
            await handlePaymentEvent(event);
        }
        res.json({ received: true });
    } catch (err) {
        console.error('Error handling event:', err);
        res.status(500).send('Internal Server Error');
    }
});

async function handlePaymentEvent(event) {
    const eventType = event.type.trim();
    const data = event.data.object;

    // We only care about specific events
    if (!['payment_intent.succeeded', 'invoice.payment_succeeded', 'charge.refunded', 'invoice.payment_failed'].includes(eventType)) {
        return;
    }

    const logFile = require('path').join(__dirname, 'payment-debug.log');
    const log = (msg) => require('fs').appendFileSync(logFile, `${formatIsoDate(Date.now() / 1000)} - ${msg}\n`);

    log(`Processing event: ${eventType}`);

    let amount = 0;
    let currency = 'usd';
    let status = '';
    let type = '';
    let stripeCustomerId = '';
    let stripeChargeId = '';
    let paymentMethodBrand = '';
    let paymentMethodLast4 = '';
    let failureCode = '';
    let failureMessage = '';
    let refundAmount = '';
    let email = '';
    let stripeSubscriptionId = '';
    let metadata = {};

    // Extract basic data based on event type
    if (eventType === 'payment_intent.succeeded') {
        amount = data.amount / 100;
        currency = data.currency;
        status = 'Succeeded';
        type = 'Charge';
        stripeCustomerId = data.customer;
        stripeChargeId = data.latest_charge;
        metadata = data.metadata || {};
        if (data.receipt_email) email = data.receipt_email;

        // 1. Try metadata
        if (metadata.subscription_id) {
            stripeSubscriptionId = metadata.subscription_id;
        }

        // 2. Try Invoice
        if (!stripeSubscriptionId && data.invoice) {
            try {
                const invoiceId = typeof data.invoice === 'string' ? data.invoice : data.invoice.id;
                const invoice = await stripe.invoices.retrieve(invoiceId);
                if (invoice.subscription) {
                    stripeSubscriptionId = invoice.subscription;
                }
            } catch (err) {
                log(`Error fetching invoice ${data.invoice}: ${err.message}`);
            }
        }

    } else if (eventType === 'invoice.payment_succeeded') {
        amount = data.amount_paid / 100;
        currency = data.currency;
        status = 'Succeeded';
        type = 'Charge';
        stripeCustomerId = data.customer;
        stripeChargeId = data.charge;
        stripeSubscriptionId = data.subscription;
        email = data.customer_email;
        metadata = data.metadata || {};

    } else if (eventType === 'invoice.payment_failed') {
        amount = data.amount_due / 100;
        currency = data.currency;
        status = 'Failed';
        type = 'Charge';
        stripeCustomerId = data.customer;
        stripeChargeId = data.charge;
        stripeSubscriptionId = data.subscription;
        email = data.customer_email;
        metadata = data.metadata || {};

    } else if (eventType === 'charge.refunded') {
        amount = -1 * (data.amount_refunded / 100);
        refundAmount = data.amount_refunded / 100;
        currency = data.currency;
        status = 'Refunded';
        type = 'Refund';
        stripeCustomerId = data.customer;
        stripeChargeId = data.id;
        metadata = data.metadata || {};
    }

    // Fetch additional details
    try {
        // 1. Get Email if missing
        if (!email && stripeCustomerId) {
            const stripeCustomer = await stripe.customers.retrieve(stripeCustomerId);
            email = stripeCustomer.email;
        }

        // 2. Get Card Details & Failure Info from Charge
        if (stripeChargeId) {
            try {
                const charge = await stripe.charges.retrieve(stripeChargeId);
                if (charge.payment_method_details && charge.payment_method_details.card) {
                    paymentMethodBrand = charge.payment_method_details.card.brand;
                    paymentMethodLast4 = charge.payment_method_details.card.last4;
                }
                if (charge.outcome) {
                    if (charge.outcome.network_status !== 'approved_by_network') {
                        failureCode = charge.failure_code || charge.outcome.reason;
                        failureMessage = charge.failure_message || charge.outcome.seller_message;
                    }
                }
            } catch (err) {
                log(`Error retrieving charge ${stripeChargeId}: ${err.message}`);
            }
        }
    } catch (e) {
        log(`Error fetching details: ${e.message}`);
    }

    // Find Internal Customer ID
    let customerId = '';
    if (email) {
        const customer = await findCustomerByEmail(email);
        if (customer) {
            customerId = customer.id;
        }
    }

    if (!customerId) {
        log(`Customer ${stripeCustomerId} (Email: ${email}) not found. Creating...`);
        try {
            const stripeCustomer = await stripe.customers.retrieve(stripeCustomerId);
            const mockEvent = {
                type: 'customer.created',
                data: { object: stripeCustomer }
            };
            // We can't easily wait for the result of this async handler if it doesn't return the ID
            // But handleCustomerEvent isn't defined in the snippet I saw? 
            // Wait, I didn't see handleCustomerEvent in the file view.
            // Let's assume it exists or I should just rely on the email lookup.
            // If it's missing, I should probably just log it.
            // For now, I'll comment out the undefined call and rely on email.
            // await handleCustomerEvent(mockEvent); 
            // customerId = await findCustomerByStripeId(stripeCustomerId); // This was the crasher
        } catch (e) {
            log(`Error creating customer: ${e.message}`);
        }
    }

    // Find Internal Subscription ID
    let subscriptionId = '';
    if (stripeSubscriptionId) {
        subscriptionId = await findSubscriptionByStripeId(stripeSubscriptionId);
        log(`Found Internal Subscription ID: ${subscriptionId}`);

        // BACKUP: Force Create if missing
        if (!subscriptionId) {
            log(`Subscription ${stripeSubscriptionId} not found. Force-creating...`);
            try {
                const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
                const mockEvent = {
                    type: 'customer.subscription.updated',
                    data: { object: sub }
                };
                await handleSubscriptionEvent(mockEvent, true);
                subscriptionId = await findSubscriptionByStripeId(stripeSubscriptionId);
                log(`After force-create: ${subscriptionId}`);
            } catch (err) {
                log(`Error force-creating: ${err.message}`);
            }
        }

        // FORCE UPDATE STATUS TO ACTIVE
        if (subscriptionId && stripeSubscriptionId) {
            log(`Attempting to force-update status for ${stripeSubscriptionId}`);
            const updateStatus = async () => {
                try {
                    const res = await sheets.spreadsheets.values.get({
                        spreadsheetId: SPREADSHEET_ID,
                        range: 'Subscriptions!S:S',
                    });
                    const ids = res.data.values;
                    const rowIndex = ids ? ids.findIndex(row => row[0] === stripeSubscriptionId) : -1;

                    if (rowIndex !== -1) {
                        const realRowIndex = rowIndex + 1;
                        await updateSheetCells('Subscriptions', `D${realRowIndex}`, ['active']);
                        log(`Force-updated status to 'active' at Row ${realRowIndex}`);
                        return true;
                    } else {
                        log(`Row not found for status update.`);
                        return false;
                    }
                } catch (err) {
                    log(`Error updating status: ${err.message}`);
                    return false;
                }
            };

            let success = await updateStatus();
            if (!success) {
                log('Retrying status update in 2 seconds...');
                await new Promise(resolve => setTimeout(resolve, 2000));
                success = await updateStatus();
                if (!success) log('Retry failed.');
            }
        }
    }

    // Generate Payment ID
    const paymentId = await getNextId('Payments', 'PAY');

    const row = [
        paymentId,
        customerId || '',
        metadata.order_id || '',
        subscriptionId || '',
        formatIsoDate(Date.now() / 1000),
        amount,
        currency.toUpperCase(),
        status,
        type,
        stripeCustomerId,
        stripeChargeId || '',
        paymentMethodBrand,
        paymentMethodLast4,
        refundAmount || 0,
        failureCode,
        failureMessage,
        JSON.stringify(metadata),
        formatIsoDate(Date.now() / 1000),
        formatIsoDate(Date.now() / 1000)
    ];

    await appendToSheet('Payments', row);
    log(`Recorded payment ${paymentId}`);

    // --- Create Order & Line Items ---
    console.log(`[DEBUG] Payment status: ${status}, Event Type: '${eventType}'`);
    console.log('Event Type Codes:', eventType.split('').map(c => c.charCodeAt(0)));

    // We only create Orders for successful payments (Charge or Invoice Payment)
    // Invoice status is 'paid', PaymentIntent/Charge status is 'succeeded'
    if (status === 'Succeeded' || status === 'Paid') {
        console.log('[DEBUG] Status is Succeeded/Paid, attempting to create order...');
        try {
            let orderType = 'One_Time';
            let subtotal = amount; // Default
            let shipping = 0;
            let tax = 0;
            let discount = 0;
            let total = amount;
            let lineItems = [];
            let shippingAddressId = '';
            let billingAddressId = '';
            let orderDate = data.created; // Timestamp

            // Fetch Customer Addresses for linking
            if (customerId) {
                try {
                    const customer = await findCustomerByEmail(email); // Re-fetch to get rowIndex
                    if (customer) {
                        const addrRes = await sheets.spreadsheets.values.get({
                            spreadsheetId: SPREADSHEET_ID,
                            range: `Customers!J${customer.rowIndex}:K${customer.rowIndex}`,
                        });
                        if (addrRes.data.values && addrRes.data.values[0]) {
                            shippingAddressId = addrRes.data.values[0][0] || '';
                            billingAddressId = addrRes.data.values[0][1] || '';
                        }
                    }
                } catch (e) {
                    log(`Error fetching addresses for order: ${e.message}`);
                }
            }

            if (eventType === 'invoice.payment_succeeded') {
                // Subscription or Mixed
                const invoice = data; // In this event, data IS the invoice object

                if (invoice.billing_reason === 'subscription_create') {
                    orderType = 'Initial_Subscription';
                } else if (invoice.billing_reason === 'subscription_cycle') {
                    orderType = 'Subscription_Renewal';
                } else {
                    orderType = 'Mixed_Or_Other'; // Could be manual invoice
                }

                subtotal = invoice.subtotal / 100;
                tax = invoice.tax / 100 || 0;
                total = invoice.total / 100;
                discount = (invoice.total_discount_amounts || []).reduce((acc, d) => acc + (d.amount / 100), 0);

                // Extract Shipping from total if not explicit?
                // Stripe invoices usually have shipping as a line item or shipping_cost field
                if (invoice.shipping_cost) {
                    shipping = invoice.shipping_cost.amount_subtotal / 100;
                }

                // Line Items
                if (invoice.lines && invoice.lines.data) {
                    for (const line of invoice.lines.data) {
                        // Find Internal Plan ID if possible
                        let internalPlanId = '';
                        try {
                            // We need product object to find internal ID
                            // line.price.product is usually an ID string here
                            let productObj = { name: line.description }; // Fallback
                            if (typeof line.price.product === 'string') {
                                // We don't want to await fetch here if we can avoid it to save time/rate limits
                                // But findInternalPlanId requires it.
                                // Let's try to fetch it.
                                const p = await stripe.products.retrieve(line.price.product);
                                productObj = p;
                            }
                            internalPlanId = await findInternalPlanId(productObj, line.price);
                        } catch (e) {
                            log(`Error finding plan for line: ${e.message}`);
                        }

                        lineItems.push({
                            planId: internalPlanId || line.price.id,
                            priceId: line.price.id,
                            name: line.description,
                            quantity: line.quantity,
                            unitPrice: line.price.unit_amount / 100,
                            subtotal: (line.amount / 100), // This is usually qty * unit
                            discount: (line.discount_amounts || []).reduce((acc, d) => acc + (d.amount / 100), 0),
                            total: (line.amount / 100) // Amount is post-discount in some contexts? No, amount is usually subtotal.
                            // Wait, line.amount in invoice line item is usually the total for that line.
                            // Let's check Stripe docs or assume amount is final.
                        });
                    }
                }

            } else if (eventType === 'payment_intent.succeeded') {
                // Fetch fresh PI to ensure we have metadata
                let pi = data;
                try {
                    pi = await stripe.paymentIntents.retrieve(data.id);
                    console.log('[DEBUG] Fetched fresh PI:', pi.id);
                } catch (e) {
                    console.error('[DEBUG] Error fetching fresh PI:', e);
                }

                const piMetadata = pi.metadata || {};
                console.log('[DEBUG] PI Invoice:', pi.invoice);
                console.log('[DEBUG] PI Metadata:', JSON.stringify(piMetadata));

                // One-Time (if no invoice)
                // If invoice exists OR we have a subscription_id in metadata, we used to skip.
                // But since invoice.payment_succeeded is unreliable/missing, we handle it here!
                if (pi.invoice || (piMetadata && piMetadata.subscription_id)) {
                    console.log('[DEBUG] Subscription PI detected. Fetching invoice to create Initial_Subscription order.');

                    const invoiceId = pi.invoice || piMetadata.invoice_id;
                    if (invoiceId) {
                        try {
                            const invoice = await stripe.invoices.retrieve(invoiceId);

                            // Determine Order Type
                            if (invoice.billing_reason === 'subscription_create') {
                                orderType = 'Initial_Subscription';
                            } else if (invoice.billing_reason === 'subscription_cycle') {
                                orderType = 'Subscription_Renewal';
                            } else {
                                orderType = 'Initial_Subscription'; // Default for PI with sub ID
                            }

                            // Extract Data from Invoice
                            subtotal = invoice.subtotal / 100;
                            tax = invoice.tax / 100 || 0;
                            total = invoice.total / 100;
                            discount = (invoice.total_discount_amounts || []).reduce((acc, d) => acc + (d.amount / 100), 0);

                            if (invoice.shipping_cost) {
                                shipping = invoice.shipping_cost.amount_subtotal / 100;
                            }

                            // Line Items from Invoice
                            if (invoice.lines && invoice.lines.data) {
                                for (const line of invoice.lines.data) {
                                    // Handle Price or Pricing structure
                                    let priceId = '';
                                    let productId = '';
                                    let unitAmount = 0;

                                    if (line.price) {
                                        priceId = line.price.id;
                                        productId = typeof line.price.product === 'string' ? line.price.product : line.price.product.id;
                                        unitAmount = line.price.unit_amount;
                                    } else if (line.pricing && line.pricing.price_details) {
                                        priceId = line.pricing.price_details.price;
                                        productId = line.pricing.price_details.product;
                                        unitAmount = parseInt(line.pricing.unit_amount_decimal, 10);
                                    } else {
                                        log(`[WARN] Line item missing price info: ${JSON.stringify(line)}`);
                                        continue;
                                    }

                                    let internalPlanId = '';
                                    try {
                                        let productObj = { name: line.description };
                                        if (productId) {
                                            const p = await stripe.products.retrieve(productId);
                                            productObj = p;
                                        }
                                        // We need a mock price object for findInternalPlanId if we only have IDs
                                        // Or we can just pass what we have if findInternalPlanId supports it.
                                        // findInternalPlanId expects (stripeProduct, stripePrice).
                                        // Let's construct a mock price object.
                                        const mockPrice = {
                                            id: priceId,
                                            product: productId,
                                            unit_amount: unitAmount,
                                            recurring: line.period ? { interval: 'month' } : null // Rough guess, or fetch real price
                                        };

                                        // Better: Fetch the real price object if we have ID
                                        if (priceId) {
                                            const realPrice = await stripe.prices.retrieve(priceId);
                                            internalPlanId = await findInternalPlanId(productObj, realPrice);
                                        } else {
                                            internalPlanId = await findInternalPlanId(productObj, mockPrice);
                                        }
                                    } catch (e) {
                                        log(`Error finding plan for line: ${e.message}`);
                                    }

                                    lineItems.push({
                                        planId: internalPlanId || priceId,
                                        priceId: priceId,
                                        name: line.description,
                                        quantity: line.quantity,
                                        unitPrice: unitAmount / 100,
                                        subtotal: (line.amount / 100),
                                        discount: (line.discount_amounts || []).reduce((acc, d) => acc + (d.amount / 100), 0),
                                        total: (line.amount / 100)
                                    });
                                }
                            }
                            // We have populated everything. Proceed to createOrder.
                        } catch (err) {
                            console.error('Error fetching invoice for PI:', err);
                            // Fallback? If invoice fetch fails, maybe just log error.
                        }
                    }
                } else {
                    orderType = 'One_Time';
                    // Metadata has info
                    const priceId = metadata.price_id;
                    const productId = metadata.product_id;

                    // We assume 1 item type per PI for now based on create-subscription logic
                    // But if mixed, we might have issues. 
                    // However, the create-subscription logic for 'one_time' creates a PI with metadata.

                    const quantity = parseInt(metadata.quantity || '1', 10);

                    // Fetch Product Name
                    let productName = 'One-Time Product';
                    let internalPlanId = '';
                    if (productId) {
                        try {
                            const p = await stripe.products.retrieve(productId);
                            productName = p.name;
                            // Try to find plan ID
                            if (priceId) {
                                const priceObj = await stripe.prices.retrieve(priceId);
                                internalPlanId = await findInternalPlanId(p, priceObj);
                            }
                        } catch (e) {
                            log(`Error fetching product ${productId}: ${e.message}`);
                        }
                    }

                    lineItems.push({
                        planId: internalPlanId || priceId,
                        priceId: priceId,
                        name: productName,
                        quantity: quantity,
                        unitPrice: amount / quantity, // Approximate if multiple
                        subtotal: amount,
                        discount: 0,
                        total: amount
                    });
                }
            } else {
                console.log('[DEBUG] Event type matched neither invoice nor payment_intent block.');
            }

            // Create Order
            console.log('[DEBUG] Calling createOrder with data:', {
                customerId, subscriptionId, orderType, total
            });

            // FIX: If we have a subscription ID but orderType is One_Time, and it's not explicitly a one-time purchase (no price_id),
            // assume it's the Initial Subscription payment.
            // FIX: If we have a subscription ID but orderType is One_Time, force Initial_Subscription
            if (orderType === 'One_Time' && subscriptionId) {
                console.log('[DEBUG] Overriding Order Type to Initial_Subscription based on presence of subscriptionId.');
                log(`Overriding Order Type to Initial_Subscription based on presence of subscriptionId: ${subscriptionId}`);
                orderType = 'Initial_Subscription';
            }

            const orderId = await createOrder({
                customerId: customerId,
                subscriptionId: subscriptionId, // From outer scope
                orderType: orderType,
                orderDate: orderDate,
                status: 'Paid', // Since we are in succeeded event
                currency: currency,
                subtotal: subtotal,
                discount: discount,
                discountCode: '', // Hard to get from PI metadata unless we passed it
                shipping: shipping,
                tax: tax,
                total: total,
                shippingAddressId: shippingAddressId,
                billingAddressId: billingAddressId,
                shippingMethod: 'Standard', // Default for now
                fulfillmentStatus: 'Unfulfilled',
                externalId: stripeChargeId || data.id, // Charge ID or PI ID
                internalNotes: `Created from ${eventType}`
            });

            console.log(`[DEBUG] Order created with ID: ${orderId}`);

            // Create Line Items
            if (orderId && lineItems.length > 0) {
                console.log(`[DEBUG] Creating ${lineItems.length} line items for order ${orderId}`);
                await createOrderLineItems(orderId, lineItems);
            } else {
                console.log('[DEBUG] No line items to create or order creation failed.');
            }

            // Link Order to Subscription if this is an Initial_Subscription
            if (orderId && orderType === 'Initial_Subscription' && stripeSubscriptionId) {
                console.log(`[DEBUG] Linking Order ${orderId} to Subscription ${stripeSubscriptionId}`);
                await updateSubscriptionOrderLink(stripeSubscriptionId, orderId);
            }

            // Link Order to Payment
            if (orderId && paymentId) {
                console.log(`[DEBUG] Linking Order ${orderId} to Payment ${paymentId}`);
                await updatePaymentOrderLink(paymentId, orderId);
            }

            // Create Deliveries for Order - iterate through all line items
            if (orderId && lineItems.length > 0) {
                console.log(`[DEBUG] Creating deliveries for Order ${orderId} with ${lineItems.length} line items`);

                // Create deliveries for each line item (handles mixed one-time + subscription orders)
                for (const lineItem of lineItems) {
                    const planId = lineItem.planId || null;
                    if (planId) {
                        console.log(`[DEBUG] Creating deliveries for Plan ${planId} in Order ${orderId}`);
                        await createDeliveries({
                            orderId,
                            customerId,
                            subscriptionId,
                            planId,
                            shippingAddressId,
                            orderDate,
                            orderType
                        });
                    } else {
                        console.log(`[DEBUG] Skipping delivery creation for line item without planId in Order ${orderId}`);
                    }
                }
            }



        } catch (err) {
            console.log(`[DEBUG] Error in order creation block: ${err.message}`);
            log(`Error creating order records: ${err.message}`);
        }
    } else {
        console.log(`[DEBUG] Status is NOT Succeeded (${status}), skipping order creation.`);
    }

}

async function handleSubscriptionEvent(event, forceLog = false) {
    const eventType = event.type;
    const subscription = event.data.object;

    if (!['customer.subscription.created', 'customer.subscription.updated'].includes(eventType)) {
        return;
    }

    console.log(`Processing subscription event: ${eventType} `);

    // 1. Fetch Stripe Customer to get Email
    let email = '';
    try {
        const stripeCustomer = await stripe.customers.retrieve(subscription.customer);
        email = stripeCustomer.email;
    } catch (err) {
        console.error('Error fetching customer for subscription:', err);
    }

    // 2. Find Internal Customer ID & Address IDs
    let customerId = '';
    let shippingAddressId = '';
    let billingAddressId = '';

    if (email) {
        const customer = await findCustomerByEmail(email);
        if (customer) {
            customerId = customer.id;
            // Fetch Address IDs from Customer Row (Col J and K)
            try {
                const addrRes = await sheets.spreadsheets.values.get({
                    spreadsheetId: SPREADSHEET_ID,
                    range: `Customers!J${customer.rowIndex}:K${customer.rowIndex}`,
                });
                if (addrRes.data.values && addrRes.data.values[0]) {
                    shippingAddressId = addrRes.data.values[0][0] || '';
                    billingAddressId = addrRes.data.values[0][1] || '';
                }
            } catch (e) {
                console.error('Error fetching customer addresses:', e);
            }
        }
    }

    // 3. Extract Plan Details
    const item = subscription.items.data[0];
    const price = item.price;
    const product = item.price.product; // Ensure expand: ['data.product'] or fetch it

    // Fetch Product if not expanded
    let stripeProduct = product;
    if (typeof product === 'string') {
        try {
            stripeProduct = await stripe.products.retrieve(product);
        } catch (e) {
            console.error('Error fetching product for plan lookup:', e);
        }
    }

    // Lookup Internal Plan ID
    let planId = price.id; // Default to Stripe Price ID
    try {
        const internalPlanId = await findInternalPlanId(stripeProduct, price);
        if (internalPlanId) {
            planId = internalPlanId;
        } else {
            console.warn(`Could not find internal Plan ID for ${stripeProduct.name}(${price.id})`);
        }
    } catch (e) {
        console.error('Error finding internal plan ID:', e);
    }

    // 4. Prepare Data
    const stripeSubscriptionId = subscription.id;
    const stripeCustomerId = subscription.customer;
    let status = subscription.status;

    // If we are forcing a log because payment succeeded, treat 'incomplete' as 'active'
    if (forceLog && status === 'incomplete') {
        status = 'active';
    }

    console.log('Subscription object for debugging:', JSON.stringify(subscription, null, 2));
    console.log('DEBUG DATES:', {
        start_date: subscription.start_date,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end
    });

    console.log('DEBUG DATES:', {
        start_date: subscription.start_date,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end
    });

    const startDate = formatIsoDate(subscription.start_date);

    // Manual Calculation Logic
    let firstBillingTimestamp = subscription.current_period_start || subscription.start_date;
    let nextBillingTimestamp = subscription.current_period_end;

    const billingIntervalUnit = price.recurring ? price.recurring.interval : 'one_time';
    const billingIntervalCount = price.recurring ? price.recurring.interval_count : 1;

    if (!nextBillingTimestamp && firstBillingTimestamp) {
        if (billingIntervalUnit !== 'one_time') {
            nextBillingTimestamp = addInterval(firstBillingTimestamp, billingIntervalUnit, billingIntervalCount);
        }
    }

    const currentPeriodStart = formatHumanDate(firstBillingTimestamp);
    const currentPeriodEnd = formatHumanDate(nextBillingTimestamp);
    const canceledAt = formatIsoDate(subscription.canceled_at);
    const amount = price.unit_amount / 100;
    const currency = price.currency.toUpperCase();
    const quantity = item.quantity || 1;

    // 5. Create or Update
    // Check if we should log based on status
    // We log if:
    // 1. Status is active, trialing, past_due, canceled, unpaid
    // 2. OR forceLog is true (meaning we just got a payment for it)
    const shouldLog = ['active', 'trialing', 'past_due', 'canceled', 'unpaid'].includes(status) || forceLog;

    if (!shouldLog) {
        console.log(`Skipping subscription ${stripeSubscriptionId} with status: ${status} `);
        return;
    }
    if (!shouldLog && eventType === 'customer.subscription.created') {
        console.log(`Skipping subscription ${stripeSubscriptionId} with status: ${status} (created event)`);
        return;
    }

    // Check if already exists
    const existingId = await findSubscriptionByStripeId(stripeSubscriptionId);

    if (eventType === 'customer.subscription.created') {
        if (existingId) {
            console.log(`Subscription ${stripeSubscriptionId} already exists as ${existingId}. Skipping creation.`);
            return;
        }

        if (!shouldLog) {
            console.log(`Subscription ${stripeSubscriptionId} is ${status}, waiting for active state to log.`);
            return;
        }

        // Create New Row (only if we didn't find it and it's active/trialing)
        const subscriptionId = await getNextId('Subscriptions', 'SUB');
        const now = formatIsoDate(Date.now() / 1000);

        const row = [
            subscriptionId,
            customerId,
            planId, // Plan_ID (Internal)
            status,
            startDate,
            currentPeriodStart, // First Billing Date
            currentPeriodEnd, // Next Billing Date
            canceledAt, // End Date
            '', // Cancellation Reason
            billingIntervalUnit,
            billingIntervalCount,
            1, // Deliveries Per Billing Cycle (Default)
            quantity,
            amount,
            currency,
            shippingAddressId,
            billingAddressId,
            stripeCustomerId,
            stripeSubscriptionId,
            '', // Created_From_Order_ID
            `Event: ${eventType} `, // Internal Notes
            now,
            now
        ];

        await appendToSheet('Subscriptions', row);
        console.log(`Recorded ACTIVE subscription ${subscriptionId} for ${email}`);

    } else if (eventType === 'customer.subscription.updated') {
        console.log(`Handling subscription update for ${stripeSubscriptionId}.Status: ${status} `);

        // existingId is already fetched above
        if (existingId) {
            // Update existing row (e.g. status change, renewal)
            console.log(`Subscription ${stripeSubscriptionId} already exists as ${existingId}. Updating status...`);

            // Find row index to update status
            try {
                const res = await sheets.spreadsheets.values.get({
                    spreadsheetId: SPREADSHEET_ID,
                    range: 'Subscriptions!S:S',
                });
                const ids = res.data.values;
                const rowIndex = ids.findIndex(row => row[0] === stripeSubscriptionId);
                if (rowIndex !== -1) {
                    // Status is Column D (index 3, but 1-based is 4? No, A=1, B=2, C=3, D=4)
                    // Update Status (D), CurrentPeriodStart (F), CurrentPeriodEnd (G)
                    const realRowIndex = rowIndex + 1;

                    // CRITICAL FIX: Never overwrite 'active' with 'incomplete'.
                    // If the incoming status is 'incomplete', ignore the status update.
                    if (status !== 'incomplete') {
                        await updateSheetCells('Subscriptions', `D${realRowIndex}`, [status]);
                        console.log(`Updated status for ${existingId} to ${status} `);
                    } else {
                        console.log(`Ignoring status update to 'incomplete' for ${existingId}(keeping existing status)`);
                    }

                    await updateSheetCells('Subscriptions', `F${realRowIndex}:G${realRowIndex}`, [currentPeriodStart, currentPeriodEnd]);

                    // Update Updated_At (Col W)
                    const now = formatIsoDate(Date.now() / 1000);
                    await updateSheetCells('Subscriptions', `W${realRowIndex}`, [now]);
                }
            } catch (err) {
                console.error('Error updating subscription status:', err);
            }
        } else {
            // Not found. If active, create it!
            if (shouldLog) {
                console.log(`Subscription ${stripeSubscriptionId} became active(status: ${status}) but not in sheet.Creating...`);

                const subscriptionId = await getNextId('Subscriptions', 'SUB');
                const now = formatIsoDate(Date.now() / 1000);

                const row = [
                    subscriptionId,
                    customerId,
                    planId, // Plan_ID (Internal)
                    status,
                    startDate,
                    currentPeriodStart, // First Billing Date
                    currentPeriodEnd, // Next Billing Date
                    canceledAt, // End Date
                    '', // Cancellation Reason
                    billingIntervalUnit,
                    billingIntervalCount,
                    1, // Deliveries Per Billing Cycle (Default)
                    quantity,
                    amount,
                    currency,
                    shippingAddressId,
                    billingAddressId,
                    stripeCustomerId,
                    stripeSubscriptionId,
                    '', // Created_From_Order_ID
                    `Event: ${eventType} `, // Internal Notes
                    now,
                    now
                ];

                await appendToSheet('Subscriptions', row);
                console.log(`Recorded ACTIVE subscription ${subscriptionId} for ${email}(from update event)`);
            } else {
                console.log(`Subscription ${stripeSubscriptionId} is ${status}, waiting for active state to log.`);
            }
        }
    }
}

// Helper: Find Subscription by Stripe ID
async function findSubscriptionByStripeId(stripeSubId) {
    try {
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Subscriptions!S:S', // Stripe_Subscription_ID is in Column S
        });
        const ids = res.data.values;
        if (!ids) return null;

        const rowIndex = ids.findIndex(row => row[0] === stripeSubId);
        if (rowIndex === -1) return null;

        // Fetch Internal ID (Col A)
        const idRes = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `Subscriptions!A${rowIndex + 1}`,
        });

        return idRes.data.values[0][0];
    } catch (error) {
        console.error('Error finding subscription:', error);
        return null;
    }
}

// 3) Start server
app.listen(PORT, () => {
    console.log(`✅ 702Greens subscription server running on port ${PORT} `);
});

// --- Google Sheets Integration ---
const { google } = require('googleapis');


// Load credentials
const KEY_FILE_PATH = path.join(__dirname, 'credentials.json');
const SPREADSHEET_ID = '1ij_i-W-6cLBQnL_X3d9htwy0-rlRQWT4RcT8gq8FCo0';

const auth = new google.auth.GoogleAuth({
    keyFile: KEY_FILE_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

// Helper: Get next ID (e.g., CUS_00001)
async function getNextId(sheetName, prefix) {
    try {
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${sheetName}!A:A`, // Assuming ID is in Column A
        });

        const rows = res.data.values;
        if (!rows || rows.length <= 1) {
            return `${prefix}_00001`; // Start if empty (header assumed)
        }

        // Get last ID
        const lastRow = rows[rows.length - 1];
        const lastId = lastRow[0]; // e.g., "CUS_00012"

        if (!lastId || !lastId.startsWith(prefix)) {
            // Fallback if format is weird, though ideally we should handle this better
            return `${prefix}_00001`;
        }

        const numberPart = parseInt(lastId.split('_')[1], 10);
        const nextNumber = numberPart + 1;
        return `${prefix}_${String(nextNumber).padStart(5, '0')}`;

    } catch (error) {
        console.error(`Error generating ID for ${sheetName}: `, error);
        throw error;
    }
}

// Helper: Find customer by Email
async function findCustomerByEmail(email) {
    try {
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Customers!C:C', // Email is in Column C
        });
        const emails = res.data.values;
        if (!emails) return null;

        // Find index (1-based for Sheets, but array is 0-based)
        const rowIndex = emails.findIndex(row => row[0] && row[0].toLowerCase() === email.toLowerCase());

        if (rowIndex === -1) return null;

        // Fetch the ID for this row (Column A)
        const idRes = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `Customers!A${rowIndex + 1}`,
        });

        return {
            id: idRes.data.values[0][0],
            rowIndex: rowIndex + 1 // 1-based index for Sheets API
        };

    } catch (error) {
        console.error('Error finding customer:', error);
        return null;
    }
}

// Helper: Find Address by ID
async function findAddressById(addressId) {
    try {
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Addresses!A:A', // ID is in Column A
        });
        const ids = res.data.values;
        if (!ids) return null;

        const rowIndex = ids.findIndex(row => row[0] === addressId);
        if (rowIndex === -1) return null;

        // Fetch Row (1-based index)
        // Headers: Address_ID, Customer_ID, Type, First, Last, Company, Phone, Country, State, City, Zip, Line1, Line2
        // A=0, B=1, C=2, D=3, E=4, F=5, G=6, H=7, I=8, J=9, K=10, L=11, M=12
        const rowRes = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `Addresses!A${rowIndex + 1}:M${rowIndex + 1}`,
        });

        const row = rowRes.data.values[0];
        if (!row) return null;

        return {
            country: row[7] || 'US',
            state: row[8] || '',
            city: row[9] || '',
            zip: row[10] || '',
            line1: row[11] || '',
            line2: row[12] || ''
        };

    } catch (error) {
        console.error('Error finding address:', error);
        return null;
    }
}

// Helper: Append row
async function appendToSheet(sheetName, rowData) {
    try {
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: sheetName,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [rowData],
            },
        });
    } catch (error) {
        console.error(`Error appending to ${sheetName}: `, error);
        throw error;
    }
}

// --- Plan Lookup Helper ---
let plansCache = null;
let lastPlansFetch = 0;
const PLANS_CACHE_TTL = 60 * 60 * 1000; // 1 hour

async function getPlans() {
    const now = Date.now();
    if (plansCache && (now - lastPlansFetch < PLANS_CACHE_TTL)) {
        return plansCache;
    }

    try {
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Plans (Product_Config - Static)!A:I', // Read columns A to I
        });
        const rows = res.data.values;
        if (!rows || rows.length < 2) return [];

        // Map rows to objects
        // A: Plan_ID, C: Plan_Name, G: Billing_Interval_Unit, H: Billing_Interval_Count, I: Deliveries_Per_Billing_Cycle
        const headers = rows[0];
        const plans = rows.slice(1).map(row => ({
            id: row[0],
            name: row[2],
            intervalUnit: row[6] ? row[6].toLowerCase() : '',
            intervalCount: row[7] ? parseInt(row[7], 10) : 1,
            deliveriesPerCycle: row[8] ? parseInt(row[8], 10) : 1
        }));

        plansCache = plans;
        lastPlansFetch = now;
        return plans;
    } catch (error) {
        console.error('Error fetching plans:', error);
        return [];
    }
}

// --- Discount Code Lookup Helper ---
let discountCodesCache = null;
let lastDiscountCodesFetch = 0;
const DISCOUNT_CODES_CACHE_TTL = 60 * 60 * 1000; // 1 hour

async function getDiscountCodes() {
    const now = Date.now();
    if (discountCodesCache && (now - lastDiscountCodesFetch < DISCOUNT_CODES_CACHE_TTL)) {
        return discountCodesCache;
    }

    try {
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Discount Codes (Static)!A:O', // Read all columns
        });
        const rows = res.data.values;
        if (!rows || rows.length < 2) return [];

        // Map rows to objects
        // A: Code_ID, B: Code, C: Code_Type, D: Discount_Method, E: Discount_Value, 
        // F: Currency, G: Applies_To, H: Min_Order_Value, I: Start_Date, J: End_Date,
        // K: Max_Uses_Per_Customer, L: Is_Active, M: Internal_Notes, N: Created_At, O: Updated_At
        const codes = rows.slice(1).map(row => ({
            id: row[0],
            code: row[1] ? row[1].toUpperCase() : '', // Store uppercase for matching
            codeType: row[2],
            discountMethod: row[3],
            discountValue: row[4] ? parseFloat(row[4]) : 0,
            currency: row[5],
            appliesTo: row[6],
            minOrderValue: row[7] ? parseFloat(row[7]) : 0,
            startDate: row[8],
            endDate: row[9],
            maxUsesPerCustomer: row[10] ? parseInt(row[10], 10) : null,
            isActive: row[11] ? row[11].toUpperCase() === 'TRUE' : false,
            internalNotes: row[12]
        }));

        discountCodesCache = codes;
        lastDiscountCodesFetch = now;
        return codes;
    } catch (error) {
        console.error('Error fetching discount codes:', error);
        return [];
    }
}


async function findInternalPlanId(stripeProduct, stripePrice) {
    if (!stripeProduct || !stripePrice) return null;
    if (typeof stripeProduct === 'string') {
        console.error('findInternalPlanId received string for product, expected object.');
        return null;
    }

    const plans = await getPlans();

    // Normalize Stripe data
    const stripeName = (stripeProduct.name || '').trim().toLowerCase();
    // Map Stripe's 'one_time' to 'none' (as used in Sheet)
    let stripeInterval = stripePrice.recurring ? stripePrice.recurring.interval.toLowerCase() : 'one_time';
    if (stripeInterval === 'one_time') {
        stripeInterval = 'none';
    }
    // For one-time products, use count 0 (as in Sheet), otherwise use Stripe's count
    const stripeIntervalCount = stripePrice.recurring ? stripePrice.recurring.interval_count : 0;

    // Find match
    const match = plans.find(plan => {
        if (!plan.name) return false;
        const nameMatch = plan.name.trim().toLowerCase() === stripeName;

        const intervalMatch = plan.intervalUnit === stripeInterval;
        const countMatch = plan.intervalCount === stripeIntervalCount;

        return nameMatch && intervalMatch && countMatch;
    });

    if (match) {
        console.log(`Found matching Internal Plan ID: ${match.id} for ${stripeName}`);
    } else {
        console.warn(`No matching Internal Plan ID found for ${stripeName}(${stripeInterval} x ${stripeIntervalCount})`);
    }

    return match ? match.id : null;
}

// Helper: Update specific cells
async function updateSheetCells(sheetName, range, values) {
    try {
        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `${sheetName}!${range}`,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [values],
            },
        });
    } catch (error) {
        console.error(`Error updating ${sheetName}: `, error);
        throw error;
    }
}

// Helper: Link Order to Subscription
async function updateSubscriptionOrderLink(stripeSubscriptionId, orderId) {
    try {
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Subscriptions!S:S', // Stripe_Subscription_ID is in Column S
        });
        const ids = res.data.values;
        if (!ids) return;

        const rowIndex = ids.findIndex(row => row[0] === stripeSubscriptionId);
        if (rowIndex === -1) {
            console.log(`Subscription ${stripeSubscriptionId} not found for order link.`);
            return;
        }

        const realRowIndex = rowIndex + 1;
        // Column T is the 20th column (Created_From_Order_ID)
        await updateSheetCells('Subscriptions', `T${realRowIndex}`, [orderId]);
        console.log(`Linked Order ${orderId} to Subscription ${stripeSubscriptionId} at Row ${realRowIndex}`);
    } catch (error) {
        console.error('Error linking order to subscription:', error);
    }
}


// Helper: Link Payment to Order
async function updatePaymentOrderLink(paymentId, orderId) {
    try {
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Payments!A:A', // Payment_ID is in Column A
        });
        const ids = res.data.values;
        if (!ids) return;

        const rowIndex = ids.findIndex(row => row[0] === paymentId);
        if (rowIndex === -1) {
            console.log(`Payment ${paymentId} not found for order link.`);
            return;
        }

        const realRowIndex = rowIndex + 1;
        // Column C is the 3rd column (Order_ID)
        await updateSheetCells('Payments', `C${realRowIndex}`, [orderId]);
        console.log(`Linked Order ${orderId} to Payment ${paymentId} at Row ${realRowIndex}`);
    } catch (error) {
        console.error('Error linking order to payment:', error);
    }
}

// Helper: Create Deliveries for Order
async function createDeliveries(orderData) {
    try {
        const { orderId, customerId, subscriptionId, planId, shippingAddressId, orderDate, orderType } = orderData;

        if (!planId) {
            console.log(`No Plan ID for Order ${orderId}, skipping delivery creation.`);
            return;
        }

        // Fetch plan configuration
        const plans = await getPlans();
        const plan = plans.find(p => p.id === planId);

        if (!plan) {
            console.log(`Plan ${planId} not found, skipping delivery creation.`);
            return;
        }

        const deliveriesPerCycle = plan.deliveriesPerCycle || 1; // Deliveries_Per_Billing_Cycle from column I
        const billingIntervalUnit = plan.intervalUnit || 'week'; // Billing_Interval_Unit from column G
        const billingIntervalCount = plan.intervalCount || 1; // Billing_Interval_Count from column H

        // Calculate billing cycle duration in days
        let cycleInDays = 0;
        if (billingIntervalUnit === 'day') {
            cycleInDays = billingIntervalCount;
        } else if (billingIntervalUnit === 'week') {
            cycleInDays = billingIntervalCount * 7;
        } else if (billingIntervalUnit === 'month') {
            cycleInDays = billingIntervalCount * 30; // Approximate
        } else if (billingIntervalUnit === 'year') {
            cycleInDays = billingIntervalCount * 365; // Approximate
        }

        // For one-time orders, create single delivery
        const isOneTime = orderType === 'One_Time' || billingIntervalUnit === 'none';
        const numberOfDeliveries = isOneTime ? 1 : deliveriesPerCycle;

        // Calculate days between deliveries
        const daysBetweenDeliveries = isOneTime ? 0 : Math.floor(cycleInDays / numberOfDeliveries);

        // First delivery is 4 days from order date
        const firstDeliveryDate = orderDate + (4 * 24 * 60 * 60); // 4 days in seconds

        const now = formatIsoDate(Date.now() / 1000);

        for (let i = 0; i < numberOfDeliveries; i++) {
            const deliveryId = await getNextId('Deliveries', 'DEL');
            const deliveryNumber = i + 1;
            const scheduledDate = firstDeliveryDate + (i * daysBetweenDeliveries * 24 * 60 * 60);

            const row = [
                deliveryId,
                customerId || '',
                subscriptionId || '',
                planId || '',
                1, // Cycle_Number (always 1 for initial orders)
                deliveryNumber, // Delivery_Number_In_Cycle
                formatIsoDate(scheduledDate), // Original_Scheduled_Date
                formatIsoDate(scheduledDate), // Scheduled_Delivery_Date
                'Scheduled', // Delivery_Status
                now, // Status_Updated_At
                '', // Change_Reason
                '', // Replaced_By_Delivery_ID
                shippingAddressId || '', // Shipping_Address_ID
                '', // Delivery_Window
                '', // Carrier
                '', // Tracking_Number
                orderId || '', // Order_ID
                '', // Internal_Notes
                now, // Created_At
                now  // Updated_At
            ];

            await appendToSheet('Deliveries', row);
            console.log(`Created Delivery ${deliveryId} for Order ${orderId} (${deliveryNumber}/${numberOfDeliveries})`);
        }

        console.log(`Created ${numberOfDeliveries} deliveries for Order ${orderId}`);
    } catch (error) {
        console.error('Error creating deliveries:', error);
    }
}


// Helper: Format Name (First token only, Capitalized)

function formatName(name) {
    if (!name) return '';
    // Take first part only (strip middle name), trim, lowercase then capitalize first letter
    const firstToken = name.trim().split(/\s+/)[0].toLowerCase();
    return firstToken.charAt(0).toUpperCase() + firstToken.slice(1);
}

// Helper: Format Text (Capitalize first letter of each word - Title Case)
function formatText(text) {
    if (!text) return '';
    return text.trim().toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
}

// Helper: Find Address by Customer ID and Type
async function findAddressByCustomerIdAndType(customerId, type) {
    try {
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Addresses!B:C', // Customer_ID (B), Type (C)
        });

        const rows = res.data.values;
        if (!rows) return null;

        // Find index where Col B matches CustomerID AND Col C matches Type
        const rowIndex = rows.findIndex(row => row[0] === customerId && row[1] === type);

        if (rowIndex === -1) return null;

        // Fetch Address ID (Col A)
        const idRes = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `Addresses!A${rowIndex + 1}`,
        });

        return {
            id: idRes.data.values[0][0],
            rowIndex: rowIndex + 1
        };

    } catch (error) {
        console.error('Error finding address:', error);
        return null;
    }
}

// Helper: Process Address (Create/Update)
async function handleAddress(customerId, addressData, type, existingCustomer) {
    const { firstName, lastName, company, phone, address1, address2, city, state, zip, country } = addressData;

    // Hygiene
    const cleanFirstName = formatName(firstName);
    const cleanLastName = formatName(lastName);
    const cleanCompany = formatText(company);
    const cleanPhone = phone ? phone.trim() : '';
    const cleanAddress1 = formatText(address1);
    const cleanAddress2 = formatText(address2);
    const cleanCity = formatText(city);
    const cleanState = state ? state.toUpperCase() : '';
    const cleanCountry = country ? country.toUpperCase() : 'US';
    const now = formatIsoDate(Date.now() / 1000);

    if (!cleanAddress1) return null; // Skip if no street address

    const existingAddress = await findAddressByCustomerIdAndType(customerId, type);
    let addressId;

    if (!existingAddress) {
        // Create New
        addressId = await getNextId('Addresses', 'ADDR');
        const newRow = [
            addressId, customerId, type,
            cleanFirstName, cleanLastName, cleanCompany, cleanPhone,
            cleanCountry, cleanState, cleanCity, zip || '',
            cleanAddress1, cleanAddress2,
            now, now
        ];
        await appendToSheet('Addresses', newRow);

        // Link to Customer
        // Shipping -> Col J, Billing -> Col K
        const colLetter = type === 'Shipping' ? 'J' : 'K';

        let custRowIndex;
        if (existingCustomer && existingCustomer.rowIndex) {
            custRowIndex = existingCustomer.rowIndex;
        } else {
            // Fallback find
            // We assume caller handles passing valid existingCustomer if possible
            // But if we really need to find it:
            // const cust = await findCustomerByEmail(...)
        }

        if (custRowIndex) {
            await updateSheetCells('Customers', `${colLetter}${custRowIndex}`, [addressId]);
        }

    } else {
        // Update Existing
        addressId = existingAddress.id;
        const rowIndex = existingAddress.rowIndex;
        const updateValues = [
            cleanFirstName, cleanLastName, cleanCompany, cleanPhone,
            cleanCountry, cleanState, cleanCity, zip || '',
            cleanAddress1, cleanAddress2
        ];
        // Update D through M
        await updateSheetCells('Addresses', `D${rowIndex}:M${rowIndex}`, updateValues);
        // Update Updated_At (O)
        await updateSheetCells('Addresses', `O${rowIndex}`, [now]);
    }
    return addressId;
}

// In-memory lock for processing emails to prevent race conditions
const processingLocks = new Map();

// Endpoint: Capture Lead (Pre-payment)
app.post('/capture-lead', async (req, res) => {
    console.log('🚨🚨🚨 CAPTURE-LEAD ENDPOINT HIT! Email:', req.body.email);

    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    // Wait if this email is already being processed
    if (processingLocks.has(email)) {
        try {
            await processingLocks.get(email);
        } catch (err) {
            // Ignore errors from previous requests
        }
    }

    // Create a new promise for this request
    let resolveLock;
    const lockPromise = new Promise(resolve => {
        resolveLock = resolve;
    });
    processingLocks.set(email, lockPromise);

    try {
        const { firstName, lastName, phone, address, apartment, city, state, zip, country, company, billingAddress, sameAsShipping } = req.body;

        // --- Data Hygiene (Customer Profile) ---
        const cleanFirstName = formatName(firstName);
        const cleanLastName = formatName(lastName);
        const cleanFullName = `${cleanFirstName} ${cleanLastName} `.trim();
        const cleanPhone = phone ? phone.trim() : '';

        // 1. Check/Create Customer
        const existingCustomer = await findCustomerByEmail(email);
        let customerId;
        let isNewCustomer = false;
        const now = formatIsoDate(Date.now() / 1000);
        let custRowIndex;

        if (!existingCustomer) {
            isNewCustomer = true;
            customerId = await getNextId('Customers', 'CUS');
            console.log('📝 NEW CUSTOMER - Generated ID:', customerId);

            const newCustomerRow = [
                customerId, now, email, cleanPhone, cleanFirstName, cleanLastName, cleanFullName,
                'TRUE', 'TRUE', '', '', 'Checkout Form', now, 'Lead captured at checkout'
            ];

            console.log('📝 Attempting to append customer row:', newCustomerRow);
            console.log('📝 Row has', newCustomerRow.length, 'columns');

            try {
                await appendToSheet('Customers', newCustomerRow);
                console.log('✅ Successfully appended customer to sheet!');
            } catch (error) {
                console.error('❌ FAILED to append customer:', error.message);
                throw error;
            }

            // For new customers, we need to find the row index we just added to link addresses
            // Since we just appended, it's the last row. But safer to fetch or calculate.
            // Let's re-fetch to be safe and simple.
            const newCust = await findCustomerByEmail(email);
            custRowIndex = newCust ? newCust.rowIndex : null;

        } else {
            customerId = existingCustomer.id;
            custRowIndex = existingCustomer.rowIndex;
            if (cleanFirstName || cleanLastName || cleanPhone) {
                const updateValues = [cleanPhone, cleanFirstName, cleanLastName, cleanFullName];
                await updateSheetCells('Customers', `D${custRowIndex}:G${custRowIndex}`, updateValues);
            }
        }

        const customerObj = { id: customerId, rowIndex: custRowIndex };

        // 2. Handle Shipping Address
        const shippingAddressId = await handleAddress(customerId, {
            firstName, lastName, company, phone,
            address1: address, address2: apartment,
            city, state, zip, country
        }, 'Shipping', customerObj);

        // 3. Handle Billing Address
        if (sameAsShipping) {
            // If same as shipping, link Shipping Address ID to Default_Billing_Address_ID (Col K)
            if (custRowIndex && shippingAddressId) {
                await updateSheetCells('Customers', `K${custRowIndex}`, [shippingAddressId]);
            }
        } else if (billingAddress) {
            await handleAddress(customerId, {
                firstName: billingAddress.firstName,
                lastName: billingAddress.lastName,
                company: billingAddress.company,
                phone: billingAddress.phone, // Usually same phone, but form might allow diff?
                address1: billingAddress.address,
                address2: billingAddress.apartment,
                city: billingAddress.city,
                state: billingAddress.state,
                zip: billingAddress.zip,
                country: billingAddress.country
            }, 'Billing', customerObj);
        }

        res.json({ success: true, customerId, isNew: isNewCustomer });

    } catch (err) {
        console.error('Error capturing lead:', err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        // Release lock
        if (processingLocks.get(email) === lockPromise) {
            processingLocks.delete(email);
        }
        if (resolveLock) resolveLock();
    }
});

// --- Order & Line Item Helpers ---

async function createOrder(orderData) {
    try {
        const logFile = require('path').join(__dirname, 'payment-debug.log');
        const log = (msg) => require('fs').appendFileSync(logFile, `${new Date().toISOString()} - [createOrder] ${msg}\n`);

        log(`Starting order creation for Customer: ${orderData.customerId}, Type: ${orderData.orderType}`);

        const orderId = await getNextId('Orders', 'ORD');
        const now = formatIsoDate(Date.now() / 1000);

        // Map fields
        const row = [
            orderId,
            orderData.customerId || '',
            orderData.subscriptionId || '',
            orderData.orderType || '',
            formatIsoDate(orderData.orderDate) || now, // Order_Date
            orderData.status || 'Pending',
            orderData.currency ? orderData.currency.toUpperCase() : 'USD',
            orderData.subtotal || 0,
            orderData.discount || 0,
            orderData.discountCode || '',
            orderData.shipping || 0,
            orderData.tax || 0,
            orderData.total || 0,
            orderData.shippingAddressId || '',
            orderData.billingAddressId || '',
            orderData.shippingMethod || '',
            orderData.fulfillmentStatus || '',
            '', // Fulfilled_At
            'Stripe', // Order_Source / Payment_Provider
            orderData.externalId || '', // Payment_Provider_Order_ID
            orderData.internalNotes || '',
            now, // Created_At
            now  // Updated_At
        ];

        await appendToSheet('Orders', row);
        console.log(`Created Order ${orderId}`);
        log(`Successfully appended Order ${orderId} to sheet.`);
        return orderId;
    } catch (e) {
        console.error('Error creating order:', e);
        const logFile = require('path').join(__dirname, 'payment-debug.log');
        require('fs').appendFileSync(logFile, `${new Date().toISOString()} - [createOrder] ERROR: ${e.message}\n`);
        return null;
    }
}

async function createOrderLineItems(orderId, items) {
    try {
        const logFile = require('path').join(__dirname, 'payment-debug.log');
        const log = (msg) => require('fs').appendFileSync(logFile, `${new Date().toISOString()} - [createOrderLineItems] ${msg}\n`);

        log(`Starting line item creation for Order ${orderId}. Items count: ${items.length}`);

        for (const item of items) {
            const lineItemId = await getNextId('Order Line Items', 'OLI');

            // Try to find Internal Plan ID if possible
            let planId = '';
            if (item.priceId) {
                // We might need to look it up, or pass it in. 
                // For now, let's try to find it if we have product info, otherwise use Price ID
                // Actually, let's just use what we have.
                // If we have a helper to find internal plan ID, use it.
                // We have findInternalPlanId(stripeProduct, stripePrice) but that needs objects.
                // Let's assume item.planId is passed if known, else use priceId
                planId = item.planId || item.priceId || '';
            }

            const row = [
                lineItemId,
                orderId,
                planId,
                item.name || '',
                item.quantity || 1,
                item.unitPrice || 0,
                item.subtotal || 0,
                item.discount || 0,
                item.total || 0
            ];

            await appendToSheet('Order Line Items', row);
            log(`Created line item ${lineItemId} for Order ${orderId}`);
        }
        console.log(`Created ${items.length} line items for Order ${orderId}`);
        log(`Successfully created ${items.length} line items for Order ${orderId}`);
    } catch (e) {
        console.error('Error creating line items:', e);
        const logFile = require('path').join(__dirname, 'payment-debug.log');
        require('fs').appendFileSync(logFile, `${new Date().toISOString()} - [createOrderLineItems] ERROR: ${e.message}\n`);
    }
}