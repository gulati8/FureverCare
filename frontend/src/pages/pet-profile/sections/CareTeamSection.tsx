import { usePetProfileContext } from '../context';
import VetsTab from '../tabs/VetsTab';
import ContactsTab from '../tabs/ContactsTab';

export default function CareTeamSection() {
  const { petId, token, vets, setVets, emergencyContacts, setEmergencyContacts } = usePetProfileContext();

  return (
    <div className="fade-in">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <VetsTab petId={petId} token={token} vets={vets} setVets={setVets} />
        </div>
        <div className="card">
          <ContactsTab petId={petId} token={token} contacts={emergencyContacts} setContacts={setEmergencyContacts} />
        </div>
      </div>
    </div>
  );
}
