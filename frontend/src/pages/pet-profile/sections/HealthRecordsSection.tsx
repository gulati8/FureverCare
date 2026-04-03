import { useEffect, useState } from 'react';
import { usePetProfileContext } from '../context';
import ConditionsTab from '../tabs/ConditionsTab';
import AllergiesTab from '../tabs/AllergiesTab';
import MedicationsTab from '../tabs/MedicationsTab';
import VaccinationsTab from '../tabs/VaccinationsTab';

export default function HealthRecordsSection() {
  const ctx = usePetProfileContext();
  const {
    petId, token,
    conditions, setConditions,
    allergies, setAllergies,
    medications, setMedications,
    vaccinations, setVaccinations,
    handleNavigateToReview,
    setHealthActiveSection,
    registerScrollToHealthSection,
  } = ctx;

  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['conditions', 'allergies']));

  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (!hash) return;
    setOpenSections(prev => new Set([...prev, hash]));
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.getElementById(hash);
        if (!el) return;
        const y = el.getBoundingClientRect().top + window.scrollY - 24;
        window.scrollTo({ top: y, behavior: 'smooth' });
      });
    });
  }, []);

  useEffect(() => {
    const sectionIds = ['conditions', 'allergies', 'medications', 'vaccinations'];
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setHealthActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 }
    );
    for (const id of sectionIds) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [setHealthActiveSection]);

  useEffect(() => {
    registerScrollToHealthSection((sectionId: string) => {
      setOpenSections(prev => new Set([...prev, sectionId]));
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const el = document.getElementById(sectionId);
          if (!el) return;
          const y = el.getBoundingClientRect().top + window.scrollY - 24;
          window.scrollTo({ top: y, behavior: 'smooth' });
        });
      });
    });
  }, [registerScrollToHealthSection]);

  const activeMeds = medications.filter(m => m.is_active);
  const expiringVacs = vaccinations.filter(v => v.expiration_date && new Date(v.expiration_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

  return (
    <div className="space-y-4 fade-in">
      {/* Conditions accordion — default open */}
      <details id="conditions" className="health-accordion" open={openSections.has('conditions')} onToggle={(e) => {
        const isOpen = (e.target as HTMLDetailsElement).open;
        setOpenSections(prev => {
          const next = new Set(prev);
          if (isOpen) next.add('conditions');
          else next.delete('conditions');
          return next;
        });
      }}>
        <summary className="health-accordion-summary">
          <div className="health-accordion-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
            Conditions
            {conditions.length > 0 && (
              <span className="badge badge-warning">{conditions.length}</span>
            )}
          </div>
          <svg className="health-accordion-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </summary>
        <div className="health-accordion-content">
          <ConditionsTab
            petId={petId} token={token}
            conditions={conditions} setConditions={setConditions}
            onNavigateToReview={handleNavigateToReview}
          />
        </div>
      </details>

      {/* Allergies accordion — default open */}
      <details id="allergies" className="health-accordion" open={openSections.has('allergies')} onToggle={(e) => {
        const isOpen = (e.target as HTMLDetailsElement).open;
        setOpenSections(prev => {
          const next = new Set(prev);
          if (isOpen) next.add('allergies');
          else next.delete('allergies');
          return next;
        });
      }}>
        <summary className="health-accordion-summary">
          <div className="health-accordion-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Allergies
            {allergies.length > 0 && (
              <span className="badge badge-danger">{allergies.length}</span>
            )}
          </div>
          <svg className="health-accordion-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </summary>
        <div className="health-accordion-content">
          <AllergiesTab
            petId={petId} token={token}
            allergies={allergies} setAllergies={setAllergies}
            onNavigateToReview={handleNavigateToReview}
          />
        </div>
      </details>

      {/* Medications accordion — default collapsed */}
      <details id="medications" className="health-accordion" open={openSections.has('medications')} onToggle={(e) => {
        const isOpen = (e.target as HTMLDetailsElement).open;
        setOpenSections(prev => {
          const next = new Set(prev);
          if (isOpen) next.add('medications');
          else next.delete('medications');
          return next;
        });
      }}>
        <summary className="health-accordion-summary">
          <div className="health-accordion-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3" />
            </svg>
            Medications
            {activeMeds.length > 0 && (
              <span className="badge badge-info">{activeMeds.length} active</span>
            )}
          </div>
          <svg className="health-accordion-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </summary>
        <div className="health-accordion-content">
          <MedicationsTab
            petId={petId} token={token}
            medications={medications} setMedications={setMedications}
            onNavigateToReview={handleNavigateToReview}
          />
        </div>
      </details>

      {/* Vaccinations accordion — default collapsed */}
      <details id="vaccinations" className="health-accordion" open={openSections.has('vaccinations')} onToggle={(e) => {
        const isOpen = (e.target as HTMLDetailsElement).open;
        setOpenSections(prev => {
          const next = new Set(prev);
          if (isOpen) next.add('vaccinations');
          else next.delete('vaccinations');
          return next;
        });
      }}>
        <summary className="health-accordion-summary">
          <div className="health-accordion-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9.5 14.5L3 21m7-4l4 4m3-11l-1-1m-3-3l-1-1m5-2l-7 7" />
            </svg>
            Vaccinations
            {expiringVacs.length > 0 ? (
              <span className="badge badge-danger">{expiringVacs.length} expiring</span>
            ) : vaccinations.length > 0 ? (
              <span className="badge badge-success">{vaccinations.length} recorded</span>
            ) : null}
          </div>
          <svg className="health-accordion-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </summary>
        <div className="health-accordion-content">
          <VaccinationsTab
            petId={petId} token={token}
            vaccinations={vaccinations} setVaccinations={setVaccinations}
            onNavigateToReview={handleNavigateToReview}
          />
        </div>
      </details>

    </div>
  );
}
