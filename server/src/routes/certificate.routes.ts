import { Router } from 'express';
import { issueCertificate, verifyCertificate, getMyCertificates } from '../controllers/certificate.controller';
import { authenticateToken, authorizeRole } from '../middlewares/auth.middleware';

const router = Router();

router.post('/issue', authenticateToken, authorizeRole(['ADMIN', 'HR']), issueCertificate);
router.get('/verify/:id', verifyCertificate); // Public
router.get('/my-certificates', authenticateToken, getMyCertificates);

export default router;
