import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation, Outlet, Link } from 'react-router-dom';
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
  PetAlert,
} from '../api/client';
import ManageAccessModal from '../components/ManageAccessModal';
import PhotoUpload from '../components/PhotoUpload';
import ShareModal from '../components/ShareModal';
import ShareWallet from '../components/ShareWallet';
import UpgradeBanner from '../components/UpgradeBanner';
import PetProfileNav from './pet-profile/PetProfileNav';
import { PetProfileContext } from './pet-profile/context';
import { formatWeight } from './pet-profile/utils';

const SECTION_LABELS: Record<string, string> = {
  'health': 'Health Profile',
  'care-team': 'Care Team',
  'documents': 'Health Records',
  'activity': 'Timeline',
};

export default function PetDetail() {
  const { id } = useParams<{ id: string }>();
  const { token, isPremium } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [pet, setPet] = useState<Pet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showLinkWallet, setShowLinkWallet] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [pendingDocNav, setPendingDocNav] = useState<{ uploadId: number; highlightItemId: number } | null>(null);

  // Health scroll-spy
  const [healthActiveSection, setHealthActiveSection] = useState<string | null>(null);
  const scrollToHealthRef = useRef<(id: string) => void>(() => {});
  const registerScrollToHealthSection = useCallback((fn: (id: string) => void) => { scrollToHealthRef.current = fn; }, []);
  const scrollToHealthSection = (id: string) => scrollToHealthRef.current(id);

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

  const petId = parseInt(id || '0');

  useEffect(() => {
    loadPetData();
  }, [id, token]);

  const loadPetData = async () => {
    if (!token || !id) return;
    setIsLoading(true);
    try {
      const [petData, vetsData, conditionsData, allergiesData, medsData, vacsData, contactsData, alertsData] = await Promise.all([
        petsApi.get(petId, token),
        petsApi.getVets(petId, token),
        petsApi.getConditions(petId, token),
        petsApi.getAllergies(petId, token),
        petsApi.getMedications(petId, token),
        petsApi.getVaccinations(petId, token),
        petsApi.getEmergencyContacts(petId, token),
        petsApi.getAlerts(petId, token),
      ]);
      setPet(petData);
      setVets(vetsData);
      setConditions(conditionsData);
      setAllergies(allergiesData);
      setMedications(medsData);
      setVaccinations(vacsData);
      setEmergencyContacts(contactsData);
      setAlerts(alertsData);
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy"></div>
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
    isPremium: !!isPremium,
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
    handlePetUpdated,
    handleNavigateToReview,
    loadPetData,
    setShowShareModal,
    pendingDocNav,
    setPendingDocNav,
    healthActiveSection,
    setHealthActiveSection,
    scrollToHealthSection,
    registerScrollToHealthSection,
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
              <h1 className="text-2xl text-navy font-semibold">{pet.name}</h1>
              <p className="capitalize text-surface-500">
                {pet.breed ? `${pet.breed} ${pet.species}` : pet.species}
                {pet.sex && ` \u2022 ${pet.sex}${pet.is_fixed ? ' (Fixed)' : ''}`}
              </p>
              {pet.weight_kg && <p className="text-sm text-surface-400">{formatWeight(pet.weight_kg, pet.weight_unit)}</p>}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowAccessModal(true)}
              className={`btn btn-ghost btn-sm border border-surface-200 ${!isPremium ? 'opacity-50' : ''}`}
              title={!isPremium ? 'Premium feature - Upgrade to share pet access with others' : 'Share Profile'}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline sm:mr-[6px] align-middle">
                <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              <span className="hidden sm:inline">Share Profile</span>
            </button>
            <button
              onClick={() => setShowShareModal(true)}
              className="btn btn-ghost btn-sm border border-surface-200"
              title="Send Card"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline sm:mr-[6px] align-middle">
                <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              <span className="hidden sm:inline">Send Card</span>
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
            images: 0,
          }}
          healthActiveSection={healthActiveSection}
          onHealthSubNavClick={(id: string) => scrollToHealthRef.current(id)}
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
        isPremium ? (
          <ManageAccessModal
            petId={petId}
            petName={pet.name}
            onClose={() => setShowAccessModal(false)}
          />
        ) : (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
              <h2 className="text-lg font-semibold text-navy mb-4">Share Pet Access</h2>
              <UpgradeBanner type="feature" feature="shared_ownership" />
              <p className="text-surface-600 text-sm mt-4">
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
