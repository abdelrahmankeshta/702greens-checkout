import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Package, MapPin, Calendar, ShoppingBag } from 'lucide-react';
import Layout from '../components/Layout';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:4242' : '/api');

export default function EmailLoginPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email) return;

        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`${API_URL}/check-email?email=${encodeURIComponent(email)}`);
            const data = await res.json();

            if (data.exists && data.customer) {
                const from = location.state?.from?.pathname || '/checkout';
                navigate(from, { state: { customerData: data.customer } });
            } else {
                setError('Account not found. Please check your email or continue as guest.');
            }
        } catch (err) {
            console.error('Error checking email:', err);
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout>
            <div style={{
                minHeight: 'calc(100vh - 80px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2rem',
                backgroundColor: '#f8f9fa' // Light background for the page
            }}>
                <div style={{
                    width: '100%',
                    maxWidth: '900px',
                    backgroundColor: '#ffffff',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', // Premium shadow
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'row',
                    flexWrap: 'wrap'
                }}>
                    {/* Left Column: Login Form */}
                    <div style={{
                        flex: '1 1 400px',
                        padding: '3rem',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center'
                    }}>
                        <h1 style={{
                            fontSize: '2rem',
                            fontWeight: 700,
                            marginBottom: '0.5rem',
                            color: 'var(--color-primary)',
                            fontFamily: 'var(--font-heading, sans-serif)'
                        }}>
                            Sign In
                        </h1>
                        <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
                            Enter your email to get started
                        </p>

                        <form onSubmit={handleSubmit}>
                            <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    placeholder=" "
                                    style={{
                                        width: '100%',
                                        height: '56px',
                                        padding: '20px 16px 6px',
                                        fontSize: '1rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: 'var(--radius-md)',
                                        outline: 'none',
                                        backgroundColor: 'transparent',
                                        transition: 'border-color 0.2s'
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                                />
                                <label
                                    htmlFor="email"
                                    style={{
                                        position: 'absolute',
                                        left: '16px',
                                        top: email ? '8px' : '18px',
                                        fontSize: email ? '0.75rem' : '1rem',
                                        color: '#6b7280',
                                        pointerEvents: 'none',
                                        transition: 'all 0.2s ease-out',
                                        backgroundColor: 'transparent'
                                    }}
                                >
                                    Email
                                </label>
                                <style>
                                    {`
                                        input:focus + label {
                                            top: 8px;
                                            font-size: 0.75rem;
                                            color: var(--color-primary);
                                        }
                                        input:not(:placeholder-shown) + label {
                                            top: 8px;
                                            font-size: 0.75rem;
                                        }
                                    `}
                                </style>
                            </div>

                            {error && (
                                <div style={{
                                    marginBottom: '1.5rem',
                                    padding: '0.75rem',
                                    background: '#fee2e2',
                                    color: '#991b1b',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: '0.875rem'
                                }}>
                                    {error}
                                </div>
                            )}

                            <Button
                                type="submit"
                                variant="primary"
                                style={{
                                    width: '100%',
                                    marginBottom: '1.5rem',
                                    height: '50px',
                                    backgroundColor: '#0f392b', // Deep green
                                    color: '#ffffff', // White text
                                    fontSize: '1.1rem',
                                    fontWeight: '600',
                                    borderRadius: '9999px' // Pill shape
                                }}
                                disabled={loading}
                            >
                                {loading ? 'Checking...' : 'Sign In'}
                            </Button>
                        </form>

                        <div style={{ textAlign: 'center' }}>
                            <button
                                onClick={() => {
                                    const from = location.state?.from?.pathname || '/checkout';
                                    navigate(from);
                                }}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--color-text-muted)',
                                    textDecoration: 'underline',
                                    cursor: 'pointer',
                                    fontSize: '0.875rem'
                                }}
                            >
                                Return to checkout
                            </button>
                        </div>
                    </div>

                    {/* Right Column: Value Props */}
                    <div style={{
                        flex: '1 1 350px',
                        padding: '3rem',
                        backgroundColor: '#f3f4f6', // Light gray/beige
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center'
                    }}>
                        <h2 style={{
                            fontSize: '1.25rem',
                            fontWeight: 600,
                            marginBottom: '2rem',
                            color: 'var(--color-text-main)'
                        }}>
                            Things You Can Do Here
                        </h2>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <Package size={24} color="#4b5563" />
                                <span style={{ color: '#374151', fontWeight: 500 }}>Review Upcoming Orders</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <MapPin size={24} color="#4b5563" />
                                <span style={{ color: '#374151', fontWeight: 500 }}>Track Shipments</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <Calendar size={24} color="#4b5563" />
                                <span style={{ color: '#374151', fontWeight: 500 }}>Customize Your Subscription</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <ShoppingBag size={24} color="#4b5563" />
                                <span style={{ color: '#374151', fontWeight: 500 }}>Shop Additional Products</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
