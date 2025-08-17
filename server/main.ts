// deno-lint-ignore-file require-await
import { withRuntime } from "@deco/workers-runtime";
import {
  createStepFromTool,
  createTool,
  createWorkflow,
} from "@deco/workers-runtime/mastra";
import { z } from "zod";
import type { Env as DecoEnv } from "./deco.gen.ts";

interface Env extends DecoEnv {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
}

const createMyTool = (_env: Env) =>
  createTool({
    id: "MY_TOOL",
    description: "Say hello",
    inputSchema: z.object({ name: z.string() }),
    outputSchema: z.object({ message: z.string() }),
    execute: async ({ context }) => ({
      message: `Hello, ${context.name}!`,
    }),
  });

const createMyWorkflow = (env: Env) => {
  const step = createStepFromTool(createMyTool(env));

  return createWorkflow({
    id: "MY_WORKFLOW",
    inputSchema: z.object({ name: z.string() }),
    outputSchema: z.object({ message: z.string() }),
  })
    .then(step)
    .commit();
};

const createCreateOpportunityTool = (env: Env) =>
  createTool({
    id: "CREATE_OPPORTUNITY",
    description: "Create an opportunity from lead data and persist to workspace database",
    inputSchema: z.object({
      empresa: z.string(),
      pessoa: z.string(),
      telefone: z.string(),
      email: z.string().email(),
      interesse: z.string(),
    }),
    outputSchema: z.object({ id: z.string() }),
  execute: async ({ context }) => {
      const { empresa, pessoa, telefone, email, interesse } = context;

      // Ensure table exists (safe to run repeatedly)
      await env.DECO_CHAT_WORKSPACE_API.DATABASES_RUN_SQL({
        sql: `CREATE TABLE IF NOT EXISTS opportunities (
          id TEXT PRIMARY KEY,
          empresa TEXT,
          pessoa TEXT,
          telefone TEXT,
          email TEXT,
          interesse TEXT,
          created_at TEXT
        );`,
      });

      const id = crypto?.randomUUID?.() ?? String(Date.now());

      await env.DECO_CHAT_WORKSPACE_API.DATABASES_RUN_SQL({
        sql: `INSERT INTO opportunities (id, empresa, pessoa, telefone, email, interesse, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7);`,
        params: [
          id,
          empresa,
          pessoa,
          telefone,
          email,
          interesse,
          new Date().toISOString(),
        ],
      });

      return { id };
    },
  });

const createListOpportunitiesTool = (env: Env) =>
  createTool({
    id: "LIST_OPPORTUNITIES",
    description: "List opportunities stored in the workspace database",
    inputSchema: z.object({ limit: z.number().int().positive().optional() }).optional(),
    outputSchema: z.object({ items: z.array(z.object({
      id: z.string(),
      empresa: z.string().nullable().optional(),
      pessoa: z.string().nullable().optional(),
      telefone: z.string().nullable().optional(),
      email: z.string().nullable().optional(),
      interesse: z.string().nullable().optional(),
      created_at: z.string().nullable().optional(),
    })) }),
    execute: async ({ context }) => {
      const limit = (context as any)?.limit ?? 100;

      // Ensure table exists so listing won't throw when empty
      await env.DECO_CHAT_WORKSPACE_API.DATABASES_RUN_SQL({
        sql: `CREATE TABLE IF NOT EXISTS opportunities (
          id TEXT PRIMARY KEY,
          empresa TEXT,
          pessoa TEXT,
          telefone TEXT,
          email TEXT,
          interesse TEXT,
          created_at TEXT
        );`,
      });

      const res = await env.DECO_CHAT_WORKSPACE_API.DATABASES_RUN_SQL({
        sql: `SELECT id, empresa, pessoa, telefone, email, interesse, created_at FROM opportunities ORDER BY created_at DESC LIMIT $1;`,
        params: [limit],
      });

      // Deco DATABASES_RUN_SQL returns an object with `result: Array<{ meta?, results?: unknown[] }>`
      // The actual rows are usually at res.result[0].results and may be arrays or objects.
      const resultArray = (res as any)?.result ?? [];
      const first = resultArray[0] ?? {};
      let rows = (first as any)?.results ?? [];

      // If rows elements are objects with a 'values' array and a 'columns' array exists in meta,
      // convert to objects mapping columns -> values.
      const meta = (first as any)?.meta ?? {};
      const columns: string[] | undefined = meta?.columns;

      if (Array.isArray(rows) && rows.length > 0 && rows[0] && typeof rows[0] === "object") {
        const firstRow = rows[0];

        // Case: rows are like { columns: [...], values: [...] } or { values: [...] }
        if (Array.isArray(firstRow.values) && columns && Array.isArray(columns)) {
          rows = rows.map((r: any) => {
            const obj: any = {};
            for (let i = 0; i < columns.length; i++) obj[columns[i]] = r.values[i];
            return obj;
          });
        } else if (Array.isArray(firstRow.values) && !columns && Array.isArray(firstRow.columns)) {
          // sometimes columns are inside the row
          rows = rows.map((r: any) => {
            const obj: any = {};
            for (let i = 0; i < r.columns.length; i++) obj[r.columns[i]] = r.values[i];
            return obj;
          });
        }
      }

      // Now rows can be arrays (positional) or objects (keyed by column name)
      const items = Array.isArray(rows)
        ? rows.map((r: any) => {
            let item: any;
            if (Array.isArray(r)) {
              item = {
                id: String(r[0] ?? ""),
                empresa: r[1] ?? null,
                pessoa: r[2] ?? null,
                telefone: r[3] ?? null,
                email: r[4] ?? null,
                interesse: r[5] ?? null,
                created_at: r[6] ?? null,
              };
            } else {
              item = {
                id: String(r?.id ?? r?.ID ?? r?.Id ?? r?.rowid ?? ""),
                empresa: r?.empresa ?? null,
                pessoa: r?.pessoa ?? null,
                telefone: r?.telefone ?? null,
                email: r?.email ?? null,
                interesse: r?.interesse ?? null,
                created_at: r?.created_at ?? null,
              };
            }

            // sanitize weird literal strings
            if (item.id === "undefined") item.id = "";

            return item;
          })
        : [];

      return { items };
    },
  });

const fallbackToView = (viewPath: string = "/") => (req: Request, env: Env) => {
  const LOCAL_URL = "http://localhost:4000";
  const url = new URL(req.url);
  const useDevServer = (req.headers.get("origin") || req.headers.get("host"))
    ?.includes("localhost");

  const request = new Request(
    useDevServer
      ? new URL(`${url.pathname}${url.search}`, LOCAL_URL)
      : new URL(viewPath, req.url),
    req,
  );

  return useDevServer ? fetch(request) : env.ASSETS.fetch(request);
};

const createCreateOpportunityWorkflow = (env: Env) => {
  const step = createStepFromTool(createCreateOpportunityTool(env));

  return createWorkflow({
    id: "CREATE_OPPORTUNITY_WORKFLOW",
    inputSchema: z.object({
      empresa: z.string(),
      pessoa: z.string(),
      telefone: z.string(),
      email: z.string().email(),
      interesse: z.string(),
    }),
    outputSchema: z.object({ id: z.string() }),
  })
    .then(step)
    .commit();
};
// Debug tool: run arbitrary SQL (ONLY for debugging; remove or protect in production)
const createDebugDbTool = (env: Env) =>
  createTool({
    id: "DEBUG_DB_RUN_SQL",
    description: "Run arbitrary SQL and return raw result (debug only)",
    inputSchema: z.object({ sql: z.string(), params: z.array(z.any()).optional() }),
    outputSchema: z.object({ result: z.any() }),
    execute: async ({ context }) => {
      const { sql, params } = context as any;
      const res = await env.DECO_CHAT_WORKSPACE_API.DATABASES_RUN_SQL({ sql, params });
      return { result: res };
    },
  });

const _runtimeAny = withRuntime<Env>({
  workflows: [createMyWorkflow, createCreateOpportunityWorkflow],
  tools: [
    createMyTool,
    createCreateOpportunityTool,
    createListOpportunitiesTool,
    createDebugDbTool,
  ],
  fetch: fallbackToView("/"),
}) as any;

const Workflow = _runtimeAny.Workflow as typeof _runtimeAny.Workflow;

export { Workflow };

export default _runtimeAny;
