import { Router } from "express";
import { db } from "@workspace/db";
import { chatMessagesTable, datasetsTable, recordsTable } from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";
import { SendChatMessageBody } from "@workspace/api-zod";

const router = Router();

function extractKeywords(message: string): string[] {
  const cleaned = message
    .replace(/[?？!！,，。.、；;：:]/g, " ")
    // Chinese action words (no \b — \b doesn't work on Chinese characters)
    .replace(/查找|搜索|查询|搜寻|找一下|查一下|帮我查|帮我找|帮我|给我|我想要|我想|显示|包含|有关|关于|有没有|是否有|告诉我|列出|列举|筛选|过滤/g, " ")
    // Meta/description words users say but that aren't in data
    .replace(/员工|职员|人员|记录|数据|信息|内容|条目|结果|条|项|个|以下|如下|下面|所有|全部/g, " ")
    // English stopwords — \b works for ASCII
    .replace(/\b(search|find|show|list|get|look for|about|with|containing|where|tell me|all|any)\b/gi, " ")
    // Common Chinese particles
    .replace(/[的地得了吗呢啊哦哈吧嗯呀哟]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words = cleaned.split(/\s+/).filter(w => w.length > 0);
  return words.length > 0 ? words : [message.trim()];
}

router.get("/chat/history", async (_req, res) => {
  try {
    const messages = await db.select().from(chatMessagesTable)
      .orderBy(chatMessagesTable.createdAt)
      .limit(100);

    res.json(messages.map(m => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
    })));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch chat history" });
  }
});

router.post("/chat/message", async (req, res) => {
  const parse = SendChatMessageBody.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "message is required" });
    return;
  }

  const { message, datasetId } = parse.data;

  try {
    await db.insert(chatMessagesTable).values({
      role: "user",
      content: message,
    });

    const keywords = extractKeywords(message);
    const searchQuery = keywords.join(" ");

    // Each keyword must match (AND logic) — supports Chinese multi-word queries
    const keywordConditions = keywords.map(kw =>
      sql`${recordsTable.rowData}::text ILIKE ${"%" + kw + "%"}`
    );
    const conditions = [...keywordConditions];
    if (datasetId) {
      conditions.push(eq(recordsTable.datasetId, datasetId));
    }
    const whereClause = and(...conditions);

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
      .limit(20);

    const results = records.map(r => {
      const cols = r.columns as string[];
      const matchedColumns = cols.filter(col => {
        const val = (r.rowData as Record<string, unknown>)[col];
        if (val === undefined || val === null) return false;
        const strVal = String(val).toLowerCase();
        return keywords.some(kw => strVal.includes(kw.toLowerCase()));
      });
      return {
        id: r.id,
        datasetId: r.datasetId,
        datasetName: r.datasetName,
        rowData: r.rowData,
        matchedColumns,
      };
    });

    const total = totalResult.count;
    const displayQuery = keywords.join("、");
    let responseContent: string;

    if (total === 0) {
      responseContent = `未找到与"${displayQuery}"相关的记录。请尝试其他关键词，或先上传包含相关数据的 Excel 文件。`;
    } else {
      responseContent = `找到 ${total} 条与"${displayQuery}"相关的记录，为您显示前 ${results.length} 条。`;
    }

    const [assistantMsg] = await db.insert(chatMessagesTable).values({
      role: "assistant",
      content: responseContent,
      searchQuery,
      resultCount: total,
    }).returning();

    res.json({
      message: {
        ...assistantMsg,
        createdAt: assistantMsg.createdAt.toISOString(),
      },
      results: {
        results,
        query: searchQuery,
        total,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Failed to send chat message");
    res.status(500).json({ error: "Failed to process message" });
  }
});

export default router;
