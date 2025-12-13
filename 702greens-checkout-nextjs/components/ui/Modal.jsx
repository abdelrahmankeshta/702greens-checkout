'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children }) {
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
            backdropFilter: 'blur(4px)'
        }} onClick={onClose}>
            <div style={{
                backgroundColor: '#fff',
                borderRadius: '12px',
                width: '100%',
                maxWidth: '600px',
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                animation: 'modalFadeIn 0.2s ease-out'
            }} onClick={e => e.stopPropagation()}>
                <style>{`
                    @keyframes modalFadeIn {
                        from { opacity: 0; transform: scale(0.95); }
                        to { opacity: 1; transform: scale(1); }
                    }
                `}</style>

                {/* Header */}
                <div style={{
                    padding: '1.5rem',
                    borderBottom: '1px solid #e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', margin: 0 }}>{title}</h2>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '0.5rem',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#6b7280',
                            transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div style={{
                    padding: '1.5rem',
                    overflowY: 'auto',
                    lineHeight: '1.6',
                    color: '#374151',
                    fontSize: '0.95rem'
                }}>
                    {children}
                </div>
            </div>
        </div>
    );
}
