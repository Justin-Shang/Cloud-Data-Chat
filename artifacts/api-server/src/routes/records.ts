import { Router } from "express";
import { db } from "@workspace/db";
import { datasetsTable, recordsTable } from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";
import { ListRecordsParams, ListRecordsQueryParams, SearchAllRecordsQueryParams } from "@workspace/api-zod";

const router = Router();

router.get("/datasets/:id/records", async (req, res) => {
  const paramsParse = ListRecordsParams.safeParse(req.params);
  const queryParse = ListRecordsQueryParams.safeParse(req.query);

  if (!paramsParse.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const datasetId = paramsParse.data.id;
  const queryStr = queryParse.data?.query ?? "";
  const limit = queryParse.data?.limit ?? 50;
  const offset = queryParse.data?.offset ?? 0;

  try {
    const conditions = [eq(recordsTable.datasetId, datasetId)];

    if (queryStr) {
      conditions.push(sql`${recordsTable.rowData}::text ILIKE ${"%" + queryStr + "%"}`);
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    const [totalResult] = await db.select({ count: sql<number>`count(*)::int` })
      .from(recordsTable)
      .where(whereClause);

    const records = await db.select().from(recordsTable)
      .where(whereClause)
      .limit(limit)
      .offset(offset);

    res.json({
      records: records.map(r => ({
        id: r.id,
        datasetId: r.datasetId,
        rowData: r.rowData,
      })),
      total: totalResult.count,
      limit,
      offset,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to list records");
    res.status(500).json({ error: "Failed to list records" });
  }
});

router.get("/records/search", async (req, res) => {
  const queryParse = SearchAllRecordsQueryParams.safeParse(req.query);

  if (!queryParse.success || !queryParse.data.query) {
    res.status(400).json({ error: "query parameter is required" });
    return;
  }

  const { query, datasetId, limit = 20 } = queryParse.data;

  try {
    const conditions = [sql`${recordsTable.rowData}::text ILIKE ${"%" + query + "%"}`];

    if (datasetId) {
      conditions.push(eq(recordsTable.datasetId, datasetId));
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

    const [totalResult] = await db.select({ count: sql<number>`count(*)::int` })
      .from(recordsTable)
      .innerJoin(datasetsTable, eq(recordsTable.datasetId, datasetsTable.id))
      .where(whereClause);

    const records = await db.select({
      id: recordsTable.id,
      datasetId: recordsTable.datasetId,
      rowData: recordsTable.rowData,
      datasetName: datasetsTable.name,
      columns: datasetsTable.columns,
    }).from(recordsTable)
      .innerJoin(datasetsTable, eq(recordsTable.datasetId, datasetsTable.id))
      .where(whereClause)
      .limit(limit);

    const lowerQuery = query.toLowerCase();

    const results = records.map(r => {
      const cols = r.columns as string[];
      const matchedColumns = cols.filter(col => {
        const val = (r.rowData as Record<string, unknown>)[col];
        return val !== undefined && val !== null && String(val).toLowerCase().includes(lowerQuery);
      });
      return {
        id: r.id,
        datasetId: r.datasetId,
        datasetName: r.datasetName,
        rowData: r.rowData,
        matchedColumns,
      };
    });

    res.json({ results, query, total: totalResult.count });
  } catch (err) {
    req.log.error({ err }, "Failed to search records");
    res.status(500).json({ error: "Failed to search" });
  }
});

export default router;
