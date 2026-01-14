"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/dashboard/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Check,
  X,
  ChevronUp,
  ChevronDown,
  Loader2,
  Sparkles,
  CheckCircle,
  XCircle,
} from "lucide-react";
import type { Topic } from "@/types/database";

interface DiscoveredTopic {
  title: string;
  keywords: string[];
  category: string;
  priority: number;
  selected: boolean;
}

const WORKER_URL = "https://seo-content-generator.ta-voeten.workers.dev";

export default function TopicsPage() {
  const params = useParams();
  const websiteId = params.id as string;
  const supabase = createClient();

  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTopic, setNewTopic] = useState({ title: "", keywords: "", category: "", priority: 5 });
  const [saving, setSaving] = useState(false);

  // Discovery state
  const [discovering, setDiscovering] = useState(false);
  const [discoveredTopics, setDiscoveredTopics] = useState<DiscoveredTopic[]>([]);
  const [showDiscoveredReview, setShowDiscoveredReview] = useState(false);
  const [savingDiscovered, setSavingDiscovered] = useState(false);
  const [discoverError, setDiscoverError] = useState<string | null>(null);

  useEffect(() => {
    fetchTopics();
  }, [websiteId]);

  const fetchTopics = async () => {
    const { data } = await supabase
      .from("topics")
      .select("*")
      .eq("website_id", websiteId)
      .order("is_used", { ascending: true })
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false });

    if (data) setTopics(data as Topic[]);
    setLoading(false);
  };

  const handleAddTopic = async () => {
    if (!newTopic.title.trim()) return;
    setSaving(true);

    const { error } = await supabase.from("topics").insert({
      website_id: websiteId,
      title: newTopic.title.trim(),
      keywords: newTopic.keywords.split(",").map((k) => k.trim()).filter(Boolean),
      category: newTopic.category || null,
      priority: newTopic.priority,
      source: "manual",
    });

    if (!error) {
      setNewTopic({ title: "", keywords: "", category: "", priority: 5 });
      setShowAddForm(false);
      fetchTopics();
    }
    setSaving(false);
  };

  const handleDeleteTopic = async (topicId: string) => {
    if (!confirm("Delete this topic?")) return;

    await supabase.from("topics").delete().eq("id", topicId);
    fetchTopics();
  };

  const handlePriorityChange = async (topicId: string, delta: number) => {
    const topic = topics.find((t) => t.id === topicId);
    if (!topic) return;

    const newPriority = Math.max(1, Math.min(10, topic.priority + delta));
    await supabase.from("topics").update({ priority: newPriority }).eq("id", topicId);
    fetchTopics();
  };

  const handleDiscoverTopics = async () => {
    setDiscovering(true);
    setDiscoverError(null);

    try {
      const response = await fetch(`${WORKER_URL}/discover?website_id=${websiteId}`, {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Discovery failed: ${response.status}`);
      }

      const data = await response.json();

      if (data.topics && Array.isArray(data.topics)) {
        setDiscoveredTopics(
          data.topics.map((t: { title: string; keywords?: string[]; category?: string; priority?: number }) => ({
            ...t,
            keywords: t.keywords || [],
            category: t.category || "general",
            priority: t.priority || 5,
            selected: true, // Select all by default
          }))
        );
        setShowDiscoveredReview(true);
      } else {
        throw new Error("No topics returned from discovery");
      }
    } catch (error) {
      setDiscoverError(error instanceof Error ? error.message : "Discovery failed");
    } finally {
      setDiscovering(false);
    }
  };

  const toggleDiscoveredTopic = (index: number) => {
    setDiscoveredTopics((prev) =>
      prev.map((t, i) => (i === index ? { ...t, selected: !t.selected } : t))
    );
  };

  const handleSaveDiscoveredTopics = async () => {
    const selectedTopics = discoveredTopics.filter((t) => t.selected);
    if (selectedTopics.length === 0) return;

    setSavingDiscovered(true);

    try {
      const topicsToInsert = selectedTopics.map((t) => ({
        website_id: websiteId,
        title: t.title,
        keywords: t.keywords,
        category: t.category,
        priority: t.priority,
        source: "ai_suggested" as const,
      }));

      const { error } = await supabase.from("topics").insert(topicsToInsert);

      if (error) throw error;

      setShowDiscoveredReview(false);
      setDiscoveredTopics([]);
      fetchTopics();
    } catch (error) {
      setDiscoverError(error instanceof Error ? error.message : "Failed to save topics");
    } finally {
      setSavingDiscovered(false);
    }
  };

  const unusedTopics = topics.filter((t) => !t.is_used);
  const usedTopics = topics.filter((t) => t.is_used);

  return (
    <div className="flex flex-col">
      <Header title="Topics" description="Manage content topics for this website" />

      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Link href={`/dashboard/websites/${websiteId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Website
            </Button>
          </Link>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleDiscoverTopics}
              disabled={discovering || showDiscoveredReview}
            >
              {discovering ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              {discovering ? "Discovering..." : "Discover Topics"}
            </Button>
            <Button onClick={() => setShowAddForm(true)} disabled={showAddForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Topic
            </Button>
          </div>
        </div>

        {/* Discovery Error */}
        {discoverError && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
            <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-destructive">Discovery Failed</p>
              <p className="text-sm text-muted-foreground">{discoverError}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto"
              onClick={() => setDiscoverError(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Discovered Topics Review */}
        {showDiscoveredReview && discoveredTopics.length > 0 && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Discovered Topics ({discoveredTopics.filter((t) => t.selected).length}/{discoveredTopics.length} selected)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Review the discovered topics below. Click to select or deselect topics before saving.
              </p>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {discoveredTopics.map((topic, index) => (
                  <div
                    key={index}
                    onClick={() => toggleDiscoveredTopic(index)}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                      topic.selected
                        ? "bg-primary/10 border-primary/30 hover:bg-primary/15"
                        : "bg-muted/30 border-muted hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex-1">
                      <p className={`font-medium ${!topic.selected && "text-muted-foreground"}`}>
                        {topic.title}
                      </p>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        {topic.category && (
                          <span className="text-xs bg-muted px-2 py-0.5 rounded">
                            {topic.category}
                          </span>
                        )}
                        {topic.keywords?.slice(0, 3).map((kw, i) => (
                          <span key={i} className="text-xs text-muted-foreground">
                            {kw}
                          </span>
                        ))}
                        {topic.keywords?.length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{topic.keywords.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">P{topic.priority}</span>
                      {topic.selected ? (
                        <CheckCircle className="h-5 w-5 text-primary" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 justify-end pt-2 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDiscoveredReview(false);
                    setDiscoveredTopics([]);
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveDiscoveredTopics}
                  disabled={savingDiscovered || discoveredTopics.filter((t) => t.selected).length === 0}
                >
                  {savingDiscovered ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Save {discoveredTopics.filter((t) => t.selected).length} Topics
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Add Topic Form */}
        {showAddForm && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add New Topic</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="title">Topic Title</Label>
                  <Input
                    id="title"
                    placeholder="How to optimize your SEO strategy"
                    value={newTopic.title}
                    onChange={(e) => setNewTopic({ ...newTopic, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="keywords">Keywords (comma-separated)</Label>
                  <Input
                    id="keywords"
                    placeholder="SEO, optimization, strategy"
                    value={newTopic.keywords}
                    onChange={(e) => setNewTopic({ ...newTopic, keywords: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    placeholder="guides"
                    value={newTopic.category}
                    onChange={(e) => setNewTopic({ ...newTopic, category: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority (1-10)</Label>
                  <Input
                    id="priority"
                    type="number"
                    min={1}
                    max={10}
                    value={newTopic.priority}
                    onChange={(e) => setNewTopic({ ...newTopic, priority: parseInt(e.target.value) || 5 })}
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowAddForm(false)}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleAddTopic} disabled={saving || !newTopic.title.trim()}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Add Topic
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Available Topics */}
        <Card>
          <CardHeader>
            <CardTitle>Available Topics ({unusedTopics.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : unusedTopics.length > 0 ? (
              <div className="space-y-2">
                {unusedTopics.map((topic) => (
                  <div
                    key={topic.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{topic.title}</p>
                      <div className="flex gap-2 mt-1">
                        {topic.category && (
                          <span className="text-xs bg-muted px-2 py-0.5 rounded">
                            {topic.category}
                          </span>
                        )}
                        {topic.keywords?.map((kw, i) => (
                          <span key={i} className="text-xs text-muted-foreground">
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-muted rounded px-2 py-1">
                        <button
                          onClick={() => handlePriorityChange(topic.id, -1)}
                          className="hover:text-primary"
                          disabled={topic.priority <= 1}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                        <span className="text-sm font-medium w-4 text-center">
                          {topic.priority}
                        </span>
                        <button
                          onClick={() => handlePriorityChange(topic.id, 1)}
                          className="hover:text-primary"
                          disabled={topic.priority >= 10}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteTopic(topic.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No available topics. Add topics manually or use <strong>Discover Topics</strong> to find trending topics with AI.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Used Topics */}
        {usedTopics.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-muted-foreground">
                Used Topics ({usedTopics.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {usedTopics.map((topic) => (
                  <div
                    key={topic.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                  >
                    <div className="flex-1">
                      <p className="text-muted-foreground">{topic.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Used on {topic.used_at ? new Date(topic.used_at).toLocaleDateString() : "N/A"}
                        {topic.last_seo_score && ` • SEO Score: ${topic.last_seo_score}`}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteTopic(topic.id)}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
