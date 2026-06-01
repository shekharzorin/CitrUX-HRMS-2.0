import { z } from 'zod';

// At least 8 chars, with lowercase, uppercase, digit, and special character.
// Mirrors the strength check previously inlined in the auth controller.
const strongPassword = z
    .string()
    .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
        'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character.'
    );

export const loginSchema = z.object({
    email: z.string().email('A valid email is required'),
    password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
    email: z.string().email('A valid email is required'),
});

export const resetPasswordSchema = z.object({
    token: z.string().min(1, 'Token is required'),
    uid: z.string().min(1, 'User id is required'),
    newPassword: strongPassword,
});
