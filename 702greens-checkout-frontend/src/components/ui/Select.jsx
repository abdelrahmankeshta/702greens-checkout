export function Select({ label, options, error, ...props }) {
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
                    style={{
                        width: '100%',
                        padding: '0.75rem',
                        paddingRight: '2.5rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)',
                        fontSize: '1rem',
                        outline: 'none',
                        appearance: 'none',
                        backgroundColor: 'var(--color-bg-input)',
                        cursor: 'pointer'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--color-border-focus)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
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
