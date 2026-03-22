import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Outlet, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  petsApi,
  documentsApi,
  Pet,
  PetVet,
  PetCondition,
  PetAllergy,
  PetMedication,
  PetVaccination,
  PetEmergencyContact,
  PetAlert,
  DocumentUpload,
} from '../api/client';
import ManageAccessModal from '../components/ManageAccessModal';
import PhotoUpload from '../components/PhotoUpload';
import ShareModal from '../components/ShareModal';
import ShareWallet from '../components/ShareWallet';
import PetProfileNav from './pet-profile/PetProfileNav';
import { PetProfileContext } from './pet-profile/context';
import { formatWeight } from './pet-profile/utils';

const SECTION_LABELS: Record<string, string> = {
  'health': 'Health Records',
  'care-team': 'Care Team',
  'documents': 'Documents',
  'activity': 'Activity',
};

export default function PetDetail() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [pet, setPet] = useState<Pet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showLinkWallet, setShowLinkWallet] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [pendingDocNav, setPendingDocNav] = useState<{ uploadId: number; highlightItemId: number } | null>(null);

  const handleNavigateToReview = (uploadId: number, highlightItemId: number) => {
    setPendingDocNav({ uploadId, highlightItemId });
    navigate('documents');
  };

  // Health records state
  const [vets, setVets] = useState<PetVet[]>([]);
  const [conditions, setConditions] = useState<PetCondition[]>([]);
  const [allergies, setAllergies] = useState<PetAllergy[]>([]);
  const [medications, setMedications] = useState<PetMedication[]>([]);
  const [vaccinations, setVaccinations] = useState<PetVaccination[]>([]);
  const [emergencyContacts, setEmergencyContacts] = useState<PetEmergencyContact[]>([]);
  const [alerts, setAlerts] = useState<PetAlert[]>([]);
  const [imageUploads, setImageUploads] = useState<DocumentUpload[]>([]);

  const petId = parseInt(id || '0');

  useEffect(() => {
    loadPetData();
  }, [id, token]);

  const loadPetData = async () => {
    if (!token || !id) return;
    setIsLoading(true);
    try {
      const [petData, vetsData, conditionsData, allergiesData, medsData, vacsData, contactsData, alertsData, uploadsData] = await Promise.all([
        petsApi.get(petId, token),
        petsApi.getVets(petId, token),
        petsApi.getConditions(petId, token),
        petsApi.getAllergies(petId, token),
        petsApi.getMedications(petId, token),
        petsApi.getVaccinations(petId, token),
        petsApi.getEmergencyContacts(petId, token),
        petsApi.getAlerts(petId, token),
        documentsApi.listUploads(petId, token).catch(() => [] as DocumentUpload[]),
      ]);
      setPet(petData);
      setVets(vetsData);
      setConditions(conditionsData);
      setAllergies(allergiesData);
      setMedications(medsData);
      setVaccinations(vacsData);
      setEmergencyContacts(contactsData);
      setAlerts(alertsData);
      setImageUploads(uploadsData.filter((u: any) => {
        const isImage = u.file_type === 'image' || u.media_type === 'image' || (u.mime_type && u.mime_type.startsWith('image/'));
        return isImage && u.status === 'completed';
      }));
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

  const handlePetUpdated = (updatedPet: Pet) => {
    setPet(updatedPet);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--color-navy)' }}></div>
      </div>
    );
  }

  if (!pet) return null;

  // Determine current section for breadcrumbs
  const basePath = `/pets/${id}`;
  const subPath = location.pathname.replace(basePath, '').replace(/^\//, '');
  const sectionLabel = SECTION_LABELS[subPath] || '';

  // Build outlet context
  const outletContext: PetProfileContext = {
    pet,
    petId,
    token: token!,
    isPremium: true, // Beta: all features unlocked
    vets,
    setVets,
    conditions,
    setConditions,
    allergies,
    setAllergies,
    medications,
    setMedications,
    vaccinations,
    setVaccinations,
    emergencyContacts,
    setEmergencyContacts,
    alerts,
    setAlerts,
    imageUploads,
    handlePetUpdated,
    handleNavigateToReview,
    loadPetData,
    setShowShareModal,
    pendingDocNav,
    setPendingDocNav,
  };

  return (
    <div>
      {/* Breadcrumbs */}
      <div className="breadcrumb">
        <Link to="/dashboard">Dashboard</Link>
        <span className="sep">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
        </span>
        {sectionLabel ? (
          <>
            <Link to={basePath}>{pet.name}</Link>
            <span className="sep">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
            </span>
            <span className="current">{sectionLabel}</span>
          </>
        ) : (
          <span className="current">{pet.name}</span>
        )}
      </div>

      {/* Header card */}
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <PhotoUpload
              petId={petId}
              currentPhotoUrl={pet.photo_url}
              onPhotoUpdated={(photoUrl) => setPet({ ...pet, photo_url: photoUrl })}
              compact
              species={pet.species}
            />
            <div>
              <h1 className="text-2xl" style={{ color: 'var(--color-navy)', fontWeight: 700 }}>{pet.name}</h1>
              <p className="capitalize" style={{ color: 'var(--color-surface-500)' }}>
                {pet.breed ? `${pet.breed} ${pet.species}` : pet.species}
                {pet.sex && ` \u2022 ${pet.sex}${pet.is_fixed ? ' (Fixed)' : ''}`}
              </p>
              {pet.weight_kg && <p className="text-sm" style={{ color: 'var(--color-surface-400)' }}>{formatWeight(pet.weight_kg, pet.weight_unit)}</p>}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowAccessModal(true)}
              className="btn btn-ghost btn-sm"
              style={{ border: '1px solid var(--color-surface-200)' }}
            >
              Access
            </button>
            <button
              onClick={() => setShowShareModal(true)}
              className="btn btn-accent btn-sm"
            >
              Share Card
            </button>
            <button
              onClick={handleDeletePet}
              className="btn btn-danger btn-sm"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar + Content layout */}
      <div className="pet-profile-layout">
        <PetProfileNav
          basePath={basePath}
          counts={{
            conditions: conditions.length,
            allergies: allergies.length,
            medications: medications.filter(m => m.is_active).length,
            vaccinations: vaccinations.length,
            vets: vets.length,
            contacts: emergencyContacts.length,
            alerts: alerts.filter(a => a.is_active).length,
            images: imageUploads.length,
          }}
        />

        <div className="pet-profile-content">
          <Outlet context={outletContext} />
        </div>
      </div>

      {/* Share Modal */}
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
