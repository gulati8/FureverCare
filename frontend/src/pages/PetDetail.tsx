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
import { DocumentImportSection } from '../components/document-import/DocumentImportSection';
import { AuditLogViewer } from '../components/audit/AuditLogViewer';
import { MedicalTimeline } from '../components/MedicalTimeline';

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
  const { token } = useAuth();
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
            <button
              onClick={() => setShowAccessModal(true)}
              className="btn-secondary"
            >
              Access
            </button>
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
          <OverviewTab pet={pet} conditions={conditions} allergies={allergies} medications={medications} />
        )}
        {activeTab === 'timeline' && (
          <MedicalTimeline
            conditions={conditions}
            allergies={allergies}
            medications={medications}
            vaccinations={vaccinations}
            dateOfBirth={pet.date_of_birth}
          />
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
          <DocumentImportSection petId={petId} onImportComplete={() => loadPetData()} />
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
          permanentShareUrl={shareUrl}
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
        <ManageAccessModal
          petId={petId}
          petName={pet.name}
          onClose={() => setShowAccessModal(false)}
        />
      )}
    </div>
  );
}

// Overview Tab
function OverviewTab({ pet, conditions, allergies, medications }: {
  pet: Pet;
  conditions: PetCondition[];
  allergies: PetAllergy[];
  medications: PetMedication[];
}) {
  const activeMeds = medications.filter(m => m.is_active);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Basic Information</h3>
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-sm text-gray-500">Species</dt>
            <dd className="text-gray-900 capitalize">{pet.species}</dd>
          </div>
          {pet.breed && (
            <div>
              <dt className="text-sm text-gray-500">Breed</dt>
              <dd className="text-gray-900">{pet.breed}</dd>
            </div>
          )}
          {pet.sex && (
            <div>
              <dt className="text-sm text-gray-500">Sex</dt>
              <dd className="text-gray-900 capitalize">{pet.sex}{pet.is_fixed ? ' (Spayed/Neutered)' : ''}</dd>
            </div>
          )}
          {pet.date_of_birth && (
            <div>
              <dt className="text-sm text-gray-500">Date of Birth</dt>
              <dd className="text-gray-900">{new Date(pet.date_of_birth.split('T')[0] + 'T00:00:00').toLocaleDateString()}</dd>
            </div>
          )}
          {pet.weight_kg && (
            <div>
              <dt className="text-sm text-gray-500">Weight</dt>
              <dd className="text-gray-900">{formatWeight(pet.weight_kg, pet.weight_unit)}</dd>
            </div>
          )}
          {pet.microchip_id && (
            <div>
              <dt className="text-sm text-gray-500">Microchip ID</dt>
              <dd className="text-gray-900 font-mono">{pet.microchip_id}</dd>
            </div>
          )}
        </dl>
      </div>

      {pet.special_instructions && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Special Instructions</h3>
          <p className="text-gray-700 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            {pet.special_instructions}
          </p>
        </div>
      )}

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

// Conditions Tab
function ConditionsTab({ petId, token, conditions, setConditions }: {
  petId: number;
  token: string;
  conditions: PetCondition[];
  setConditions: (c: PetCondition[]) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [severity, setSeverity] = useState('');
  const [notes, setNotes] = useState('');

  const handleAdd = async () => {
    if (!name.trim()) return;
    const condition = await petsApi.addCondition(petId, { name, severity: severity || null, notes: notes || null, diagnosed_date: null }, token);
    setConditions([condition, ...conditions]);
    setShowForm(false);
    setName(''); setSeverity(''); setNotes('');
  };

  const handleDelete = async (id: number) => {
    await petsApi.deleteCondition(petId, id, token);
    setConditions(conditions.filter(c => c.id !== id));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Medical Conditions</h3>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm">+ Add Condition</button>
      </div>

      {showForm && (
        <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
          <input type="text" placeholder="Condition name *" value={name} onChange={e => setName(e.target.value)} className="input" />
          <select value={severity} onChange={e => setSeverity(e.target.value)} className="input">
            <option value="">Severity (optional)</option>
            <option value="mild">Mild</option>
            <option value="moderate">Moderate</option>
            <option value="severe">Severe</option>
          </select>
          <textarea placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} className="input" rows={2} />
          <div className="flex gap-2">
            <button onClick={handleAdd} className="btn-primary text-sm">Save</button>
            <button onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancel</button>
          </div>
        </div>
      )}

      {conditions.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No medical conditions recorded</p>
      ) : (
        <ul className="divide-y">
          {conditions.map(c => (
            <li key={c.id} className="py-3 flex justify-between items-start">
              <div>
                <p className="font-medium">{c.name}</p>
                {c.severity && <span className="text-sm text-gray-500 capitalize">{c.severity}</span>}
                {c.notes && <p className="text-sm text-gray-600 mt-1">{c.notes}</p>}
              </div>
              <button onClick={() => handleDelete(c.id)} className="text-red-600 hover:text-red-800 text-sm">Delete</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Allergies Tab
function AllergiesTab({ petId, token, allergies, setAllergies }: {
  petId: number;
  token: string;
  allergies: PetAllergy[];
  setAllergies: (a: PetAllergy[]) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [allergen, setAllergen] = useState('');
  const [reaction, setReaction] = useState('');
  const [severity, setSeverity] = useState('');

  const handleAdd = async () => {
    if (!allergen.trim()) return;
    const allergy = await petsApi.addAllergy(petId, { allergen, reaction: reaction || null, severity: severity || null }, token);
    setAllergies([allergy, ...allergies]);
    setShowForm(false);
    setAllergen(''); setReaction(''); setSeverity('');
  };

  const handleDelete = async (id: number) => {
    await petsApi.deleteAllergy(petId, id, token);
    setAllergies(allergies.filter(a => a.id !== id));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Allergies</h3>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm">+ Add Allergy</button>
      </div>

      {showForm && (
        <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
          <input type="text" placeholder="Allergen *" value={allergen} onChange={e => setAllergen(e.target.value)} className="input" />
          <input type="text" placeholder="Reaction (optional)" value={reaction} onChange={e => setReaction(e.target.value)} className="input" />
          <select value={severity} onChange={e => setSeverity(e.target.value)} className="input">
            <option value="">Severity (optional)</option>
            <option value="mild">Mild</option>
            <option value="moderate">Moderate</option>
            <option value="severe">Severe</option>
            <option value="life-threatening">Life-threatening</option>
          </select>
          <div className="flex gap-2">
            <button onClick={handleAdd} className="btn-primary text-sm">Save</button>
            <button onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancel</button>
          </div>
        </div>
      )}

      {allergies.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No allergies recorded</p>
      ) : (
        <ul className="divide-y">
          {allergies.map(a => (
            <li key={a.id} className="py-3 flex justify-between items-start">
              <div>
                <p className="font-medium">{a.allergen}</p>
                {a.severity && <span className={`text-sm capitalize ${a.severity === 'life-threatening' ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>{a.severity}</span>}
                {a.reaction && <p className="text-sm text-gray-600 mt-1">Reaction: {a.reaction}</p>}
              </div>
              <button onClick={() => handleDelete(a.id)} className="text-red-600 hover:text-red-800 text-sm">Delete</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Medications Tab
function MedicationsTab({ petId, token, medications, setMedications }: {
  petId: number;
  token: string;
  medications: PetMedication[];
  setMedications: (m: PetMedication[]) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('');

  const handleAdd = async () => {
    if (!name.trim()) return;
    const med = await petsApi.addMedication(petId, {
      name, dosage: dosage || null, frequency: frequency || null,
      start_date: null, end_date: null, prescribing_vet: null, notes: null, is_active: true
    }, token);
    setMedications([med, ...medications]);
    setShowForm(false);
    setName(''); setDosage(''); setFrequency('');
  };

  const handleToggleActive = async (med: PetMedication) => {
    const updated = await petsApi.updateMedication(petId, med.id, { is_active: !med.is_active }, token);
    setMedications(medications.map(m => m.id === med.id ? updated : m));
  };

  const handleDelete = async (id: number) => {
    await petsApi.deleteMedication(petId, id, token);
    setMedications(medications.filter(m => m.id !== id));
  };

  const active = medications.filter(m => m.is_active);
  const inactive = medications.filter(m => !m.is_active);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Medications</h3>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm">+ Add Medication</button>
      </div>

      {showForm && (
        <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
          <input type="text" placeholder="Medication name *" value={name} onChange={e => setName(e.target.value)} className="input" />
          <input type="text" placeholder="Dosage (e.g., 10mg)" value={dosage} onChange={e => setDosage(e.target.value)} className="input" />
          <input type="text" placeholder="Frequency (e.g., twice daily)" value={frequency} onChange={e => setFrequency(e.target.value)} className="input" />
          <div className="flex gap-2">
            <button onClick={handleAdd} className="btn-primary text-sm">Save</button>
            <button onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancel</button>
          </div>
        </div>
      )}

      {active.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-500 mb-2">Active Medications</h4>
          <ul className="divide-y border rounded-lg">
            {active.map(m => (
              <li key={m.id} className="p-3 flex justify-between items-start">
                <div>
                  <p className="font-medium">{m.name}</p>
                  {m.dosage && <span className="text-sm text-gray-500">{m.dosage}</span>}
                  {m.frequency && <span className="text-sm text-gray-500"> - {m.frequency}</span>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleToggleActive(m)} className="text-gray-600 hover:text-gray-800 text-sm">Discontinue</button>
                  <button onClick={() => handleDelete(m.id)} className="text-red-600 hover:text-red-800 text-sm">Delete</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {inactive.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-2">Past Medications</h4>
          <ul className="divide-y border rounded-lg opacity-60">
            {inactive.map(m => (
              <li key={m.id} className="p-3 flex justify-between items-start">
                <div>
                  <p className="font-medium line-through">{m.name}</p>
                  {m.dosage && <span className="text-sm text-gray-500">{m.dosage}</span>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleToggleActive(m)} className="text-primary-600 hover:text-primary-800 text-sm">Reactivate</button>
                  <button onClick={() => handleDelete(m.id)} className="text-red-600 hover:text-red-800 text-sm">Delete</button>
                </div>
              </li>
            ))}
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
function VaccinationsTab({ petId, token, vaccinations, setVaccinations }: {
  petId: number;
  token: string;
  vaccinations: PetVaccination[];
  setVaccinations: (v: PetVaccination[]) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [adminDate, setAdminDate] = useState('');
  const [expDate, setExpDate] = useState('');

  const handleAdd = async () => {
    if (!name.trim() || !adminDate) return;
    const vac = await petsApi.addVaccination(petId, {
      name, administered_date: adminDate,
      expiration_date: expDate || null,
      administered_by: null, lot_number: null
    }, token);
    setVaccinations([vac, ...vaccinations]);
    setShowForm(false);
    setName(''); setAdminDate(''); setExpDate('');
  };

  const handleDelete = async (id: number) => {
    await petsApi.deleteVaccination(petId, id, token);
    setVaccinations(vaccinations.filter(v => v.id !== id));
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
        <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
          <input type="text" placeholder="Vaccination name *" value={name} onChange={e => setName(e.target.value)} className="input" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-600">Date administered *</label>
              <input type="date" value={adminDate} onChange={e => setAdminDate(e.target.value)} className="input" />
            </div>
            <div>
              <label className="text-sm text-gray-600">Expiration date</label>
              <input type="date" value={expDate} onChange={e => setExpDate(e.target.value)} className="input" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} className="btn-primary text-sm">Save</button>
            <button onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancel</button>
          </div>
        </div>
      )}

      {vaccinations.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No vaccinations recorded</p>
      ) : (
        <ul className="divide-y">
          {vaccinations.map(v => (
            <li key={v.id} className="py-3 flex justify-between items-start">
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
              <button onClick={() => handleDelete(v.id)} className="text-red-600 hover:text-red-800 text-sm">Delete</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Vets Tab
function VetsTab({ petId, token, vets, setVets }: {
  petId: number;
  token: string;
  vets: PetVet[];
  setVets: (v: PetVet[]) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [clinicName, setClinicName] = useState('');
  const [vetName, setVetName] = useState('');
  const [phone, setPhone] = useState('');

  const handleAdd = async () => {
    if (!clinicName.trim()) return;
    const vet = await petsApi.addVet(petId, {
      clinic_name: clinicName, vet_name: vetName || null,
      phone: phone || null, email: null, address: null, is_primary: vets.length === 0
    }, token);
    setVets([vet, ...vets]);
    setShowForm(false);
    setClinicName(''); setVetName(''); setPhone('');
  };

  const handleDelete = async (id: number) => {
    await petsApi.deleteVet(petId, id, token);
    setVets(vets.filter(v => v.id !== id));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Veterinarians</h3>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm">+ Add Vet</button>
      </div>

      {showForm && (
        <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
          <input type="text" placeholder="Clinic name *" value={clinicName} onChange={e => setClinicName(e.target.value)} className="input" />
          <input type="text" placeholder="Vet name" value={vetName} onChange={e => setVetName(e.target.value)} className="input" />
          <input type="tel" placeholder="Phone number" value={phone} onChange={e => setPhone(e.target.value)} className="input" />
          <div className="flex gap-2">
            <button onClick={handleAdd} className="btn-primary text-sm">Save</button>
            <button onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancel</button>
          </div>
        </div>
      )}

      {vets.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No veterinarians recorded</p>
      ) : (
        <ul className="divide-y">
          {vets.map(v => (
            <li key={v.id} className="py-3 flex justify-between items-start">
              <div>
                <p className="font-medium">{v.clinic_name} {v.is_primary && <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded">Primary</span>}</p>
                {v.vet_name && <p className="text-sm text-gray-600">Dr. {v.vet_name}</p>}
                {v.phone && <p className="text-sm text-gray-500">{v.phone}</p>}
              </div>
              <button onClick={() => handleDelete(v.id)} className="text-red-600 hover:text-red-800 text-sm">Delete</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Contacts Tab
function ContactsTab({ petId, token, contacts, setContacts }: {
  petId: number;
  token: string;
  contacts: PetEmergencyContact[];
  setContacts: (c: PetEmergencyContact[]) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('');

  const handleAdd = async () => {
    if (!name.trim() || !phone.trim()) return;
    const contact = await petsApi.addEmergencyContact(petId, {
      name, phone, relationship: relationship || null, email: null, is_primary: contacts.length === 0
    }, token);
    setContacts([contact, ...contacts]);
    setShowForm(false);
    setName(''); setPhone(''); setRelationship('');
  };

  const handleDelete = async (id: number) => {
    await petsApi.deleteEmergencyContact(petId, id, token);
    setContacts(contacts.filter(c => c.id !== id));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Emergency Contacts</h3>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm">+ Add Contact</button>
      </div>

      {showForm && (
        <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
          <input type="text" placeholder="Name *" value={name} onChange={e => setName(e.target.value)} className="input" />
          <input type="tel" placeholder="Phone *" value={phone} onChange={e => setPhone(e.target.value)} className="input" />
          <input type="text" placeholder="Relationship (e.g., spouse, neighbor)" value={relationship} onChange={e => setRelationship(e.target.value)} className="input" />
          <div className="flex gap-2">
            <button onClick={handleAdd} className="btn-primary text-sm">Save</button>
            <button onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancel</button>
          </div>
        </div>
      )}

      {contacts.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No emergency contacts recorded</p>
      ) : (
        <ul className="divide-y">
          {contacts.map(c => (
            <li key={c.id} className="py-3 flex justify-between items-start">
              <div>
                <p className="font-medium">{c.name} {c.is_primary && <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded">Primary</span>}</p>
                {c.relationship && <p className="text-sm text-gray-600">{c.relationship}</p>}
                <p className="text-sm text-gray-500">{c.phone}</p>
              </div>
              <button onClick={() => handleDelete(c.id)} className="text-red-600 hover:text-red-800 text-sm">Delete</button>
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

