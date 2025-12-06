import React, { useState } from 'react';

export const FloatingLabelInput = ({ label, value, onChange, disabled, ...props }) => {
    const [isFocused, setIsFocused] = useState(false);
    const hasValue = value && value.length > 0;
    const isActive = isFocused || hasValue;

    return (
        <div style={{ position: 'relative', flex: 1 }}>
            <input
                value={value}
                onChange={onChange}
                disabled={disabled}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                style={{
                    width: '100%',
                    height: '48px',
                    padding: '1.25rem 0.75rem 0.25rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${isFocused ? '#0f392b' : '#e5e7eb'}`, // Brand green focus border
                    backgroundColor: '#fff',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    color: '#1f2937',
                    boxShadow: isFocused ? '0 0 0 1px #0f392b' : 'none' // Brand green ring
                }}
                {...props}
            />
            <label style={{
                position: 'absolute',
                left: '0.75rem',
                top: isActive ? '8px' : '50%',
                transform: isActive ? 'none' : 'translateY(-50%)',
                fontSize: isActive ? '0.75rem' : '1rem',
                color: '#6b7280',
                pointerEvents: 'none',
                transition: 'all 0.2s ease-out',
                fontWeight: isActive ? 500 : 400
            }}>
                {label}
            </label>
        </div>
    );
};
