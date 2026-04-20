import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { config } from '../config/index.js';
import { prisma } from '../db/prisma.js';
import { stripUndefined } from './prisma-helpers.js';

export type SubscriptionStatus = 'free' | 'trialing' | 'active' | 'past_due' | 'canceled';
export type SubscriptionTier = 'free' | 'premium';

export interface User {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  phone: string | null;
  is_admin: boolean;
  stripe_customer_id: string | null;
  subscription_status: SubscriptionStatus;
  subscription_tier: SubscriptionTier;
  subscription_current_period_end: Date | null;
  subscription_stripe_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserInput {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const passwordHash = await bcrypt.hash(input.password, 12);

  const result = await prisma.users.create({
    data: {
      email: input.email.toLowerCase(),
      password_hash: passwordHash,
      name: input.name,
      phone: input.phone || null,
    },
  });

  return result as User;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  return prisma.users.findUnique({
    where: {
      email: email.toLowerCase(),
    },
  }) as Promise<User | null>;
}

export async function findUserById(id: number): Promise<User | null> {
  return prisma.users.findUnique({
    where: {
      id,
    },
  }) as Promise<User | null>;
}

export async function verifyPassword(user: User, password: string): Promise<boolean> {
  return bcrypt.compare(password, user.password_hash);
}

export async function updateUser(id: number, updates: Partial<Pick<User, 'name' | 'phone'>>): Promise<User | null> {
  const data = stripUndefined({
    name: updates.name,
    phone: updates.phone,
    updated_at: new Date(),
  });

  if (Object.keys(data).length === 1) {
    return findUserById(id);
  }

  const users = await prisma.users.updateManyAndReturn({
    where: {
      id,
    },
    data,
  });

  return (users[0] as User | undefined) ?? null;
}

// Password reset functions

export interface PasswordResetToken {
  id: number;
  user_id: number;
  token: string;
  expires_at: Date;
  used_at: Date | null;
  created_at: Date;
}

export async function createPasswordResetToken(userId: number): Promise<string> {
  // Invalidate any existing unused tokens for this user
  await prisma.password_reset_tokens.updateMany({
    where: {
      user_id: userId,
      used_at: null,
    },
    data: {
      used_at: new Date(),
    },
  });

  // Generate a secure random token
  const token = crypto.randomBytes(32).toString('hex');

  // Calculate expiry time
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + config.passwordReset.tokenExpiryMinutes);

  await prisma.password_reset_tokens.create({
    data: {
      user_id: userId,
      token,
      expires_at: expiresAt,
    },
  });

  return token;
}

export async function findValidPasswordResetToken(token: string): Promise<PasswordResetToken | null> {
  return prisma.password_reset_tokens.findFirst({
    where: {
      token,
      expires_at: {
        gt: new Date(),
      },
      used_at: null,
    },
  }) as Promise<PasswordResetToken | null>;
}

export async function usePasswordResetToken(token: string): Promise<boolean> {
  const result = await prisma.password_reset_tokens.updateMany({
    where: {
      token,
      expires_at: {
        gt: new Date(),
      },
      used_at: null,
    },
    data: {
      used_at: new Date(),
    },
  });

  return result.count > 0;
}

export async function updateUserPassword(userId: number, newPassword: string): Promise<boolean> {
  const passwordHash = await bcrypt.hash(newPassword, 12);

  const result = await prisma.users.updateMany({
    where: {
      id: userId,
    },
    data: {
      password_hash: passwordHash,
      updated_at: new Date(),
    },
  });

  return result.count > 0;
}

// Subscription-related functions

export interface SubscriptionUpdates {
  stripe_customer_id?: string;
  subscription_status?: SubscriptionStatus;
  subscription_tier?: SubscriptionTier;
  subscription_current_period_end?: Date | null;
  subscription_stripe_id?: string | null;
}

export interface SubscriptionInfo {
  subscription_status: SubscriptionStatus;
  subscription_tier: SubscriptionTier;
  subscription_current_period_end: Date | null;
  subscription_stripe_id: string | null;
  stripe_customer_id: string | null;
}

export async function updateSubscription(userId: number, updates: SubscriptionUpdates): Promise<User> {
  const data = stripUndefined({
    stripe_customer_id: updates.stripe_customer_id,
    subscription_status: updates.subscription_status,
    subscription_tier: updates.subscription_tier,
    subscription_current_period_end: updates.subscription_current_period_end,
    subscription_stripe_id: updates.subscription_stripe_id,
    updated_at: new Date(),
  });

  if (Object.keys(data).length === 1) {
    const user = await findUserById(userId);
    if (!user) throw new Error('User not found');
    return user;
  }

  const users = await prisma.users.updateManyAndReturn({
    where: {
      id: userId,
    },
    data,
  });
  const result = users[0];

  if (!result) throw new Error('User not found');
  return result as User;
}

export async function findUserByStripeCustomerId(stripeCustomerId: string): Promise<User | null> {
  return prisma.users.findFirst({
    where: {
      stripe_customer_id: stripeCustomerId,
    },
  }) as Promise<User | null>;
}

export async function getUserSubscriptionInfo(userId: number): Promise<SubscriptionInfo> {
  const result = await prisma.users.findUnique({
    where: {
      id: userId,
    },
    select: {
      subscription_status: true,
      subscription_tier: true,
      subscription_current_period_end: true,
      subscription_stripe_id: true,
      stripe_customer_id: true,
    },
  });

  if (!result) {
    return {
      subscription_status: 'free',
      subscription_tier: 'free',
      subscription_current_period_end: null,
      subscription_stripe_id: null,
      stripe_customer_id: null,
    };
  }

  return {
    subscription_status: (result.subscription_status as SubscriptionStatus | null) ?? 'free',
    subscription_tier: (result.subscription_tier as SubscriptionTier | null) ?? 'free',
    subscription_current_period_end: result.subscription_current_period_end,
    subscription_stripe_id: result.subscription_stripe_id,
    stripe_customer_id: result.stripe_customer_id,
  };
}

const FREE_TIER_PET_LIMIT = Infinity; // Beta: unlimited pets for all users
const PREMIUM_FEATURES = ['upload', 'timeline', 'shared_ownership'];

export async function canUserAddPet(userId: number): Promise<{allowed: boolean, reason?: string, petCount: number, limit: number}> {
  const user = await findUserById(userId);
  if (!user) {
    return { allowed: false, reason: 'User not found', petCount: 0, limit: 0 };
  }

  // Premium users have unlimited pets
  if (user.subscription_tier === 'premium') {
    const petCount = await prisma.pets.count({
      where: {
        user_id: userId,
      },
    });
    return { allowed: true, petCount, limit: Infinity };
  }

  // Free tier users have a pet limit
  const petCount = await prisma.pets.count({
    where: {
      user_id: userId,
    },
  });

  if (petCount >= FREE_TIER_PET_LIMIT) {
    return {
      allowed: false,
      reason: `Free tier limited to ${FREE_TIER_PET_LIMIT} pet. Upgrade to premium for unlimited pets.`,
      petCount,
      limit: FREE_TIER_PET_LIMIT,
    };
  }

  return { allowed: true, petCount, limit: FREE_TIER_PET_LIMIT };
}

export async function canUserUseFeature(userId: number, feature: string): Promise<boolean> {
  // If not a premium feature, allow all users
  if (!PREMIUM_FEATURES.includes(feature)) {
    return true;
  }

  const user = await findUserById(userId);
  if (!user) {
    return false;
  }

  // Beta: all features available to all users
  return true;
}
