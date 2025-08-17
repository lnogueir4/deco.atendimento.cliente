import { useEffect, useState } from "react";
import { createRoute, type RootRoute } from "@tanstack/react-router";
import { client } from "../lib/rpc";

function KanbanHome() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
  const res = await client.LIST_OPPORTUNITIES?.({});
        if (mounted) setItems((res as any)?.items ?? []);
      } catch (err) {
        console.error("Failed to load opportunities", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-4 text-slate-900 dark:text-white">Kanban — Oportunidades</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-800 border rounded-lg p-4">
            <h2 className="font-semibold mb-2">Novas</h2>
            {loading && <p className="text-sm text-slate-500">Carregando...</p>}
            {!loading && items.length === 0 && <p className="text-sm text-slate-500">Nenhuma oportunidade</p>}
            <div className="space-y-3">
              {items.map((it) => (
                <div key={it.id} className="p-3 border rounded-md bg-slate-50 dark:bg-slate-900">
                  <div className="font-semibold text-slate-900 dark:text-white">{it.empresa}</div>
                  <div className="text-sm text-slate-600 dark:text-slate-300">{it.pessoa} — {it.telefone}</div>
                  <div className="text-sm text-slate-500">{it.email}</div>
                  <div className="mt-2 text-sm text-slate-700 dark:text-slate-300">{it.interesse}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 border rounded-lg p-4">
            <h2 className="font-semibold mb-2">Em Contato</h2>
            <p className="text-sm text-slate-500">(Coluna vazia — sem status implementado)</p>
          </div>

          <div className="bg-white dark:bg-slate-800 border rounded-lg p-4">
            <h2 className="font-semibold mb-2">Proposta / Fechado</h2>
            <p className="text-sm text-slate-500">(Coluna vazia — sem status implementado)</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default (parentRoute: RootRoute) =>
  createRoute({
    path: "/",
    component: KanbanHome,
    getParentRoute: () => parentRoute,
  });
