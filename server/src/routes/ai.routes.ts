import { Router } from 'express';
import { handleAiChat } from '../controllers/ai.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken); // Must be logged in

router.post('/chat', handleAiChat);

export default router;
