import { Router } from 'express';
import { pgPool } from '../db';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { placeLimiter } from '../middleware/rateLimit';
import { HttpError } from '../middleware/error';

/**
 * GET /api/places
 * List places with optional filtering by destination, kind, search.
 * Query params: q (search), destination_id, kind, page, limit
 */
export const placesRouter = Router();

placeLimiter;

placesRouter.use(placeLimiter);

placesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    const search = (req.query.q as string) || undefined;
    const destinationId = (req.query.destination_id as string) || undefined;
    const kind = (req.query.kind as string) || undefined;

    let results;
    let total = 0;

    if (search || destinationId || kind) {
      // Use search_places RPC via pgPool directly
      const kindFilter = kind ? ` AND kind = '${kind}' ` : '';

      // Get count
      const countResult = await pgPool.query(
        `SELECT COUNT(*) FROM search_places(
          ${search ? `'${search}'::text, ` : 'NULL::text, '}
          ${destinationId ? `'${destinationId}'::uuid, ` : 'NULL::uuid, '}
          ${kind ? `'${kind}'::text, ` : 'NULL::text, '}
          1,
          0
        ) AS results(id TEXT)`
      );

      // Get results
      const rpcQuery = `
        SELECT * FROM search_places(
          ${search ? `'${search}'::text, ` : 'NULL::text, '}
          ${destinationId ? `'${destinationId}'::uuid, ` : 'NULL::uuid, '}
          ${kind ? `'${kind}'::text, ` : 'NULL::text, '}
          ${limit},
          ${offset}
        ) AS results(id TEXT, slug TEXT, name TEXT, kind TEXT, destination_id UUID?, latitude FLOAT8, longitude FLOAT8, city TEXT, country_code CHAR(2), description TEXT, rating_avg FLOAT, rating_count INT, price_level INT, data_source TEXT, status TEXT, featured BOOLEAN, opening_hours JSONB, created_at TEXT)
      `;

      const rpcResult = await pgPool.query(rpcQuery);

      total = parseInt(countResult.rows[0].count, 10);
      results = rpcResult.rows;
    } else {
      // Simple list
      const countResult = await pgPool.query('SELECT COUNT(*) FROM places');

      const listResult = await pgPool.query(`
        SELECT id, slug, name, kind, destination_id, latitude, longitude,
               city, country_code, address_line, description, rating_avg, rating_count,
               price_level, data_source, status, featured, opening_hours, created_at
        FROM places
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset]);

      total = parseInt(countResult.rows[0].count, 10);
      results = listResult.rows;
    }

    res.json({ places: results, page, limit, total });
  }),
);

/**
 * GET /api/places/:slug
 * Get place details by slug.
 */
placesRouter.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const { rows: [place] } = await pgPool.query(`
      SELECT id, slug, name, kind, destination_id, latitude, longitude,
             city, country_code, address_line, description, rating_avg, rating_count,
             price_level, currency, data_source, status, featured, opening_hours,
             phone, website, price_note, source_place_id, last_synced_at, created_at
      FROM places
      WHERE slug = $1
    `, [req.params.slug]);

    if (!place) {
      throw new HttpError(404, 'Place not found', 'not_found');
    }

    res.json({ place });
  }),
);

/**
 * GET /api/places/nearby
 * Get places near given coordinates (uses PostGIS via RPC).
 * Query params: lat, lng, radius_km (default 50), limit (default 20)
 */
placesRouter.get(
  '/nearby',
  asyncHandler(async (req, res) => {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radiusKm = Number(req.query.radius_km) || 50;
    const limit = Math.min(Number(req.query.limit) || 20, 100);

    if (isNaN(lat) || isNaN(lng)) {
      throw new HttpError(400, 'lat and lng query parameters are required', 'missing_params');
    }

    const { rows: results } = await pgPool.query(`
      SELECT * FROM nearby_places(
        ${lat}::float8,
        ${lng}::float8,
        ${radiusKm}::float8,
        ${limit}
      ) AS results(id TEXT, slug TEXT, name TEXT, kind TEXT, destination_id UUID?,
                   latitude FLOAT8, longitude FLOAT8, city TEXT, country_code CHAR(2),
                   summary TEXT, description TEXT, hero_image_path TEXT, status TEXT,
                   featured BOOLEAN, popularity INT, rating_avg FLOAT, rating_count INT,
                   distance_km FLOAT8)
    `);

    res.json({ places: results });
  }),
);

export default placesRouter;