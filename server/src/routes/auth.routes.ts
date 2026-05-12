import { Router } from 'express';
import { login, forgotPassword, resetPassword, getMe } from '../controllers/auth.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();
import rateLimit from 'express-rate-limit';

const forgotPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3, // Limit each IP to 3 forgot password requests per windowMs
    message: { message: 'Too many password reset requests from this IP, please try again after 15 minutes.' }
});

const resetPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 password reset attempts per windowMs
    message: { message: 'Too many password reset attempts from this IP, please try again after 15 minutes.' }
});
router.post('/login', login);
router.post('/forgot-password', forgotPasswordLimiter, forgotPassword);
router.post('/reset-password', resetPasswordLimiter, resetPassword);
router.get('/me', authenticateToken, getMe);  // Returns current user from token

export default router;
