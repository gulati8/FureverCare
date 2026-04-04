import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  compact?: boolean;
}

export default function EmptyState({ icon, title, description, action, compact = false }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-4' : 'py-12'}`}>
      {icon && <div className={compact ? 'mb-2' : 'mb-3'}>{icon}</div>}
      <p className={compact ? 'text-surface-500 text-sm' : 'text-navy text-lg font-semibold'}>{title}</p>
      {description && <p className="text-surface-500 text-sm mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
