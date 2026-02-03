import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';
import { canUserAddPet, canUserUseFeature } from '../models/user.js';

/**
 * Check if user has premium subscription
 */
export function requirePremium(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.user?.subscription_tier !== 'premium') {
    res.status(402).json({
      error: 'Premium subscription required',
      upgrade_url: '/pricing',
    });
    return;
  }
  next();
}

/**
 * Check pet limit before creating a pet
 */
export async function checkPetLimit(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const result = await canUserAddPet(req.userId);

    if (!result.allowed) {
      res.status(402).json({
        error: result.reason,
        pet_count: result.petCount,
        pet_limit: result.limit,
        upgrade_url: '/pricing',
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Error checking pet limit:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Feature-specific check (factory function)
 * Returns middleware that checks if user can use a specific feature
 */
export function requireFeature(feature: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    try {
      const allowed = await canUserUseFeature(req.userId, feature);

      if (!allowed) {
        res.status(402).json({
          error: `${feature} requires a premium subscription`,
          upgrade_url: '/pricing',
        });
        return;
      }

      next();
    } catch (error) {
      console.error(`Error checking feature access for ${feature}:`, error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}
