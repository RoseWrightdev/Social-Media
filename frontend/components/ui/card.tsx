// Minimal Card component for proof of concept
interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`card ${className}`} style={{
      backgroundColor: '#2a2a2a',
      borderRadius: '8px',
      padding: '1rem'
    }}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }: CardProps) {
  return (
    <div className={`card-header ${className}`} style={{
      marginBottom: '1rem',
      borderBottom: '1px solid #444',
      paddingBottom: '0.5rem'
    }}>
      {children}
    </div>
  );
}

export function CardContent({ children, className = '' }: CardProps) {
  return (
    <div className={`card-content ${className}`}>
      {children}
    </div>
  );
}
