"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Globe,
  Settings,
  FileText,
  Key,
  Trash2,
  Loader2,
  MoreVertical,
} from "lucide-react";

interface Website {
  id: string;
  name: string;
  domain: string;
  is_active: boolean;
  total_articles_generated: number;
  days_between_posts: number;
  next_scheduled_at: string | null;
  last_generated_at: string | null;
  topics: { count: number }[];
}

interface WebsiteCardProps {
  website: Website;
}

export function WebsiteCard({ website }: WebsiteCardProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = async () => {
    if (isDeleting) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/websites/${website.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete website");
      }

      // Refresh the page to show updated list
      router.refresh();
    } catch (error) {
      console.error("Error deleting website:", error);
      alert(
        error instanceof Error ? error.message : "Failed to delete website"
      );
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const topicsCount =
    (website.topics as unknown as { count: number }[])?.[0]?.count || 0;

  return (
    <Card className="relative">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{website.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{website.domain}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`h-2.5 w-2.5 rounded-full ${
                website.is_active ? "bg-green-500" : "bg-gray-300"
              }`}
              title={website.is_active ? "Active" : "Inactive"}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold">
              {website.total_articles_generated}
            </p>
            <p className="text-xs text-muted-foreground">Articles</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{topicsCount}</p>
            <p className="text-xs text-muted-foreground">Topics</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{website.days_between_posts}d</p>
            <p className="text-xs text-muted-foreground">Interval</p>
          </div>
        </div>

        {/* Schedule Info */}
        <div className="rounded-lg bg-muted p-3">
          <p className="text-sm">
            <span className="text-muted-foreground">Next generation: </span>
            {website.next_scheduled_at
              ? new Date(website.next_scheduled_at).toLocaleDateString()
              : "Not scheduled"}
          </p>
          {website.last_generated_at && (
            <p className="text-sm">
              <span className="text-muted-foreground">Last: </span>
              {new Date(website.last_generated_at).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Delete Confirmation */}
        {showDeleteConfirm ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 space-y-3">
            <p className="text-sm font-medium text-destructive">
              Delete &quot;{website.name}&quot;?
            </p>
            <p className="text-xs text-muted-foreground">
              This will permanently delete all topics, logs, and settings for
              this website.
            </p>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Yes, Delete"
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          /* Actions */
          <div className="flex gap-2">
            <Link href={`/dashboard/websites/${website.id}`} className="flex-1">
              <Button variant="outline" size="sm" className="w-full">
                <Settings className="h-4 w-4 mr-2" />
                Manage
              </Button>
            </Link>
            <Link href={`/dashboard/websites/${website.id}/topics`}>
              <Button variant="ghost" size="sm">
                <FileText className="h-4 w-4" />
              </Button>
            </Link>
            <Link href={`/dashboard/websites/${website.id}/api-keys`}>
              <Button variant="ghost" size="sm">
                <Key className="h-4 w-4" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
