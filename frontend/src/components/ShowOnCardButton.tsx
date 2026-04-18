interface ShowOnCardButtonProps {
  active: boolean;
  onClick: () => void;
}

export default function ShowOnCardButton({ active, onClick }: ShowOnCardButtonProps) {
  const label = active ? 'Remove from card' : 'Show on card';

  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border transition-colors ${
        active
          ? 'border-danger bg-danger text-white hover:bg-danger-dark'
          : 'border-surface-300 bg-surface-200 text-surface-500 hover:bg-surface-300 hover:text-surface-600'
      }`}
    >
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3z" />
      </svg>
    </button>
  );
}
