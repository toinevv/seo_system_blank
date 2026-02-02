import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/dashboard/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WebsiteCard } from "@/components/dashboard/website-card";
import Link from "next/link";
import { Plus, Globe } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function WebsitesPage() {
  const supabase = await createClient();

  const { data: websites } = await supabase
    .from("websites")
    .select(`
      *,
      topics(count),
      generation_logs(count)
    `)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col">
      <Header
        title="Websites"
        description="Manage your connected websites"
      />

      <div className="p-6 space-y-6">
        {/* Add Website Button */}
        <div className="flex justify-between items-center">
          <p className="text-muted-foreground">
            {websites?.length || 0} website(s) configured
          </p>
          <Link href="/dashboard/websites/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Website
            </Button>
          </Link>
        </div>

        {/* Websites Grid */}
        {websites && websites.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {websites.map((website) => (
              <WebsiteCard key={website.id} website={website} />
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Globe className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">No websites yet</h3>
                <p className="text-muted-foreground">
                  Add your first website to start generating SEO content.
                </p>
              </div>
              <Link href="/dashboard/websites/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Website
                </Button>
              </Link>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
