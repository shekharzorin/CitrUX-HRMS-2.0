import { Router } from 'express';
import { handleAiChat } from '../controllers/ai.controller';
import { authenticateToken } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { aiChatSchema } from '../validators/schemas';

const router = Router();

router.use(authenticateToken); // Must be logged in

router.post('/chat', validate({ body: aiChatSchema }), handleAiChat);

export default router;
