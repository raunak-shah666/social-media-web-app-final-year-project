import { Router } from 'express';
import {
  sendMessage,
  getConversations,
  getChatHistory,
} from '../controllers/messages.controller.js';
import { verifyAuth } from '../middlewares/verifyAuth.ts';

const router = Router();

// All message endpoints are protected by authentication
router.use(verifyAuth);

router.post('/', sendMessage);
router.get('/conversations', getConversations);
router.get('/:userId', getChatHistory);

export default router;
