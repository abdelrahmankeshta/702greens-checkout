import { Link } from 'react-router-dom';
import { useState } from 'react';
import Modal from './ui/Modal';
import { policies } from '../data/policies.jsx';

export default function Layout({ children }) {
    const [activePolicy, setActivePolicy] = useState(null);

    return (
        <div style={{ minHeight: '100vh', width: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <header style={{
                width: '100%',
                backgroundColor: '#0f392b',
                padding: '2.5rem 0', // Increased padding for taller header
                textAlign: 'center',
                position: 'relative',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                zIndex: 20, // Higher z-index to sit above content
                overflow: 'visible' // Allow greens to overflow
            }}>
                <Link to="/" style={{
                    textDecoration: 'none',
                    display: 'inline-block',
                    position: 'relative',
                    zIndex: 2
                }}>
                    <img
                        src="/702greens-logo.png"
                        alt="702Greens Logo"
                        style={{
                            height: '70px',
                            width: 'auto',
                            display: 'block',
                            margin: '0 auto',
                            filter: 'brightness(0) invert(1)',
                            transition: 'opacity 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.target.style.opacity = '0.9'}
                        onMouseLeave={(e) => e.target.style.opacity = '1'}
                    />
                </Link>

                {/* Overflowing Greens - Left */}
                <div style={{
                    position: 'absolute',
                    bottom: '-40px', // Overflowing downwards
                    left: '-50px',
                    width: '400px',
                    height: '120px',
                    backgroundImage: 'url(/greens-horizontal.png)',
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    transform: 'rotate(5deg)',
                    zIndex: 1,
                    pointerEvents: 'none'
                }} />

                {/* Overflowing Greens - Right */}
                <div style={{
                    position: 'absolute',
                    bottom: '-40px', // Overflowing downwards
                    right: '-50px',
                    width: '400px',
                    height: '120px',
                    backgroundImage: 'url(/greens-horizontal.png)',
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    transform: 'scaleX(-1) rotate(5deg)', // Mirror and rotate
                    zIndex: 1,
                    pointerEvents: 'none'
                }} />
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
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginBottom: '1rem' }}>
                    <button onClick={() => setActivePolicy('refund')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', textDecoration: 'none', fontSize: 'inherit' }} onMouseEnter={e => e.target.style.color = 'var(--color-primary)'} onMouseLeave={e => e.target.style.color = 'inherit'}>Refund policy</button>
                    <button onClick={() => setActivePolicy('privacy')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', textDecoration: 'none', fontSize: 'inherit' }} onMouseEnter={e => e.target.style.color = 'var(--color-primary)'} onMouseLeave={e => e.target.style.color = 'inherit'}>Privacy policy</button>
                    <button onClick={() => setActivePolicy('terms')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', textDecoration: 'none', fontSize: 'inherit' }} onMouseEnter={e => e.target.style.color = 'var(--color-primary)'} onMouseLeave={e => e.target.style.color = 'inherit'}>Terms of service</button>
                    <button onClick={() => setActivePolicy('cancellation')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', textDecoration: 'none', fontSize: 'inherit' }} onMouseEnter={e => e.target.style.color = 'var(--color-primary)'} onMouseLeave={e => e.target.style.color = 'inherit'}>Cancellation policy</button>
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
