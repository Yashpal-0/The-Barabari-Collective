const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { validateCreate, validateUpdate, validateMove, validateComment } = require('../middleware/validate');

const ALLOWED_UPDATE = new Set(['title', 'description', 'priority', 'assignee', 'team_tag', 'parent_id']);

router.get('/', async (req, res, next) => {
  try {
    const filters = [];
    const params = [];
    const { status, priority, team, assignee } = req.query;
    if (status)   { params.push(status);   filters.push(`status = $${params.length}`); }
    if (priority) { params.push(priority); filters.push(`priority = $${params.length}`); }
    if (team)     { params.push(team);     filters.push(`team_tag = $${params.length}`); }
    if (assignee) { params.push(assignee); filters.push(`assignee = $${params.length}`); }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const { rows } = await pool.query(
      `SELECT * FROM tickets ${where} ORDER BY position ASC, created_at ASC`,
      params
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/', validateCreate, async (req, res, next) => {
  try {
    const { title, description, status, priority, assignee, team_tag, parent_id } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO tickets (title, description, status, priority, assignee, team_tag, parent_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [title, description, status, priority, assignee, team_tag, parent_id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { rows: tickets } = await pool.query('SELECT * FROM tickets WHERE id = $1', [id]);
    if (!tickets.length) return res.status(404).json({ error: 'Ticket not found' });
    const { rows: children } = await pool.query('SELECT * FROM tickets WHERE parent_id = $1', [id]);
    const { rows: comments } = await pool.query(
      'SELECT * FROM comments WHERE ticket_id = $1 ORDER BY created_at ASC', [id]
    );
    res.json({ ticket: tickets[0], children, comments });
  } catch (err) { next(err); }
});

router.patch('/:id/move', validateMove, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const id = parseInt(req.params.id);
    const { status, position } = req.body;
    await client.query('BEGIN');

    const { rows: cur } = await client.query(
      'SELECT status FROM tickets WHERE id = $1 FOR UPDATE', [id]
    );
    if (!cur.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Ticket not found' });
    }
    const oldStatus = cur[0].status;

    await client.query(
      'UPDATE tickets SET status = $1, position = $2 WHERE id = $3',
      [status, position, id]
    );

    // Re-sequence the destination column so every card gets a unique,
    // gap-free 0..n position. The moved card sorts just before whatever
    // currently sits at `position` (the - 0.5 nudge), matching the
    // frontend reorder() splice semantics.
    await client.query(
      `WITH ordered AS (
         SELECT id, ROW_NUMBER() OVER (
           ORDER BY CASE WHEN id = $2 THEN $3::numeric - 0.5 ELSE position END,
                    created_at
         ) - 1 AS rn
         FROM tickets WHERE status = $1
       )
       UPDATE tickets t SET position = o.rn FROM ordered o WHERE t.id = o.id`,
      [status, id, position]
    );

    // Moved out of its old column → close the gap it left behind.
    if (oldStatus !== status) {
      await client.query(
        `WITH ordered AS (
           SELECT id, ROW_NUMBER() OVER (ORDER BY position, created_at) - 1 AS rn
           FROM tickets WHERE status = $1
         )
         UPDATE tickets t SET position = o.rn FROM ordered o WHERE t.id = o.id`,
        [oldStatus]
      );
    }

    const { rows } = await client.query('SELECT * FROM tickets WHERE id = $1', [id]);
    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
});

router.patch('/:id', validateUpdate, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const fields = Object.keys(req.body).filter(k => ALLOWED_UPDATE.has(k));
    const params = fields.map(k => req.body[k]);
    params.push(id);
    const set = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
    const { rows } = await pool.query(
      `UPDATE tickets SET ${set} WHERE id = $${params.length} RETURNING *`,
      params
    );
    if (!rows.length) return res.status(404).json({ error: 'Ticket not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { rows } = await pool.query('DELETE FROM tickets WHERE id=$1 RETURNING id', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Ticket not found' });
    res.status(204).send();
  } catch (err) { next(err); }
});

router.post('/:id/comments', validateComment, async (req, res, next) => {
  try {
    const ticket_id = parseInt(req.params.id);
    const { author, body } = req.body;
    const { rows: ticket } = await pool.query('SELECT id FROM tickets WHERE id=$1', [ticket_id]);
    if (!ticket.length) return res.status(404).json({ error: 'Ticket not found' });
    const { rows } = await pool.query(
      'INSERT INTO comments (ticket_id, author, body) VALUES ($1,$2,$3) RETURNING *',
      [ticket_id, author, body]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.get('/:id/comments', async (req, res, next) => {
  try {
    const ticket_id = parseInt(req.params.id);
    const { rows } = await pool.query(
      'SELECT * FROM comments WHERE ticket_id=$1 ORDER BY created_at ASC', [ticket_id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;
