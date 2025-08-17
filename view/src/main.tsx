import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import {
  createRootRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import CallToolDemo from "./routes/call-tool.tsx";
import WorkflowsDemo from "./routes/workflows.tsx";
import ViewsDemo from "./routes/views.tsx";
import KanbanHome from "./routes/kanban.tsx";

import "./styles.css";

// ...existing code...
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const indexRoute = KanbanHome(rootRoute);

const routeTree = rootRoute.addChildren([
  indexRoute,
  CallToolDemo(rootRoute),
  WorkflowsDemo(rootRoute),
  ViewsDemo(rootRoute),
]);

const queryClient = new QueryClient();

const router = createRouter({
  routeTree,
  context: {
    queryClient,
  },
  defaultPreload: "intent",
  scrollRestoration: true,
  defaultStructuralSharing: true,
  defaultPreloadStaleTime: 0,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById("app");
if (rootElement && !rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  );
}
