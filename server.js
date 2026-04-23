import express from "express";
import pkg from "pg";
import cors from "cors";
import dotenv from "dotenv";
import ExcelJS from "exceljs";

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

const leadSelectWithFirstReceivedAt = `
  SELECT
    leads.*,
    COALESCE(first_user_message.created_at, first_message.created_at, leads.created_at) AS first_received_at
  FROM leads
  LEFT JOIN LATERAL (
    SELECT created_at
    FROM messages
    WHERE messages.lead_id = leads.id
      AND messages.role = 'user'
      AND messages.created_at IS NOT NULL
    ORDER BY created_at ASC
    LIMIT 1
  ) first_user_message ON true
  LEFT JOIN LATERAL (
    SELECT created_at
    FROM messages
    WHERE messages.lead_id = leads.id
      AND messages.created_at IS NOT NULL
    ORDER BY created_at ASC
    LIMIT 1
  ) first_message ON true
`;


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
      ${leadSelectWithFirstReceivedAt}
      ORDER BY leads.last_message_at DESC NULLS LAST
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
      `${leadSelectWithFirstReceivedAt} WHERE leads.id = $1`,
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
      `${leadSelectWithFirstReceivedAt}
       WHERE leads.phone ILIKE $1 OR leads.name ILIKE $1
       ORDER BY leads.last_message_at DESC`,
      [`%${q}%`]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Search failed" });
  }
});


// =======================
// EXPORT LEADS TO EXCEL
// =======================
app.post("/export-leads", async (req, res) => {
  try {
    const rows = Array.isArray(req.body) ? req.body : [];

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Leads");

    const headers = Object.keys(rows[0] || {});
    const statusHeader = headers.find((header) => header.toLowerCase() === "status");
    sheet.columns = headers.map((header) => ({ header, key: header, width: 20 }));

    sheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1F2937" },
      };
    });

    rows.forEach((row, index) => {
      const excelRow = sheet.addRow(row);
      const bg = index % 2 === 0 ? "FFF9FAFB" : "FFFFFFFF";

      excelRow.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
      });

      if (statusHeader) {
        const statusCell = excelRow.getCell(statusHeader);
        const status = String(statusCell.value || "").toLowerCase();

        if (status === "hot") {
          statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFC7CE" } };
        } else if (status === "warm") {
          statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFEB9C" } };
        } else if (status === "cold") {
          statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC6EFCE" } };
        }
      }
    });

    if (headers.length > 0) {
      sheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: headers.length },
      };
    }

    sheet.views = [{ state: "frozen", ySplit: 1 }];

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", "attachment; filename=leads.xlsx");

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to export leads" });
  }
});


// =======================
// START SERVER
// =======================
app.listen(process.env.PORT || 3000, "0.0.0.0", () => {
  console.log(`Server running on port ${process.env.PORT || 3000}`);
});
