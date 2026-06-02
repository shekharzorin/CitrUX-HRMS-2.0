import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { requirePermission } from '../../shared/auth';
import { validate } from '../../middlewares/validate.middleware';
import { createQueueSchema, updateQueueSchema } from './support-department.validators';
import {
    createTicketSchema, createCategorySchema, updateCategorySchema,
    createCommentSchema, changeStatusSchema, assignSchema,
} from './ticket.validators';
import {
    listDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    restoreDepartment,
} from './support-department.controller';
import { listCategories, createCategory, updateCategory, deleteCategory } from './ticket-category.controller';
import {
    createTicket, listTickets, getTicket,
    changeTicketStatus, assignTicket, unassignTicket, assignTicketToMe,
} from './ticket.controller';
import { listComments, createComment } from './comment.controller';

// Mounted at /api/support behind authenticateToken + requireFeature('SUPPORT_DESK').
const router = Router();

// Ticket attachments: in-memory (streamed to Cloudinary by UploadService),
// images/PDF only, bounded count + size; multer errors surface as 400.
const attachmentUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024, files: 5 },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') return cb(null, true);
        cb(new Error('Only images and PDF files are allowed'));
    },
});
const withAttachments = (req: Request, res: Response, next: NextFunction) =>
    attachmentUpload.array('files', 5)(req, res, (err: any) =>
        err ? res.status(400).json({ message: err.message || 'File upload failed' }) : next());

// ── Support queues ─────────────────────────────────────────────────────────
router.get('/departments', listDepartments);
router.post('/departments', requirePermission('MANAGE_SUPPORT_DEPARTMENTS'), validate({ body: createQueueSchema }), createDepartment);
router.put('/departments/:id', requirePermission('MANAGE_SUPPORT_DEPARTMENTS'), validate({ body: updateQueueSchema }), updateDepartment);
router.delete('/departments/:id', requirePermission('MANAGE_SUPPORT_DEPARTMENTS'), deleteDepartment);
router.post('/departments/:id/restore', requirePermission('MANAGE_SUPPORT_DEPARTMENTS'), restoreDepartment);

// ── Categories (scoped under a queue) ────────────────────────────────────────
router.get('/departments/:deptId/categories', listCategories);
router.post('/departments/:deptId/categories', requirePermission('MANAGE_TICKET_CATEGORIES'), validate({ body: createCategorySchema }), createCategory);
router.put('/categories/:id', requirePermission('MANAGE_TICKET_CATEGORIES'), validate({ body: updateCategorySchema }), updateCategory);
router.delete('/categories/:id', requirePermission('MANAGE_TICKET_CATEGORIES'), deleteCategory);

// ── Tickets ──────────────────────────────────────────────────────────────────
router.post('/tickets', requirePermission('CREATE_TICKETS'), withAttachments, validate({ body: createTicketSchema }), createTicket);
router.get('/tickets', requirePermission('VIEW_TICKETS'), listTickets);
router.get('/tickets/:id', requirePermission('VIEW_TICKETS'), getTicket);

// Status transitions (service enforces agent vs requester-reopen).
router.post('/tickets/:id/status', requirePermission('VIEW_TICKETS'), validate({ body: changeStatusSchema }), changeTicketStatus);

// Assignment (agents).
router.post('/tickets/:id/assign', requirePermission('MANAGE_TICKETS'), validate({ body: assignSchema }), assignTicket);
router.post('/tickets/:id/unassign', requirePermission('MANAGE_TICKETS'), unassignTicket);
router.post('/tickets/:id/assign-to-me', requirePermission('MANAGE_TICKETS'), assignTicketToMe);

// Comments (withAttachments tolerates JSON too; visibility enforced in service).
router.get('/tickets/:id/comments', requirePermission('VIEW_TICKETS'), listComments);
router.post('/tickets/:id/comments', requirePermission('VIEW_TICKETS'), withAttachments, validate({ body: createCommentSchema }), createComment);

export default router;
