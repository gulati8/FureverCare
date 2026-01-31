import { useState, useRef, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Feature {
  icon: string;
  title: string;
  description: string;
}

interface FeaturesContent {
  title: string;
  subtitle: string;
  features: Feature[];
}

interface FeaturesEditorProps {
  content: FeaturesContent;
  onChange: (content: FeaturesContent) => void;
}

// 24 unique icons for feature sections
const ICONS: Record<string, string> = {
  // Documents & Files
  document: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  folder: "M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z",
  clipboard: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
  archive: "M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4",
  // Health & Medical
  heart: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
  beaker: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z",
  // Time & Calendar
  calendar: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  clock: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  // Communication
  bell: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
  chat: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
  mail: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  // Users & People
  user: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  users: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
  // Security
  shield: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  lock: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
  key: "M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z",
  // Analytics & Data
  chart: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  trending: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
  // Actions
  check: "M5 13l4 4L19 7",
  star: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z",
  lightning: "M13 10V3L4 14h7v7l9-11h-7z",
  // Misc
  globe: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  cog: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  sparkles: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z",
};

const ICON_KEYS = Object.keys(ICONS);

// Legacy icon name mapping (seeded data uses these)
const LEGACY_ICON_MAP: Record<string, string> = {
  health_records: 'document',
  medication: 'beaker',
  vet: 'heart',
  weight: 'chart',
  documents: 'archive',
  multi_pet: 'users',
};

// Get the normalized icon key (handles legacy names)
function getNormalizedIconKey(icon: string): string {
  if (ICON_KEYS.includes(icon)) {
    return icon;
  }
  return LEGACY_ICON_MAP[icon] || 'sparkles';
}

// Icon component that renders SVGs
function IconPreview({ icon, className = "w-6 h-6" }: { icon: string; className?: string }) {
  const normalizedIcon = getNormalizedIconKey(icon);
  const path = ICONS[normalizedIcon] || ICONS.sparkles;
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path} />
    </svg>
  );
}

// Drag handle icon
function DragHandleIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
    </svg>
  );
}

// Sortable feature item component
interface SortableFeatureProps {
  id: string;
  feature: Feature;
  index: number;
  isEditing: boolean;
  onToggleEdit: () => void;
  onFeatureChange: (field: keyof Feature, value: string) => void;
}

function SortableFeature({
  id,
  feature,
  index,
  isEditing,
  onToggleEdit,
  onFeatureChange,
}: SortableFeatureProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  // Scroll to center the selected icon when this feature is expanded
  useEffect(() => {
    if (isEditing && scrollContainerRef.current) {
      const scrollContainer = scrollContainerRef.current;

      // Small delay to ensure DOM has rendered
      setTimeout(() => {
        // Find the selected button by its data attribute
        const selectedButton = scrollContainer.querySelector('[data-selected="true"]') as HTMLButtonElement;

        if (selectedButton) {
          const containerRect = scrollContainer.getBoundingClientRect();
          const buttonRect = selectedButton.getBoundingClientRect();

          // Calculate button's position relative to the scroll container
          const buttonRelativeLeft = buttonRect.left - containerRect.left + scrollContainer.scrollLeft;
          const containerWidth = scrollContainer.clientWidth;
          const buttonWidth = buttonRect.width;

          // Calculate scroll position to center the button
          const scrollLeft = buttonRelativeLeft - (containerWidth / 2) + (buttonWidth / 2);
          scrollContainer.scrollTo({ left: Math.max(0, scrollLeft), behavior: 'smooth' });
        }
      }, 50);
    }
  }, [isEditing]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border border-gray-200 rounded-lg overflow-hidden ${isDragging ? 'shadow-lg' : ''}`}
    >
      {/* Feature header - always visible */}
      <div className="px-4 py-3 bg-gray-50 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Drag handle */}
          <button
            type="button"
            className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 touch-none"
            {...attributes}
            {...listeners}
          >
            <DragHandleIcon />
          </button>
          <span className="text-gray-400 font-mono text-sm">
            {String(index + 1).padStart(2, '0')}
          </span>
          {/* Highlighted icon matching the selected style */}
          <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center text-white shadow-md ring-2 ring-primary-600 ring-offset-1">
            <IconPreview icon={feature.icon} className="w-6 h-6" />
          </div>
          <span
            className="font-medium text-gray-900 cursor-pointer hover:text-primary-600"
            onClick={onToggleEdit}
          >
            {feature.title || 'Untitled Feature'}
          </span>
        </div>
        <button
          type="button"
          onClick={onToggleEdit}
          className="p-1 hover:bg-gray-200 rounded"
        >
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${isEditing ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Feature editor - expandable */}
      {isEditing && (
        <div className="p-4 space-y-4 border-t border-gray-200">
          <div>
            <label className="label">Icon</label>
            <div
              ref={scrollContainerRef}
              className="flex gap-2 p-3 bg-gray-50 rounded-lg overflow-x-auto"
            >
              {ICON_KEYS.map((key) => {
                const isSelected = getNormalizedIconKey(feature.icon) === key;
                return (
                  <button
                    key={key}
                    data-selected={isSelected ? 'true' : undefined}
                    type="button"
                    onClick={() => onFeatureChange('icon', key)}
                    className={`p-3 rounded-lg flex-shrink-0 transition-all ${
                      isSelected
                        ? 'bg-primary-500 ring-2 ring-primary-600 ring-offset-2 text-white shadow-md'
                        : 'bg-white hover:bg-gray-100 text-gray-500 hover:text-gray-700 border border-gray-200'
                    }`}
                  >
                    <IconPreview icon={key} className="w-7 h-7" />
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="label">Title</label>
            <input
              type="text"
              value={feature.title || ''}
              onChange={(e) => onFeatureChange('title', e.target.value)}
              className="input"
              placeholder="Feature title..."
            />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              value={feature.description || ''}
              onChange={(e) => onFeatureChange('description', e.target.value)}
              className="input"
              rows={2}
              placeholder="Brief description of this feature..."
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function FeaturesEditor({ content, onChange }: FeaturesEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Generate stable IDs for features (using index as fallback)
  const featureIds = content.features.map((_, index) => `feature-${index}`);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleTitleChange = (value: string) => {
    onChange({ ...content, title: value });
  };

  const handleSubtitleChange = (value: string) => {
    onChange({ ...content, subtitle: value });
  };

  const handleFeatureChange = (index: number, field: keyof Feature, value: string) => {
    const newFeatures = [...content.features];
    newFeatures[index] = { ...newFeatures[index], [field]: value };
    onChange({ ...content, features: newFeatures });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = featureIds.indexOf(active.id as string);
      const newIndex = featureIds.indexOf(over.id as string);

      const newFeatures = arrayMove(content.features, oldIndex, newIndex);
      onChange({ ...content, features: newFeatures });

      // Update editingIndex if needed
      if (editingIndex !== null) {
        if (editingIndex === oldIndex) {
          setEditingIndex(newIndex);
        } else if (oldIndex < editingIndex && newIndex >= editingIndex) {
          setEditingIndex(editingIndex - 1);
        } else if (oldIndex > editingIndex && newIndex <= editingIndex) {
          setEditingIndex(editingIndex + 1);
        }
      }
    }
  };

  const features = content.features || [];

  return (
    <div className="space-y-6">
      {/* Section title and subtitle */}
      <div>
        <label className="label">Section Title</label>
        <input
          type="text"
          value={content.title || ''}
          onChange={(e) => handleTitleChange(e.target.value)}
          className="input"
          placeholder="Our Features"
        />
      </div>

      <div>
        <label className="label">Section Subtitle</label>
        <input
          type="text"
          value={content.subtitle || ''}
          onChange={(e) => handleSubtitleChange(e.target.value)}
          className="input"
          placeholder="Everything you need to manage your pet's health"
        />
      </div>

      {/* Features list */}
      <div>
        <label className="label mb-3">Features ({features.length})</label>
        <p className="text-sm text-gray-500 mb-3">Drag features to reorder them</p>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={featureIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {features.map((feature, index) => (
                <SortableFeature
                  key={featureIds[index]}
                  id={featureIds[index]}
                  feature={feature}
                  index={index}
                  isEditing={editingIndex === index}
                  onToggleEdit={() => setEditingIndex(editingIndex === index ? null : index)}
                  onFeatureChange={(field, value) => handleFeatureChange(index, field, value)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {features.length === 0 && (
          <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
            No features defined yet.
          </div>
        )}
      </div>
    </div>
  );
}
