import { forwardRef, useState } from 'react';

export const Input = forwardRef(({ label, error, rightIcon, onFocus, onBlur, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);

    return (
        <div style={{ marginBottom: '1rem', position: 'relative' }}>
            {label && (
                <label style={{
                    display: 'block',
                    marginBottom: '0.375rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: 'var(--color-text-main)'
                }}>
                    {label}
                </label>
            )}
            <div style={{ position: 'relative' }}>
                <input
                    ref={ref}
                    style={{
                        width: '100%',
                        padding: '0.75rem',
                        paddingRight: rightIcon ? '2.5rem' : '0.75rem',
                        borderRadius: 'var(--radius-md)',
                        border: `1px solid ${error ? '#ef4444' : isFocused ? '#0f392b' : '#e5e7eb'}`, // State-based border
                        fontSize: '1rem',
                        outline: 'none',
                        transition: 'border-color 0.2s, box-shadow 0.2s',
                        backgroundColor: 'var(--color-bg-input)',
                        boxShadow: error ? 'none' : isFocused ? '0 0 0 1px #0f392b' : 'none' // State-based shadow
                    }}
                    onFocus={(e) => {
                        setIsFocused(true);
                        if (onFocus) onFocus(e);
                    }}
                    onBlur={(e) => {
                        setIsFocused(false);
                        if (onBlur) onBlur(e);
                    }}
                    {...props}
                />
                {rightIcon && (
                    <div style={{
                        position: 'absolute',
                        right: '0.75rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#9ca3af',
                        pointerEvents: 'none',
                        display: 'flex',
                        alignItems: 'center'
                    }}>
                        {rightIcon}
                    </div>
                )}
            </div>
            {error && (
                <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                    {error}
                </span>
            )}
        </div>
    );
});

Input.displayName = 'Input';

