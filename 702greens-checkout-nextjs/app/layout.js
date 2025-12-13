import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "702Greens Checkout",
  description: "Fresh microgreens delivered to your door",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Preconnect to Stripe domains for faster checkout */}
        <link rel="preconnect" href="https://js.stripe.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://api.stripe.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://m.stripe.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://js.stripe.com" />
        <link rel="dns-prefetch" href="https://api.stripe.com" />
        <link rel="dns-prefetch" href="https://pay.google.com" />

        {/* Preconnect to Google Maps for address autocomplete */}
        <link rel="preconnect" href="https://maps.googleapis.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://maps.googleapis.com" />
      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
