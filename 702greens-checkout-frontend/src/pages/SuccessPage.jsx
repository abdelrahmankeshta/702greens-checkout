import Layout from '../components/Layout';
import { CheckCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Link } from 'react-router-dom';

export default function SuccessPage() {
    return (
        <Layout>
            <div style={{
                maxWidth: 480,
                margin: '3rem auto',
                textAlign: 'center',
                padding: '2rem'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    marginBottom: '1.5rem'
                }}>
                    <div style={{
                        width: 80,
                        height: 80,
                        borderRadius: '50%',
                        backgroundColor: '#dcfce7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <CheckCircle size={48} color="var(--color-primary)" />
                    </div>
                </div>

                <h1 style={{
                    fontSize: '2rem',
                    fontWeight: 700,
                    marginBottom: '1rem',
                    color: 'var(--color-text-main)'
                }}>
                    Payment successful!
                </h1>

                <p style={{
                    color: 'var(--color-text-muted)',
                    marginBottom: '2rem',
                    fontSize: '1.125rem'
                }}>
                    Thank you for subscribing to 702Greens. We've sent a confirmation email with your order details.
                </p>

                <div style={{
                    padding: '1.5rem',
                    backgroundColor: 'var(--color-bg-surface)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '2rem',
                    textAlign: 'left'
                }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>What happens next?</h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                        Your microgreens will be harvested fresh and delivered to your door on the next scheduled delivery day.
                    </p>
                </div>

                <Link to="/" style={{ textDecoration: 'none' }}>
                    <Button>Return to Home</Button>
                </Link>
            </div>
        </Layout>
    );
}
