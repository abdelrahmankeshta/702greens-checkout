import { forwardRef } from 'react';

export const Input = forwardRef(({ label, error, rightIcon, ...props }, ref) => {
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
                        border: `1px solid ${error ? '#ef4444' : 'var(--color-border)'}`,
                        fontSize: '1rem',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                        backgroundColor: 'var(--color-bg-input)',
                    }}
                    onFocus={(e) => e.target.style.borderColor = error ? '#ef4444' : 'var(--color-border-focus)'}
                    onBlur={(e) => {
                        e.target.style.borderColor = error ? '#ef4444' : 'var(--color-border)';
                        if (props.onBlur) props.onBlur(e);
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

