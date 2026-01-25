interface ConfidenceBadgeProps {
  score: number | null;
}

export function ConfidenceBadge({ score }: ConfidenceBadgeProps) {
  if (score === null) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
        Unknown
      </span>
    );
  }

  const percentage = Math.round(score * 100);

  // Color coding based on confidence level
  let colorClass: string;
  let label: string;

  if (score >= 0.8) {
    colorClass = 'bg-green-100 text-green-800';
    label = 'High';
  } else if (score >= 0.5) {
    colorClass = 'bg-yellow-100 text-yellow-800';
    label = 'Medium';
  } else {
    colorClass = 'bg-red-100 text-red-800';
    label = 'Low';
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}>
      <span>{percentage}%</span>
      <span className="text-[10px] opacity-75">{label}</span>
    </span>
  );
}
