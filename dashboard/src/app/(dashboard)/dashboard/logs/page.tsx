import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/dashboard/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function LogsPage() {
  const supabase = await createClient();

  const { data: logs } = await supabase
    .from("generation_logs")
    .select("*, websites(name, domain)")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="flex flex-col">
      <Header title="Generation Logs" description="View content generation history" />

      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Generations</CardTitle>
          </CardHeader>
          <CardContent>
            {logs && logs.length > 0 ? (
              <div className="relative overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase bg-muted">
                    <tr>
                      <th className="px-4 py-3">Website</th>
                      <th className="px-4 py-3">Article</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">API</th>
                      <th className="px-4 py-3">SEO Score</th>
                      <th className="px-4 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b hover:bg-muted/50">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium">
                              {(log.websites as { name: string })?.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {(log.websites as { domain: string })?.domain}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="max-w-xs truncate">
                            {log.article_title || "—"}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              log.status === "success"
                                ? "bg-green-100 text-green-800"
                                : log.status === "failed"
                                ? "bg-red-100 text-red-800"
                                : log.status === "generating"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 capitalize">{log.api_used || "—"}</td>
                        <td className="px-4 py-3">{log.seo_score || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No generation logs yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
