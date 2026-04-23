import express from "express";
import pkg from "pg";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});


// =======================
// HEALTH CHECK
// =======================
app.get("/", (req, res) => {
  res.json({ status: "API running" });
});


// =======================
// CREATE / UPSERT LEAD (WITH SOURCE)
// =======================
app.post("/leads", async (req, res) => {
  try {
    let {
      name,
      phone,
      source,
      campaign,
      adset,
      ad,
      source_raw
    } = req.body;

    if (!phone) {
      return res.status(400).json({ error: "Phone is required" });
    }

    // normalize phone (last 10 digits)
    const cleanPhone = phone.replace(/\D/g, "").slice(-10);

    const result = await pool.query(
      `
      INSERT INTO leads (
        name,
        phone,
        source,
        campaign,
        adset,
        ad,
        source_raw,
        last_message_at,
        message_count
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),1)

      ON CONFLICT (phone)
      DO UPDATE SET
        name = COALESCE(EXCLUDED.name, leads.name),
        last_message_at = NOW(),
        message_count = leads.message_count + 1

      -- DO NOT overwrite source if already set
      WHERE leads.source IS NULL OR leads.source = 'unknown'

      RETURNING *;
      `,
      [
        name || null,
        cleanPhone,
        source || "unknown",
        campaign || null,
        adset || null,
        ad || null,
        source_raw || null
      ]
    );

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create/update lead" });
  }
});


// =======================
// GET ALL LEADS
// =======================
app.get("/leads", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM leads
      ORDER BY last_message_at DESC NULLS LAST
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch leads" });
  }
});


// =======================
// GET SINGLE LEAD + MESSAGES
// =======================
app.get("/leads/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const lead = await pool.query(
      `SELECT * FROM leads WHERE id = $1`,
      [id]
    );

    const messages = await pool.query(
      `SELECT * FROM messages WHERE lead_id = $1 ORDER BY created_at ASC`,
      [id]
    );

    res.json({
      lead: lead.rows[0],
      messages: messages.rows,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch lead data" });
  }
});


// =======================
// GET LEAD INSIGHTS
// =======================
app.get("/insights/:lead_id", async (req, res) => {
  const { lead_id } = req.params;

  try {
    const result = await pool.query(
      `SELECT * FROM lead_insights WHERE lead_id = $1`,
      [lead_id]
    );

    res.json(result.rows[0] || {});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch insights" });
  }
});


// =======================
// GET SIGNAL LOG
// =======================
app.get("/signals/:lead_id", async (req, res) => {
  const { lead_id } = req.params;

  try {
    const result = await pool.query(
      `SELECT * FROM lead_signal_log WHERE lead_id = $1 ORDER BY created_at DESC`,
      [lead_id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch signals" });
  }
});


// =======================
// SEARCH LEADS (optional)
// =======================
app.get("/search", async (req, res) => {
  const { q } = req.query;

  try {
    const result = await pool.query(
      `SELECT * FROM leads
       WHERE phone ILIKE $1 OR name ILIKE $1
       ORDER BY last_message_at DESC`,
      [`%${q}%`]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Search failed" });
  }
});


// =======================
// START SERVER
// =======================
app.listen(process.env.PORT || 3000, "0.0.0.0", () => {
  console.log(`Server running on port ${process.env.PORT || 3000}`);
});
