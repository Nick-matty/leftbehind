import { Router } from 'express';
import { query } from '../db';
import { pgPool } from '../db';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { savedPlaceLimiter } from '../middleware/rateLimit';
import { HttpError } from '../middleware/error';

/**
 * POST /api/saved-places
 * Save a place for the authenticated user.
 * Body: { place_id, destination_id, notes }
 * Either place_id or destination_id must be provided.
 */
export const savedPlacesRouter = Router();

savedPlaceLimiter;

savedPlacesRouter.use(savedPlaceLimiter);

savedPlacesRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { place_id, destination_id, notes } = req.body as {
      place_id?: string;
      destination_id?: string;
      notes?: string;
    };

    if (!place_id && !destination_id) {
      throw new HttpError(400, 'Either place_id or destination_id is required', 'missing_params');
    }

    if (place_id && destination_id) {
      throw new HttpError(400, 'Provide either place_id or destination_id, not both', 'conflict');
    }

    // Check if already saved
    const { rows: [existing] } = await query(
      'SELECT id FROM saved_place WHERE user_id = $1 AND (place_id = $2 OR destination_id = $3)',
      [req.userId, place_id, destination_id]
    );

    if (existing) {
      throw new HttpError(409, 'Place is already saved', 'already_saved');
    }

    const { rows: [saved] } = await query(
      `INSERT INTO saved_place (user_id, place_id, destination_id, notes, created_at)
       VALUES ($1, $2, $3, $4, now())
       RETURNING id, user_id, place_id, destination_id, notes, created_at`,
      [req.userId, place_id, destination_id, notes]
    );

    res.status(201).json({ saved_place: saved });
  }),
);

/**
 * DELETE /api/saved-places/:id
 * Remove a saved place for the authenticated user.
 */
savedPlacesRouter.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const savedId = req.params.id;

    const { rows: [deleted] } = await query(
      `DELETE FROM saved_place WHERE id = $1 AND user_id = $2 RETURNING id`,
      [savedId, req.userId]
    );

    if (!deleted) {
      throw new HttpError(404, 'Saved place not found or not yours', 'not_found');
    }

    res.json({ deleted: true });
  }),
);

/**
 * GET /api/saved-places
 * Get all saved places for the authenticated user.
 */
savedPlacesRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { rows: savedPlaces } = await query(`
      SELECT sp.id, sp.user_id, sp.place_id, sp.destination_id, sp.notes,
             sp.created_at,
             p.id, p.slug, p.name, p.kind, p.destination_id, p.latitude, p.longitude,
             p.city, p.country_code, p.summary, p.description, p.hero_image_path,
             p.rating_avg, p.rating_count
      FROM saved_place sp
      JOIN place p ON (sp.place_id = p.id OR sp.destination_id IS NOT NULL)
      WHERE sp.user_id = $1
      ORDER BY sp.created_at DESC
    `, [req.userId]);

    res.json({ saved_places: savedPlaces });
  }),
);

/**
 * POST /api/collections
 * Create a new collection for the authenticated user.
 * Body: { name, description }
 */
savedPlacesRouter.post(
  '/collections',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { name, description } = req.body as { name: string; description?: string };

    if (!name) {
      throw new HttpError(400, 'Collection name is required', 'validation');
    }

    const { rows: [collection] } = await query(
      `INSERT INTO collection (user_id, name, description, created_at)
       VALUES ($1, $2, $3, now())
       RETURNING id, user_id, name, description, created_at`,
      [req.userId, name, description]
    );

    res.status(201).json({ collection });
  }),
);

/**
 * POST /api/collections/:collection_id/items
 * Add a place/item to a collection.
 * Body: { place_id, destination_id, sort_order }
 * Either place_id or destination_id must be provided.
 */
savedPlacesRouter.post(
  '/collections/:collection_id/items',
  requireAuth,
  asyncHandler(async (req, res) => {
    const collectionId = req.params.collection_id;
    const { place_id, destination_id, sort_order } = req.body as {
      place_id?: string;
      destination_id?: string;
      sort_order?: number;
    };

    // Check collection exists and belongs to user
    const { rows: [collection] } = await query(
      `SELECT id FROM collection WHERE id = $1 AND user_id = $2`,
      [collectionId, req.userId]
    );

    if (!collection) {
      throw new HttpError(404, 'Collection not found', 'not_found');
    }

    // Check if already in collection
    const { rows: [existingItem] } = await query(
      `SELECT id FROM collection_item WHERE collection_id = $1 AND (place_id = $2 OR destination_id = $3)`,
      [collectionId, place_id, destination_id]
    );

    if (existingItem) {
      throw new HttpError(409, 'Place is already in this collection', 'already_in_collection');
    }

    const effectiveSort = sort_order !== undefined ? sort_order : 0;

    const { rows: [item] } = await query(
      `INSERT INTO collection_item (collection_id, place_id, destination_id, sort_order, created_at)
       VALUES ($1, $2, $3, $4, now())
       RETURNING id, collection_id, place_id, destination_id, sort_order, created_at`,
      [collectionId, place_id, destination_id, effectiveSort]
    );

    res.status(201).json({ collection_item: item });
  }),
);

/**
 * DELETE /api/collections/:collection_id/items/:item_id
 * Remove an item from a collection.
 */
savedPlacesRouter.delete(
  '/collections/:collection_id/items/:item_id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { collection_id, item_id } = req.params;

    const { rows: [deleted] } = await query(
      `DELETE FROM collection_item WHERE id = $1 AND collection_id = $2 RETURNING id`,
      [item_id, collection_id]
    );

    if (!deleted) {
      throw new HttpError(404, 'Collection item not found', 'not_found');
    }

    res.json({ deleted: true });
  }),
);

/**
 * GET /api/collections
 * Get all collections for the authenticated user with their items.
 */
savedPlacesRouter.get(
  '/collections',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { rows: collections } = await query(`
      SELECT c.id, c.user_id, c.name, c.description, c.created_at,
             json_agg(json_build_object(
               'id', ci.id,
               'place_id', ci.place_id,
               'destination_id', ci.destination_id,
               'sort_order', ci.sort_order,
               'created_at', ci.created_at
             )) as items
      FROM collection c
      LEFT JOIN collection_item ci ON c.id = ci.collection_id
      WHERE c.user_id = $1
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `, [req.userId]);

    res.json({ collections });
  }),
);

export default savedPlacesRouter;