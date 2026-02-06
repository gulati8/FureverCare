# SOAP Notes in Veterinary Medicine: Research & Strategic Recommendations for FureverCare

Research conducted: February 2026

---

## Executive Summary

SOAP notes are the **universal language of veterinary medicine**. Every vet visit -- from routine wellness exams to emergency trauma -- produces a SOAP note. A vet tech we spoke with confirmed what the research bears out: SOAP notes are how veterinary professionals think about, document, and communicate patient care.

This report explores what SOAP notes are, how the industry handles them, and proposes a strategic evolution for FureverCare that centers the pet health experience around SOAP-structured visit records. The core thesis:

**FureverCare should become the "Rosetta Stone" for pet health records** -- an AI-powered system that can ingest the chaotic, inconsistent output of the veterinary industry (PDFs, scanned notes, discharge summaries, lab results) and present it in the structured, SOAP-native format that veterinary professionals already think in, while simultaneously making it accessible to pet owners.

### Key Findings

1. **SOAP notes are created at every vet visit** -- they are the atomic unit of veterinary care
2. **Pet owners almost never receive the actual SOAP note** -- they get simplified discharge summaries
3. **There is no interoperability standard** -- vet records are PDFs, faxes, and paper. No FHIR equivalent exists
4. **AI scribe adoption is exploding** -- from 3.5% to 17.5% of vets in 14 months (5x growth)
5. **The semantic layer is the hardest problem** -- same conditions appear differently across practices
6. **Emergency vets routinely work blind** -- this is the exact gap FureverCare fills
7. **Nobody is doing what we're proposing** -- AI tools focus on vet-side creation, not owner-side aggregation and interpretation

### Challenge to an Assumption

The vet tech said SOAP notes are key -- and she's right. But here's the nuance: **what ER staff need is not the raw SOAP note itself**. They need the *clinical intelligence that SOAP notes contain*, presented in a format optimized for rapid triage. An ER vet spending 30 seconds scanning a shared card needs to see active problems, current medications, and critical history -- not four sections of prose from the last dental cleaning. The recommendation is to **parse and store data in SOAP structure** (because that's the source of truth) but **present it in an ER-optimized view** on the shared card.

---

## Part 1: Understanding SOAP Notes

### 1.1 What SOAP Stands For

SOAP is an acronym for the four sections of a clinical progress note:

| Section | Name | What It Captures | Who Provides It |
|---------|------|------------------|-----------------|
| **S** | Subjective | Owner's observations and concerns | Pet owner's report |
| **O** | Objective | Measurable clinical findings | Veterinary examination |
| **A** | Assessment | Clinical judgment and diagnoses | Veterinarian's analysis |
| **P** | Plan | Treatment and follow-up actions | Veterinarian's orders |

SOAP notes exist within the larger **Problem-Oriented Veterinary Medical Record (POVMR)** framework endorsed by AAHA, which organizes records into: Database (patient info), Problem List (all identified issues), Plan (for each problem), and Progress Notes (written in SOAP format).

### 1.2 Detailed Section Breakdown

#### Subjective (S) -- The Owner's Story

This section captures what the pet owner reports. In veterinary medicine, this is uniquely important because **the patient cannot describe their own symptoms**.

**Typical contents:**
- Chief complaint ("vomiting for 3 days", "limping on right front leg")
- History of present illness with timeline and progression
- Behavioral changes (appetite, energy, water intake, elimination)
- Environmental context (indoor/outdoor, boarding, exposure to toxins)
- Current medications and supplements
- Diet information
- Relevant negatives (no cough, no diarrhea -- abbreviated as "C/S/D" meaning cough/sneezing/diarrhea)

**Key insight for FureverCare:** When pet owners upload discharge summaries, the Subjective section is often **not included** in what they receive. But when full records are transferred between vets, it's present and contains critical context.

#### Objective (O) -- The Clinical Facts

This section contains measurable, observable data from the veterinary examination. No interpretation -- just facts.

**Standard vital signs documented:**
- Temperature (normal: dogs 101-102.5°F, cats 100.5-102.5°F)
- Heart rate (HR)
- Respiratory rate (RR)
- Weight (with units)
- Body Condition Score (BCS, 1-9 scale)
- Mucous membranes (MM) -- color and moisture
- Capillary refill time (CRT) -- normal is <2 seconds
- Hydration status (skin turgor assessment)
- Patient demeanor: BAR (Bright, Alert, Responsive) or QAR (Quiet, Alert, Responsive)

**Physical exam findings (head-to-tail):**
- Eyes, ears, oral cavity
- Lymph nodes
- Heart and lung auscultation
- Abdominal palpation
- Musculoskeletal assessment
- Skin and coat condition
- Neurological status

**Diagnostic results:**
- Lab work (CBC, chemistry, urinalysis)
- Imaging findings (radiographs, ultrasound)
- Point-of-care tests (heartworm, FeLV/FIV, fecal)

**Key insight for FureverCare:** The Objective section is the **richest source of structured data** in veterinary records. Vital signs, lab values, and exam findings are all extractable by LLM and highly valuable for longitudinal tracking.

#### Assessment (A) -- The Diagnosis

This section synthesizes Subjective and Objective data into clinical conclusions.

**Typical contents:**
- Working diagnosis or diagnoses (numbered by problem)
- Differential diagnoses in order of likelihood (using "r/o" = "rule out")
- Severity assessment
- Prognosis
- Clinical reasoning connecting findings to conclusions

**Example format:**
```
A: 1. Acute vomiting r/o pancreatitis vs. foreign body obstruction
      vs. dietary indiscretion vs. infectious vs. other
   2. Mild dehydration secondary to decreased intake
   3. Mild conjunctivitis secondary to URI
```

**Key insight for FureverCare:** Assessments contain the diagnoses that should populate our `pet_conditions` table. Differential diagnoses are also valuable -- they tell the next vet what was considered and ruled out.

#### Plan (P) -- The Action Items

This section outlines everything that happens next.

**Typical contents:**
- Medications prescribed (drug, dose in mg/kg, route, frequency, duration)
- Procedures performed or ordered
- Diagnostic tests ordered
- Diet changes
- Activity restrictions
- Client education provided
- Follow-up timeline and criteria
- Referrals to specialists
- **Declined services** (legally important -- if owner declined bloodwork, it's documented here)

**Key insight for FureverCare:** The Plan section maps directly to our `pet_medications` table and should also drive timeline entries for follow-up scheduling.

### 1.3 How SOAP Notes Differ from Human Medicine

| Aspect | Human SOAP | Veterinary SOAP |
|--------|-----------|-----------------|
| Patient voice | Patient describes symptoms directly | Owner reports observations (proxy) |
| Vital sign ranges | Standardized for humans | Species-specific (dog vs. cat vs. exotic) |
| Consent documentation | Patient consent | Owner consent + declined services |
| Abbreviations | Standardized (mostly) | Highly variable between practices |
| Digital adoption | Mandated by law (HIPAA/HITECH) | No mandate, voluntary |
| Interoperability | FHIR/HL7 standards enforced | No enforced standard |
| Record portability | Patient right by law | Varies by state, no federal law |

### 1.4 SOAP Note Variants

| Variant | Sections | Use Case |
|---------|----------|----------|
| **SOAP** | Subjective, Objective, Assessment, Plan | Standard -- used for all visits |
| **SOAPE** | + Evaluation | Addresses longitudinal tracking of treatment outcomes |
| **SOAPIE** | + Intervention, Evaluation | Used in nursing/critical care |
| **SOAPIER** | + Intervention, Evaluation, Revision | Extended critical care documentation |
| **APSO** | Assessment-Plan first | Chronic disease management (actionable info first) |
| **DAP** | Data, Assessment, Plan | Simplified (combines S+O into "Data") |

**Recommendation:** FureverCare should parse and store standard SOAP, but the **APSO reordering** (Assessment/Plan first) is worth considering for the emergency card display, since it puts the most actionable information first.

### 1.5 When SOAP Notes Are Created

**Every visit generates a SOAP note.** Specific scenarios:

| Visit Type | SOAP Characteristics |
|-----------|---------------------|
| Wellness/Annual exam | Full SOAP, preventive care emphasis |
| Sick visit | Full SOAP, diagnostic emphasis |
| Follow-up/Recheck | SOAP comparing to prior visit |
| Emergency | SOAP with triage focus (XABCDE) |
| Dental procedure | SOAP + separate dental chart |
| Surgery | Pre-op SOAP + surgical report |
| Vaccination-only | Abbreviated SOAP |
| Hospitalization | Daily (or multiple daily) SOAP progress notes per active problem |
| Telehealth | SOAP with virtual exam limitations noted |

**AAHA requires** finished records to be closed within 24 hours. For hospitalized patients, each active problem gets at least one SOAP entry per day.

---

## Part 2: Real-World SOAP Note Examples

These examples illustrate the range of complexity and the data available for extraction.

### Example 1: Routine Wellness Exam

```
Patient: Max, 5yo MN Labrador Retriever, 32.5 kg

S: Owner reports Max is doing well overall. Eating and drinking normally.
   Regular exercise with daily walks. No V/D. Current on Simparica Trio
   monthly. Occasional scratching but no excessive licking. Diet: Purina
   Pro Plan dry. No concerns from owner.

O: T 101.8°F, HR 88, RR 24, Wt 32.5 kg, BCS 5/9
   BAR. Normal gait. Coat healthy. Eyes clear. Ears clean bilaterally.
   Mild tartar upper premolars, Grade 1/4 gingivitis. Heart NSR, no
   murmur. Lungs CTA bilaterally. Abdomen soft, non-painful. LN WNL.
   Skin: mild erythema interdigital spaces RF. MM pink, moist. CRT <2s.
   4Dx: Negative. Fecal float: Negative.

A: 1. Healthy adult dog - annual wellness
   2. Mild dental disease (Grade 1 gingivitis)
   3. Early interdigital dermatitis RF - r/o allergic vs. environmental

P: 1. DHPP and Rabies administered
      - DHPP: Lot #ABC123, exp 06/2026, SQ R shoulder
      - Rabies: Lot #DEF456, exp 12/2026, SQ R hip
   2. Continue Simparica Trio monthly
   3. Dental cleaning recommended within 3 months. Estimate provided.
   4. Interdigital: Monitor. Rinse feet after walks.
   5. Recheck: 12 months
```

**Extractable data for FureverCare:**
- Vaccinations: DHPP (date, lot, expiration), Rabies (date, lot, expiration)
- Conditions: Mild dental disease, Interdigital dermatitis
- Medications: Simparica Trio (ongoing, monthly)
- Vitals: Weight, temperature, HR, RR, BCS
- Vet info: From document header
- Follow-up: 12 months

### Example 2: Chronic Disease Management

```
Patient: Whiskers, 14yo MN DSH, 4.8 kg

S: Improved appetite since starting renal diet 4 weeks ago. Drinking
   slightly more. Urinating normally. Energy stable. No vomiting since
   last visit. Current meds: Renal diet (Royal Canin), Aluminum
   hydroxide 90mg/kg/day with food.

O: T 101.0°F, HR 160, RR 22, Wt 4.8 kg (up from 4.5 kg), BCS 4/9
   QAR. Mild muscle wasting. MM pale pink, tacky. CRT 2s. Mild
   dehydration ~3-5%. Grade II/VI systolic murmur (unchanged).
   Bilateral small irregular kidneys on palpation.
   Chemistry: BUN 48 (ref 16-36), Creat 3.1 (ref 0.8-2.4),
   Phos 5.8 (ref 3.1-6.8), K+ 4.2, PCV 28% (ref 30-45%).
   USG 1.018.

A: 1. CKD IRIS Stage 3 - stable. BUN/Creat improved (was 55/3.4)
   2. Mild non-regenerative anemia (PCV 28%) - renal origin
   3. Phosphorus controlled on current dose
   4. Cardiac murmur - stable

P: 1. Continue renal diet and aluminum hydroxide
   2. Start SQ fluids 100ml LRS every other day (owner demonstrated)
   3. Monitor PCV - discuss EPO if drops below 25%
   4. Recheck chemistry and PCV in 6 weeks
   5. BP check next visit
   6. Client educated on uremic crisis signs
```

**Extractable data for FureverCare:**
- Conditions: CKD IRIS Stage 3, Non-regenerative anemia, Cardiac murmur
- Medications: Renal diet, Aluminum hydroxide (with dosing), SQ fluids (new)
- Lab results: BUN, Creatinine, Phosphorus, K+, PCV, USG (with reference ranges and trend)
- Weight trend: 4.5 -> 4.8 kg (improving)
- Follow-up: 6 weeks

### Example 3: Emergency Trauma

```
Patient: Buddy, ~3yo MI mixed breed, est 25 kg

S: Found by Good Samaritan on roadside, appears HBC. No owner ID.
   Unknown medical history, vaccination status, medications.

O: T 99.8°F (hypothermic), HR 180 (tachycardic), RR 44 (tachypneic)
   Obtunded. MM pale, CRT 3s. Weak femoral pulses. Abdomen tense,
   painful - fluid wave present. Open fracture R tibia with active
   hemorrhage. Decreased breath sounds R hemithorax. Anisocoria.
   Blood glucose: 65. AFAST: Positive for free abdominal fluid.
   Rads: R pneumothorax, pulmonary contusions R caudal lobe.
   PCV/TS: 22%/4.0 (hemorrhagic shock).

A: 1. Hemorrhagic shock
   2. R pneumothorax - traumatic
   3. Open fracture R tibia
   4. Suspected head trauma (anisocoria, obtunded)
   5. Hypothermia secondary to shock

P: 1. IV crystalloid bolus 20ml/kg over 15 min. Active warming.
   2. R thoracocentesis - 200ml air evacuated. Recheck 2 hrs.
   3. Splint R tibia. Surgical consult pending stabilization.
   4. Type and crossmatch - transfusion if PCV <20% post-fluids
   5. Serial AFAST q2h
   6. Neuro checks q1h
   7. Methadone 0.3mg/kg IV q4h for pain
   8. Microchip scan: NEGATIVE
```

**Why this matters for FureverCare:** This is the scenario we're built for. If Buddy's owner had FureverCare with a shared QR tag, the ER team would have had vaccination status, known allergies, medication history, and emergency contacts -- instead of working completely blind.

---

## Part 3: The Industry Landscape

### 3.1 PIMS Market Share

The veterinary software market is heavily concentrated:

| Vendor | Market Share | Products | AI SOAP? |
|--------|-------------|----------|----------|
| **IDEXX** | ~43% | Cornerstone (legacy), Neo (cloud), ezyVet (cloud) | ezyVet only (native) |
| **Covetrus** | ~36% | AVImark (legacy), Pulse (cloud) | No native AI |
| **DaySmart Vet** | ~11% | Cloud-based | No |
| **Shepherd** | Growing | Cloud-based | Native (TranscribeAI) |
| **Digitail** | Growing | Cloud-based | Native (Tails AI) |
| **Vetspire** | Growing | Cloud-based | Native (AI Scribe) |
| **Instinct** | Growing (ER-focused) | Cloud-based | Semi-native |

**The critical insight:** 79% of the market (IDEXX + Covetrus) runs on platforms with **no native AI SOAP capabilities**. This gap created the standalone AI scribe market.

### 3.2 AI Scribe Ecosystem

AI usage for medical records among VIN (Veterinary Information Network) members grew **5x in 14 months** -- from 3.5% (July 2024) to 17.5% (September 2025). Major players:

| Tool | Key Feature | PIMS Integration | Pricing |
|------|------------|-----------------|---------|
| **ScribbleVet** | Record summarizer (100s of pages -> summary), dental charts | ezyVet, Pulse, Vetspire, 1-click | $40-200/mo per user |
| **HappyDoc** | Scout (gap detection), trained on 1.2M+ appointments | Cornerstone, AVImark, Vetspire, ezyVet (write-back) | Contact |
| **Scribenote** | Adaptive templates, SOC 2 Type II certified | Widget mode (universal), PIMSPal for Pulse/ezyVet | Free-$99/mo per DVM |
| **Talkatoo** | First vet AI company (2019), TaDA assistant, call summary | ezyVet, Neo, Cornerstone | Contact |
| **VetRec** | 30+ templates, D.A.V.I.D AI Agent, Records Recap in 30s | 1-click PIMS integration | $99-150/mo |
| **CoVet** | 40+ templates, PDF upload parsing, handwritten note photos | Cloud PMS write-back | Contact |
| **PawfectNotes** | Multilingual, broadest specialty coverage | Various | Contact |

**UC Davis and University of Florida** veterinary schools have adopted ScribbleVet, signaling institutional acceptance of AI documentation.

### 3.3 The General AI Scribe Workflow

All veterinary AI scribes follow a similar pattern:

1. **Record** -- Vet taps "Record" on phone/tablet at appointment start
2. **Ambient Listening** -- AI listens to full two-way conversation (vet + owner)
3. **Intelligent Filtering** -- Removes small talk, ambient noise
4. **Terminology Recognition** -- Trained on veterinary vocabulary
5. **Speaker Differentiation** -- Distinguishes vet voice from owner voice
6. **SOAP Structuring** -- AI categorizes information into S/O/A/P sections contextually (vet does NOT need to say "now for the subjective section")
7. **Review** -- Vet reviews generated notes (typically <2 minutes editing)
8. **Export/Sync** -- One-click transfer to PIMS or auto-sync

**Key efficiency stat:** These tools save an average of **70 minutes per DVM per day**.

### 3.4 What Pet Owners Actually Receive

**Pet owners almost NEVER receive the full SOAP note.** Instead they get:

| Document | When | Format | Contains |
|----------|------|--------|----------|
| **Discharge summary** | After every visit | Printed or PDF | Plain-language diagnosis, medications, care instructions, follow-up |
| **Vaccination certificate** | After vaccinations | Standardized form | Vaccine names, dates, lot numbers, next due dates |
| **Lab results** | If requested | PDF on lab letterhead | Test values, reference ranges, flags |
| **Full medical records** | When switching vets or for insurance | PDF (often 10-100+ pages) | Complete SOAP notes, lab results, imaging reports, everything |
| **Invoice/receipt** | After every visit | Printed or PDF | Procedure codes, diagnoses (for billing), costs |

**Implication for FureverCare:** The documents most likely to be uploaded are discharge summaries (plain language, limited data), vaccination certificates (structured, easy to parse), and full records transfers (rich SOAP data, but massive and inconsistent PDFs).

### 3.5 The Interoperability Gap

**There is no FHIR equivalent for veterinary medicine.** The landscape:

| Standard | Status | Coverage |
|----------|--------|----------|
| **FHIR** | Technically covers vet medicine, but no vet-specific implementation guide in use | Theoretical |
| **VetXML** | UK consortium, schemas for insurance claims and microchip registration | UK only, narrow scope |
| **AAHA Diagnostic Terms** | ~3,500 concepts from SNOMED-CT covering 90% of small animal cases | Voluntary, US-focused |
| **DICOM** | Widely adopted for imaging (X-rays, CT, MRI) | Only standard with real interoperability |
| **HL7/LOINC** | AVMA supports adoption but no enforcement | Aspirational |

**The three-layer interoperability problem:**
1. **Connection layer** (APIs, file transfer) -- partially solved
2. **Structure layer** (data format agreement) -- partially solved
3. **Semantic layer** (standardized terminology) -- **the fundamental failure**. The same condition appears as "DM," "Diabetes," "Type 1 diabetes," or "Endocrine disorder" at different practices.

**How records actually transfer between clinics today:**
1. Owner requests records (may need signed release form)
2. Clinic exports as PDF (or prints and scans)
3. Sent via email, fax, or US mail
4. Receiving clinic manually reviews and enters relevant data into their PIMS
5. Process takes days to weeks

**No automated, standardized electronic transfer exists between different PIMS systems.**

---

## Part 4: AI Record Parsing -- The Competitive Landscape

### 4.1 Who's Parsing Vet Records With AI?

Most AI tools in this space are designed for **vet-side creation** of records, not **owner-side interpretation**. Notable exceptions:

| Company | What They Do | Relevance to FureverCare |
|---------|-------------|--------------------------|
| **ScribbleVet Record Review** | Turns 100s of pages of records into readable summary | Direct competitor to our extraction pipeline |
| **CoVet** | Uploads patient histories as PDF or photos of handwritten notes for instant summaries | Very similar to our document upload approach |
| **Trupanion** | Automates 60%+ of insurance invoice processing with ML trained on millions of claims | Proves AI record parsing at scale works |
| **Embrace (Apollo AI)** | 75% faster claims processing, 250K+ claims via AI | Insurance-side parsing of vet records |
| **Five Sigma (Clive AI)** | Pet insurance AI Claims Adjuster with 6-step STP workflow | Specialized for invoice/claims parsing |
| **VetMamba** | Research project (Yeshiva University) using Mamba architecture for long vet records | Novel architecture approach for long documents |
| **Nanonets** | OCR + AI specifically for veterinary medical records | Generic document extraction platform |

### 4.2 What Makes FureverCare's Approach Unique

**Nobody is doing exactly what we're proposing.** The landscape splits into:

1. **Vet-side tools** (ScribbleVet, HappyDoc, etc.) -- Help vets CREATE records. Require PIMS integration. B2B sales to clinics.
2. **Insurance tools** (Trupanion, Embrace) -- Parse vet records for CLAIMS processing. Not designed for owner access.
3. **Pet owner portals** (PetDesk/VitusVet, Digitail Pet Parent App) -- Give owners access to records FROM their vet's system. Tied to specific PIMS. Not cross-clinic.

**FureverCare's unique position:** Owner-initiated, cross-clinic aggregation with AI parsing, specifically optimized for emergency sharing. No existing product does this.

### 4.3 The Pet Insurance Insight

Pet insurance companies are the **most advanced consumers of AI record parsing** -- and their challenges are instructive:

- Veterinary invoices are **unstructured and highly variable** between clinics
- Traditional OCR struggled with the unique complexities of vet documents
- Trupanion's ML models were trained on **millions of claims** to achieve 60%+ automation
- The semantic variability (same treatment coded differently) is the hardest problem
- Many claims are still **faxed** as paper or image-based documents

**What FureverCare can learn:** Start with the highest-value, most structured documents first (vaccination certificates, lab results). Build toward parsing full SOAP notes from record transfers. Use AAHA Diagnostic Terms as a normalization target.

---

## Part 5: Common Veterinary Abbreviations

Understanding these abbreviations is critical for our LLM extraction prompts:

### Patient Descriptors
| Abbreviation | Meaning |
|-------------|---------|
| MN | Male Neutered |
| FS | Female Spayed |
| MI | Male Intact |
| FI | Female Intact |
| DSH / DLH / DMH | Domestic Short/Long/Medium Hair |
| yo | Years old |

### Vital Signs & Exam
| Abbreviation | Meaning |
|-------------|---------|
| BAR | Bright, Alert, Responsive |
| QAR | Quiet, Alert, Responsive |
| TPR | Temperature, Pulse, Respiration |
| BCS | Body Condition Score (1-9) |
| CRT | Capillary Refill Time |
| MM | Mucous Membranes |
| NSR | Normal Sinus Rhythm |
| CTA | Clear to Auscultation |
| WNL | Within Normal Limits |
| LN | Lymph Nodes |
| PE | Physical Examination |

### Clinical
| Abbreviation | Meaning |
|-------------|---------|
| DDx | Differential Diagnosis |
| r/o | Rule Out |
| Hx | History |
| Dx | Diagnosis |
| Tx | Treatment |
| Rx | Prescription |
| Px | Prognosis |
| HBC | Hit By Car |
| GDV | Gastric Dilatation-Volvulus |
| FLUTD | Feline Lower Urinary Tract Disease |
| URI | Upper Respiratory Infection |
| CKD | Chronic Kidney Disease |
| DM | Diabetes Mellitus |
| AFAST / TFAST | Abdominal/Thoracic Focused Assessment with Sonography |

### Medication/Dosing
| Abbreviation | Meaning |
|-------------|---------|
| SID | Once daily |
| BID | Twice daily |
| TID | Three times daily |
| QID | Four times daily |
| PRN | As needed |
| PO | Per os (by mouth) |
| SQ / SC | Subcutaneous |
| IM | Intramuscular |
| IV | Intravenous |
| mg/kg | Milligrams per kilogram (standard dosing unit) |

**Critical parsing challenge:** Some abbreviations are ambiguous. "BUP" could mean buprenorphine OR bupivacaine. "Dex" could mean dexamethasone OR dexmedetomidine. Context-dependent interpretation is required -- and this is where LLMs have an advantage over rule-based parsers.

---

## Part 6: Strategic Recommendations for FureverCare

### 6.1 Data Model Evolution: Add Visit Records

**Current state:** FureverCare stores flat lists of medications, conditions, vaccinations, etc. -- disconnected from visits.

**Proposed: Add a `pet_visits` table** as the organizational backbone:

```
pet_visits
├── id
├── pet_id (FK)
├── visit_date
├── visit_type (wellness, sick, emergency, follow_up, dental, surgery, vaccination)
├── clinic_name
├── vet_name
├── reason_for_visit (chief complaint)
├── subjective (text -- owner's report)
├── objective (text -- exam findings)
├── objective_vitals (JSONB -- structured vitals: temp, HR, RR, weight, BCS, MM, CRT)
├── assessment (text -- diagnoses and differentials)
├── plan (text -- treatment plan)
├── follow_up_date
├── follow_up_notes
├── source_document_id (FK to document_uploads -- links to uploaded PDF)
├── created_at
└── updated_at
```

**Then link existing records to visits:**
- `pet_medications.visit_id` -- which visit prescribed this medication
- `pet_vaccinations.visit_id` -- which visit administered this vaccine
- `pet_conditions.visit_id` -- which visit diagnosed this condition
- Lab results, imaging results linked to visits

This enables: "On January 15, Whiskers visited Dr. Smith for vomiting. Bloodwork showed elevated BUN. Diagnosed with CKD Stage 3. Started on renal diet." -- versus the current disconnected: "Condition: CKD. Medication: Renal diet."

### 6.2 Timeline Redesign: Visit-Centric with Drill-Down

**Proposed timeline structure:**

```
Timeline View
├── Feb 2026: Emergency Visit - Vomiting, Lethargy
│   ├── S: Owner reports 3 days of vomiting...
│   ├── O: T 103.2°F, dehydrated, abdominal pain...
│   ├── A: Acute pancreatitis, dehydration
│   ├── P: IV fluids, anti-nausea, bland diet
│   ├── [Lab Results] CBC, Chemistry panel
│   └── [Medications Started] Cerenia, Omeprazole
│
├── Jan 2026: Wellness Exam
│   ├── Summary: Healthy, dental cleaning recommended
│   ├── [Vaccinations] DHPP, Rabies
│   └── [Follow-up] Dental cleaning in 3 months
│
├── Dec 2025: Dental Cleaning
│   ├── Summary: Grade 2 periodontal disease, 2 extractions
│   ├── [Dental Chart] Visual diagram
│   └── [Medications] Antibiotics 10 days, pain meds 5 days
│
└── Standalone Records (no visit linked)
    ├── Microchip: #123456789
    ├── Allergy: Chicken (moderate)
    └── Emergency Contact: Jane Doe, 555-0123
```

**Key design principles:**
- Visits are the primary timeline entries (expandable cards)
- Medications, vaccinations, conditions appear as sub-items under their originating visit
- Standalone records (allergies, emergency contacts, microchip) that don't belong to a specific visit appear separately
- Each visit card shows a one-line summary + expandable SOAP details
- Filter by visit type, date range, or keyword

### 6.3 Emergency Card Evolution: ER-Optimized View

**Current card shows:** Flat lists of conditions, allergies, medications, vaccinations, vets, contacts.

**Proposed ER-optimized card (APSO-inspired -- most actionable info first):**

```
┌─────────────────────────────────────────────┐
│  🚨 EMERGENCY PET HEALTH CARD              │
│  Buddy | 5yo MN Labrador | 32.5 kg         │
│  Microchip: #985112000123456                │
├─────────────────────────────────────────────┤
│  ⚠️ CRITICAL ALERTS                         │
│  • Allergy: PENICILLIN (severe - anaphylaxis│
│  • Condition: Epilepsy (controlled)         │
│  • Medication: Phenobarbital 60mg BID       │
├─────────────────────────────────────────────┤
│  💊 ACTIVE MEDICATIONS                       │
│  Phenobarbital 60mg PO BID (since 2024)     │
│  Simparica Trio monthly (HW/flea/tick)      │
│  Cosequin daily (joint supplement)          │
├─────────────────────────────────────────────┤
│  📋 ACTIVE CONDITIONS                        │
│  Epilepsy - IRIS controlled (dx 2024)       │
│  Hip dysplasia - mild bilateral (dx 2023)   │
│  Dental disease - Grade 2 (noted Jan 2026)  │
├─────────────────────────────────────────────┤
│  🏥 RECENT VISITS (last 6 months)           │
│  Jan 15, 2026 - Wellness Exam (Dr. Smith)   │
│    → Healthy, dental cleaning recommended   │
│  Nov 3, 2025 - Seizure Episode (ER)         │
│    → Phenobarbital level checked, adjusted  │
├─────────────────────────────────────────────┤
│  💉 VACCINATION STATUS                       │
│  Rabies: Current (exp Dec 2026)             │
│  DHPP: Current (exp Jan 2027)               │
│  Bordetella: EXPIRED (exp Oct 2025)         │
├─────────────────────────────────────────────┤
│  📞 CONTACTS                                │
│  Owner: John Doe - (555) 123-4567           │
│  Vet: ABC Animal Hospital - (555) 987-6543  │
│  Emergency: Jane Doe - (555) 246-8135       │
└─────────────────────────────────────────────┘
```

**Key changes from current card:**
1. **Critical Alerts section** at the top -- allergies, drug interactions, and critical conditions that affect immediate treatment decisions
2. **Recent visit summaries** -- gives ER vet context about what's been happening recently
3. **Active conditions** with diagnosis dates and current status
4. **Vaccination status** with explicit EXPIRED flags
5. **APSO-inspired ordering** -- assessment info (what's wrong) and plan info (what they're on) before subjective history

### 6.4 LLM Extraction Pipeline Evolution

#### New Document Type: SOAP Note / Visit Record

Add to the document classifier (`classify-document.yml`):

```yaml
- soap_note: Full SOAP-formatted veterinary visit notes, progress notes,
  clinical records with S/O/A/P sections
- discharge_summary: Client-facing visit summary with care instructions,
  follow-up guidance (NOT the clinical SOAP note)
- dental_chart: Dental examination diagrams with tooth-by-tooth findings
- surgical_report: Pre-op, intra-op, and post-op documentation
- referral_letter: Specialist referral or consultation correspondence
- records_transfer: Multi-page compilation of records from previous vet
```

#### New Extraction Record Type: Visit

Add to the extraction prompt (`extract-data.yml`):

```yaml
- visit: Vet visit records (visit_date, visit_type, clinic_name, vet_name,
  reason_for_visit, subjective, objective, objective_vitals, assessment,
  plan, follow_up_date, follow_up_notes)
```

The visit extraction should additionally extract linked sub-records:
- Medications mentioned in the Plan section
- Diagnoses mentioned in the Assessment section
- Lab values mentioned in the Objective section
- Vaccinations administered (from Plan section)

#### Abbreviation-Aware Extraction

Add a veterinary abbreviation expansion layer to the extraction prompt:

```
When extracting data, expand common veterinary abbreviations:
- BAR → Bright, Alert, Responsive
- QAR → Quiet, Alert, Responsive
- BCS → Body Condition Score
- CRT → Capillary Refill Time
- MM → Mucous Membranes
- NSR → Normal Sinus Rhythm
- CTA → Clear to Auscultation
- WNL → Within Normal Limits
- r/o → Rule Out
- DDx → Differential Diagnosis
- HBC → Hit By Car
- BID/TID/SID/QID → dosing frequency
- PO/SQ/IM/IV → administration route

For ambiguous abbreviations (e.g., "BUP" could be buprenorphine or
bupivacaine), use surrounding clinical context to determine the most
likely meaning and note the ambiguity in the extraction confidence score.
```

#### Multi-Page Record Transfer Handling

For records transfers (the 100+ page PDFs owners get when switching vets), add a **chunked extraction** approach:

1. **Page classification** -- Classify each page/section as SOAP note, lab result, invoice, vaccination record, imaging report, etc.
2. **Visit boundary detection** -- Identify where one visit ends and another begins
3. **Per-visit extraction** -- Extract SOAP data from each visit separately
4. **Deduplication** -- Same medication appearing in multiple visits shouldn't create duplicates
5. **Longitudinal assembly** -- Build the timeline from all extracted visits

#### AAHA Diagnostic Terms Normalization

Use the AAHA Diagnostic Terms (~3,500 concepts from SNOMED-CT) as a normalization target. When extracting conditions:

```
When extracting diagnoses or conditions, normalize to AAHA standard
diagnostic terms where possible. Map variations like:
- "DM" / "Diabetes" / "Type 2 DM" → "Diabetes mellitus"
- "CKD" / "Kidney disease" / "Renal failure" → "Chronic kidney disease"
- "Otitis" / "Ear infection" → "Otitis externa" or "Otitis media"

Include both the original text from the document and the normalized term.
```

### 6.5 The "Vet Record Expert Agent" Concept

Based on your interest in building an agent that's an expert in interpreting pet medical records, here's a proposed architecture:

```
Document Upload
      │
      ▼
┌─────────────┐
│  Classifier  │  What type of document is this?
│  (existing)  │  Now with: soap_note, discharge_summary,
└──────┬──────┘  dental_chart, surgical_report, referral_letter,
       │         records_transfer
       ▼
┌─────────────┐
│  Splitter    │  For multi-page record transfers:
│  (new)       │  Split into individual documents/visits
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Extractor   │  Per-document structured extraction
│  (enhanced)  │  Now with: visit record type, SOAP sections,
└──────┬──────┘  abbreviation expansion, vitals parsing
       │
       ▼
┌─────────────┐
│  Normalizer  │  Terminology normalization:
│  (new)       │  AAHA Diagnostic Terms mapping,
└──────┬──────┘  medication name standardization
       │
       ▼
┌─────────────┐
│  Assembler   │  Build longitudinal patient timeline:
│  (new)       │  Link meds/conditions/vaccines to visits,
└──────┬──────┘  detect duplicates, identify trends
       │
       ▼
┌─────────────┐
│  Insights    │  Optional intelligence layer:
│  (future)    │  Flag expired vaccinations, drug interactions,
└─────────────┘  overdue follow-ups, condition trends
```

**The Insights layer** is where FureverCare could differentiate significantly. Imagine:
- "Whiskers' kidney values have been trending upward over the last 3 visits"
- "Rabies vaccination expired 2 months ago"
- "Last dental cleaning was 18 months ago -- the vet recommended annual"
- "Buddy is on phenobarbital (for seizures) -- alert: this drug interacts with metronidazole"

### 6.6 Questions for Your Vet Tech Advisor

Given that she's an ongoing advisor, these questions would help validate and refine the approach:

**About SOAP notes in practice:**
1. When a pet arrives at the ER, what specific information from previous SOAP notes is most useful in the first 60 seconds?
2. When you receive a records transfer from another clinic, what's the first thing you look for? How do you handle 50+ page PDFs?
3. How often do you encounter handwritten records vs. digital? Is this still common?
4. What abbreviations or shorthand do you find most confusing when reading records from other clinics?

**About the emergency card concept:**
5. If you could design the ideal "pet emergency card" that an owner shows you at intake, what would it contain?
6. Is there information that pet owners frequently FORGET to mention that would be on a SOAP note?
7. How important is vaccination status in an ER setting? Does it change treatment decisions?
8. Do you look at lab result trends, or just the most recent values?

**About data presentation:**
9. Would you prefer to see visit-by-visit SOAP history, or a problem-focused summary that aggregates across visits?
10. For the emergency card -- would a "Critical Alerts" section (severe allergies, drug interactions, ongoing critical conditions) at the top change how you triage?

**About the industry:**
11. What PIMS does your clinic use? How do you feel about its SOAP note features?
12. Do you use any AI scribe tools? If so, which one and what do you like/dislike?
13. When owners bring records from another clinic, what format are they usually in?

---

## Part 7: Implementation Roadmap

### Phase 1: Foundation (Data Model + Enhanced Parsing)

- Add `pet_visits` table with SOAP fields
- Add `soap_note` and `discharge_summary` to document classifier
- Add `visit` record type to extraction pipeline
- Add veterinary abbreviation expansion to extraction prompts
- Link existing record types (medications, conditions, vaccinations) to visits via optional `visit_id`

### Phase 2: Timeline (Visit-Centric UI)

- Redesign pet detail timeline to be visit-centric
- Visits as expandable cards with SOAP sections
- Standalone records (allergies, contacts, microchip) in separate section
- Filter by visit type, date range, condition

### Phase 3: Emergency Card Enhancement

- Add Critical Alerts section (severe allergies, drug interactions)
- Add recent visit summaries to shared card
- Add vaccination expiration status flags
- Reorder card sections for ER-optimized triage flow (APSO-inspired)

### Phase 4: Record Transfer Intelligence

- Multi-page PDF splitting and per-page classification
- Visit boundary detection in long record transfers
- Cross-visit deduplication
- Longitudinal timeline assembly from bulk record imports

### Phase 5: Insights Engine (Future)

- Vaccination expiration tracking and alerts
- Lab value trend detection
- Drug interaction checking
- Follow-up reminder tracking
- Condition progression monitoring

---

## Appendix: Competitive Positioning

### Where FureverCare Sits

```
                    Vet-Side                Owner-Side
                    ┌─────────────────┬──────────────────┐
                    │                 │                  │
   Record          │  ScribbleVet    │  FureverCare     │
   Creation/       │  HappyDoc       │  (unique         │
   Parsing         │  Scribenote     │   position)      │
                    │  VetRec, CoVet  │                  │
                    │                 │                  │
                    ├─────────────────┼──────────────────┤
                    │                 │                  │
   Practice        │  ezyVet         │  PetDesk app     │
   Management      │  Shepherd       │  Digitail        │
                    │  Digitail       │  pet parent app  │
                    │  Vetspire       │  VitusVet        │
                    │                 │                  │
                    ├─────────────────┼──────────────────┤
                    │                 │                  │
   Claims/         │  Trupanion      │  (no owner-side  │
   Insurance       │  Embrace Apollo │   equivalent)    │
                    │  Five Sigma     │                  │
                    │                 │                  │
                    └─────────────────┴──────────────────┘
```

FureverCare occupies the **owner-side record parsing** quadrant -- a space with essentially no competition. PetDesk and Digitail's pet parent apps give owners access to records from a single clinic. FureverCare aggregates across ALL clinics and adds AI interpretation.

### The Moat

1. **Cross-clinic aggregation** -- No other tool lets owners upload records from any vet
2. **AI-powered interpretation** -- Not just storing PDFs, but extracting structured data
3. **Emergency-optimized presentation** -- Purpose-built for the ER handoff scenario
4. **Owner-controlled** -- Pet owners own their data, not tied to any clinic's PIMS

---

## Sources

### SOAP Note Format & Best Practices
- [HappyDoc - What Makes a Good Veterinary SOAP Note](https://happydoc.ai/blog/what-makes-a-good-veterinary-soap-note-with-examples)
- [HappyDoc - Anatomy of a Great SOAP Note](https://www.happydoc.ai/blog/great-veterinarian-soap-note-example)
- [SOAP Note AI - Veterinary Medicine Guide](https://www.soapnoteai.com/soap-note-guides-and-example/veterinary-medicine/)
- [SOAP Note AI - 10 Common Examples](https://www.soapnoteai.com/soap-note-guides-and-example/veterinary-medicine/examples/)
- [TextExpander - Veterinary SOAP Note Templates](https://textexpander.com/templates/veterinary-soap-note)
- [Acorn.vet - Essential Guide to Veterinary SOAP Notes 2025/2026](https://acorn.vet/blog/guide-to-veterinary-soap-notes-2025)
- [University of Wisconsin - Tips for SOAP Writing](https://www.vetmed.wisc.edu/wp-content/uploads/2019/07/soapwriting.pdf)
- [VETport - SOAP Medical Record Veterinary EMR](https://www.vetport.com/SOAP-medical-record-veterinary-EMR)
- [DaySmart Vet - Ultimate Guide to Writing Veterinary SOAP Notes](https://www.daysmart.com/vet/blog/the-ultimate-guide-to-writing-veterinary-soap-notes/)
- [Talkatoo - Ultimate Guide to SOAP Notes](https://talkatoo.com/blog/the-ultimate-guide-to-soap-notes/)
- [WandScribe - Mastering Veterinary SOAP Notes](https://wandscribe.com/blog/mastering-veterinary-soap-notes)
- [Lemonade Pet Insurance - SOAP Medical Records](https://www.lemonade.com/pet/explained/soap-medical-records/)
- [Study.com - POVMR & SOAP Record Formats in Veterinary Medicine](https://study.com/academy/lesson/povmr-soap-record-formats-in-veterinary-medicine.html)
- [NCBI StatPearls - SOAP Notes](https://www.ncbi.nlm.nih.gov/books/NBK482263/)

### PIMS Systems & Market
- [IDEXX - Top Veterinary Software Solutions 2025](https://software.idexx.com/top-veterinary-software-solutions-a-2025-comparison-guide)
- [Shepherd Veterinary Software](https://www.shepherd.vet/)
- [Shepherd - 8 Best AI-Powered PIMS 2026](https://www.shepherd.vet/blog/8-best-ai-powered-veterinary-practice-management-software-platforms-2026-comparison-guide/)
- [Digitail](https://digitail.com/)
- [Digitail - Tails AI Dictation for Quick SOAPs](https://help.digitail.io/en/articles/8656757-tails-ai-dictation-for-quick-soaps)
- [Vetspire - Medical Records](https://www.vetspire.ai/features/medical-records)
- [Instinct EMR](https://instinct.vet/products/instinct-emr/)
- [PetDesk Scribe](https://petdesk.com/veterinary-ai-transcription-platform/)
- [Provet Cloud](https://www.provet.com/product/features)
- [NaVetor](https://www.navetor.com/features)
- [Rhapsody PIMS](https://www.rhapsody.vet/)
- [PMC - Cloud-Based Software Gathering Steam](https://pmc.ncbi.nlm.nih.gov/articles/PMC10727148/)

### AI Scribe Tools
- [ScribbleVet](https://www.scribblevet.com/)
- [HappyDoc](https://happydoc.ai/)
- [Scribenote](https://scribenote.com/)
- [Talkatoo](https://talkatoo.com/)
- [VetRec](https://vetrec.io/)
- [CoVet](https://www.co.vet/)
- [PawfectNotes](https://www.pawfectnotes.com/)
- [Talkingvet](https://talkingvet.com/)
- [VetX AI](https://www.vetx.ai/)
- [DVM360 - UC Davis Adopts AI Scribe](https://www.dvm360.com/view/uc-davis-veterinary-school-adopts-use-of-ai-scribe-platform)
- [DVM360 - Two Companies Integrating AI for SOAP Notes](https://www.dvm360.com/view/two-companies-are-integrating-ai-based-tools-for-enhanced-soap-notes)

### Pet Insurance & AI Claims
- [Trupanion AI Technology](https://investors.trupanion.com/news/Press-Releases/news-details/2023/Trupanion-AI-Technology-Empowers-Pet-Parents-with-Lightning-Fast-Direct-Hospital-Payments/default.aspx)
- [Trupanion Data Science (Domino)](https://domino.ai/customers/trupanion)
- [Embrace Apollo AI](https://www.embracepetinsurance.com/about-us/press-media/press-release-detail/2023/03/29/embrace-pet-insurance-launches-modern-approach-to-claims-processing-with-proprietary-ai-solution)
- [Five Sigma Clive AI for Pet Insurance](https://fivesigmalabs.com/blog/five-sigma-clive-ai-pet-insurance-claims-stp-90-percent-faster/)

### Interoperability & Standards
- [AVMA - Animal Health Information Standards](https://www.avma.org/resources-tools/avma-policies/animal-health-information-standards-informatics)
- [AAHA Problem and Diagnostic Terms](https://www.aaha.org/practice-resources/aaha-benchmarking/aaha-open-standards/standard-diagnostic-terms/)
- [Three Layers of Veterinary Software Interoperability](https://priorknowledgeandpractice.substack.com/p/the-three-layers-of-veterinary-software)
- [Today's Veterinary Business - Software Integration & AI Adoption](https://todaysveterinarybusiness.com/software-integration-and-ai-adoption-020226/)
- [PMC - Veterinary Informatics](https://pmc.ncbi.nlm.nih.gov/articles/PMC7382640/)
- [VetXML Consortium](https://groups.google.com/g/veterinary-health-it-standards/c/TwJiX3hQKo8)

### Record Keeping Standards & Legal
- [Instinct - 10 Common Questions About Veterinary Medical Recordkeeping](https://instinct.vet/blog/10-common-questions-about-veterinary-medical-recordkeeping-standards/)
- [CVO - Guide to Medical Records](https://www.cvo.org/getmedia/21c320ef-f1f1-4c2a-9350-ef154d73f3bc/Guide-Medical-Records.pdf)
- [Co.vet - Veterinary Medical Records Laws by State](https://www.co.vet/post/veterinary-medical-records-laws)

### Veterinary Abbreviations
- [CVMA - Vet Acronyms](https://cvma.net/resources/careers/veterinary-students/vet-acronyms/)
- [University of Illinois - Veterinary Abbreviations & Acronyms Guide](https://www.library.illinois.edu/vex/vetabbrev/)
- [PetPlace - Guide to Veterinary Abbreviations](https://www.petplace.com/article/cats/pet-health/what-do-those-veterinary-abbreviations-mean)

### Pet Health Data & Record Portability
- [VitusVet](https://vitusvet.com/pet-owners/)
- [PetDesk](https://petdesk.com/)
- [Bond Vet Technology](https://bondvet.com/technology)
- [Airvet](https://www.airvet.com/)
- [Petriage](https://petriage.com/)
- [Yeshiva University - VetMamba AI](https://www.yu.edu/news/katz/ai-tool-helps-veterinarians-understand-complex-animal-health-records-faster)
- [VCA - Importance of Sharing Medical Records](https://vcahospitals.com/know-your-pet/the-importance-of-sharing-medical-records)
- [PetMD - Medical Privacy for Pets](https://www.petmd.com/news/view/medical-privacy-pets-36821)
- [Nanonets - Veterinary Record OCR](https://nanonets.com/document-ocr/authorization-to-release-veterinary-medical-records)
- [VIN - AI for Medical Records](https://news.vin.com/doc/?id=12903793)
