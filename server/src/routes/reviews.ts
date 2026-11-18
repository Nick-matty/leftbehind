import { Router } from 'express';
import { pgPool } from '../db';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { reviewLimiter } from '../middleware/rateLimit';
import { HttpError } from '../middleware/error';

/**
 * POST /api/reviews
 * Create a review for a place or destination.
 * Body: { place_id, destination_id, rating, title, body, visit_date }
 * Either place_id or destination_id must be provided, not both.
 */
export const reviewsRouter = Router();

reviewsRouter.use(reviewLimiter);

reviewsRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { place_id, destination_id, rating, title, body: bodyInput, visit_date } = req.body as {
      place_id?: string;
      destination_id?: string;
      rating: number;
      title?: string;
      body?: string;
      visit_date?: string;
    };

    if (!place_id && !destination_id) {
      throw new HttpError(400, 'Either place_id or destination_id is required', 'missing_params');
    }

    if (place_id && destination_id) {
      throw new HttpError(400, 'Provide either place_id or destination_id, not both', 'conflict');
    }

    if (rating < 1 || rating > 5) {
      throw new HttpError(400, 'Rating must be between 1 and 5', 'validation');
    }

    // Check user hasn't already reviewed this target
    const { rows: [existing] } = await pgPool.query(
      `SELECT id FROM review WHERE user_id = $1 AND (place_id = $2 OR destination_id = $3) AND status = 'published'`,
      [req.userId, place_id, destination_id]
    );

    if (existing) {
      throw new HttpError(409, 'You have already published a review for this target.', 'duplicate_review');
    }

    const { rows: [review] } = await pgPool.query(
      `INSERT INTO review (user_id, place_id, destination_id, rating, title, body, visit_date, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'published', now())
       RETURNING id, user_id, place_id, destination_id, rating, title, body, status, created_at`,
      [req.userId, place_id, destination_id, rating, title, bodyInput, visit_date]
    );

    res.status(201).json({ review });
  }),
);

/**
 * GET /api/reviews
 * List reviews for a place or destination.
 * Query params: place_id, destination_id, page, limit, status
 */
reviewsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    const placeId = (req.query.place_id as string) || undefined;
    const destinationId = (req.query.destination_id as string) || undefined;
    const status = (req.query.status as string) || 'published';

    let whereClause = '';
    let params: any[] = [];

    if (placeId) {
      whereClause += ` WHERE place_id = $1 `;
      params.push(placeId);
    } else if (destinationId) {
      whereClause += ` WHERE destination_id = $1 `;
      params.push(destinationId);
    } else {
      whereClause = ` WHERE status = $1 `;
      params.push(status);
    }

    const countResult = await pgPool.query(`SELECT COUNT(*) FROM review ${whereClause}`, params);
    const reviewsResult = await pgPool.query(
      `SELECT id, user_id, place_id, destination_id, rating, title, body, visit_date, status,
               moderation_note, moderated_by, moderated_at, created_at
         FROM review ${whereClause}
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
      [status, limit, offset],
    );

    res.json({ reviews: reviewsResult.rows, page, limit, total: parseInt(countResult.rows[0].count, 10) });
  }),
);

/**
 * PUT /api/reviews/:id
 * Update a review (author or admin).
 */
reviewsRouter.put(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const reviewId = req.params.id;
    const { rating, title, body: bodyInput } = req.body as { rating?: number; title?: string; body?: string };

    // Check ownership or admin
    const { rows: [existingReview] } = await pgPool.query(
      `SELECT user_id FROM review WHERE id = $1`,
      [reviewId]
    );

    if (!existingReview) {
      throw new HttpError(404, 'Review not found', 'not_found');
    }

    if (existingReview.user_id !== req.userId) {
      throw new HttpError(403, 'Not authorized to update this review', 'forbidden');
    }

    const { rows: [updated] } = await pgPool.query(
      `UPDATE review SET rating = COALESCE($1, rating), title = COALESCE($2, title), body = COALESCE($3, body), updated_at = now() WHERE id = $4 RETURNING id, user_id, place_id, destination_id, rating, title, body, status, created_at`,
      [rating !== undefined ? rating : undefined, title !== undefined ? title : undefined, bodyInput !== undefined ? bodyInput : undefined, reviewId]
    );

    res.json({ review: updated });
  }),
);

/**
 * DELETE /api/reviews/:id
 * Delete a review (author only).
 */
reviewsRouter.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const reviewId = req.params.id;

    // Check ownership
    const { rows: [existingReview] } = await pgPool.query(
      `SELECT user_id FROM review WHERE id = $1`,
      [reviewId]
    );

    if (!existingReview) {
      throw new HttpError(404, 'Review not found', 'not_found');
    }

    if (existingReview.user_id !== req.userId) {
      throw new HttpError(403, 'Not authorized to delete this review', 'forbidden');
    }

    const { rows: [deleted] } = await pgPool.query(
      `DELETE FROM review WHERE id = $1 RETURNING id`,
      [reviewId]
    );

    if (!deleted) {
      throw new HttpError(404, 'Review not found', 'not_found');
    }

    res.json({ deleted: true });
  }),
);

/**
 * GET /api/reviews/average/:entity_id
 * Get average rating for a place or destination.
 * Query param: kind=place|destination
 */
reviewsRouter.get(
  '/average/:entity_id',
  asyncHandler(async (req, res) => {
    const entityId = req.params.entity_id;
    const kind = req.query.kind as 'place' | 'destination' || 'place';

    const { rows: [avgResult] } = await pgPool.query(
      `SELECT COALESCE(AVG(rating)::numeric(3,1), 0) as average_rating, COUNT(*) as rating_count FROM review WHERE ${kind === 'destination' ? 'destination_id' : 'place_id'} = $1 AND status = 'published'`,
      [entityId]
    );

    res.json({ average_rating: parseFloat(avgResult.average_rating), rating_count: parseInt(avgResult.rating_count, 10) });
  }),
);

export default reviewsRouter;