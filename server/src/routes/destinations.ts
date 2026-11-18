import { Router } from 'express';
import { pgPool } from '../db';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { destinationLimiter } from '../middleware/rateLimit';
import { HttpError } from '../middleware/error';

/**
 * GET /api/destinations
 * List destinations with optional filtering and search.
 * Query params: q (search), category, country, page, limit
 */
export const destinationsRouter = Router();

destinationsRouter.use(destinationLimiter);

destinationsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;

    const search = (req.query.q as string) || undefined;
    const category = (req.query.category as string) || undefined;
    const country = (req.query.country as string) || undefined;

    let whereClause = '';
    let params: any[] = [];
    let paramIdx = 1;

    if (search) {
      whereClause += ` WHERE (d.name ILIKE $${paramIdx} OR d.slug ILIKE $${paramIdx}) `;
      params.push(`%${search}%`);
      paramIdx++;
    }
    if (category) {
      if (whereClause) whereClause += ' AND ';
      whereClause += `d.category = $${paramIdx}`;
      params.push(category);
      paramIdx++;
    }
    if (country) {
      if (whereClause) whereClause += ' AND ';
      whereClause += `d.country_code = $${paramIdx}`;
      params.push(country);
      paramIdx++;
    }

    let results;
    let total = 0;

    if (search || category || country) {
      // Use simple SQL query with WHERE clause via pgPool
      let listQuery: string;
      if (search) {
        listQuery = `
          SELECT id, slug, name, country_code, region, city, latitude, longitude,
                 summary, description, hero_image_path, status, featured, popularity,
                 rating_avg, rating_count, created_at
          FROM destinations
          WHERE (name ILIKE $1 OR slug ILIKE $1)
          ORDER BY popularity DESC, created_at DESC
          LIMIT $2 OFFSET $3
        `;
      } else if (category) {
        listQuery = `
          SELECT id, slug, name, country_code, region, city, latitude, longitude,
                 summary, description, hero_image_path, status, featured, popularity,
                 rating_avg, rating_count, created_at
          FROM destinations
          WHERE category = $1
          ORDER BY popularity DESC, created_at DESC
          LIMIT $2 OFFSET $3
        `;
      } else {
        listQuery = `
          SELECT id, slug, name, country_code, region, city, latitude, longitude,
                 summary, description, hero_image_path, status, featured, popularity,
                 rating_avg, rating_count, created_at
          FROM destinations
          WHERE country_code = $1
          ORDER BY popularity DESC, created_at DESC
          LIMIT $2 OFFSET $3
        `;
      }

      // Get count and results
      const [countResult, listResult] = await Promise.all([
        pgPool.query(
          `SELECT COUNT(*) as count FROM destinations WHERE ${whereClause.replace('d.', '')}`
        ),
        pgPool.query(listQuery, params),
      ]);

      total = parseInt(countResult.rows[0].count, 10);
      results = listResult.rows;
    } else {
      // Simple list without filters via pgPool
      const [countResult, listResult] = await Promise.all([
        pgPool.query(`SELECT COUNT(*) as count FROM destinations`),
        pgPool.query(`
          SELECT id, slug, name, country_code, region, city, latitude, longitude,
                 summary, description, hero_image_path, status, featured, popularity,
                 rating_avg, rating_count, created_at
          FROM destinations
          ORDER BY popularity DESC, created_at DESC
          LIMIT $1 OFFSET $2
        `, [limit, offset]),
      ]);

      total = parseInt(countResult.rows[0].count, 10);
      results = listResult.rows;
    }

    res.json({ destinations: results, page, limit, total });
  }),
);

/**
 * GET /api/destinations/nearby
 * Get destinations near given coordinates (uses PostGIS via RPC).
 * Query params: lat, lng, radius_km (default 50), limit (default 20)
 */
destinationsRouter.get(
  '/nearby',
  asyncHandler(async (req, res) => {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radiusKm = Number(req.query.radius_km) || 50;
    const limit = Math.min(Number(req.query.limit) || 20, 100);

    if (isNaN(lat) || isNaN(lng)) {
      throw new HttpError(400, 'lat and lng query parameters are required', 'missing_params');
    }

    // Use pgPool directly for RPC call
    const { rows: results } = await pgPool.query(`
      SELECT * FROM nearby_places(
        ${lat}::float8,
        ${lng}::float8,
        ${radiusKm}::float8,
        ${limit}
      ) AS results(id TEXT, slug TEXT, name TEXT, country_code TEXT, region TEXT, city TEXT, latitude FLOAT8, longitude FLOAT8, summary TEXT, description TEXT, hero_image_path TEXT, status TEXT, featured BOOLEAN, popularity INT, rating_avg FLOAT, rating_count INT, distance_km FLOAT8)
    `);

    res.json({ destinations: results });
  }),
);

/**
 * GET /api/destinations/:slug
 * Get destination details by slug.
 */
destinationsRouter.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const [ { rows: [dest] } ] = await Promise.all([
      pgPool.query(
        `SELECT id, slug, name, country_code, region, city, latitude, longitude,
                 summary, description, hero_image_path, status, featured, popularity,
                 rating_avg, rating_count, created_at
          FROM destinations
          WHERE slug = $1`,
        [req.params.slug]
      ),
    ]);

    if (!dest) {
      throw new HttpError(404, 'Destination not found', 'not_found');
    }

    res.json({ destination: dest });
  }),
);

export default destinationsRouter;