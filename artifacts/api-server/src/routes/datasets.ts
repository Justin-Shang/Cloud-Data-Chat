import { Router } from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import { db } from "@workspace/db";
import { datasetsTable, recordsTable } from "@workspace/db";
import { eq, count, sql } from "drizzle-orm";
import {
  GetDatasetParams,
  DeleteDatasetParams,
} from "@workspace/api-zod";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

router.get("/datasets", async (req, res) => {
  try {
    const datasets = await db.select().from(datasetsTable).orderBy(datasetsTable.createdAt);
    res.json(datasets.map(d => ({
      ...d,
      createdAt: d.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to list datasets");
    res.status(500).json({ error: "Failed to list datasets" });
  }
});

router.get("/datasets/stats", async (req, res) => {
  try {
    const [totalDatasetsResult] = await db.select({ count: count() }).from(datasetsTable);
    const [totalRecordsResult] = await db.select({ count: count() }).from(recordsTable);

    const totalColumnsResult = await db.select({ columns: datasetsTable.columns }).from(datasetsTable);
    const totalColumns = totalColumnsResult.reduce((sum, d) => sum + (d.columns as string[]).length, 0);

    const recentDatasets = await db.select().from(datasetsTable)
      .orderBy(sql`${datasetsTable.createdAt} DESC`)
      .limit(5);

    res.json({
      totalDatasets: totalDatasetsResult.count,
      totalRecords: totalRecordsResult.count,
      totalColumns,
      recentDatasets: recentDatasets.map(d => ({
        ...d,
        createdAt: d.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get stats");
    res.status(500).json({ error: "Failed to get stats" });
  }
});

router.post("/datasets/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const { buffer, originalname } = req.file;
    const name = (req.body.name as string) || originalname.replace(/\.(xlsx?|csv)$/i, "");

    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      res.status(400).json({ error: "Excel file has no sheets" });
      return;
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

    if (rows.length === 0) {
      res.status(400).json({ error: "Excel file is empty" });
      return;
    }

    const columns = Object.keys(rows[0]);

    const [dataset] = await db.insert(datasetsTable).values({
      name,
      filename: originalname,
      sheetName,
      rowCount: rows.length,
      columnCount: columns.length,
      columns,
    }).returning();

    if (rows.length > 0) {
      const batchSize = 500;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize).map(row => ({
          datasetId: dataset.id,
          rowData: row,
        }));
        await db.insert(recordsTable).values(batch);
      }
    }

    res.status(201).json({
      ...dataset,
      createdAt: dataset.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to upload dataset");
    res.status(500).json({ error: "Failed to process file" });
  }
});

router.get("/datasets/:id", async (req, res) => {
  const parse = GetDatasetParams.safeParse(req.params);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  try {
    const [dataset] = await db.select().from(datasetsTable).where(eq(datasetsTable.id, parse.data.id));
    if (!dataset) {
      res.status(404).json({ error: "Dataset not found" });
      return;
    }
    res.json({ ...dataset, createdAt: dataset.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to get dataset");
    res.status(500).json({ error: "Failed to get dataset" });
  }
});

router.delete("/datasets/:id", async (req, res) => {
  const parse = DeleteDatasetParams.safeParse(req.params);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  try {
    await db.delete(datasetsTable).where(eq(datasetsTable.id, parse.data.id));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete dataset");
    res.status(500).json({ error: "Failed to delete dataset" });
  }
});

export default router;
