import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  petsApi,
  Pet,
  PetVet,
  PetCondition,
  PetAllergy,
  PetMedication,
  PetVaccination,
  PetEmergencyContact,
  API_URL,
} from '../api/client';
import EditPetModal from '../components/EditPetModal';
import ManageAccessModal from '../components/ManageAccessModal';
import ShareModal from '../components/ShareModal';
import ShareWallet from '../components/ShareWallet';
import InlineEditForm, { EditField } from '../components/InlineEditForm';
import { DocumentImportSection } from '../components/document-import/DocumentImportSection';
import { AuditLogViewer } from '../components/audit/AuditLogViewer';
import { MedicalTimeline } from '../components/MedicalTimeline';
import UpgradeBanner from '../components/UpgradeBanner';

type TabType = 'overview' | 'timeline' | 'conditions' | 'allergies' | 'medications' | 'vaccinations' | 'contacts' | 'vets' | 'documents' | 'history';

const KG_TO_LBS = 2.20462;

function formatWeight(value: number | string, unit: 'lbs' | 'kg' | null): React.ReactNode {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  const safeUnit = unit || 'kg';
  if (safeUnit === 'lbs') {
    const kg = numValue / KG_TO_LBS;
    return <><strong>{numValue.toFixed(1)} lbs</strong> / {kg.toFixed(1)} kg</>;
  } else {
    const lbs = numValue * KG_TO_LBS;
    return <>{lbs.toFixed(1)} lbs / <strong>{numValue.toFixed(1)} kg</strong></>;
  }
}

export default function PetDetail() {
  const { id } = useParams<{ id: string }>();
  const { token, isPremium } = useAuth();
  const navigate = useNavigate();

  const [pet, setPet] = useState<Pet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showShareModal, setShowShareModal] = useState(false);
  const [showLinkWallet, setShowLinkWallet] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);

  // Health records state
  const [vets, setVets] = useState<PetVet[]>([]);
  const [conditions, setConditions] = useState<PetCondition[]>([]);
  const [allergies, setAllergies] = useState<PetAllergy[]>([]);
  const [medications, setMedications] = useState<PetMedication[]>([]);
  const [vaccinations, setVaccinations] = useState<PetVaccination[]>([]);
  const [emergencyContacts, setEmergencyContacts] = useState<PetEmergencyContact[]>([]);

  const petId = parseInt(id || '0');

  useEffect(() => {
    loadPetData();
  }, [id, token]);

  const loadPetData = async () => {
    if (!token || !id) return;
    setIsLoading(true);
    try {
      const [petData, vetsData, conditionsData, allergiesData, medsData, vacsData, contactsData] = await Promise.all([
        petsApi.get(petId, token),
        petsApi.getVets(petId, token),
        petsApi.getConditions(petId, token),
        petsApi.getAllergies(petId, token),
        petsApi.getMedications(petId, token),
        petsApi.getVaccinations(petId, token),
        petsApi.getEmergencyContacts(petId, token),
      ]);
      setPet(petData);
      setVets(vetsData);
      setConditions(conditionsData);
      setAllergies(allergiesData);
      setMedications(medsData);
      setVaccinations(vacsData);
      setEmergencyContacts(contactsData);
    } catch (err) {
      console.error('Failed to load pet:', err);
      navigate('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePet = async () => {
    if (!token || !pet) return;
    if (!confirm(`Are you sure you want to delete ${pet.name}? This action cannot be undone.`)) return;

    try {
      await petsApi.delete(petId, token);
      navigate('/dashboard');
    } catch (err) {
      alert('Failed to delete pet');
    }
  };

  const shareUrl = pet ? `${window.location.origin}/card/${pet.share_id}` : '';

  const getFullPhotoUrl = (url: string | null) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${API_URL}${url}`;
  };

  const handlePetUpdated = (updatedPet: Pet) => {
    setPet(updatedPet);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!pet) return null;

  const timelineEventCount = conditions.length + allergies.length + medications.length + vaccinations.length;
  const tabs: { id: TabType; label: string; count?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'timeline', label: 'Timeline', count: timelineEventCount > 0 ? timelineEventCount : undefined },
    { id: 'conditions', label: 'Conditions', count: conditions.length },
    { id: 'allergies', label: 'Allergies', count: allergies.length },
    { id: 'medications', label: 'Medications', count: medications.filter(m => m.is_active).length },
    { id: 'vaccinations', label: 'Vaccinations', count: vaccinations.length },
    { id: 'vets', label: 'Veterinarians', count: vets.length },
    { id: 'contacts', label: 'Emergency Contacts', count: emergencyContacts.length },
    { id: 'documents', label: 'Import Documents' },
    { id: 'history', label: 'History' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
              {pet.photo_url ? (
                <img src={getFullPhotoUrl(pet.photo_url)!} alt={pet.name} className="w-20 h-20 rounded-full object-cover" />
              ) : (
                <span className="text-4xl">
                  {pet.species === 'dog' ? '🐕' : pet.species === 'cat' ? '🐈' : '🐾'}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{pet.name}</h1>
              <p className="text-gray-500 capitalize">
                {pet.breed ? `${pet.breed} ${pet.species}` : pet.species}
                {pet.sex && ` • ${pet.sex}${pet.is_fixed ? ' (Fixed)' : ''}`}
              </p>
              {pet.weight_kg && <p className="text-sm text-gray-400">{formatWeight(pet.weight_kg, pet.weight_unit)}</p>}
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={() => setShowEditModal(true)}
              className="btn-secondary"
            >
              Edit
            </button>
            {isPremium ? (
              <button
                onClick={() => setShowAccessModal(true)}
                className="btn-secondary"
              >
                Access
              </button>
            ) : (
              <button
                onClick={() => setShowAccessModal(true)}
                className="btn-secondary opacity-50"
                title="Premium feature - Upgrade to share pet access with others"
              >
                Access
              </button>
            )}
            <button
              onClick={() => setShowShareModal(true)}
              className="btn-primary"
            >
              Share Card
            </button>
            <button
              onClick={handleDeletePet}
              className="btn-danger"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="card">
        {activeTab === 'overview' && (
          <OverviewTab pet={pet} token={token!} onPetUpdated={handlePetUpdated} conditions={conditions} allergies={allergies} medications={medications} />
        )}
        {activeTab === 'timeline' && (
          isPremium ? (
            <MedicalTimeline
              conditions={conditions}
              allergies={allergies}
              medications={medications}
              vaccinations={vaccinations}
              dateOfBirth={pet.date_of_birth}
            />
          ) : (
            <div className="space-y-4">
              <UpgradeBanner type="feature" feature="timeline" />
              <p className="text-gray-500 text-center py-4">
                Upgrade to premium to view a visual timeline of your pet's medical history.
              </p>
            </div>
          )
        )}
        {activeTab === 'conditions' && (
          <ConditionsTab petId={petId} token={token!} conditions={conditions} setConditions={setConditions} />
        )}
        {activeTab === 'allergies' && (
          <AllergiesTab petId={petId} token={token!} allergies={allergies} setAllergies={setAllergies} />
        )}
        {activeTab === 'medications' && (
          <MedicationsTab petId={petId} token={token!} medications={medications} setMedications={setMedications} />
        )}
        {activeTab === 'vaccinations' && (
          <VaccinationsTab petId={petId} token={token!} vaccinations={vaccinations} setVaccinations={setVaccinations} />
        )}
        {activeTab === 'vets' && (
          <VetsTab petId={petId} token={token!} vets={vets} setVets={setVets} />
        )}
        {activeTab === 'contacts' && (
          <ContactsTab petId={petId} token={token!} contacts={emergencyContacts} setContacts={setEmergencyContacts} />
        )}
        {activeTab === 'documents' && (
          isPremium ? (
            <DocumentImportSection petId={petId} onImportComplete={() => loadPetData()} />
          ) : (
            <div className="space-y-4">
              <UpgradeBanner type="feature" feature="upload" />
              <p className="text-gray-500 text-center py-4">
                Upgrade to premium to import medical records from PDFs and photos.
              </p>
            </div>
          )
        )}
        {activeTab === 'history' && (
          <HistoryTab petId={petId} />
        )}
      </div>

      {/* Quick Share Modal */}
      {showShareModal && (
        <ShareModal
          petName={pet.name}
          shareUrl={shareUrl}
          onClose={() => setShowShareModal(false)}
          onManageLinks={() => {
            setShowShareModal(false);
            setShowLinkWallet(true);
          }}
        />
      )}

      {/* Link Management Wallet */}
      {showLinkWallet && (
        <ShareWallet
          petId={petId}
          petName={pet.name}
          onClose={() => setShowLinkWallet(false)}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <EditPetModal
          pet={pet}
          onClose={() => setShowEditModal(false)}
          onPetUpdated={handlePetUpdated}
        />
      )}

      {/* Manage Access Modal */}
      {showAccessModal && (
        isPremium ? (
          <ManageAccessModal
            petId={petId}
            petName={pet.name}
            onClose={() => setShowAccessModal(false)}
          />
        ) : (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Share Pet Access</h2>
              <UpgradeBanner type="feature" feature="shared_ownership" />
              <p className="text-gray-600 text-sm mt-4">
                With premium, you can invite family members or pet sitters to view and manage your pet's health records.
              </p>
              <button
                onClick={() => setShowAccessModal(false)}
                className="mt-4 w-full btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
}

// Overview Tab
type OverviewField = 'species' | 'breed' | 'sex' | 'date_of_birth' | 'weight' | 'microchip_id' | 'special_instructions';

const SPECIES_OPTIONS = [
  { value: 'dog', label: 'Dog' }, { value: 'cat', label: 'Cat' }, { value: 'bird', label: 'Bird' },
  { value: 'rabbit', label: 'Rabbit' }, { value: 'hamster', label: 'Hamster' }, { value: 'fish', label: 'Fish' },
  { value: 'reptile', label: 'Reptile' }, { value: 'other', label: 'Other' },
];

function OverviewTab({ pet, token, onPetUpdated, conditions, allergies, medications }: {
  pet: Pet;
  token: string;
  onPetUpdated: (pet: Pet) => void;
  conditions: PetCondition[];
  allergies: PetAllergy[];
  medications: PetMedication[];
}) {
  const activeMeds = medications.filter(m => m.is_active);
  const [editingField, setEditingField] = useState<OverviewField | null>(null);

  const handleSaveField = async (field: OverviewField, values: Record<string, string | boolean>) => {
    const payload: Record<string, unknown> = {};
    switch (field) {
      case 'species':
        payload.species = values.species;
        break;
      case 'breed':
        payload.breed = (values.breed as string) || null;
        break;
      case 'sex':
        payload.sex = (values.sex as string) || null;
        payload.is_fixed = values.is_fixed;
        break;
      case 'date_of_birth':
        payload.date_of_birth = (values.date_of_birth as string) || null;
        break;
      case 'weight':
        payload.weight_kg = values.weight_kg ? Number(values.weight_kg) : null;
        payload.weight_unit = values.weight_unit;
        break;
      case 'microchip_id':
        payload.microchip_id = (values.microchip_id as string) || null;
        break;
      case 'special_instructions':
        payload.special_instructions = (values.special_instructions as string) || null;
        break;
    }
    const updated = await petsApi.update(pet.id, payload as Parameters<typeof petsApi.update>[1], token);
    onPetUpdated(updated);
    setEditingField(null);
  };

  const fieldConfigs: Record<OverviewField, { fields: EditField[]; values: Record<string, string | boolean> }> = {
    species: {
      fields: [{ key: 'species', placeholder: 'Species', type: 'select', options: SPECIES_OPTIONS, required: true }],
      values: { species: pet.species },
    },
    breed: {
      fields: [{ key: 'breed', placeholder: 'Breed', type: 'text' }],
      values: { breed: pet.breed || '' },
    },
    sex: {
      fields: [
        { key: 'sex', placeholder: 'Sex', type: 'select', options: [{ value: '', label: 'Select...' }, { value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }] },
        { key: 'is_fixed', placeholder: 'Spayed / Neutered', type: 'checkbox' },
      ],
      values: { sex: pet.sex || '', is_fixed: pet.is_fixed || false },
    },
    date_of_birth: {
      fields: [{ key: 'date_of_birth', placeholder: 'Date of Birth', type: 'date' }],
      values: { date_of_birth: pet.date_of_birth ? pet.date_of_birth.split('T')[0] : '' },
    },
    weight: {
      fields: [
        { key: 'weight_kg', placeholder: 'Weight', type: 'number', step: '0.1', min: '0', gridGroup: 'weight' },
        { key: 'weight_unit', placeholder: 'Unit', type: 'select', options: [{ value: 'lbs', label: 'pounds (lbs)' }, { value: 'kg', label: 'kilograms (kg)' }], gridGroup: 'weight' },
      ],
      values: { weight_kg: pet.weight_kg ? String(pet.weight_kg) : '', weight_unit: pet.weight_unit || 'lbs' },
    },
    microchip_id: {
      fields: [{ key: 'microchip_id', placeholder: 'Microchip ID', type: 'text' }],
      values: { microchip_id: pet.microchip_id || '' },
    },
    special_instructions: {
      fields: [{ key: 'special_instructions', placeholder: 'Any special care instructions for emergency staff...', type: 'textarea', rows: 3 }],
      values: { special_instructions: pet.special_instructions || '' },
    },
  };

  const renderEditableField = (field: OverviewField, label: string, displayValue: React.ReactNode, show = true) => {
    if (!show && editingField !== field) return null;

    if (editingField === field) {
      const config = fieldConfigs[field];
      return (
        <div className="col-span-2">
          <dt className="text-sm text-gray-500 mb-1">{label}</dt>
          <InlineEditForm
            fields={config.fields}
            values={config.values}
            onSave={(vals) => handleSaveField(field, vals)}
            onCancel={() => setEditingField(null)}
          />
        </div>
      );
    }

    return (
      <div
        className="group cursor-pointer rounded-lg p-2 -m-2 hover:bg-gray-50 transition-colors"
        onClick={() => setEditingField(field)}
      >
        <dt className="text-sm text-gray-500 flex items-center gap-1">
          {label}
          <svg className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </dt>
        <dd className="text-gray-900">{displayValue}</dd>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Basic Information</h3>
        <dl className="grid grid-cols-2 gap-4">
          {renderEditableField('species', 'Species', <span className="capitalize">{pet.species}</span>)}
          {renderEditableField('breed', 'Breed', pet.breed, !!pet.breed)}
          {renderEditableField('sex', 'Sex', <span className="capitalize">{pet.sex}{pet.is_fixed ? ' (Spayed/Neutered)' : ''}</span>, !!pet.sex)}
          {renderEditableField('date_of_birth', 'Date of Birth', pet.date_of_birth ? new Date(pet.date_of_birth.split('T')[0] + 'T00:00:00').toLocaleDateString() : null, !!pet.date_of_birth)}
          {renderEditableField('weight', 'Weight', pet.weight_kg ? formatWeight(pet.weight_kg, pet.weight_unit) : null, !!pet.weight_kg)}
          {renderEditableField('microchip_id', 'Microchip ID', <span className="font-mono">{pet.microchip_id}</span>, !!pet.microchip_id)}
        </dl>
      </div>

      <div>
        {editingField === 'special_instructions' ? (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Special Instructions</h3>
            <InlineEditForm
              fields={fieldConfigs.special_instructions.fields}
              values={fieldConfigs.special_instructions.values}
              onSave={(vals) => handleSaveField('special_instructions', vals)}
              onCancel={() => setEditingField(null)}
            />
          </div>
        ) : (
          <div
            className="group cursor-pointer rounded-lg p-2 -m-2 hover:bg-gray-50 transition-colors"
            onClick={() => setEditingField('special_instructions')}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-1">
              Special Instructions
              <svg className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </h3>
            {pet.special_instructions ? (
              <p className="text-gray-700 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                {pet.special_instructions}
              </p>
            ) : (
              <p className="text-gray-400 text-sm">Click to add special instructions</p>
            )}
          </div>
        )}
      </div>

      {(conditions.length > 0 || allergies.length > 0 || activeMeds.length > 0) && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Health Summary</h3>
          <div className="grid gap-4 md:grid-cols-3">
            {conditions.length > 0 && (
              <div className="bg-orange-50 rounded-lg p-4">
                <h4 className="font-medium text-orange-800 mb-2">Conditions ({conditions.length})</h4>
                <ul className="text-sm text-orange-700 space-y-1">
                  {conditions.slice(0, 3).map(c => <li key={c.id}>{c.name}</li>)}
                  {conditions.length > 3 && <li>+{conditions.length - 3} more</li>}
                </ul>
              </div>
            )}
            {allergies.length > 0 && (
              <div className="bg-red-50 rounded-lg p-4">
                <h4 className="font-medium text-red-800 mb-2">Allergies ({allergies.length})</h4>
                <ul className="text-sm text-red-700 space-y-1">
                  {allergies.slice(0, 3).map(a => <li key={a.id}>{a.allergen}</li>)}
                  {allergies.length > 3 && <li>+{allergies.length - 3} more</li>}
                </ul>
              </div>
            )}
            {activeMeds.length > 0 && (
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">Active Medications ({activeMeds.length})</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  {activeMeds.slice(0, 3).map(m => <li key={m.id}>{m.name}</li>)}
                  {activeMeds.length > 3 && <li>+{activeMeds.length - 3} more</li>}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Shared severity options
const SEVERITY_OPTIONS = [
  { value: '', label: 'Severity (optional)' },
  { value: 'mild', label: 'Mild' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'severe', label: 'Severe' },
];

const ALLERGY_SEVERITY_OPTIONS = [
  ...SEVERITY_OPTIONS,
  { value: 'life-threatening', label: 'Life-threatening' },
];

// Conditions Tab
const CONDITION_FIELDS: EditField[] = [
  { key: 'name', placeholder: 'Condition name *', required: true },
  { key: 'severity', placeholder: 'Severity', type: 'select', options: SEVERITY_OPTIONS },
  { key: 'notes', placeholder: 'Notes (optional)', type: 'textarea' },
];

function ConditionsTab({ petId, token, conditions, setConditions }: {
  petId: number;
  token: string;
  conditions: PetCondition[];
  setConditions: (c: PetCondition[]) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [addValues, setAddValues] = useState<Record<string, string | boolean>>({ name: '', severity: '', notes: '' });

  const handleAdd = async (values: Record<string, string | boolean>) => {
    if (!(values.name as string).trim()) return;
    const condition = await petsApi.addCondition(petId, { name: values.name as string, severity: (values.severity as string) || null, notes: (values.notes as string) || null, diagnosed_date: null }, token);
    setConditions([condition, ...conditions]);
    setShowForm(false);
    setAddValues({ name: '', severity: '', notes: '' });
  };

  const handleSaveEdit = async (values: Record<string, string | boolean>) => {
    if (!editingId || !(values.name as string).trim()) return;
    const updated = await petsApi.updateCondition(petId, editingId, { name: values.name as string, severity: (values.severity as string) || null, notes: (values.notes as string) || null }, token);
    setConditions(conditions.map(c => c.id === editingId ? updated : c));
    setEditingId(null);
  };

  const handleDelete = async (id: number) => {
    await petsApi.deleteCondition(petId, id, token);
    setConditions(conditions.filter(c => c.id !== id));
    setDeletingId(null);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Medical Conditions</h3>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm">+ Add Condition</button>
      </div>

      {showForm && (
        <InlineEditForm
          fields={CONDITION_FIELDS}
          values={addValues}
          onSave={handleAdd}
          onCancel={() => setShowForm(false)}
          className="mb-4"
        />
      )}

      {conditions.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No medical conditions recorded</p>
      ) : (
        <ul className="divide-y">
          {conditions.map(c => (
            <li key={c.id} className="py-3">
              {editingId === c.id ? (
                <InlineEditForm
                  fields={CONDITION_FIELDS}
                  values={{ name: c.name, severity: c.severity || '', notes: c.notes || '' }}
                  onSave={handleSaveEdit}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{c.name}</p>
                    {c.severity && <span className="text-sm text-gray-500 capitalize">{c.severity}</span>}
                    {c.notes && <p className="text-sm text-gray-600 mt-1">{c.notes}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingId(c.id)} className="text-primary-600 hover:text-primary-800 text-sm">Edit</button>
                    {deletingId === c.id ? (
                      <>
                        <span className="text-sm text-gray-500">Sure?</span>
                        <button onClick={() => handleDelete(c.id)} className="text-red-600 hover:text-red-800 text-sm font-semibold">Yes</button>
                        <button onClick={() => setDeletingId(null)} className="text-gray-600 hover:text-gray-800 text-sm">No</button>
                      </>
                    ) : (
                      <button onClick={() => setDeletingId(c.id)} className="text-red-600 hover:text-red-800 text-sm">Delete</button>
                    )}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Allergies Tab
const ALLERGY_FIELDS: EditField[] = [
  { key: 'allergen', placeholder: 'Allergen *', required: true },
  { key: 'reaction', placeholder: 'Reaction (optional)' },
  { key: 'severity', placeholder: 'Severity', type: 'select', options: ALLERGY_SEVERITY_OPTIONS },
];

function AllergiesTab({ petId, token, allergies, setAllergies }: {
  petId: number;
  token: string;
  allergies: PetAllergy[];
  setAllergies: (a: PetAllergy[]) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [addValues, setAddValues] = useState<Record<string, string | boolean>>({ allergen: '', reaction: '', severity: '' });

  const handleAdd = async (values: Record<string, string | boolean>) => {
    if (!(values.allergen as string).trim()) return;
    const allergy = await petsApi.addAllergy(petId, { allergen: values.allergen as string, reaction: (values.reaction as string) || null, severity: (values.severity as string) || null }, token);
    setAllergies([allergy, ...allergies]);
    setShowForm(false);
    setAddValues({ allergen: '', reaction: '', severity: '' });
  };

  const handleSaveEdit = async (values: Record<string, string | boolean>) => {
    if (!editingId || !(values.allergen as string).trim()) return;
    const updated = await petsApi.updateAllergy(petId, editingId, { allergen: values.allergen as string, reaction: (values.reaction as string) || null, severity: (values.severity as string) || null }, token);
    setAllergies(allergies.map(a => a.id === editingId ? updated : a));
    setEditingId(null);
  };

  const handleDelete = async (id: number) => {
    await petsApi.deleteAllergy(petId, id, token);
    setAllergies(allergies.filter(a => a.id !== id));
    setDeletingId(null);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Allergies</h3>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm">+ Add Allergy</button>
      </div>

      {showForm && (
        <InlineEditForm
          fields={ALLERGY_FIELDS}
          values={addValues}
          onSave={handleAdd}
          onCancel={() => setShowForm(false)}
          className="mb-4"
        />
      )}

      {allergies.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No allergies recorded</p>
      ) : (
        <ul className="divide-y">
          {allergies.map(a => (
            <li key={a.id} className="py-3">
              {editingId === a.id ? (
                <InlineEditForm
                  fields={ALLERGY_FIELDS}
                  values={{ allergen: a.allergen, reaction: a.reaction || '', severity: a.severity || '' }}
                  onSave={handleSaveEdit}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{a.allergen}</p>
                    {a.severity && <span className={`text-sm capitalize ${a.severity === 'life-threatening' ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>{a.severity}</span>}
                    {a.reaction && <p className="text-sm text-gray-600 mt-1">Reaction: {a.reaction}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingId(a.id)} className="text-primary-600 hover:text-primary-800 text-sm">Edit</button>
                    {deletingId === a.id ? (
                      <>
                        <span className="text-sm text-gray-500">Sure?</span>
                        <button onClick={() => handleDelete(a.id)} className="text-red-600 hover:text-red-800 text-sm font-semibold">Yes</button>
                        <button onClick={() => setDeletingId(null)} className="text-gray-600 hover:text-gray-800 text-sm">No</button>
                      </>
                    ) : (
                      <button onClick={() => setDeletingId(a.id)} className="text-red-600 hover:text-red-800 text-sm">Delete</button>
                    )}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Medications Tab
const MEDICATION_FIELDS: EditField[] = [
  { key: 'name', placeholder: 'Medication name *', required: true },
  { key: 'dosage', placeholder: 'Dosage (e.g., 10mg)' },
  { key: 'frequency', placeholder: 'Frequency (e.g., twice daily)' },
];

function MedicationsTab({ petId, token, medications, setMedications }: {
  petId: number;
  token: string;
  medications: PetMedication[];
  setMedications: (m: PetMedication[]) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [addValues, setAddValues] = useState<Record<string, string | boolean>>({ name: '', dosage: '', frequency: '' });

  const handleAdd = async (values: Record<string, string | boolean>) => {
    if (!(values.name as string).trim()) return;
    const med = await petsApi.addMedication(petId, {
      name: values.name as string, dosage: (values.dosage as string) || null, frequency: (values.frequency as string) || null,
      start_date: null, end_date: null, prescribing_vet: null, notes: null, is_active: true
    }, token);
    setMedications([med, ...medications]);
    setShowForm(false);
    setAddValues({ name: '', dosage: '', frequency: '' });
  };

  const handleSaveEdit = async (values: Record<string, string | boolean>) => {
    if (!editingId || !(values.name as string).trim()) return;
    const updated = await petsApi.updateMedication(petId, editingId, { name: values.name as string, dosage: (values.dosage as string) || null, frequency: (values.frequency as string) || null }, token);
    setMedications(medications.map(m => m.id === editingId ? updated : m));
    setEditingId(null);
  };

  const handleToggleActive = async (med: PetMedication) => {
    const updated = await petsApi.updateMedication(petId, med.id, { is_active: !med.is_active }, token);
    setMedications(medications.map(m => m.id === med.id ? updated : m));
  };

  const handleDelete = async (id: number) => {
    await petsApi.deleteMedication(petId, id, token);
    setMedications(medications.filter(m => m.id !== id));
    setDeletingId(null);
  };

  const active = medications.filter(m => m.is_active);
  const inactive = medications.filter(m => !m.is_active);

  const renderMedRow = (m: PetMedication, isInactive?: boolean) => (
    <li key={m.id} className="p-3">
      {editingId === m.id ? (
        <InlineEditForm
          fields={MEDICATION_FIELDS}
          values={{ name: m.name, dosage: m.dosage || '', frequency: m.frequency || '' }}
          onSave={handleSaveEdit}
          onCancel={() => setEditingId(null)}
        />
      ) : (
        <div className="flex justify-between items-start">
          <div>
            <p className={`font-medium ${isInactive ? 'line-through' : ''}`}>{m.name}</p>
            {m.dosage && <span className="text-sm text-gray-500">{m.dosage}</span>}
            {m.frequency && <span className="text-sm text-gray-500"> - {m.frequency}</span>}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setEditingId(m.id)} className="text-primary-600 hover:text-primary-800 text-sm">Edit</button>
            <button onClick={() => handleToggleActive(m)} className={`text-sm ${isInactive ? 'text-primary-600 hover:text-primary-800' : 'text-gray-600 hover:text-gray-800'}`}>
              {isInactive ? 'Reactivate' : 'Discontinue'}
            </button>
            {deletingId === m.id ? (
              <>
                <span className="text-sm text-gray-500">Sure?</span>
                <button onClick={() => handleDelete(m.id)} className="text-red-600 hover:text-red-800 text-sm font-semibold">Yes</button>
                <button onClick={() => setDeletingId(null)} className="text-gray-600 hover:text-gray-800 text-sm">No</button>
              </>
            ) : (
              <button onClick={() => setDeletingId(m.id)} className="text-red-600 hover:text-red-800 text-sm">Delete</button>
            )}
          </div>
        </div>
      )}
    </li>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Medications</h3>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm">+ Add Medication</button>
      </div>

      {showForm && (
        <InlineEditForm
          fields={MEDICATION_FIELDS}
          values={addValues}
          onSave={handleAdd}
          onCancel={() => setShowForm(false)}
          className="mb-4"
        />
      )}

      {active.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-500 mb-2">Active Medications</h4>
          <ul className="divide-y border rounded-lg">
            {active.map(m => renderMedRow(m))}
          </ul>
        </div>
      )}

      {inactive.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-2">Past Medications</h4>
          <ul className="divide-y border rounded-lg opacity-60">
            {inactive.map(m => renderMedRow(m, true))}
          </ul>
        </div>
      )}

      {medications.length === 0 && (
        <p className="text-gray-500 text-center py-8">No medications recorded</p>
      )}
    </div>
  );
}

// Vaccinations Tab
const VACCINATION_FIELDS: EditField[] = [
  { key: 'name', placeholder: 'Vaccination name *', required: true },
  { key: 'administered_date', placeholder: 'Date administered', type: 'date', label: 'Date administered *', required: true, gridGroup: 'dates' },
  { key: 'expiration_date', placeholder: 'Expiration date', type: 'date', label: 'Expiration date', gridGroup: 'dates' },
];

function VaccinationsTab({ petId, token, vaccinations, setVaccinations }: {
  petId: number;
  token: string;
  vaccinations: PetVaccination[];
  setVaccinations: (v: PetVaccination[]) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [addValues, setAddValues] = useState<Record<string, string | boolean>>({ name: '', administered_date: '', expiration_date: '' });

  const toDateInput = (d: string | null) => d ? d.split('T')[0] : '';

  const handleAdd = async (values: Record<string, string | boolean>) => {
    if (!(values.name as string).trim() || !values.administered_date) return;
    const vac = await petsApi.addVaccination(petId, {
      name: values.name as string, administered_date: values.administered_date as string,
      expiration_date: (values.expiration_date as string) || null,
      administered_by: null, lot_number: null
    }, token);
    setVaccinations([vac, ...vaccinations]);
    setShowForm(false);
    setAddValues({ name: '', administered_date: '', expiration_date: '' });
  };

  const handleSaveEdit = async (values: Record<string, string | boolean>) => {
    if (!editingId || !(values.name as string).trim() || !values.administered_date) return;
    const updated = await petsApi.updateVaccination(petId, editingId, { name: values.name as string, administered_date: values.administered_date as string, expiration_date: (values.expiration_date as string) || null }, token);
    setVaccinations(vaccinations.map(v => v.id === editingId ? updated : v));
    setEditingId(null);
  };

  const handleDelete = async (id: number) => {
    await petsApi.deleteVaccination(petId, id, token);
    setVaccinations(vaccinations.filter(v => v.id !== id));
    setDeletingId(null);
  };

  const isExpired = (expDate: string | null) => {
    if (!expDate) return false;
    return new Date(expDate) < new Date();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Vaccinations</h3>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm">+ Add Vaccination</button>
      </div>

      {showForm && (
        <InlineEditForm
          fields={VACCINATION_FIELDS}
          values={addValues}
          onSave={handleAdd}
          onCancel={() => setShowForm(false)}
          className="mb-4"
        />
      )}

      {vaccinations.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No vaccinations recorded</p>
      ) : (
        <ul className="divide-y">
          {vaccinations.map(v => (
            <li key={v.id} className="py-3">
              {editingId === v.id ? (
                <InlineEditForm
                  fields={VACCINATION_FIELDS}
                  values={{ name: v.name, administered_date: toDateInput(v.administered_date), expiration_date: toDateInput(v.expiration_date) }}
                  onSave={handleSaveEdit}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{v.name}</p>
                    <p className="text-sm text-gray-500">
                      Administered: {new Date(v.administered_date.split('T')[0] + 'T00:00:00').toLocaleDateString()}
                    </p>
                    {v.expiration_date && (
                      <p className={`text-sm ${isExpired(v.expiration_date) ? 'text-red-600' : 'text-gray-500'}`}>
                        {isExpired(v.expiration_date) ? 'Expired' : 'Expires'}: {new Date(v.expiration_date.split('T')[0] + 'T00:00:00').toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingId(v.id)} className="text-primary-600 hover:text-primary-800 text-sm">Edit</button>
                    {deletingId === v.id ? (
                      <>
                        <span className="text-sm text-gray-500">Sure?</span>
                        <button onClick={() => handleDelete(v.id)} className="text-red-600 hover:text-red-800 text-sm font-semibold">Yes</button>
                        <button onClick={() => setDeletingId(null)} className="text-gray-600 hover:text-gray-800 text-sm">No</button>
                      </>
                    ) : (
                      <button onClick={() => setDeletingId(v.id)} className="text-red-600 hover:text-red-800 text-sm">Delete</button>
                    )}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Vets Tab
const VET_FIELDS: EditField[] = [
  { key: 'clinic_name', placeholder: 'Clinic name *', required: true },
  { key: 'vet_name', placeholder: 'Vet name' },
  { key: 'phone', placeholder: 'Phone number', type: 'tel' },
];

function VetsTab({ petId, token, vets, setVets }: {
  petId: number;
  token: string;
  vets: PetVet[];
  setVets: (v: PetVet[]) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [addValues, setAddValues] = useState<Record<string, string | boolean>>({ clinic_name: '', vet_name: '', phone: '' });

  const handleAdd = async (values: Record<string, string | boolean>) => {
    if (!(values.clinic_name as string).trim()) return;
    const vet = await petsApi.addVet(petId, {
      clinic_name: values.clinic_name as string, vet_name: (values.vet_name as string) || null,
      phone: (values.phone as string) || null, email: null, address: null, is_primary: vets.length === 0
    }, token);
    setVets([vet, ...vets]);
    setShowForm(false);
    setAddValues({ clinic_name: '', vet_name: '', phone: '' });
  };

  const handleSaveEdit = async (values: Record<string, string | boolean>) => {
    if (!editingId || !(values.clinic_name as string).trim()) return;
    const updated = await petsApi.updateVet(petId, editingId, { clinic_name: values.clinic_name as string, vet_name: (values.vet_name as string) || null, phone: (values.phone as string) || null }, token);
    setVets(vets.map(v => v.id === editingId ? updated : v));
    setEditingId(null);
  };

  const handleDelete = async (id: number) => {
    await petsApi.deleteVet(petId, id, token);
    setVets(vets.filter(v => v.id !== id));
    setDeletingId(null);
  };

  const handleSetPrimary = async (vetId: number) => {
    await petsApi.setPrimaryVet(petId, vetId, token);
    setVets(vets.map(v => ({ ...v, is_primary: v.id === vetId })));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Veterinarians</h3>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm">+ Add Vet</button>
      </div>

      {showForm && (
        <InlineEditForm
          fields={VET_FIELDS}
          values={addValues}
          onSave={handleAdd}
          onCancel={() => setShowForm(false)}
          className="mb-4"
        />
      )}

      {vets.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No veterinarians recorded</p>
      ) : (
        <ul className="divide-y">
          {vets.map(v => (
            <li key={v.id} className="py-3">
              {editingId === v.id ? (
                <InlineEditForm
                  fields={VET_FIELDS}
                  values={{ clinic_name: v.clinic_name, vet_name: v.vet_name || '', phone: v.phone || '' }}
                  onSave={handleSaveEdit}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{v.clinic_name} {v.is_primary && <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded">Primary</span>}</p>
                    {v.vet_name && <p className="text-sm text-gray-600">Dr. {v.vet_name}</p>}
                    {v.phone && <p className="text-sm text-gray-500">{v.phone}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingId(v.id)} className="text-primary-600 hover:text-primary-800 text-sm">Edit</button>
                    {!v.is_primary && (
                      <button onClick={() => handleSetPrimary(v.id)} className="text-primary-600 hover:text-primary-800 text-sm">Set as Primary</button>
                    )}
                    {deletingId === v.id ? (
                      <>
                        <span className="text-sm text-gray-500">Sure?</span>
                        <button onClick={() => handleDelete(v.id)} className="text-red-600 hover:text-red-800 text-sm font-semibold">Yes</button>
                        <button onClick={() => setDeletingId(null)} className="text-gray-600 hover:text-gray-800 text-sm">No</button>
                      </>
                    ) : (
                      <button onClick={() => setDeletingId(v.id)} className="text-red-600 hover:text-red-800 text-sm">Delete</button>
                    )}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Contacts Tab
const CONTACT_FIELDS: EditField[] = [
  { key: 'name', placeholder: 'Name *', required: true },
  { key: 'phone', placeholder: 'Phone *', type: 'tel', required: true },
  { key: 'relationship', placeholder: 'Relationship (e.g., spouse, neighbor)' },
];

function ContactsTab({ petId, token, contacts, setContacts }: {
  petId: number;
  token: string;
  contacts: PetEmergencyContact[];
  setContacts: (c: PetEmergencyContact[]) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [addValues, setAddValues] = useState<Record<string, string | boolean>>({ name: '', phone: '', relationship: '' });

  const handleAdd = async (values: Record<string, string | boolean>) => {
    if (!(values.name as string).trim() || !(values.phone as string).trim()) return;
    const contact = await petsApi.addEmergencyContact(petId, {
      name: values.name as string, phone: values.phone as string, relationship: (values.relationship as string) || null, email: null, is_primary: contacts.length === 0
    }, token);
    setContacts([contact, ...contacts]);
    setShowForm(false);
    setAddValues({ name: '', phone: '', relationship: '' });
  };

  const handleSaveEdit = async (values: Record<string, string | boolean>) => {
    if (!editingId || !(values.name as string).trim() || !(values.phone as string).trim()) return;
    const updated = await petsApi.updateEmergencyContact(petId, editingId, { name: values.name as string, phone: values.phone as string, relationship: (values.relationship as string) || null }, token);
    setContacts(contacts.map(c => c.id === editingId ? updated : c));
    setEditingId(null);
  };

  const handleDelete = async (id: number) => {
    await petsApi.deleteEmergencyContact(petId, id, token);
    setContacts(contacts.filter(c => c.id !== id));
    setDeletingId(null);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Emergency Contacts</h3>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm">+ Add Contact</button>
      </div>

      {showForm && (
        <InlineEditForm
          fields={CONTACT_FIELDS}
          values={addValues}
          onSave={handleAdd}
          onCancel={() => setShowForm(false)}
          className="mb-4"
        />
      )}

      {contacts.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No emergency contacts recorded</p>
      ) : (
        <ul className="divide-y">
          {contacts.map(c => (
            <li key={c.id} className="py-3">
              {editingId === c.id ? (
                <InlineEditForm
                  fields={CONTACT_FIELDS}
                  values={{ name: c.name, phone: c.phone, relationship: c.relationship || '' }}
                  onSave={handleSaveEdit}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{c.name} {c.is_primary && <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded">Primary</span>}</p>
                    {c.relationship && <p className="text-sm text-gray-600">{c.relationship}</p>}
                    <p className="text-sm text-gray-500">{c.phone}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingId(c.id)} className="text-primary-600 hover:text-primary-800 text-sm">Edit</button>
                    {deletingId === c.id ? (
                      <>
                        <span className="text-sm text-gray-500">Sure?</span>
                        <button onClick={() => handleDelete(c.id)} className="text-red-600 hover:text-red-800 text-sm font-semibold">Yes</button>
                        <button onClick={() => setDeletingId(null)} className="text-gray-600 hover:text-gray-800 text-sm">No</button>
                      </>
                    ) : (
                      <button onClick={() => setDeletingId(c.id)} className="text-red-600 hover:text-red-800 text-sm">Delete</button>
                    )}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// History Tab
function HistoryTab({ petId }: { petId: number }) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Change History</h3>
      <p className="text-sm text-gray-600 mb-4">
        View all changes made to your pet's health records, including data imported from PDFs.
      </p>
      <AuditLogViewer petId={petId} />
    </div>
  );
}

