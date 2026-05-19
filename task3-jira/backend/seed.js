const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/jira_kanban',
});

const STATUSES   = ['backlog','todo','in_progress','review','done'];
const PRIORITIES = ['low','medium','high','critical'];
const ASSIGNEES  = ['Alice Chen','Bob Patel','Carol Singh','David Kim','Emma Torres','Frank Liu','Grace Okonkwo','Hiro Tanaka'];
const TEAMS      = ['frontend','backend','infra','design','qa','mobile','data','security'];

const TITLE_PREFIXES = ['Add','Fix','Refactor','Update','Implement','Migrate','Optimise','Document','Review','Deploy','Test','Remove','Integrate','Improve','Debug'];
const TITLE_SUBJECTS = [
  'authentication flow','dashboard charts','API rate limiting','CI pipeline','database migrations',
  'error boundaries','search indexing','notification service','cache layer','user permissions',
  'payment gateway','onboarding wizard','dark mode support','CSV export','webhook handler',
  'session management','email templates','logging middleware','CORS policy','health checks',
  'mobile nav bar','analytics events','admin panel','forgot password','file uploads',
  'pagination logic','toast notifications','unit test coverage','OpenAPI spec','feature flags',
];

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const maybe = (val, prob = 0.6) => Math.random() < prob ? val : null;

function makeTitle(i) {
  return `${rand(TITLE_PREFIXES)} ${rand(TITLE_SUBJECTS)} (#${i})`;
}

function makeDescription(i) {
  if (Math.random() < 0.3) return '';
  return `Task ${i}: ${rand(TITLE_SUBJECTS)} needs attention. Tracked as part of the ${rand(TEAMS)} team sprint.`;
}

// Weighted status — more tickets in early columns
const STATUS_WEIGHTS = [
  ...Array(35).fill('backlog'),
  ...Array(25).fill('todo'),
  ...Array(20).fill('in_progress'),
  ...Array(12).fill('review'),
  ...Array(8).fill('done'),
];

const PRIORITY_WEIGHTS = [
  ...Array(30).fill('low'),
  ...Array(40).fill('medium'),
  ...Array(20).fill('high'),
  ...Array(10).fill('critical'),
];

async function seed() {
  const TOTAL      = 50;
  const BATCH_SIZE = 50;    // rows per INSERT
  const N_PARENTS  = 15;    // first N_PARENTS have no parent

  console.log('Truncating existing data…');
  await pool.query('TRUNCATE TABLE comments, tickets RESTART IDENTITY CASCADE');

  const insertedIds = [];

  for (let offset = 0; offset < TOTAL; offset += BATCH_SIZE) {
    const count  = Math.min(BATCH_SIZE, TOTAL - offset);
    const values = [];
    const params = [];
    let   p      = 1;

    for (let i = 0; i < count; i++) {
      const idx      = offset + i + 1;
      const status   = rand(STATUS_WEIGHTS);
      const priority = rand(PRIORITY_WEIGHTS);
      const assignee = maybe(rand(ASSIGNEES), 0.7);
      const team_tag = maybe(rand(TEAMS), 0.8);

      // First N_PARENTS are roots; after that ~40% get a parent
      let parent_id = null;
      if (idx > N_PARENTS && insertedIds.length > 0 && Math.random() < 0.4) {
        parent_id = insertedIds[Math.floor(Math.random() * Math.min(insertedIds.length, N_PARENTS))];
      }

      values.push(`($${p},$${p+1},$${p+2},$${p+3},$${p+4},$${p+5},$${p+6},$${p+7})`);
      params.push(
        makeTitle(idx),
        makeDescription(idx),
        status,
        priority,
        assignee || '',
        team_tag || '',
        parent_id,
        idx - 1   // position (0-indexed, will be re-sequenced below)
      );
      p += 8;
    }

    const sql = `
      INSERT INTO tickets (title, description, status, priority, assignee, team_tag, parent_id, position)
      VALUES ${values.join(',')}
      RETURNING id
    `;
    const { rows } = await pool.query(sql, params);
    rows.forEach(r => insertedIds.push(r.id));

    console.log(`  Inserted ${offset + count} / ${TOTAL}`);
  }

  // Re-sequence positions per status column so they're 0..n gap-free
  console.log('Re-sequencing positions…');
  await pool.query(`
    WITH ordered AS (
      SELECT id,
             ROW_NUMBER() OVER (PARTITION BY status ORDER BY id) - 1 AS rn
      FROM tickets
    )
    UPDATE tickets t SET position = o.rn FROM ordered o WHERE t.id = o.id
  `);

  const { rows: counts } = await pool.query(`
    SELECT status, COUNT(*) FROM tickets GROUP BY status ORDER BY status
  `);
  console.log('\nTickets per column:');
  counts.forEach(r => console.log(`  ${r.status.padEnd(12)} ${r.count}`));
  console.log(`\nDone. ${TOTAL} tickets inserted.`);

  await pool.end();
}

seed().catch(err => { console.error(err.message); process.exit(1); });
