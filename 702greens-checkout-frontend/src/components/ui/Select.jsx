import { useState } from 'react';

export function Select({ label, options, error, onFocus, onBlur, ...props }) {
    const [isFocused, setIsFocused] = useState(false);

    return (
        <div style={{ marginBottom: '1rem' }}>
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
                <select
                    aria-label={props['aria-label'] || label || props.placeholder}
                    style={{
                        width: '100%',
                        padding: '0.75rem',
                        paddingRight: '2.5rem',
                        borderRadius: 'var(--radius-md)',
                        border: `1px solid ${error ? '#ef4444' : isFocused ? '#0f392b' : '#e5e7eb'}`,
                        fontSize: '1rem',
                        outline: 'none',
                        appearance: 'none',
                        backgroundColor: 'var(--color-bg-input)',
                        cursor: 'pointer',
                        transition: 'border-color 0.2s, box-shadow 0.2s',
                        boxShadow: error ? 'none' : isFocused ? '0 0 0 1px #0f392b' : 'none'
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
                >
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
                <div style={{
                    position: 'absolute',
                    right: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    color: 'var(--color-text-muted)'
                }}>
                    ▼
                </div>
            </div>
            {error && (
                <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                    {error}
                </span>
            )}
        </div>
    );
}
