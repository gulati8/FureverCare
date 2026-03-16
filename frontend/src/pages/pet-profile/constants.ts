import { EditField } from '../../components/InlineEditForm';
import { TOP_MEDICATIONS } from '../../constants/medications';

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

export const MEDICATION_FIELDS: EditField[] = [
  { key: 'name', placeholder: 'Medication name *', required: true, type: 'select', options: TOP_MEDICATIONS.map(m => ({ value: m, label: m })) },
  { key: 'dosage', placeholder: 'Dosage (e.g., 10mg)' },
  { key: 'frequency', placeholder: 'Frequency (e.g., twice daily)' },
  { key: 'start_date', placeholder: 'Start date', type: 'flexible_date', label: 'Start date', precisionKey: 'start_date_precision' },
];

export const VACCINATION_FIELDS: EditField[] = [
  { key: 'name', placeholder: 'Vaccination name *', required: true },
  { key: 'administered_date', placeholder: 'Date administered', type: 'flexible_date', label: 'Date administered *', required: true, precisionKey: 'administered_date_precision' },
  { key: 'expiration_date', placeholder: 'Expiration date', type: 'flexible_date', label: 'Expiration date', precisionKey: 'expiration_date_precision' },
];

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
