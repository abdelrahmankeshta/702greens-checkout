# Next.js Migration Guide

## Goal
Migrate `702greens-checkout-frontend` (Vite) to Next.js for SSR to reduce Total Blocking Time from 1.7s to <0.2s.

## Current Structure
```
702greens-checkout-testing/
├── 702greens-checkout-frontend/   ← Vite React app (keep as backup)
│   ├── src/pages/CheckoutPage.jsx (2300+ lines)
│   ├── src/components/
│   └── vite.config.js
└── 702greens-checkout-backend/    ← Express API (unchanged)
```

## Target Structure  
```
702greens-checkout-testing/
├── 702greens-checkout-frontend/   ← Keep as backup
├── 702greens-checkout-nextjs/     ← NEW Next.js app
│   ├── app/
│   │   ├── layout.jsx
│   │   ├── page.jsx (redirect to checkout)
│   │   ├── checkout/[productSlug]/page.jsx
│   │   ├── success/page.jsx
│   │   └── login/page.jsx
│   ├── components/ (copied from Vite)
│   └── next.config.js
└── 702greens-checkout-backend/
```

---

## Session 1: Project Setup

### Prompt for Fresh Agent:
```
I need to create a new Next.js 14 project for a checkout page migration. 

**Context:**
- Working directory: /Users/abdulrahmanhani/Desktop/702greens-checkout-testing
- Create new folder: 702greens-checkout-nextjs
- Existing Vite app in: 702greens-checkout-frontend (reference for copying)
- Backend API at: VITE_API_URL (same env vars)

**Tasks:**
1. Create Next.js 14 project with App Router in `702greens-checkout-nextjs`
2. Copy these folders from `702greens-checkout-frontend/src/`:
   - components/ui/ (Input.jsx, Select.jsx, Button.jsx, Modal.jsx, FloatingLabelInput.jsx)
   - data/policies.jsx
   - styles/index.css
3. Set up environment variables (.env.local) matching the Vite app
4. Configure next.config.js for the API proxy
5. Verify the project runs with `npm run dev`

**Important:** Do NOT copy CheckoutPage.jsx yet - that's for a later session.
```

### Expected Deliverables:
- [ ] Next.js project created
- [ ] UI components copied and working
- [ ] Styles imported
- [ ] Dev server running

---

## Session 2: Layout & Simple Pages

### Prompt for Fresh Agent:
```
Continue Next.js migration for a checkout app.

**Context:**  
- Working in: /Users/abdulrahmanhani/Desktop/702greens-checkout-testing/702greens-checkout-nextjs
- Reference Vite app at: ../702greens-checkout-frontend/src/

**Tasks:**
1. Create `app/layout.jsx` - port from `../702greens-checkout-frontend/src/components/Layout.jsx`
   - Convert to Next.js App Router format
   - Import global CSS
   - Add metadata for SEO
   
2. Create `app/success/page.jsx` - port from `../702greens-checkout-frontend/src/pages/SuccessPage.jsx`

3. Create `app/login/page.jsx` - port from `../702greens-checkout-frontend/src/pages/EmailLoginPage.jsx`

4. Create `app/page.jsx` - simple redirect to /checkout/single-nutrition

**Important:** These pages have minimal interactivity - keep them as Server Components where possible. Only add "use client" if needed.
```

### Expected Deliverables:
- [ ] Layout with header/footer working
- [ ] Success page working
- [ ] Login page working
- [ ] Root redirect working

---

## Session 3: CheckoutPage Migration (Largest Task)

### Prompt for Fresh Agent:
```
Port the main CheckoutPage to Next.js with performance optimizations.

**Context:**
- Working in: /Users/abdulrahmanhani/Desktop/702greens-checkout-testing/702greens-checkout-nextjs
- Source file: ../702greens-checkout-frontend/src/pages/CheckoutPage.jsx (2300+ lines)
- This is a Stripe checkout with Express Checkout (Apple/Google Pay)

**Goals:**
- Reduce Total Blocking Time from 1.7s to <0.2s
- Use SSR for initial HTML
- Lazy load Stripe SDK

**Tasks:**
1. Create `app/checkout/[productSlug]/page.jsx`

2. Split the page into:
   - Server Component (page.jsx): Fetch products, render static HTML shell
   - Client Component (CheckoutClient.jsx): All interactive parts with "use client"

3. Lazy load Stripe:
   ```jsx
   const StripeElements = dynamic(() => import('@stripe/react-stripe-js').then(mod => mod.Elements), {
     ssr: false,
     loading: () => <div>Loading payment...</div>
   });
   ```

4. Keep all existing functionality:
   - Product selection via URL slug
   - Discount codes
   - Address autocomplete (Google Maps)
   - Express Checkout
   - Standard payment form

5. Port these sub-components as "use client":
   - ExpressCheckouter
   - DeferredExpressCheckout
   - CheckoutForm (from components/)

**Key patterns to use:**
- "use client" only on interactive components
- dynamic() import for Stripe with { ssr: false }
- Server component fetches initial product data
- Client component handles form state
```

### Expected Deliverables:
- [ ] Checkout page renders
- [ ] Product loads from URL
- [ ] Express Checkout works
- [ ] Payment form works
- [ ] Discount codes work
- [ ] Address autocomplete works

---

## Session 4: Testing & Deployment

### Prompt for Fresh Agent:
```
Test and deploy the Next.js checkout app.

**Context:**
- Next.js app at: /Users/abdulrahmanhani/Desktop/702greens-checkout-testing/702greens-checkout-nextjs
- Backend at: /Users/abdulrahmanhani/Desktop/702greens-checkout-testing/702greens-checkout-backend
- GitHub repo: abdelrahmankeshta/702greens-checkout
- Vercel project: 702greens-checkout

**Tasks:**
1. Run through full checkout flow locally:
   - Visit /checkout/single-nutrition
   - Fill out form
   - Test discount code
   - Test Express Checkout buttons appear
   - Complete test payment

2. Fix any errors found

3. Update Vercel configuration:
   - Change root directory from `702greens-checkout-frontend` to `702greens-checkout-nextjs`
   - Ensure environment variables are set

4. Push to GitHub and deploy

5. Run WebPageTest on deployed URL and compare:
   - Target: Total Blocking Time < 0.2s
   - Target: Performance Score > 85

**If performance isn't improved:** Check that Stripe is being lazy-loaded correctly with dynamic() and { ssr: false }.
```

### Expected Deliverables:
- [ ] All flows tested locally
- [ ] Deployed to Vercel
- [ ] WebPageTest shows improvement
- [ ] Performance score > 85

---

## Rollback Plan
If anything breaks in production:
1. Change Vercel root directory back to `702greens-checkout-frontend`
2. Redeploy
3. Old Vite app is restored
