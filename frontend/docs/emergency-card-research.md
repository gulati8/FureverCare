# Emergency Pet Card UX Research Report

Research conducted: February 2026

## Executive Summary

This research investigates what information matters most in pet emergency situations and how to design a shared health card that an ER vet tech can scan in under 10 seconds. The goal is to optimize the card for rapid clinical assessment, not comprehensive record-keeping.

**Key Finding:** In veterinary emergencies, seconds matter. The current card design treats all information equally, but ER techs have a clear priority hierarchy they mentally follow. Our redesign should match this hierarchy visually.

---

## Part 1: What ER Vet Techs Need to Know

### The Triage Mindset

Veterinary emergency triage uses the **XABCDE approach**:
- **X** - eXsanguination (catastrophic bleeding)
- **A** - Airway patency
- **B** - Breathing assessment
- **C** - Circulation (heart rate, pulse, mucous membranes)
- **D** - Disability (neurological status)
- **E** - Exposure/Environment (temperature, wounds)

Within 90 seconds of arrival, a tech needs to classify the patient's severity level. During this time, they need specific information from the owner or health card.

### Information Priority Hierarchy

Based on research from veterinary emergency protocols and triage guidelines:

| Priority | Information | Why It Matters |
|----------|-------------|----------------|
| **CRITICAL** | Drug allergies | Could kill the pet if wrong medication given |
| **CRITICAL** | Current medications | Drug interactions can be fatal (NSAIDs + corticosteroids, phenobarbital interactions) |
| **HIGH** | Existing conditions | Affects treatment decisions (diabetes, heart disease, seizures, kidney disease) |
| **HIGH** | Species/Breed | Breed-specific risks (GDV in deep-chested dogs, HCM in Maine Coons, brachycephalic concerns) |
| **HIGH** | Weight | Critical for drug dosing |
| **MEDIUM** | Special instructions | Pre-authorized treatments, DNR preferences |
| **MEDIUM** | Owner contact | For consent on procedures |
| **MEDIUM** | Primary vet contact | For medical history consultation |
| **LOW** | Vaccinations | Rarely urgent in ER context |
| **LOW** | Pet age/photo | Helpful but not clinically urgent |

### Red Flag Conditions Requiring Immediate Display

The following conditions require **immediate visibility** on any emergency card:

1. **Drug Allergies** - Especially to common emergency medications
2. **Life-threatening conditions** - Heart disease, seizure disorders, bleeding disorders
3. **Breed-specific risks** - Brachycephalic syndrome, GDV-prone breeds
4. **Medication contraindications** - Currently on blood thinners, immunosuppressants, etc.

---

## Part 2: Current Card Design Analysis

### What Works
- Clear section separation by category
- Color-coded badges (red for allergies, orange for conditions, blue for medications)
- Mobile-friendly layout
- QR code sharing without app requirement

### What Needs Improvement

| Issue | Impact | Solution Direction |
|-------|--------|-------------------|
| All sections appear equal weight | ER tech has to scan entire page | Prioritize critical info at top |
| Allergies buried in the flow | Could be missed under stress | Make allergies UNMISSABLE |
| No severity indicators | "Chicken allergy" looks same as "Penicillin - anaphylaxis" | Add severity badges |
| Small text for medications | Hard to read quickly | Larger, bolder medication names |
| Conditions lack context | "Hip dysplasia" doesn't signal urgency | Categorize by clinical impact |
| No "at a glance" summary | Must read everything | Add critical summary banner |

---

## Part 3: Design Principles for Emergency Cards

### Visual Hierarchy for Healthcare

Research on healthcare alert design (NIST, AMA) establishes these principles:

1. **Color Coding Must Be Consistent**
   - Red = Life-threatening / Allergies
   - Orange = Serious medical conditions
   - Yellow = Warnings / Special instructions
   - Blue = Informational (medications, contacts)

2. **Typography for Rapid Scanning**
   - Critical info: Large, bold, high contrast
   - Important info: Medium weight, good spacing
   - Supporting info: Smaller, can be grouped

3. **Spatial Organization**
   - Critical information at top of visual flow
   - Group related items in bordered blocks
   - White space improves scanability under stress

4. **Signal Words**
   - Use standard medical alert terms: "ALLERGY", "ALERT", "CAUTION"
   - All caps for critical warnings

### The 10-Second Rule

An ER vet tech should be able to answer these questions within 10 seconds of viewing the card:

1. Does this pet have any drug allergies? (YES/NO, if YES what?)
2. Is the pet on any medications that could interact? (quick list)
3. Are there any conditions that affect emergency treatment?
4. What's the weight for dosing?

Everything else can be secondary information they access if needed.

---

## Part 4: Proposed Design Variants

### Design Variant 1: "Critical Banner" Approach

**Concept:** A persistent red banner at the top shows ALL critical info in one glance. Everything life-threatening is visible without scrolling.

**Structure:**
```
┌─────────────────────────────────────────┐
│ 🚨 EMERGENCY ALERT BANNER (RED)         │
│ • Allergies with severity               │
│ • Critical conditions                   │
│ • Current medications (abbreviated)     │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ Pet Photo + Name + Breed + Weight       │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ Detailed sections below...              │
└─────────────────────────────────────────┘
```

**Pros:**
- Guarantees critical info is seen first
- Follows healthcare alert patterns
- Works even if page is partially loaded

**Cons:**
- May feel alarming for pets without critical issues
- Banner takes up prime screen space

---

### Design Variant 2: "Triage Card" Approach

**Concept:** Mimics the layout of hospital triage cards. Three-column grid with severity-coded sections. Designed to be printed and attached to a chart.

**Structure:**
```
┌─────────┬─────────┬─────────┐
│ PET ID  │CRITICAL │ CONTACT │
│ Photo   │ALERTS   │ Info    │
│ Name    │(Red)    │         │
│ Breed   ├─────────┤         │
│ Weight  │MEDS     │         │
│         │(Blue)   │         │
├─────────┴─────────┴─────────┤
│ CONDITIONS & NOTES          │
└─────────────────────────────┘
```

**Pros:**
- Familiar to medical professionals
- Scannable left-to-right, top-to-bottom
- Print-friendly

**Cons:**
- Less mobile-friendly
- Requires more horizontal space

---

### Design Variant 3: "Smart Summary" Approach

**Concept:** AI-style smart summary at top that dynamically highlights what matters for THIS pet. Quiet design for healthy pets, urgent design for pets with alerts.

**Structure for pet WITH alerts:**
```
┌─────────────────────────────────────────┐
│ ⚠️ 3 ALERTS FOR [PET NAME]              │
│ • Penicillin allergy (severe)          │
│ • On Phenobarbital - check interactions │
│ • Heart murmur - limit stress          │
└─────────────────────────────────────────┘
```

**Structure for HEALTHY pet:**
```
┌─────────────────────────────────────────┐
│ ✓ No known allergies or alerts         │
│ [Pet Name] • [Breed] • [Weight]        │
└─────────────────────────────────────────┘
```

**Pros:**
- Contextually relevant
- Doesn't alarm when unnecessary
- Best "at a glance" experience

**Cons:**
- Requires logic to determine what's "alert-worthy"
- Summary could miss edge cases

---

## Part 5: Information Architecture Recommendations

### Required Sections (Always Show)

1. **Critical Alerts Section** - Top of page
   - Allergies with severity level
   - Life-threatening conditions
   - Drug interaction warnings

2. **Pet Identification** - Second
   - Photo, Name, Species, Breed
   - Weight (BOLD - needed for dosing)
   - Age, Sex, Fixed status, Microchip

3. **Current Medications** - Third
   - Name, Dosage, Frequency
   - Last dose time if relevant

4. **Medical Conditions** - Fourth
   - Categorized by severity
   - Include management notes

5. **Emergency Contacts** - Fifth
   - Owner phone (large, tappable)
   - Primary vet contact

### Optional Sections (Collapsed/Expandable)

6. **Vaccination Records**
7. **Detailed Medical History**
8. **Insurance Information**

### Severity Classification System

Add machine-readable severity to all conditions and allergies:

| Level | Display | Use For |
|-------|---------|---------|
| `life-threatening` | Red badge, top of list | Anaphylaxis risks, heart conditions |
| `severe` | Orange badge | Serious allergies, chronic conditions |
| `moderate` | Yellow badge | Manageable conditions |
| `mild` | Gray badge | Minor issues |

---

## Part 6: Technical Considerations

### Data Model Changes Needed

```typescript
// Allergy severity (add if not present)
allergy.severity: 'life-threatening' | 'severe' | 'moderate' | 'mild'

// Condition categorization
condition.category: 'cardiovascular' | 'neurological' | 'respiratory' |
                    'endocrine' | 'musculoskeletal' | 'other'
condition.emergency_relevance: 'critical' | 'important' | 'informational'

// Medication flags
medication.has_interactions: boolean
medication.interaction_notes: string
```

### Display Logic

```typescript
// Determine if pet has critical alerts
const hasCriticalAlerts =
  allergies.some(a => a.severity === 'life-threatening' || a.severity === 'severe') ||
  conditions.some(c => c.emergency_relevance === 'critical') ||
  medications.some(m => m.has_interactions);
```

---

## Part 7: Next Steps

1. **Review mockups** - Three HTML prototypes implementing each variant
2. **User testing** - Show to actual vet techs if possible
3. **Select direction** - Choose one variant or hybrid approach
4. **Update data model** - Add severity/categorization fields
5. **Implement** - Update PublicCard.tsx and TokenCard.tsx

---

## Sources

- [Merck Veterinary Manual - Initial Triage](https://www.merckvetmanual.com/emergency-medicine-and-critical-care/evaluation-and-initial-treatment-of-small-animal-emergency-patients/initial-triage-and-resuscitation-of-small-animal-emergency-patients)
- [BluePearl Pet Hospital - Triage at the Emergency Vet](https://bluepearlvet.com/pet-blog/triage-emergency-vet/)
- [Veterinary Practice - Emergency Triage Guide](https://www.veterinary-practice.com/article/emergency-triage-for-small-animal-veterinary-nurses-a-guide)
- [AVMA - Emergency Contact Cards](https://www.avma.org/resources-tools/animal-health-and-welfare/disaster-preparedness/emergency-contact-cards)
- [AMA - 5 Keys to Creating Better EHR Alerts](https://www.ama-assn.org/practice-management/digital-health/5-keys-creating-better-ehr-alert)
- [PMC - Designing Visual Hierarchies for Health Data](https://pmc.ncbi.nlm.nih.gov/articles/PMC11491599/)
- [Plumb's - Top 10 Drug Interactions in Veterinary Medicine](https://plumbs.com/blog/top-10-drugs-involved-in-drug-interactions-in-veterinary-medicine/)
- [UrgentVet - Breed-Specific Health Problems](https://urgentvet.com/common-breed-health-problems-in-dogs-and-cats/)
