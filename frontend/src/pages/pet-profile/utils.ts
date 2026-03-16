import React from 'react';

export const KG_TO_LBS = 2.20462;

export function formatWeight(value: number | string, unit: 'lbs' | 'kg' | null): React.ReactNode {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  const safeUnit = unit || 'kg';
  if (safeUnit === 'lbs') {
    const kg = numValue / KG_TO_LBS;
    return React.createElement(React.Fragment, null,
      React.createElement('strong', null, `${numValue.toFixed(1)} lbs`),
      ` / ${kg.toFixed(1)} kg`
    );
  } else {
    const lbs = numValue * KG_TO_LBS;
    return React.createElement(React.Fragment, null,
      `${lbs.toFixed(1)} lbs / `,
      React.createElement('strong', null, `${numValue.toFixed(1)} kg`)
    );
  }
}
