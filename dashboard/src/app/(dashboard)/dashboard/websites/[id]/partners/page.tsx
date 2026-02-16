"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/dashboard/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  Link2,
  ExternalLink,
  Edit2,
  AlertTriangle,
  Globe,
} from "lucide-react";
import type { WebsitePartner, PartnerTargetUrl } from "@/types/database";

interface PartnerFormData {
  partner_name: string;
  partner_domain: string;
  target_urls: PartnerTargetUrl[];
  link_categories: string[];
  max_links_per_article: number;
  link_placement: "beginning" | "middle" | "end" | "natural";
  priority: number;
  is_active: boolean;
}

const DEFAULT_FORM_DATA: PartnerFormData = {
  partner_name: "",
  partner_domain: "",
  target_urls: [{ url: "/", anchors: [""] }],
  link_categories: [],
  max_links_per_article: 1,
  link_placement: "natural",
  priority: 5,
  is_active: true,
};

export default function PartnersPage() {
  const params = useParams();
  const websiteId = params.id as string;
  const supabase = createClient();

  const [partners, setPartners] = useState<WebsitePartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [migrationRequired, setMigrationRequired] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPartner, setEditingPartner] = useState<string | null>(null);
  const [formData, setFormData] = useState<PartnerFormData>(DEFAULT_FORM_DATA);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch website categories for filtering
  const [websiteCategories, setWebsiteCategories] = useState<string[]>([]);

  useEffect(() => {
    fetchPartners();
    fetchWebsiteCategories();
  }, [websiteId]);

  const fetchPartners = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("website_partners")
        .select("*")
        .eq("website_id", websiteId)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false });

      if (fetchError) {
        // Check if table doesn't exist (migration not run)
        if (fetchError.code === "42P01") {
          setMigrationRequired(true);
          setPartners([]);
          return;
        }
        throw fetchError;
      }

      setPartners(data || []);
      setMigrationRequired(false);
    } catch (err) {
      console.error("Error fetching partners:", err);
      setError("Failed to load partners");
    } finally {
      setLoading(false);
    }
  };

  const fetchWebsiteCategories = async () => {
    // Fetch categories from website config or topics
    const { data: website } = await supabase
      .from("websites")
      .select("categories")
      .eq("id", websiteId)
      .single();

    if (website?.categories?.category_keywords) {
      setWebsiteCategories(Object.keys(website.categories.category_keywords));
    }

    // Also get unique categories from topics
    const { data: topics } = await supabase
      .from("topics")
      .select("category")
      .eq("website_id", websiteId)
      .not("category", "is", null);

    if (topics) {
      const topicCategories = [...new Set(topics.map((t) => t.category).filter(Boolean))];
      setWebsiteCategories((prev) => [...new Set([...prev, ...topicCategories])]);
    }
  };

  const handleAddPartner = async () => {
    if (!formData.partner_name.trim() || !formData.partner_domain.trim()) {
      setError("Partner name and domain are required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Clean domain (remove protocol and trailing slash)
      const cleanDomain = formData.partner_domain
        .replace(/^https?:\/\//, "")
        .replace(/\/$/, "");

      // Filter out empty target URLs
      const validTargetUrls = formData.target_urls.filter(
        (t) => t.url.trim() && t.anchors.some((a) => a.trim())
      );

      const { error: insertError } = await supabase.from("website_partners").insert({
        website_id: websiteId,
        partner_name: formData.partner_name.trim(),
        partner_domain: cleanDomain,
        target_urls: validTargetUrls.map((t) => ({
          url: t.url.trim(),
          anchors: t.anchors.filter((a) => a.trim()),
        })),
        link_categories: formData.link_categories.filter(Boolean),
        max_links_per_article: formData.max_links_per_article,
        link_placement: formData.link_placement,
        priority: formData.priority,
        is_active: formData.is_active,
      });

      if (insertError) {
        if (insertError.code === "23505") {
          throw new Error(`Partner "${cleanDomain}" already exists for this website`);
        }
        throw insertError;
      }

      setFormData(DEFAULT_FORM_DATA);
      setShowAddForm(false);
      fetchPartners();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add partner");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePartner = async (partnerId: string) => {
    setSaving(true);
    setError(null);

    try {
      // Filter out empty target URLs
      const validTargetUrls = formData.target_urls.filter(
        (t) => t.url.trim() && t.anchors.some((a) => a.trim())
      );

      const { error: updateError } = await supabase
        .from("website_partners")
        .update({
          partner_name: formData.partner_name.trim(),
          target_urls: validTargetUrls.map((t) => ({
            url: t.url.trim(),
            anchors: t.anchors.filter((a) => a.trim()),
          })),
          link_categories: formData.link_categories.filter(Boolean),
          max_links_per_article: formData.max_links_per_article,
          link_placement: formData.link_placement,
          priority: formData.priority,
          is_active: formData.is_active,
        })
        .eq("id", partnerId)
        .eq("website_id", websiteId);

      if (updateError) throw updateError;

      setEditingPartner(null);
      setFormData(DEFAULT_FORM_DATA);
      fetchPartners();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update partner");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePartner = async (partnerId: string) => {
    if (!confirm("Delete this partner? This cannot be undone.")) return;

    try {
      const { error: deleteError } = await supabase
        .from("website_partners")
        .delete()
        .eq("id", partnerId)
        .eq("website_id", websiteId);

      if (deleteError) throw deleteError;
      fetchPartners();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete partner");
    }
  };

  const handlePriorityChange = async (partnerId: string, delta: number) => {
    const partner = partners.find((p) => p.id === partnerId);
    if (!partner) return;

    const newPriority = Math.max(1, Math.min(10, partner.priority + delta));

    try {
      await supabase
        .from("website_partners")
        .update({ priority: newPriority })
        .eq("id", partnerId);
      fetchPartners();
    } catch (err) {
      console.error("Error updating priority:", err);
    }
  };

  const handleToggleActive = async (partnerId: string, currentState: boolean) => {
    try {
      await supabase
        .from("website_partners")
        .update({ is_active: !currentState })
        .eq("id", partnerId);
      fetchPartners();
    } catch (err) {
      console.error("Error toggling active state:", err);
    }
  };

  const startEditing = (partner: WebsitePartner) => {
    setEditingPartner(partner.id);
    setFormData({
      partner_name: partner.partner_name,
      partner_domain: partner.partner_domain,
      target_urls: partner.target_urls.length > 0 ? partner.target_urls : [{ url: "/", anchors: [""] }],
      link_categories: partner.link_categories || [],
      max_links_per_article: partner.max_links_per_article,
      link_placement: partner.link_placement,
      priority: partner.priority,
      is_active: partner.is_active,
    });
    setShowAddForm(false);
  };

  const cancelEditing = () => {
    setEditingPartner(null);
    setFormData(DEFAULT_FORM_DATA);
  };

  // Target URL management helpers
  const addTargetUrl = () => {
    setFormData((prev) => ({
      ...prev,
      target_urls: [...prev.target_urls, { url: "", anchors: [""] }],
    }));
  };

  const removeTargetUrl = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      target_urls: prev.target_urls.filter((_, i) => i !== index),
    }));
  };

  const updateTargetUrl = (index: number, field: "url" | "anchors", value: string | string[]) => {
    setFormData((prev) => ({
      ...prev,
      target_urls: prev.target_urls.map((t, i) =>
        i === index ? { ...t, [field]: value } : t
      ),
    }));
  };

  // Category toggle helper
  const toggleCategory = (category: string) => {
    setFormData((prev) => ({
      ...prev,
      link_categories: prev.link_categories.includes(category)
        ? prev.link_categories.filter((c) => c !== category)
        : [...prev.link_categories, category],
    }));
  };

  const activePartners = partners.filter((p) => p.is_active);
  const inactivePartners = partners.filter((p) => !p.is_active);

  // Render migration required notice
  if (migrationRequired) {
    return (
      <div className="flex flex-col">
        <Header title="Partner Backlinking" description="Manage partner websites for mutual backlinking" />
        <div className="p-6 space-y-6">
          <Link href={`/dashboard/websites/${websiteId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Website
            </Button>
          </Link>

          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-800">
                <AlertTriangle className="h-5 w-5" />
                Database Migration Required
              </CardTitle>
              <CardDescription className="text-yellow-700">
                The partner backlinking feature requires a database migration.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-yellow-800">
                Run the following migration in your Supabase dashboard to enable this feature:
              </p>
              <code className="block bg-yellow-100 p-3 rounded text-sm font-mono text-yellow-900">
                migrations/005_website_partners.sql
              </code>
              <p className="text-xs text-yellow-700">
                This will create the <code>website_partners</code> table and add the <code>backlinks</code> column to articles.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <Header
        title="Partner Backlinking"
        description="Manage partner websites for mutual SEO backlinking"
      />

      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Link href={`/dashboard/websites/${websiteId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Website
            </Button>
          </Link>

          <Button
            onClick={() => {
              setShowAddForm(true);
              setEditingPartner(null);
              setFormData(DEFAULT_FORM_DATA);
            }}
            disabled={showAddForm}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Partner
          </Button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-destructive">Error</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setError(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Add Partner Form */}
        {showAddForm && (
          <PartnerForm
            formData={formData}
            setFormData={setFormData}
            websiteCategories={websiteCategories}
            onSave={handleAddPartner}
            onCancel={() => {
              setShowAddForm(false);
              setFormData(DEFAULT_FORM_DATA);
            }}
            saving={saving}
            isNew
            addTargetUrl={addTargetUrl}
            removeTargetUrl={removeTargetUrl}
            updateTargetUrl={updateTargetUrl}
            toggleCategory={toggleCategory}
          />
        )}

        {/* Active Partners */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Active Partners ({activePartners.length})
            </CardTitle>
            <CardDescription>
              These partners will have backlinks automatically added to generated articles
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : activePartners.length > 0 ? (
              <div className="space-y-3">
                {activePartners.map((partner) =>
                  editingPartner === partner.id ? (
                    <PartnerForm
                      key={partner.id}
                      formData={formData}
                      setFormData={setFormData}
                      websiteCategories={websiteCategories}
                      onSave={() => handleUpdatePartner(partner.id)}
                      onCancel={cancelEditing}
                      saving={saving}
                      isNew={false}
                      addTargetUrl={addTargetUrl}
                      removeTargetUrl={removeTargetUrl}
                      updateTargetUrl={updateTargetUrl}
                      toggleCategory={toggleCategory}
                    />
                  ) : (
                    <PartnerCard
                      key={partner.id}
                      partner={partner}
                      onEdit={() => startEditing(partner)}
                      onDelete={() => handleDeletePartner(partner.id)}
                      onToggleActive={() => handleToggleActive(partner.id, partner.is_active)}
                      onPriorityChange={(delta) => handlePriorityChange(partner.id, delta)}
                    />
                  )
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No active partners. Add a partner website to start generating backlinks in your articles.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Inactive Partners */}
        {inactivePartners.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-muted-foreground">
                Inactive Partners ({inactivePartners.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {inactivePartners.map((partner) =>
                  editingPartner === partner.id ? (
                    <PartnerForm
                      key={partner.id}
                      formData={formData}
                      setFormData={setFormData}
                      websiteCategories={websiteCategories}
                      onSave={() => handleUpdatePartner(partner.id)}
                      onCancel={cancelEditing}
                      saving={saving}
                      isNew={false}
                      addTargetUrl={addTargetUrl}
                      removeTargetUrl={removeTargetUrl}
                      updateTargetUrl={updateTargetUrl}
                      toggleCategory={toggleCategory}
                    />
                  ) : (
                    <PartnerCard
                      key={partner.id}
                      partner={partner}
                      onEdit={() => startEditing(partner)}
                      onDelete={() => handleDeletePartner(partner.id)}
                      onToggleActive={() => handleToggleActive(partner.id, partner.is_active)}
                      onPriorityChange={(delta) => handlePriorityChange(partner.id, delta)}
                    />
                  )
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-blue-800">
              How Partner Backlinking Works
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-700 space-y-2">
            <p>
              When articles are generated, the system automatically inserts contextual backlinks to your partner websites based on:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Category matching</strong> - Links are only added to articles in relevant categories</li>
              <li><strong>Priority ranking</strong> - Higher priority partners get linked first</li>
              <li><strong>Anchor text rotation</strong> - Different anchor texts are used for natural linking patterns</li>
              <li><strong>Link placement</strong> - Control where in the article the link appears</li>
            </ul>
            <p className="text-xs text-blue-600 pt-2">
              All backlinks are stored in the article&apos;s <code>backlinks</code> field for tracking and reporting.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Partner Card Component
function PartnerCard({
  partner,
  onEdit,
  onDelete,
  onToggleActive,
  onPriorityChange,
}: {
  partner: WebsitePartner;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  onPriorityChange: (delta: number) => void;
}) {
  return (
    <div
      className={`flex items-start justify-between p-4 rounded-lg border ${
        partner.is_active ? "hover:bg-accent/50" : "bg-muted/30"
      }`}
    >
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{partner.partner_name}</span>
          <a
            href={`https://${partner.partner_domain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            {partner.partner_domain}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {/* Target URLs */}
        {partner.target_urls && partner.target_urls.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {partner.target_urls.slice(0, 3).map((target, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {target.url}
              </Badge>
            ))}
            {partner.target_urls.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{partner.target_urls.length - 3} more
              </Badge>
            )}
          </div>
        )}

        {/* Categories */}
        {partner.link_categories && partner.link_categories.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>Categories:</span>
            {partner.link_categories.map((cat, idx) => (
              <span key={idx} className="bg-muted px-1.5 py-0.5 rounded">
                {cat}
              </span>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>Placement: {partner.link_placement}</span>
          <span>Max links: {partner.max_links_per_article}/article</span>
          <span>Total links: {partner.total_links_generated}</span>
          {partner.last_linked_at && (
            <span>Last linked: {new Date(partner.last_linked_at).toLocaleDateString()}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Priority */}
        <div className="flex items-center gap-1 bg-muted rounded px-2 py-1">
          <button
            onClick={() => onPriorityChange(-1)}
            className="hover:text-primary"
            disabled={partner.priority <= 1}
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium w-4 text-center">{partner.priority}</span>
          <button
            onClick={() => onPriorityChange(1)}
            className="hover:text-primary"
            disabled={partner.priority >= 10}
          >
            <ChevronUp className="h-4 w-4" />
          </button>
        </div>

        {/* Toggle Active */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleActive}
          className={partner.is_active ? "text-green-600" : "text-muted-foreground"}
        >
          {partner.is_active ? "Active" : "Paused"}
        </Button>

        {/* Edit */}
        <Button variant="ghost" size="icon" onClick={onEdit}>
          <Edit2 className="h-4 w-4" />
        </Button>

        {/* Delete */}
        <Button variant="ghost" size="icon" onClick={onDelete}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

// Partner Form Component
function PartnerForm({
  formData,
  setFormData,
  websiteCategories,
  onSave,
  onCancel,
  saving,
  isNew,
  addTargetUrl,
  removeTargetUrl,
  updateTargetUrl,
  toggleCategory,
}: {
  formData: PartnerFormData;
  setFormData: React.Dispatch<React.SetStateAction<PartnerFormData>>;
  websiteCategories: string[];
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  isNew: boolean;
  addTargetUrl: () => void;
  removeTargetUrl: (index: number) => void;
  updateTargetUrl: (index: number, field: "url" | "anchors", value: string | string[]) => void;
  toggleCategory: (category: string) => void;
}) {
  return (
    <Card className={isNew ? "" : "border-primary/20"}>
      <CardHeader>
        <CardTitle className="text-base">
          {isNew ? "Add New Partner" : "Edit Partner"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Basic Info */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="partner_name">Partner Name</Label>
            <Input
              id="partner_name"
              placeholder="Jacht Examen Oefenen"
              value={formData.partner_name}
              onChange={(e) => setFormData({ ...formData, partner_name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="partner_domain">Partner Domain</Label>
            <Input
              id="partner_domain"
              placeholder="jacht-examen-oefenen.nl"
              value={formData.partner_domain}
              onChange={(e) => setFormData({ ...formData, partner_domain: e.target.value })}
              disabled={!isNew}
            />
            {!isNew && (
              <p className="text-xs text-muted-foreground">Domain cannot be changed after creation</p>
            )}
          </div>
        </div>

        {/* Target URLs */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Target URLs & Anchor Texts</Label>
            <Button variant="outline" size="sm" onClick={addTargetUrl}>
              <Plus className="h-3 w-3 mr-1" />
              Add URL
            </Button>
          </div>
          <div className="space-y-3">
            {formData.target_urls.map((target, idx) => (
              <div key={idx} className="flex gap-2 items-start p-3 border rounded-lg bg-muted/30">
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder="/oefenexamen"
                    value={target.url}
                    onChange={(e) => updateTargetUrl(idx, "url", e.target.value)}
                  />
                  <Input
                    placeholder="Anchor texts (comma-separated): oefenexamen, oefen nu gratis"
                    value={target.anchors.join(", ")}
                    onChange={(e) =>
                      updateTargetUrl(
                        idx,
                        "anchors",
                        e.target.value.split(",").map((a) => a.trim())
                      )
                    }
                  />
                </div>
                {formData.target_urls.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeTargetUrl(idx)}
                    className="shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Categories */}
        {websiteCategories.length > 0 && (
          <div className="space-y-2">
            <Label>Link in Categories (leave empty for all)</Label>
            <div className="flex flex-wrap gap-2">
              {websiteCategories.map((cat) => (
                <Badge
                  key={cat}
                  variant={formData.link_categories.includes(cat) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleCategory(cat)}
                >
                  {cat}
                  {formData.link_categories.includes(cat) && (
                    <Check className="h-3 w-3 ml-1" />
                  )}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Settings Row */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="max_links">Max Links Per Article</Label>
            <Input
              id="max_links"
              type="number"
              min={1}
              max={3}
              value={formData.max_links_per_article}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  max_links_per_article: Math.min(3, Math.max(1, parseInt(e.target.value) || 1)),
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="placement">Link Placement</Label>
            <select
              id="placement"
              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={formData.link_placement}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  link_placement: e.target.value as PartnerFormData["link_placement"],
                })
              }
            >
              <option value="natural">Natural (context-based)</option>
              <option value="beginning">Beginning of article</option>
              <option value="middle">Middle of article</option>
              <option value="end">End of article</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="priority">Priority (1-10)</Label>
            <Input
              id="priority"
              type="number"
              min={1}
              max={10}
              value={formData.priority}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  priority: Math.min(10, Math.max(1, parseInt(e.target.value) || 5)),
                })
              }
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end pt-2 border-t">
          <Button variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={onSave}
            disabled={saving || !formData.partner_name.trim() || !formData.partner_domain.trim()}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            {isNew ? "Add Partner" : "Save Changes"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
