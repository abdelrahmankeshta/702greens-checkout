
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function listPrices() {
    console.log('Fetching prices...');
    try {
        const prices = await stripe.prices.list({
            active: true,
            limit: 100,
            expand: ['data.product']
        });

        console.log('--- Active Prices in Stripe Account ---');
        prices.data.forEach(p => {
            console.log(`Product: ${p.product.name}`);
            console.log(`  Price ID: ${p.id}`);
            console.log(`  Type: ${p.type}`);
            console.log(`  Amount: ${p.unit_amount / 100} ${p.currency}`);
            if (p.recurring) {
                console.log(`  Interval: ${p.recurring.interval_count} ${p.recurring.interval}`);
            }
            console.log('---');
        });
    } catch (err) {
        console.error('Error fetching prices:', err);
    }
}

listPrices();
