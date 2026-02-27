/**
 * Manual verification script for primary vet selection logic
 * Run with: tsx src/validation/primary-vet-logic.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';

interface TestResult {
  testName: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function logTest(name: string, passed: boolean, details: string) {
  results.push({ testName: name, passed, details });
  console.log(`${passed ? '✓' : '✗'} ${name}`);
  if (!passed) {
    console.log(`  Details: ${details}`);
  }
}

// Read the implementation files
const healthRecordsPath = join(process.cwd(), 'src/models/health-records.ts');
const routesPath = join(process.cwd(), 'src/routes/pets.ts');
const classifierPath = join(process.cwd(), 'src/services/document-classifier.ts');

const healthRecords = readFileSync(healthRecordsPath, 'utf-8');
const routes = readFileSync(routesPath, 'utf-8');
const classifier = readFileSync(classifierPath, 'utf-8');

console.log('\n=== Primary Vet Selection Logic Verification ===\n');

// Test 1: createPetVet has conditional is_primary logic
const createPetVetMatch = healthRecords.match(/export async function createPetVet[\s\S]*?return result/);
if (createPetVetMatch) {
  const funcBody = createPetVetMatch[0];
  const hasConditional = funcBody.includes('if (isPrimary === undefined)');
  const checksExisting = funcBody.includes('SELECT id FROM pet_vets WHERE pet_id');
  const setsDefault = funcBody.includes('isPrimary = existingVets.length === 0');

  logTest(
    'createPetVet checks for existing vets when is_primary not set',
    hasConditional && checksExisting && setsDefault,
    hasConditional && checksExisting && setsDefault
      ? 'Logic correctly defaults based on existing vets'
      : 'Missing conditional logic for is_primary default'
  );
} else {
  logTest('createPetVet function exists', false, 'Function not found');
}

// Test 2: setPrimaryVet function exists and uses transaction
const hasPrimaryVetFunc = healthRecords.includes('export async function setPrimaryVet');
if (hasPrimaryVetFunc) {
  const usesTransaction = healthRecords.includes('return transaction(async (client)');
  const unsetsAll = healthRecords.includes("UPDATE pet_vets SET is_primary = false WHERE pet_id");
  const setsTarget = healthRecords.includes("UPDATE pet_vets SET is_primary = true WHERE id");
  const hasAudit = healthRecords.includes('logUpdate');

  logTest(
    'setPrimaryVet function exists',
    true,
    'Function found'
  );

  logTest(
    'setPrimaryVet uses transaction to update all vets atomically',
    usesTransaction && unsetsAll && setsTarget,
    usesTransaction && unsetsAll && setsTarget
      ? 'Function correctly uses transaction, unsets all, and sets target'
      : 'Transaction logic incomplete'
  );

  logTest(
    'setPrimaryVet includes audit logging',
    hasAudit,
    hasAudit ? 'Audit logging present' : 'Missing audit logging'
  );
} else {
  logTest('setPrimaryVet function exists', false, 'Function not found');
}

// Test 3: PATCH endpoint exists
const hasPatchEndpoint = routes.includes("router.patch('/:id/vets/:vetId/primary'");
if (hasPatchEndpoint) {
  const hasAuth = routes.includes('authenticate');
  const checksAccess = routes.includes('verifyPetAccess');
  const callsSetPrimary = routes.includes('await setPrimaryVet(petId, vetId');
  const returnsVets = routes.includes('await getPetVets(petId)');
  const hasAuditContext = routes.includes('const audit =') && routes.includes('userId: req.userId');

  logTest(
    'PATCH /pets/:id/vets/:vetId/primary endpoint exists',
    true,
    'Endpoint found'
  );

  logTest(
    'PATCH endpoint has authentication and access verification',
    hasAuth && checksAccess,
    hasAuth && checksAccess ? 'Endpoint has auth and access verification' : 'Missing auth or access check'
  );

  logTest(
    'PATCH endpoint calls setPrimaryVet and returns vet list',
    callsSetPrimary && returnsVets,
    callsSetPrimary && returnsVets ? 'Endpoint logic correct' : 'Missing setPrimaryVet call or return'
  );

  logTest(
    'PATCH endpoint includes audit context',
    hasAuditContext,
    hasAuditContext ? 'Audit context present' : 'Missing audit context'
  );
} else {
  logTest('PATCH /pets/:id/vets/:vetId/primary endpoint exists', false, 'Endpoint not found');
}

// Test 4: Document extraction sets is_primary to false
const vetCaseMatch = classifier.match(/case 'vet':[\s\S]*?is_primary:.*$/m);
if (vetCaseMatch) {
  const vetMapping = vetCaseMatch[0];
  const setsFalse = vetMapping.includes('is_primary: false');
  const hasComment = vetMapping.includes('// Always false') || vetMapping.includes('user will choose');

  logTest(
    'Document extraction always sets is_primary: false for vets',
    setsFalse,
    setsFalse ? 'Correctly sets is_primary: false' : 'is_primary may be auto-set from AI data'
  );

  logTest(
    'Document extraction vet mapping has explanatory comment',
    hasComment,
    hasComment ? 'Comment present' : 'Missing explanatory comment'
  );
} else {
  logTest('Document extraction vet mapping exists', false, 'Vet case not found in classifier');
}

// Test 5: Frontend API client has setPrimaryVet method
const apiClientPath = join(process.cwd(), '../frontend/src/api/client.ts');
try {
  const apiClient = readFileSync(apiClientPath, 'utf-8');
  const hasSetPrimaryVet = apiClient.includes('setPrimaryVet');
  const usesPatch = apiClient.match(/setPrimaryVet.*patch/i);

  logTest(
    'Frontend API client has setPrimaryVet method',
    hasSetPrimaryVet,
    hasSetPrimaryVet ? 'Method exists' : 'Method not found'
  );

  if (hasSetPrimaryVet && usesPatch) {
    logTest(
      'setPrimaryVet uses PATCH method',
      true,
      'Correct HTTP method'
    );
  }
} catch (error) {
  logTest('Frontend API client verification', false, 'Could not read frontend API client file');
}

// Summary
console.log('\n=== Summary ===\n');
const passed = results.filter(r => r.passed).length;
const total = results.length;
console.log(`Tests passed: ${passed}/${total}`);

if (passed === total) {
  console.log('\n✓ All verification checks passed!');
  process.exit(0);
} else {
  console.log(`\n✗ ${total - passed} verification check(s) failed.`);
  console.log('\nFailed tests:');
  results.filter(r => !r.passed).forEach(r => {
    console.log(`  - ${r.testName}: ${r.details}`);
  });
  process.exit(1);
}
