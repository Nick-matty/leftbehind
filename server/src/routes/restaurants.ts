import { Router } from 'express';
import { pgPool } from '../db';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { restaurantLimiter } from '../middleware/rateLimit';
import { HttpError } from '../middleware/error';

/**
 * GET /api/restaurants
 * List restaurants with optional filtering by destination, location search.
 * Query params: q (search), destination_id, lat/lng with radius_km, page, limit
 */
export const restaurantsRouter = Router();

restaurantLimiter;

restaurantsRouter.use(restaurantLimiter);

restaurantsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    const search = (req.query.q as string) || undefined;
    const destinationId = (req.query.destination_id as string) || undefined;

    let results;
    let total = 0;

    if (search || destinationId) {
      // Use RPC-style query via nearby_places with kind filter via pgPool directly
      const kindFilter = 'kind = \'restaurant\'';

      // Get count
      const countResult = await pgPool.query(
        `SELECT COUNT(*) FROM nearby_places(
          NULL::text, NULL::text, NULL::text,
          ${limit + 20}::float8
        ) AS results(id TEXT) WHERE ${kindFilter}`
      );

      // Get results
      const rpcResult = await pgPool.query(`
        SELECT * FROM nearby_places(
          NULL::text, NULL::text, NULL::text,
          ${limit + 20}::float8
        ) AS results(id TEXT, slug TEXT, name TEXT, kind TEXT, destination_id UUID?,
                     latitude FLOAT8, longitude FLOAT8, city TEXT, country_code CHAR(2),
                     summary TEXT, description TEXT, hero_image_path TEXT, status TEXT,
                     featured BOOLEAN, popularity INT, rating_avg FLOAT, rating_count INT,
                     distance_km FLOAT8)
        WHERE ${kindFilter}
        ORDER BY distance_km NULLS LAST, popularity DESC
        LIMIT ${limit} OFFSET ${offset}
      `);

      total = parseInt(countResult.rows[0].count, 10);
      results = rpcResult.rows;
    } else {
      // Simple list by destination or general list
      if (destinationId) {
        // Get count
        const countResult = await pgPool.query(
          'SELECT COUNT(*) FROM places WHERE kind = $1 AND destination_id = $2',
          ['restaurant', destinationId]
        );

        // Get results
        const listResult = await pgPool.query(`
          SELECT id, slug, name, kind, destination_id, latitude, longitude,
                 city, country_code, address_line, description, rating_avg, rating_count,
                 price_level, currency, data_source, status, featured, opening_hours, created_at
          FROM places
          WHERE kind = $1 AND destination_id = $2
          ORDER BY popularity DESC, created_at DESC
          LIMIT $3 OFFSET $4
        `, ['restaurant', destinationId, limit, offset]);

        total = parseInt(countResult.rows[0].count, 10);
        results = listResult.rows;
      } else {
        // Get count
        const countResult = await pgPool.query(
          'SELECT COUNT(*) FROM places WHERE kind = \'restaurant\''
        );

        // Get results
        const listResult = await pgPool.query(`
          SELECT id, slug, name, kind, destination_id, latitude, longitude,
                 city, country_code, address_line, description, rating_avg, rating_count,
                 price_level, currency, data_source, status, featured, opening_hours, created_at
          FROM places
          WHERE kind = \'restaurant\'
          ORDER BY popularity DESC, created_at DESC
          LIMIT $1 OFFSET $2
        `, [limit, offset]);

        total = parseInt(countResult.rows[0].count, 10);
        results = listResult.rows;
      }
    }

    res.json({ restaurants: results, page, limit, total });
  }),
);

/**
 * GET /api/restaurants/:slug
 * Get restaurant details by slug.
 */
restaurantsRouter.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const { rows: [place] } = await pgPool.query(`
      SELECT id, slug, name, kind, destination_id, latitude, longitude,
             city, country_code, address_line, description, rating_avg, rating_count,
             price_level, currency, data_source, status, featured, opening_hours,
             phone, website, price_note, source_place_id, last_synced_at, created_at,
             cuisines, serves_alcohol, reservations_url, dress_code
      FROM places
      LEFT JOIN restaurant_details ON restaurant_details.place_id = place.id
      WHERE place.slug = $1
    `, [req.params.slug]);

    if (!place) {
      throw new HttpError(404, 'Restaurant not found', 'not_found');
    }

    res.json({ restaurant: place });
  }),
);

export default restaurantsRouter;