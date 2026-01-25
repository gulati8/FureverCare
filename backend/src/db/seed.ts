/**
 * Seed script for FureverCare sample data
 *
 * Creates 5 users with realistic names and 7 pets:
 * - User 1 (Sarah Chen): 1 pet (Golden Retriever)
 * - User 2 (Marcus Johnson): 1 pet (Tabby Cat)
 * - User 3 (Emily Rodriguez): 2 pets (Labrador + Siamese Cat)
 * - User 4 & 5 (James Wilson & Priya Sharma): shared 3 pets (Corgi, Beagle, Maine Coon)
 */

import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { pool, query, queryOne } from './pool.js';

interface SeedUser {
  email: string;
  password: string;
  name: string;
  phone: string;
}

interface SeedPet {
  name: string;
  species: string;
  breed: string;
  date_of_birth: string;
  weight_kg: number;
  sex: string;
  microchip_id: string;
  photo_url: string;
  special_instructions: string;
}

// Realistic sample users
const users: SeedUser[] = [
  {
    email: 'sarah.chen@example.com',
    password: 'FureverCare2024!',
    name: 'Sarah Chen',
    phone: '(415) 555-0123',
  },
  {
    email: 'marcus.johnson@example.com',
    password: 'FureverCare2024!',
    name: 'Marcus Johnson',
    phone: '(312) 555-0456',
  },
  {
    email: 'emily.rodriguez@example.com',
    password: 'FureverCare2024!',
    name: 'Emily Rodriguez',
    phone: '(512) 555-0789',
  },
  {
    email: 'james.wilson@example.com',
    password: 'FureverCare2024!',
    name: 'James Wilson',
    phone: '(206) 555-0321',
  },
  {
    email: 'priya.sharma@example.com',
    password: 'FureverCare2024!',
    name: 'Priya Sharma',
    phone: '(650) 555-0654',
  },
];

// Realistic sample pets with AI-generated photo URLs from Unsplash
const pets: SeedPet[] = [
  // Pet for Sarah Chen (User 1)
  {
    name: 'Biscuit',
    species: 'Dog',
    breed: 'Golden Retriever',
    date_of_birth: '2021-03-15',
    weight_kg: 29.5,
    sex: 'Male',
    microchip_id: '985141000123456',
    photo_url: 'https://images.unsplash.com/photo-1633722715463-d30f4f325e24?w=400&h=400&fit=crop',
    special_instructions: 'Allergic to chicken-based treats. Loves belly rubs and playing fetch. Gets anxious during thunderstorms - needs comfort.',
  },
  // Pet for Marcus Johnson (User 2)
  {
    name: 'Whiskers',
    species: 'Cat',
    breed: 'Domestic Shorthair (Tabby)',
    date_of_birth: '2020-07-22',
    weight_kg: 4.8,
    sex: 'Female',
    microchip_id: '985141000234567',
    photo_url: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=400&h=400&fit=crop',
    special_instructions: 'Indoor only. Requires daily medication for hyperthyroidism (methimazole 2.5mg twice daily). Very affectionate but shy with strangers.',
  },
  // Pets for Emily Rodriguez (User 3) - 2 pets
  {
    name: 'Duke',
    species: 'Dog',
    breed: 'Labrador Retriever',
    date_of_birth: '2019-11-08',
    weight_kg: 32.0,
    sex: 'Male',
    microchip_id: '985141000345678',
    photo_url: 'https://images.unsplash.com/photo-1591769225440-811ad7d6eab3?w=400&h=400&fit=crop',
    special_instructions: 'Hip dysplasia - on joint supplements (Cosequin DS). No jumping or stairs. Loves swimming. Very food motivated for training.',
  },
  {
    name: 'Luna',
    species: 'Cat',
    breed: 'Siamese',
    date_of_birth: '2022-01-30',
    weight_kg: 3.9,
    sex: 'Female',
    microchip_id: '985141000456789',
    photo_url: 'https://images.unsplash.com/photo-1568152950566-c1bf43f4ab28?w=400&h=400&fit=crop',
    special_instructions: 'Very vocal and social. Needs interactive play daily (feather wands are her favorite). Grain-free diet only.',
  },
  // Shared pets for James Wilson & Priya Sharma (Users 4 & 5) - 3 pets
  {
    name: 'Cheddar',
    species: 'Dog',
    breed: 'Pembroke Welsh Corgi',
    date_of_birth: '2022-05-12',
    weight_kg: 12.3,
    sex: 'Male',
    microchip_id: '985141000567890',
    photo_url: 'https://images.unsplash.com/photo-1612536057832-2ff7ead58194?w=400&h=400&fit=crop',
    special_instructions: 'High energy - needs minimum 2 walks daily. Prone to back issues, no jumping from heights. Knows commands: sit, stay, come, paw.',
  },
  {
    name: 'Maple',
    species: 'Dog',
    breed: 'Beagle',
    date_of_birth: '2021-09-03',
    weight_kg: 10.2,
    sex: 'Female',
    microchip_id: '985141000678901',
    photo_url: 'https://images.unsplash.com/photo-1505628346881-b72b27e84530?w=400&h=400&fit=crop',
    special_instructions: 'Strong prey drive - always leash outdoors. Food allergies (no beef or dairy). Expert escape artist - check fence/gate security.',
  },
  {
    name: 'Oliver',
    species: 'Cat',
    breed: 'Maine Coon',
    date_of_birth: '2020-12-25',
    weight_kg: 7.8,
    sex: 'Male',
    microchip_id: '985141000789012',
    photo_url: 'https://images.unsplash.com/photo-1615796153287-98eacf0abb13?w=400&h=400&fit=crop',
    special_instructions: 'Long coat requires daily brushing. Very gentle giant - great with kids. Needs puzzle feeders for mental stimulation. Indoor/outdoor with catio access.',
  },
];

async function seed() {
  console.log('🌱 Starting FureverCare seed...\n');

  try {
    // Create users
    console.log('👥 Creating users...');
    const createdUsers: { id: number; email: string; name: string }[] = [];

    for (const user of users) {
      // Check if user already exists
      const existing = await queryOne<{ id: number }>(
        'SELECT id FROM users WHERE email = $1',
        [user.email.toLowerCase()]
      );

      if (existing) {
        console.log(`  ⏭️  User ${user.name} already exists (id: ${existing.id})`);
        createdUsers.push({ id: existing.id, email: user.email, name: user.name });
        continue;
      }

      const passwordHash = await bcrypt.hash(user.password, 12);
      const result = await queryOne<{ id: number; email: string; name: string }>(
        `INSERT INTO users (email, password_hash, name, phone)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, name`,
        [user.email.toLowerCase(), passwordHash, user.name, user.phone]
      );

      if (result) {
        createdUsers.push(result);
        console.log(`  ✅ Created user: ${user.name} (id: ${result.id})`);
      }
    }

    // Create pets and ownership relationships
    console.log('\n🐾 Creating pets and ownership...');
    const createdPets: { id: number; name: string; share_id: string }[] = [];

    // Pet distribution:
    // pets[0] -> users[0] (Sarah Chen)
    // pets[1] -> users[1] (Marcus Johnson)
    // pets[2], pets[3] -> users[2] (Emily Rodriguez)
    // pets[4], pets[5], pets[6] -> users[3] & users[4] (James & Priya) - shared

    const petOwnershipMap = [
      { petIndex: 0, ownerIndices: [0] },           // Biscuit -> Sarah
      { petIndex: 1, ownerIndices: [1] },           // Whiskers -> Marcus
      { petIndex: 2, ownerIndices: [2] },           // Duke -> Emily
      { petIndex: 3, ownerIndices: [2] },           // Luna -> Emily
      { petIndex: 4, ownerIndices: [3, 4] },        // Cheddar -> James (owner) & Priya (editor)
      { petIndex: 5, ownerIndices: [3, 4] },        // Maple -> James (owner) & Priya (editor)
      { petIndex: 6, ownerIndices: [4, 3] },        // Oliver -> Priya (owner) & James (editor)
    ];

    for (const mapping of petOwnershipMap) {
      const pet = pets[mapping.petIndex];
      const primaryOwner = createdUsers[mapping.ownerIndices[0]];

      // Check if pet already exists (by microchip_id)
      const existing = await queryOne<{ id: number; share_id: string }>(
        'SELECT id, share_id FROM pets WHERE microchip_id = $1',
        [pet.microchip_id]
      );

      let petId: number;
      let shareId: string;

      if (existing) {
        console.log(`  ⏭️  Pet ${pet.name} already exists (id: ${existing.id})`);
        petId = existing.id;
        shareId = existing.share_id;
      } else {
        shareId = nanoid();
        const result = await queryOne<{ id: number }>(
          `INSERT INTO pets (user_id, share_id, name, species, breed, date_of_birth, weight_kg, sex, microchip_id, photo_url, special_instructions)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           RETURNING id`,
          [
            primaryOwner.id,
            shareId,
            pet.name,
            pet.species,
            pet.breed,
            pet.date_of_birth,
            pet.weight_kg,
            pet.sex,
            pet.microchip_id,
            pet.photo_url,
            pet.special_instructions,
          ]
        );

        if (!result) {
          console.log(`  ❌ Failed to create pet: ${pet.name}`);
          continue;
        }

        petId = result.id;
        console.log(`  ✅ Created pet: ${pet.name} (${pet.breed}) - id: ${petId}`);
      }

      createdPets.push({ id: petId, name: pet.name, share_id: shareId });

      // Set up ownership relationships
      for (let i = 0; i < mapping.ownerIndices.length; i++) {
        const ownerIndex = mapping.ownerIndices[i];
        const user = createdUsers[ownerIndex];
        const role = i === 0 ? 'owner' : 'editor';

        // Check if ownership already exists
        const existingOwnership = await queryOne<{ id: number }>(
          'SELECT id FROM pet_owners WHERE pet_id = $1 AND user_id = $2',
          [petId, user.id]
        );

        if (existingOwnership) {
          console.log(`     ⏭️  Ownership already exists: ${user.name} -> ${pet.name}`);
          continue;
        }

        await query(
          `INSERT INTO pet_owners (pet_id, user_id, role, invited_by, accepted_at)
           VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
          [petId, user.id, role, i === 0 ? null : createdUsers[mapping.ownerIndices[0]].id]
        );

        console.log(`     👤 Added ${role}: ${user.name} -> ${pet.name}`);
      }
    }

    // Summary
    console.log('\n📊 Seed Summary:');
    console.log('─'.repeat(50));
    console.log(`Users created: ${createdUsers.length}`);
    console.log(`Pets created: ${createdPets.length}`);
    console.log('\n📧 Login credentials (all use same password):');
    console.log('   Password: FureverCare2024!');
    console.log('   Emails:');
    for (const user of createdUsers) {
      console.log(`   - ${user.email}`);
    }
    console.log('\n🔗 Pet share links:');
    for (const pet of createdPets) {
      console.log(`   - ${pet.name}: /pet/${pet.share_id}`);
    }

    console.log('\n✨ Seed completed successfully!');
  } catch (error) {
    console.error('\n❌ Seed failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run seed
seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
