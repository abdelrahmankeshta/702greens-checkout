import { Link } from 'react-router-dom';
import { useState } from 'react';
import Modal from './ui/Modal';
import { policies } from '../data/policies.jsx';

export default function Layout({ children }) {
    const [activePolicy, setActivePolicy] = useState(null);

    return (
        <div style={{ minHeight: '100vh', width: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            {/* Header */}
            <header style={{
                width: '100%',
                backgroundColor: '#ffffff',
                padding: '2rem 0',
                textAlign: 'center',
                borderBottom: '1px solid #e5e7eb',
                // boxShadow: '0 1px 3px rgba(0,0,0,0.05)', // Optional subtle shadow
                zIndex: 20,
            }}>
                <Link to="/" style={{
                    textDecoration: 'none',
                    display: 'inline-block',
                }}>
                    <img
                        src="/logo-full-color.png"
                        alt="702Greens"
                        style={{
                            height: '80px', // Adjusted height based on screenshot
                            width: 'auto',
                            display: 'block',
                            margin: '0 auto',
                        }}
                    />
                </Link>
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
