import { Router, type Request, type Response } from 'express';
import {
  signin,
  signup,
  me,
  logout,
  updateUser,
  sendEmailVerificationOTP,
  verifyEmailVerificationOTP,
  sendForgetPasswordOTP,
  verifyForgetPasswordOTP,
  searchUsers,
} from '../controllers/users.controller.js';
import { verifyAuth } from '../middlewares/verifyAuth.ts';
import { upload } from '../lib/multer.ts';

const router = Router();
const publicRouter = Router();
const protectedRouter = Router();

protectedRouter.use(verifyAuth);

publicRouter.post('/signin', signin);
publicRouter.post('/signup', upload.single('image'), signup);
publicRouter.post('/forget-password/send', sendForgetPasswordOTP);
publicRouter.post('/forget-password/verify', verifyForgetPasswordOTP);

protectedRouter.get('/search', searchUsers);
protectedRouter.get('/me', me);
protectedRouter.post('/logout', logout);
protectedRouter.put('/', upload.single('image'), updateUser);
protectedRouter.get('/verify-email', sendEmailVerificationOTP);
protectedRouter.post('/verify-email', verifyEmailVerificationOTP);

router.use(publicRouter);
router.use(protectedRouter);

export default router;
