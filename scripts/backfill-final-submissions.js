/**
 * Backfill final_submissions from existing revision data using word-level diff.
 */
const Database = require('better-sqlite3');
const db = new Database('sqlite.db');

function computeDiff(original, final) {
  const tokenize = (text) => {
    const tokens = [];
    const re = /\S+\s*/g;
    let m;
    while ((m = re.exec(text)) !== null) tokens.push(m[0]);
    return tokens;
  };

  const origTokens = tokenize(original);
  const finalTokens = tokenize(final);
  const m = origTokens.length;
  const n = finalTokens.length;

  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (origTokens[i - 1] === finalTokens[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const stack = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && origTokens[i - 1] === finalTokens[j - 1]) {
      stack.push({ type: 'unchanged', text: origTokens[i - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      stack.push({ type: 'added', text: finalTokens[j - 1] });
      j--;
    } else {
      stack.push({ type: 'removed', text: origTokens[i - 1] });
      i--;
    }
  }

  const raw = [];
  while (stack.length > 0) raw.push(stack.pop());

  const merged = [];
  for (const c of raw) {
    const last = merged[merged.length - 1];
    if (last && last.type === c.type) {
      last.text += c.text;
    } else {
      merged.push({ type: c.type, text: c.text });
    }
  }
  return merged;
}

const pairs = db.prepare(`
  SELECT DISTINCT r.session_id, r.sample_id
  FROM revisions r
  LEFT JOIN final_submissions f ON f.session_id = r.session_id AND f.sample_id = r.sample_id
  WHERE f.id IS NULL
`).all();

console.log(`Found ${pairs.length} pairs to backfill`);

const insertStmt = db.prepare(`
  INSERT INTO final_submissions (session_id, sample_id, original_content, final_content, changes_json, submitted_at)
  VALUES (?, ?, ?, ?, ?, datetime('now'))
`);

let backfilled = 0;
for (const pair of pairs) {
  const lastRev = db.prepare(`
    SELECT content FROM revisions
    WHERE session_id = ? AND sample_id = ?
    ORDER BY revision_number DESC LIMIT 1
  `).get(pair.session_id, pair.sample_id);

  const sample = db.prepare('SELECT content FROM writing_samples WHERE id = ?').get(pair.sample_id);

  if (lastRev && sample) {
    const changes = computeDiff(sample.content, lastRev.content);
    insertStmt.run(pair.session_id, pair.sample_id, sample.content, lastRev.content, JSON.stringify(changes));
    const addedWords = changes.filter(c => c.type === 'added').reduce((n, c) => n + c.text.trim().split(/\s+/).length, 0);
    const removedWords = changes.filter(c => c.type === 'removed').reduce((n, c) => n + c.text.trim().split(/\s+/).length, 0);
    console.log(`  ✓ session=${pair.session_id.slice(0,8)}… sample=${pair.sample_id}: +${addedWords} -${removedWords} words`);
    backfilled++;
  }
}

console.log(`\nBackfilled ${backfilled} final submissions`);
const total = db.prepare('SELECT COUNT(*) as count FROM final_submissions').get();
console.log(`Total final_submissions: ${total.count}`);
