import { Router } from 'express';
import { issueCertificate, verifyCertificate, getMyCertificates } from '../controllers/certificate.controller';
import { authenticateToken, requirePermission } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { issueCertificateSchema } from '../validators/schemas';

const router = Router();

router.post('/issue', authenticateToken, requirePermission('ISSUE_CERTIFICATES'), validate({ body: issueCertificateSchema }), issueCertificate);
router.get('/verify/:id', verifyCertificate); // Public
router.get('/my-certificates', authenticateToken, getMyCertificates);

export default router;
