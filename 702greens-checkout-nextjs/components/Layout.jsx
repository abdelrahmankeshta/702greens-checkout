'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingBag } from 'lucide-react';
import Modal from './ui/Modal';
import { policies } from '@/data/policies';

export default function Layout({ children }) {
    const [activePolicy, setActivePolicy] = useState(null);

    return (
        <div style={{ minHeight: '100vh', width: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <header className="layout-header">
                <div style={{
                    width: '100%',
                    maxWidth: '1050px',
                    margin: '0 auto',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0 2rem'
                }}>
                    {/* Left: Logo */}
                    <Link href="/" style={{
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                    }}>
                        <Image
                            src="/logo-full-color.png"
                            alt="702Greens"
                            width={180}
                            height={60}
                            style={{
                                height: '60px',
                                width: 'auto',
                            }}
                            priority
                        />
                    </Link>

                    {/* Right: Shopping Cart Icon */}
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{
                            color: '#2563eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'default'
                        }}>
                            <ShoppingBag size={24} strokeWidth={2} />
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main style={{ flex: 1, position: 'relative', backgroundColor: '#f8f9fa' }}>
                {children}
            </main>

            {/* Footer */}
            <footer style={{
                padding: '2rem',
                textAlign: 'center',
                color: 'var(--color-text-muted)',
                fontSize: '0.875rem',
                borderTop: '1px solid var(--color-border)',
                marginTop: 'auto'
            }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => setActivePolicy('refund')}
                        style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', textDecoration: 'none', fontSize: 'inherit' }}
                        onMouseEnter={e => e.target.style.color = 'var(--color-primary)'}
                        onMouseLeave={e => e.target.style.color = 'inherit'}
                    >
                        Refund policy
                    </button>
                    <button
                        onClick={() => setActivePolicy('privacy')}
                        style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', textDecoration: 'none', fontSize: 'inherit' }}
                        onMouseEnter={e => e.target.style.color = 'var(--color-primary)'}
                        onMouseLeave={e => e.target.style.color = 'inherit'}
                    >
                        Privacy policy
                    </button>
                    <button
                        onClick={() => setActivePolicy('terms')}
                        style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', textDecoration: 'none', fontSize: 'inherit' }}
                        onMouseEnter={e => e.target.style.color = 'var(--color-primary)'}
                        onMouseLeave={e => e.target.style.color = 'inherit'}
                    >
                        Terms of service
                    </button>
                    <button
                        onClick={() => setActivePolicy('cancellation')}
                        style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', textDecoration: 'none', fontSize: 'inherit' }}
                        onMouseEnter={e => e.target.style.color = 'var(--color-primary)'}
                        onMouseLeave={e => e.target.style.color = 'inherit'}
                    >
                        Cancellation policy
                    </button>
                </div>
            </footer>

            {/* Policy Modal */}
            <Modal
                isOpen={!!activePolicy}
                onClose={() => setActivePolicy(null)}
                title={activePolicy ? policies[activePolicy].title : ''}
            >
                {activePolicy && policies[activePolicy].content}
            </Modal>
        </div>
    );
}
