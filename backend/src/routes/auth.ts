import { Router, Response } from 'express';
import { z } from 'zod';
import {
  createUser,
  findUserByEmail,
  findUserById,
  verifyPassword,
  updateUser,
  createPasswordResetToken,
  findValidPasswordResetToken,
  usePasswordResetToken,
  updateUserPassword,
} from '../models/user.js';
import { generateToken, authenticate, AuthRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { sendEmail, generatePasswordResetEmail } from '../services/email.js';
import { config } from '../config/index.js';

const router = Router();

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

// Register
router.post('/register', validate(registerSchema), async (req, res: Response) => {
  try {
    const { email, password, name, phone } = req.body;

    const existing = await findUserByEmail(email);
    if (existing) {
      res.status(400).json({ error: 'Email already registered' });
      return;
    }

    const user = await createUser({ email, password, name, phone });
    const token = generateToken(user);

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
      },
      token,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', validate(loginSchema), async (req, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await findUserByEmail(email);
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const isValid = await verifyPassword(user, password);
    if (!isValid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = generateToken(user);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
  });
});

// Update profile
router.patch('/me', authenticate, validate(updateProfileSchema), async (req: AuthRequest, res: Response) => {
  try {
    const updated = await updateUser(req.userId!, req.body);
    if (!updated) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      id: updated.id,
      email: updated.email,
      name: updated.name,
      phone: updated.phone,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Update failed' });
  }
});

// Change password (for authenticated users)
router.post('/change-password', authenticate, validate(changePasswordSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await findUserById(req.userId!);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Verify current password
    const isValid = await verifyPassword(user, currentPassword);
    if (!isValid) {
      res.status(401).json({ error: 'Current password is incorrect' });
      return;
    }

    // Update password
    await updateUserPassword(user.id, newPassword);

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Request password reset
router.post('/forgot-password', validate(forgotPasswordSchema), async (req, res: Response) => {
  try {
    const { email } = req.body;

    const user = await findUserByEmail(email);

    // Always return success to prevent email enumeration
    if (!user) {
      res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
      return;
    }

    const token = await createPasswordResetToken(user.id);
    const resetUrl = `${config.frontend.url}/reset-password?token=${token}`;

    const emailContent = generatePasswordResetEmail(resetUrl, user.name);

    await sendEmail({
      to: user.email,
      subject: emailContent.subject,
      textBody: emailContent.textBody,
      htmlBody: emailContent.htmlBody,
    });

    res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// Reset password with token
router.post('/reset-password', validate(resetPasswordSchema), async (req, res: Response) => {
  try {
    const { token, password } = req.body;

    const resetToken = await findValidPasswordResetToken(token);

    if (!resetToken) {
      res.status(400).json({ error: 'Invalid or expired reset token' });
      return;
    }

    // Update the password
    const passwordUpdated = await updateUserPassword(resetToken.user_id, password);

    if (!passwordUpdated) {
      res.status(500).json({ error: 'Failed to update password' });
      return;
    }

    // Mark the token as used
    await usePasswordResetToken(token);

    // Get the user for response
    const user = await findUserById(resetToken.user_id);

    if (!user) {
      res.status(500).json({ error: 'User not found' });
      return;
    }

    // Generate a new login token
    const authToken = generateToken(user);

    res.json({
      message: 'Password has been reset successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
      },
      token: authToken,
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Validate reset token (for checking if token is still valid)
router.get('/reset-password/:token', async (req, res: Response) => {
  try {
    const { token } = req.params;

    const resetToken = await findValidPasswordResetToken(token);

    if (!resetToken) {
      res.status(400).json({ valid: false, error: 'Invalid or expired reset token' });
      return;
    }

    res.json({ valid: true });
  } catch (error) {
    console.error('Validate reset token error:', error);
    res.status(500).json({ valid: false, error: 'Failed to validate token' });
  }
});

export default router;
