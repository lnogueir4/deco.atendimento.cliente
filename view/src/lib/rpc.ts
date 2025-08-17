import { createClient } from "@deco/workers-runtime/client";

// Use a permissive any type for the MCP client in the view to avoid
// coupling the view's build to the server-generated Env types.
export const client = createClient<any>();
