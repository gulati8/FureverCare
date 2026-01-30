import { useMemo, useState } from 'react';
import {
  PetCondition,
  PetAllergy,
  PetMedication,
  PetVaccination,
} from '../api/client';

type EventType = 'vaccination' | 'medication_start' | 'medication_end' | 'condition' | 'allergy';

interface TimelineEvent {
  id: string;
  type: EventType;
  date: Date;
  title: string;
  subtitle?: string;
  details?: string[];
  severity?: string;
  isActive?: boolean;
  expirationDate?: Date;
  isExpired?: boolean;
}

interface MedicalTimelineProps {
  conditions: PetCondition[];
  allergies: PetAllergy[];
  medications: PetMedication[];
  vaccinations: PetVaccination[];
  dateOfBirth?: string | null;
}

const eventTypeConfig: Record<EventType, { label: string; icon: string; bgColor: string; textColor: string; borderColor: string }> = {
  vaccination: {
    label: 'Vaccination',
    icon: '💉',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-300',
  },
  medication_start: {
    label: 'Medication Started',
    icon: '💊',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-300',
  },
  medication_end: {
    label: 'Medication Ended',
    icon: '💊',
    bgColor: 'bg-slate-50',
    textColor: 'text-slate-600',
    borderColor: 'border-slate-300',
  },
  condition: {
    label: 'Condition Diagnosed',
    icon: '🏥',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-300',
  },
  allergy: {
    label: 'Allergy Identified',
    icon: '⚠️',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-300',
  },
};

function parseDate(dateStr: string): Date {
  // Handle ISO dates and date-only strings consistently
  if (dateStr.includes('T')) {
    return new Date(dateStr);
  }
  // For date-only strings, parse at midnight local time
  return new Date(dateStr + 'T00:00:00');
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function calculateAge(dateOfBirth: Date, eventDate: Date): string {
  const years = eventDate.getFullYear() - dateOfBirth.getFullYear();
  const months = eventDate.getMonth() - dateOfBirth.getMonth();

  let ageYears = years;
  let ageMonths = months;

  if (months < 0) {
    ageYears--;
    ageMonths += 12;
  }

  if (ageYears === 0) {
    return `${ageMonths} month${ageMonths !== 1 ? 's' : ''} old`;
  }
  if (ageMonths === 0) {
    return `${ageYears} year${ageYears !== 1 ? 's' : ''} old`;
  }
  return `${ageYears}y ${ageMonths}m old`;
}

export function MedicalTimeline({ conditions, allergies, medications, vaccinations, dateOfBirth }: MedicalTimelineProps) {
  const [filterType, setFilterType] = useState<EventType | 'all'>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const parsedDob = dateOfBirth ? parseDate(dateOfBirth) : null;

  const events = useMemo(() => {
    const allEvents: TimelineEvent[] = [];

    // Add vaccinations
    vaccinations.forEach((v) => {
      const date = parseDate(v.administered_date);
      const expirationDate = v.expiration_date ? parseDate(v.expiration_date) : undefined;
      const isExpired = expirationDate ? expirationDate < new Date() : false;

      allEvents.push({
        id: `vac-${v.id}`,
        type: 'vaccination',
        date,
        title: v.name,
        subtitle: v.administered_by ? `Administered by ${v.administered_by}` : undefined,
        details: [
          ...(v.lot_number ? [`Lot #: ${v.lot_number}`] : []),
          ...(expirationDate ? [`${isExpired ? 'Expired' : 'Expires'}: ${formatDate(expirationDate)}`] : []),
        ],
        expirationDate,
        isExpired,
      });
    });

    // Add medications (start and end events)
    medications.forEach((m) => {
      if (m.start_date) {
        allEvents.push({
          id: `med-start-${m.id}`,
          type: 'medication_start',
          date: parseDate(m.start_date),
          title: m.name,
          subtitle: m.dosage ? `${m.dosage}${m.frequency ? ` - ${m.frequency}` : ''}` : m.frequency || undefined,
          details: [
            ...(m.prescribing_vet ? [`Prescribed by ${m.prescribing_vet}`] : []),
            ...(m.notes ? [m.notes] : []),
          ],
          isActive: m.is_active,
        });
      }

      if (m.end_date && !m.is_active) {
        allEvents.push({
          id: `med-end-${m.id}`,
          type: 'medication_end',
          date: parseDate(m.end_date),
          title: `${m.name} discontinued`,
          subtitle: m.dosage || undefined,
        });
      }
    });

    // Add conditions
    conditions.forEach((c) => {
      const date = c.diagnosed_date ? parseDate(c.diagnosed_date) : parseDate(c.created_at);
      allEvents.push({
        id: `cond-${c.id}`,
        type: 'condition',
        date,
        title: c.name,
        subtitle: c.diagnosed_date ? undefined : 'Date not specified',
        details: c.notes ? [c.notes] : undefined,
        severity: c.severity || undefined,
      });
    });

    // Add allergies
    allergies.forEach((a) => {
      allEvents.push({
        id: `allergy-${a.id}`,
        type: 'allergy',
        date: parseDate(a.created_at),
        title: a.allergen,
        subtitle: a.reaction || undefined,
        severity: a.severity || undefined,
      });
    });

    // Filter
    const filtered = filterType === 'all'
      ? allEvents
      : allEvents.filter((e) => {
          if (filterType === 'medication_start') {
            return e.type === 'medication_start' || e.type === 'medication_end';
          }
          return e.type === filterType;
        });

    // Sort
    filtered.sort((a, b) => {
      const diff = a.date.getTime() - b.date.getTime();
      return sortOrder === 'desc' ? -diff : diff;
    });

    return filtered;
  }, [conditions, allergies, medications, vaccinations, filterType, sortOrder]);

  const totalCount = conditions.length + allergies.length + medications.length + vaccinations.length;

  if (totalCount === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">📋</div>
        <p className="text-gray-500">No medical events recorded yet</p>
        <p className="text-sm text-gray-400 mt-2">
          Add vaccinations, medications, conditions, or allergies to see them on the timeline
        </p>
      </div>
    );
  }

  // Group events by year and month for better visual organization
  const groupedEvents: { label: string; events: TimelineEvent[] }[] = [];
  let currentGroup: { label: string; events: TimelineEvent[] } | null = null;

  events.forEach((event) => {
    const label = event.date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    if (!currentGroup || currentGroup.label !== label) {
      currentGroup = { label, events: [] };
      groupedEvents.push(currentGroup);
    }
    currentGroup.events.push(event);
  });

  return (
    <div>
      {/* Header and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-semibold">Medical Timeline</h3>
          <p className="text-sm text-gray-500">{events.length} event{events.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as EventType | 'all')}
            className="input text-sm py-1.5 pr-8"
          >
            <option value="all">All Events</option>
            <option value="vaccination">Vaccinations</option>
            <option value="medication_start">Medications</option>
            <option value="condition">Conditions</option>
            <option value="allergy">Allergies</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1"
          >
            {sortOrder === 'desc' ? '↓ Newest' : '↑ Oldest'}
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

        {groupedEvents.map((group) => (
          <div key={group.label} className="mb-6">
            {/* Month/Year header */}
            <div className="relative flex items-center mb-4">
              <div className="absolute left-2.5 w-3 h-3 rounded-full bg-gray-300 border-2 border-white" />
              <span className="ml-10 text-sm font-medium text-gray-500">{group.label}</span>
            </div>

            {/* Events in this group */}
            {group.events.map((event) => {
              const config = eventTypeConfig[event.type];
              return (
                <div key={event.id} className="relative flex items-start mb-4 last:mb-0">
                  {/* Timeline dot */}
                  <div className={`absolute left-1.5 w-5 h-5 rounded-full flex items-center justify-center text-xs ${config.bgColor} border ${config.borderColor}`}>
                    {config.icon}
                  </div>

                  {/* Event card */}
                  <div className={`ml-10 flex-1 ${config.bgColor} border ${config.borderColor} rounded-lg p-3`}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-medium ${config.textColor}`}>
                            {config.label}
                          </span>
                          {event.severity && (
                            <span className={`text-xs px-1.5 py-0.5 rounded capitalize ${
                              event.severity === 'severe' || event.severity === 'life-threatening'
                                ? 'bg-red-100 text-red-700'
                                : event.severity === 'moderate'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {event.severity}
                            </span>
                          )}
                          {event.isActive !== undefined && (
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              event.isActive
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-500'
                            }`}>
                              {event.isActive ? 'Active' : 'Inactive'}
                            </span>
                          )}
                          {event.isExpired && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                              Expired
                            </span>
                          )}
                        </div>
                        <p className="font-medium text-gray-900 mt-1">{event.title}</p>
                        {event.subtitle && (
                          <p className="text-sm text-gray-600">{event.subtitle}</p>
                        )}
                        {event.details && event.details.length > 0 && (
                          <ul className="text-sm text-gray-500 mt-1 space-y-0.5">
                            {event.details.map((detail, i) => (
                              <li key={i}>{detail}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div className="text-right text-sm text-gray-500 whitespace-nowrap">
                        <div>{formatDate(event.date)}</div>
                        {parsedDob && event.date >= parsedDob && (
                          <div className="text-xs text-gray-400">
                            {calculateAge(parsedDob, event.date)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
