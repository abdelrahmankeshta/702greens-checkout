import Layout from '@/components/Layout';
import CheckoutClient from './CheckoutClient';

// Product slug to name pattern mapping for URL navigation
// Matches URL slugs to product names from backend
const SLUG_TO_NAME_PATTERN = {
    'single-one-time': /single.*one.*(off|time)/i,
    'single-bi-weekly': /single.*bi[-\s]?weekly/i,
    'double-nutrition': /double.*nutrition/i,
    'single-nutrition': /^single\s+nutrition\s+mix$/i
};

// Server-side product fetch
async function fetchProducts() {
    // Use internal API URL for server-side (backend runs on 4242)
    const apiUrl = process.env.BACKEND_URL || 'http://localhost:4242';
    try {
        const res = await fetch(`${apiUrl}/products`, {
            cache: 'no-store' // Always fetch fresh for checkout
        });
        if (!res.ok) throw new Error('Failed to fetch products');
        return await res.json();
    } catch (error) {
        console.error('Error fetching products:', error);
        return [];
    }
}

// Find product by matching slug to product name pattern
function findProductBySlug(products, slug) {
    const pattern = SLUG_TO_NAME_PATTERN[slug];
    if (!pattern) return null;
    return products.find(p => pattern.test(p.name));
}

export default async function CheckoutPage({ params }) {
    const { productSlug } = await params;
    const products = await fetchProducts();

    // Resolve initial product from URL slug using name pattern matching
    let initialProduct = null;
    let initialPriceId = '';

    if (productSlug) {
        initialProduct = findProductBySlug(products, productSlug);
        if (initialProduct) {
            initialPriceId = initialProduct.id;
        }
    }

    // Fallback to first product if no match
    if (!initialProduct && products.length > 0) {
        initialProduct = products[0];
        initialPriceId = products[0].id;
    }

    return (
        <Layout>
            <CheckoutClient
                products={products}
                initialProduct={initialProduct}
                initialPriceId={initialPriceId}
                productSlug={productSlug}
            />
        </Layout>
    );
}

export const metadata = {
    title: '702Greens Checkout',
    description: 'Complete your order for fresh microgreens',
};

