import React from 'react';

export const KG_TO_LBS = 2.20462;

export function calculateAgeFromDOB(dateOfBirth: string): number {
  const today = new Date();
  const dob = new Date(dateOfBirth);

  // Future dates return 0
  if (dob > today) {
    return 0;
  }

  let age = today.getFullYear() - dob.getFullYear();

  // Adjust if the birthday has not yet occurred this year
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }

  return age;
}

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
