import { EditField } from '../../components/InlineEditForm';
import { formatFlexibleDate } from '../../components/FlexibleDateInput';
import { TOP_MEDICATIONS } from '../../constants/medications';
import { PetMedication, PetVaccination } from '../../api/client';

export const SPECIES_OPTIONS = [
  { value: 'dog', label: 'Dog' }, { value: 'cat', label: 'Cat' }, { value: 'bird', label: 'Bird' },
  { value: 'rabbit', label: 'Rabbit' }, { value: 'hamster', label: 'Hamster' }, { value: 'fish', label: 'Fish' },
  { value: 'reptile', label: 'Reptile' }, { value: 'other', label: 'Other' },
];

export const SEVERITY_OPTIONS = [
  { value: '', label: 'Severity (optional)' },
  { value: 'mild', label: 'Mild' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'severe', label: 'Severe' },
];

export const ALLERGY_SEVERITY_OPTIONS = [
  ...SEVERITY_OPTIONS,
  { value: 'life-threatening', label: 'Life-threatening' },
];

export const CONDITION_FIELDS: EditField[] = [
  { key: 'name', placeholder: 'Condition name *', required: true },
  { key: 'diagnosed_date', placeholder: 'Date diagnosed', type: 'flexible_date', label: 'Date diagnosed', precisionKey: 'diagnosed_date_precision' },
  { key: 'severity', placeholder: 'Severity', type: 'select', options: SEVERITY_OPTIONS },
  { key: 'notes', placeholder: 'Notes (optional)', type: 'textarea' },
];

export const ALLERGY_FIELDS: EditField[] = [
  { key: 'allergen', placeholder: 'Allergen *', required: true },
  { key: 'reaction', placeholder: 'Reaction (optional)' },
  { key: 'severity', placeholder: 'Severity', type: 'select', options: ALLERGY_SEVERITY_OPTIONS },
];

export const REMINDER_LEAD_UNIT_OPTIONS = [
  { value: 'days', label: 'Days before' },
  { value: 'weeks', label: 'Weeks before' },
];

export const REMINDER_RECURRENCE_UNIT_OPTIONS = [
  { value: 'months', label: 'Months' },
  { value: 'years', label: 'Years' },
];

function toDateString(value: string | boolean | undefined): string | null {
  if (!value || typeof value !== 'string') {
    return null;
  }
  return value.slice(0, 10);
}

function isFutureDate(value: string | null): boolean {
  if (!value) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${value}T00:00:00`).getTime() > today.getTime();
}

function getVaccinationReminderAvailability(values: Record<string, string | boolean>) {
  const expirationDate = toDateString(values.expiration_date);
  const expirationPrecision = (values.expiration_date_precision as string) || 'day';

  if (!expirationDate) {
    return 'Add an expiration date first.';
  }

  if (expirationPrecision !== 'day') {
    return 'Use day precision for the expiration date.';
  }

  if (!isFutureDate(expirationDate)) {
    return 'Set the expiration date in the future.';
  }

  return null;
}

function formatLeadTime(value: number | null, unit: 'days' | 'weeks' | null): string {
  if (!value || !unit) {
    return '';
  }

  const singular = unit === 'days' ? 'day' : 'week';
  return `${value} ${value === 1 ? singular : unit}`;
}

function formatRecurrence(value: number | null, unit: 'months' | 'years' | null): string {
  if (!value || !unit) {
    return '';
  }

  const singular = unit === 'months' ? 'month' : 'year';
  return `every ${value} ${value === 1 ? singular : unit}`;
}

export function getMedicationFields(values: Record<string, string | boolean>): EditField[] {
  const reminderEnabled = values.reminder_enabled === true;

  return [
    { key: 'name', placeholder: 'Medication name *', required: true, type: 'select', options: TOP_MEDICATIONS.map(m => ({ value: m, label: m })) },
    { key: 'dosage', placeholder: 'Dosage (e.g., 10mg)' },
    { key: 'frequency', placeholder: 'Frequency (e.g., twice daily)' },
    { key: 'start_date', placeholder: 'Start date', type: 'flexible_date', label: 'Start date', precisionKey: 'start_date_precision' },
    {
      key: 'reminder_enabled',
      placeholder: 'Send email reminder',
      type: 'checkbox',
      helpText: 'Requires a future next due date, lead time, and recurrence interval.',
    },
    ...(reminderEnabled ? [
      { key: 'reminder_next_due_date', placeholder: 'Next due date', label: 'Next due date *', type: 'date' as const },
      { key: 'reminder_lead_time_value', placeholder: '1', label: 'Remind me', type: 'number' as const, min: '1', gridGroup: 'medication-reminder-lead' },
      { key: 'reminder_lead_time_unit', placeholder: 'Lead time unit', label: 'Unit', type: 'select' as const, options: REMINDER_LEAD_UNIT_OPTIONS, gridGroup: 'medication-reminder-lead' },
      { key: 'reminder_recurrence_value', placeholder: '1', label: 'Repeat every', type: 'number' as const, min: '1', gridGroup: 'medication-reminder-repeat' },
      { key: 'reminder_recurrence_unit', placeholder: 'Recurrence unit', label: 'Interval', type: 'select' as const, options: REMINDER_RECURRENCE_UNIT_OPTIONS, gridGroup: 'medication-reminder-repeat' },
    ] : []),
  ];
}

export function getVaccinationFields(values: Record<string, string | boolean>): EditField[] {
  const reminderEnabled = values.reminder_enabled === true;
  const reminderUnavailableReason = getVaccinationReminderAvailability(values);
  const disableReminderToggle = Boolean(reminderUnavailableReason) && !reminderEnabled;

  return [
    { key: 'name', placeholder: 'Vaccination name *', required: true },
    { key: 'administered_date', placeholder: 'Date administered', type: 'flexible_date', label: 'Date administered *', required: true, precisionKey: 'administered_date_precision' },
    { key: 'expiration_date', placeholder: 'Expiration date', type: 'flexible_date', label: 'Expiration date', precisionKey: 'expiration_date_precision' },
    {
      key: 'reminder_enabled',
      placeholder: 'Send email reminder',
      type: 'checkbox',
      disabled: disableReminderToggle,
      helpText: reminderUnavailableReason
        ? `To enable reminders, ${reminderUnavailableReason.toLowerCase()}`
        : 'Email the reminder before the vaccine expires.',
    },
    ...(reminderEnabled ? [
      {
        key: 'reminder_lead_time_value',
        placeholder: '1',
        label: 'Remind me',
        type: 'number' as const,
        min: '1',
        gridGroup: 'vaccination-reminder-lead',
        disabled: Boolean(reminderUnavailableReason),
      },
      {
        key: 'reminder_lead_time_unit',
        placeholder: 'Lead time unit',
        label: 'Unit',
        type: 'select' as const,
        options: REMINDER_LEAD_UNIT_OPTIONS,
        gridGroup: 'vaccination-reminder-lead',
        disabled: Boolean(reminderUnavailableReason),
      },
    ] : []),
  ];
}

export function getMedicationReminderSummary(medication: Pick<PetMedication, 'reminder_enabled' | 'reminder_next_due_date' | 'reminder_recurrence_value' | 'reminder_recurrence_unit' | 'reminder_lead_time_value' | 'reminder_lead_time_unit'>): string | null {
  if (!medication.reminder_enabled || !medication.reminder_next_due_date) {
    return null;
  }

  const parts = [
    `Next due ${formatFlexibleDate(medication.reminder_next_due_date, 'day')}`,
    formatRecurrence(medication.reminder_recurrence_value, medication.reminder_recurrence_unit),
    `email ${formatLeadTime(medication.reminder_lead_time_value, medication.reminder_lead_time_unit)} before`,
  ].filter(Boolean);

  return parts.join(' · ');
}

export function getVaccinationReminderSummary(vaccination: Pick<PetVaccination, 'reminder_enabled' | 'reminder_next_due_date' | 'reminder_lead_time_value' | 'reminder_lead_time_unit'>): string | null {
  if (!vaccination.reminder_enabled || !vaccination.reminder_next_due_date) {
    return null;
  }

  const leadTime = formatLeadTime(
    vaccination.reminder_lead_time_value,
    vaccination.reminder_lead_time_unit
  );

  return `Email reminder ${leadTime} before ${formatFlexibleDate(vaccination.reminder_next_due_date, 'day')}`;
}

export const VET_FIELDS: EditField[] = [
  { key: 'clinic_name', placeholder: 'Clinic name *', required: true },
  { key: 'vet_name', placeholder: 'Vet name' },
  { key: 'phone', placeholder: 'Phone number', type: 'tel' },
];

export const CONTACT_FIELDS: EditField[] = [
  { key: 'name', placeholder: 'Name *', required: true },
  { key: 'phone', placeholder: 'Phone *', type: 'tel', required: true },
  { key: 'relationship', placeholder: 'Relationship (e.g., spouse, neighbor)' },
];

export const ALERT_SUGGESTIONS = [
  'Seizure watch',
  'Dog aggressive/reactive',
  'Limited Kitty Minutes',
  'Chill protocol',
  'Muzzle trained/Muzzle at vets',
  'On Chemo Drugs',
  'Heart Murmur',
  'Bleeding Risk',
  'Not up to date on rabies',
];
