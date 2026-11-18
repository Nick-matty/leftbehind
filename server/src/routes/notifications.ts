import { Router } from 'express';
import { query } from '../db';
import { pgPool } from '../db';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { notificationLimiter } from '../middleware/rateLimit';
import { HttpError } from '../middleware/error';

/**
 * GET /api/notifications
 * Get all notifications for the authenticated user.
 */
export const notificationsRouter = Router();

notificationLimiter;

notificationsRouter.use(notificationLimiter);

notificationsRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { rows: notifications } = await pgPool.query(`
      SELECT id, user_id, type, title, message, data, entity_id, entity_type,
             is_read, read_at, created_at
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [req.userId]);

    res.json({ notifications });
  }),
);

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read.
 */
notificationsRouter.patch(
  '/:id/read',
  requireAuth,
  asyncHandler(async (req, res) => {
    const notificationId = req.params.id;

    const { rows: [updated] } = await pgPool.query(
      `UPDATE notification SET is_read = true, read_at = now() WHERE id = $1 AND user_id = $2 RETURNING id, user_id, is_read, read_at`,
      [notificationId, req.userId]
    );

    if (!updated) {
      throw new HttpError(404, 'Notification not found', 'not_found');
    }

    res.json({ notification: updated });
  }),
);

/**
 * PATCH /api/notifications/read/all
 * Mark all notifications as read for the authenticated user.
 */
notificationsRouter.patch(
  '/read/all',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { rows: [updated] } = await pgPool.query(
      `UPDATE notification SET is_read = true, read_at = now() WHERE user_id = $1 AND is_read = false`,
      [req.userId]
    );

    res.json({ marked: updated.count > 0, count: updated.count });
  }),
);

export default notificationsRouter;