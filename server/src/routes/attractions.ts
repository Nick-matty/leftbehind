import { Router } from 'express';
import { pgPool } from '../db';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { attractionLimiter } from '../middleware/rateLimit';
import { HttpError } from '../middleware/error';

/**
 * GET /api/attractions
 * List attractions with optional filtering by destination, country, city, category.
 * Query params: q (search), destination_id, country_code, city, kind, page, limit
 */
export const attractionsRouter = Router();

attractionLimiter;

attractionsRouter.use(attractionLimiter);

attractionsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    const search = (req.query.q as string) || undefined;
    const destinationId = (req.query.destination_id as string) || undefined;
    const countryCode = (req.query.country_code as string) || undefined;
    const city = (req.query.city as string) || undefined;
    const kind = (req.query.kind as string) || undefined;

    // Build WHERE clause for the query
    let whereConditions: string[] = ['status = \'published\'::moderation_status'];
    const queryParams: any[] = [];

    if (search) {
      whereConditions.push(`(name ILIKE $${queryParams.length + 1} OR slug ILIKE $${queryParams.length + 1})`);
      queryParams.push(`%${search}%`);
    }
    if (destinationId) {
      whereConditions.push(`destination_id = $${queryParams.length + 1}`);
      queryParams.push(destinationId);
    }
    if (countryCode) {
      whereConditions.push(`country_code = $${queryParams.length + 1}`);
      queryParams.push(countryCode);
    }
    if (city) {
      whereConditions.push(`city ILIKE $${queryParams.length + 1}`);
      queryParams.push(`%${city}%`);
    }
    if (kind) {
      whereConditions.push(`kind::text = $${queryParams.length + 1}`);
      queryParams.push(kind);
    }

    const whereClause = whereConditions.join(' AND ');

    // Get count
    const countResult = await pgPool.query(
      `SELECT COUNT(*) FROM places WHERE ${whereClause}`,
      queryParams
    );

    // Get results
    const resultsResult = await pgPool.query(
      `SELECT id, slug, name, kind, destination_id, latitude, longitude,
              city, country_code, description, hero_image_path,
              status, featured, popularity, rating_avg, rating_count
       FROM places
       WHERE ${whereClause}
       ORDER BY popularity DESC, created_at DESC
       LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`,
      [...queryParams, limit, offset]
    );

    const total = parseInt(countResult.rows[0].count, 10);
    res.json({ attractions: resultsResult.rows, page, limit, total });
  })
);

/** 
 * GET /api/attractions/:slug
 * Get attraction details by slug.
 */
attractionsRouter.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const { slug } = req.params;

    const result = await pgPool.query(
      `SELECT id, slug, name, kind, destination_id, latitude, longitude,
              city, country_code, description, hero_image_path,
              status, featured, popularity, rating_avg, rating_count
       FROM places
       WHERE slug = $1`,
      [slug]
    );

    if (result.rows.length === 0) {
      throw new HttpError(404, 'Attraction not found', 'not_found');
    }

    res.json({ attraction: result.rows[0] });
  })
);