export function Button({ children, variant = 'primary', isLoading, ...props }) {
    const baseStyle = {
        width: '100%',
        padding: '1rem',
        borderRadius: 'var(--radius-md)',
        border: 'none',
        fontSize: '1rem',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem'
    };

    const variants = {
        primary: {
            backgroundColor: 'var(--color-primary)',
            color: 'white',
        },
        accent: {
            backgroundColor: 'var(--color-accent)',
            color: 'var(--color-primary)',
        },
        outline: {
            backgroundColor: 'transparent',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-main)',
        }
    };

    return (
        <button
            style={{ ...baseStyle, ...variants[variant], opacity: isLoading || props.disabled ? 0.7 : 1 }}
            disabled={isLoading || props.disabled}
            {...props}
        >
            {isLoading ? 'Processing...' : children}
        </button>
    );
}
