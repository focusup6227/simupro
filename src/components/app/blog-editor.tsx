"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { useSupabase } from "@/supabase";
import { useToast } from "@/hooks/use-toast";
import { Panel } from "@/components/app/app-primitives";
import { Icons } from "@/components/app/icons";
import type { BlogPostRow } from "@/lib/blog-db";
import type { BlogCategory } from "@/lib/blog-data";

const CATEGORIES: BlogCategory[] = [
  "Training tips",
  "Protocol notes",
  "Engineering",
  "Release notes",
  "From the field",
];

const PALETTES = ["cyan", "orange", "navy", "amber", "purple"] as const;

function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

type Draft = {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  category: BlogCategory;
  read_minutes: number;
  featured: boolean;
  status: "draft" | "published";
  author_name: string;
  author_role: string;
  author_initials: string;
  palette: string;
};

const EMPTY: Draft = {
  slug: "",
  title: "",
  excerpt: "",
  body: "",
  category: "Training tips",
  read_minutes: 5,
  featured: false,
  status: "draft",
  author_name: "SimuPro Team",
  author_role: "",
  author_initials: "ST",
  palette: "cyan",
};

export function BlogEditor({ postId }: { postId?: string }) {
  const client = useSupabase();
  const router = useRouter();
  const { toast } = useToast();
  const [draft, setDraft] = React.useState<Draft>(EMPTY);
  const [loading, setLoading] = React.useState(!!postId);
  const [saving, setSaving] = React.useState(false);
  const [preview, setPreview] = React.useState(false);
  const [slugTouched, setSlugTouched] = React.useState(false);

  React.useEffect(() => {
    if (!postId || !client) return;
    client
      .from("blog_posts")
      .select("*")
      .eq("id", postId)
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          const p = data as BlogPostRow;
          setDraft({
            slug: p.slug,
            title: p.title,
            excerpt: p.excerpt,
            body: p.body,
            category: p.category as BlogCategory,
            read_minutes: p.read_minutes,
            featured: p.featured,
            status: p.status,
            author_name: p.author_name,
            author_role: p.author_role,
            author_initials: p.author_initials,
            palette: p.palette,
          });
          setSlugTouched(true);
        }
        setLoading(false);
      });
  }, [postId, client]);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function handleTitleChange(v: string) {
    set("title", v);
    if (!slugTouched) set("slug", slugify(v));
  }

  async function handleSave(publish?: boolean) {
    if (!client) return;
    if (!draft.title.trim() || !draft.slug.trim()) {
      toast({ variant: "destructive", title: "Title and slug are required." });
      return;
    }
    setSaving(true);
    const now = new Date().toISOString();
    const payload = {
      ...draft,
      status: publish ? "published" as const : draft.status,
      published_at: publish && draft.status !== "published" ? now : undefined,
      updated_at: now,
    };

    const { error } = postId
      ? await client.from("blog_posts").update(payload).eq("id", postId)
      : await client.from("blog_posts").insert({ ...payload, created_at: now });

    setSaving(false);
    if (error) {
      toast({ variant: "destructive", title: "Save failed", description: error.message });
    } else {
      toast({ title: publish ? "Published!" : "Saved", description: `"${draft.title}" ${publish ? "is now live." : "saved as draft."}` });
      router.push("/dashboard/admin/blog");
    }
  }

  if (loading) {
    return (
      <div className="app-shell p-7 text-center text-[13px]" style={{ color: "var(--text-mute)" }}>
        Loading post…
      </div>
    );
  }

  return (
    <div className="app-shell p-7 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => router.push("/dashboard/admin/blog")}
          className="h-8 w-8 rounded-md flex items-center justify-center transition hover:bg-white/[0.05]"
          style={{ color: "var(--text-mute)" }}
        >
          <Icons.Arrow className="w-4 h-4 rotate-180" />
        </button>
        <div className="flex-1">
          <div className="text-[10.5px] uppercase tracking-[0.22em] font-mono mb-0.5" style={{ color: "var(--orange)" }}>
            // ADMIN · BLOG
          </div>
          <h1 className="font-display font-bold text-white text-[24px] leading-tight">
            {postId ? "Edit post" : "New post"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPreview((v) => !v)}
            className="h-8 px-3 rounded-md text-[12.5px] font-mono transition hover:bg-white/[0.05]"
            style={{ color: preview ? "var(--cyan-soft)" : "var(--text-mute)" }}
          >
            {preview ? "Edit" : "Preview"}
          </button>
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving}
            className="h-8 px-3 rounded-md text-[12.5px] font-semibold transition"
            style={{ background: "rgba(255,255,255,0.06)", color: "var(--text)", border: "1px solid var(--border-soft)" }}
          >
            {saving ? "Saving…" : "Save draft"}
          </button>
          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={saving}
            className="h-8 px-4 rounded-lg text-[12.5px] font-semibold transition"
            style={{ background: "var(--orange)", color: "#fff" }}
          >
            {draft.status === "published" ? "Update" : "Publish"}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-5">
        {/* Main editor */}
        <div className="space-y-4">
          <Panel>
            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.15em] font-mono mb-1.5" style={{ color: "var(--text-dim)" }}>
                  Title
                </label>
                <input
                  type="text"
                  value={draft.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Why our cardiac monitor renders at 60fps…"
                  className="w-full bg-transparent border rounded-md px-3 py-2 text-[15px] text-white placeholder:text-white/25 outline-none focus:border-cyan-400/50 transition"
                  style={{ borderColor: "var(--border-soft)" }}
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-[0.15em] font-mono mb-1.5" style={{ color: "var(--text-dim)" }}>
                  Slug
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-mono" style={{ color: "var(--text-dim)" }}>/blog/</span>
                  <input
                    type="text"
                    value={draft.slug}
                    onChange={(e) => { setSlugTouched(true); set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); }}
                    placeholder="post-url-slug"
                    className="flex-1 bg-transparent border rounded-md px-3 py-2 text-[13px] font-mono text-white placeholder:text-white/25 outline-none focus:border-cyan-400/50 transition"
                    style={{ borderColor: "var(--border-soft)" }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-[0.15em] font-mono mb-1.5" style={{ color: "var(--text-dim)" }}>
                  Excerpt
                </label>
                <textarea
                  value={draft.excerpt}
                  onChange={(e) => set("excerpt", e.target.value)}
                  placeholder="One-line summary shown on the blog index card…"
                  rows={2}
                  className="w-full bg-transparent border rounded-md px-3 py-2 text-[13.5px] text-white placeholder:text-white/25 outline-none focus:border-cyan-400/50 resize-none transition"
                  style={{ borderColor: "var(--border-soft)" }}
                />
              </div>
            </div>
          </Panel>

          <Panel>
            <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: "var(--border-soft)" }}>
              <span className="text-[12px] font-mono" style={{ color: "var(--text-mute)" }}>
                {preview ? "Preview" : "Markdown"}
              </span>
              {!preview && (
                <span className="ml-auto text-[10.5px] font-mono" style={{ color: "var(--text-dim)" }}>
                  # H2 · ## H3 · **bold** · *italic* · `code` · &gt; quote · - list
                </span>
              )}
            </div>
            {preview ? (
              <div className="landing-shell blog-shell px-5 py-5 min-h-[400px]">
                <article className="prose-sim">
                  <ReactMarkdown>{draft.body}</ReactMarkdown>
                </article>
              </div>
            ) : (
              <textarea
                value={draft.body}
                onChange={(e) => set("body", e.target.value)}
                placeholder={"## Introduction\n\nStart writing your post in Markdown…"}
                className="w-full bg-transparent px-5 py-4 text-[13.5px] font-mono text-white/85 placeholder:text-white/20 outline-none resize-none"
                style={{ minHeight: 480, lineHeight: 1.65 }}
              />
            )}
          </Panel>
        </div>

        {/* Sidebar settings */}
        <div className="space-y-4">
          <Panel>
            <div className="px-5 py-3 border-b" style={{ borderColor: "var(--border-soft)" }}>
              <span className="font-display font-semibold text-[13px] text-white">Post settings</span>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.15em] font-mono mb-1.5" style={{ color: "var(--text-dim)" }}>
                  Category
                </label>
                <select
                  value={draft.category}
                  onChange={(e) => set("category", e.target.value as BlogCategory)}
                  className="w-full bg-transparent border rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-cyan-400/50 transition"
                  style={{ borderColor: "var(--border-soft)", background: "var(--panel)" }}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c} style={{ background: "#0b1f44" }}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-[0.15em] font-mono mb-1.5" style={{ color: "var(--text-dim)" }}>
                  Read time (minutes)
                </label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={draft.read_minutes}
                  onChange={(e) => set("read_minutes", parseInt(e.target.value) || 5)}
                  className="w-full bg-transparent border rounded-md px-3 py-2 text-[13px] text-white outline-none focus:border-cyan-400/50 transition"
                  style={{ borderColor: "var(--border-soft)" }}
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-[0.15em] font-mono mb-1.5" style={{ color: "var(--text-dim)" }}>
                  Card palette
                </label>
                <div className="flex gap-2 flex-wrap">
                  {PALETTES.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => set("palette", p)}
                      className="h-7 px-2.5 rounded-md text-[11px] font-mono transition"
                      style={{
                        background: draft.palette === p ? "rgba(63,184,229,0.15)" : "rgba(255,255,255,0.04)",
                        color: draft.palette === p ? "var(--cyan-soft)" : "var(--text-mute)",
                        border: `1px solid ${draft.palette === p ? "rgba(63,184,229,0.3)" : "var(--border-soft)"}`,
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={draft.featured}
                    onChange={(e) => set("featured", e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className="w-9 h-5 rounded-full transition-colors"
                    style={{ background: draft.featured ? "var(--orange)" : "rgba(255,255,255,0.1)" }}
                  >
                    <div
                      className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                      style={{ transform: draft.featured ? "translateX(18px)" : "translateX(2px)" }}
                    />
                  </div>
                </div>
                <span className="text-[12.5px]" style={{ color: "var(--text-mute)" }}>
                  Feature on blog index
                </span>
              </label>
            </div>
          </Panel>

          <Panel>
            <div className="px-5 py-3 border-b" style={{ borderColor: "var(--border-soft)" }}>
              <span className="font-display font-semibold text-[13px] text-white">Author</span>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.15em] font-mono mb-1.5" style={{ color: "var(--text-dim)" }}>
                  Name
                </label>
                <input
                  type="text"
                  value={draft.author_name}
                  onChange={(e) => set("author_name", e.target.value)}
                  className="w-full bg-transparent border rounded-md px-3 py-2 text-[13px] text-white placeholder:text-white/25 outline-none focus:border-cyan-400/50 transition"
                  style={{ borderColor: "var(--border-soft)" }}
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.15em] font-mono mb-1.5" style={{ color: "var(--text-dim)" }}>
                  Role / title
                </label>
                <input
                  type="text"
                  value={draft.author_role}
                  onChange={(e) => set("author_role", e.target.value)}
                  placeholder="Lead EMS Educator"
                  className="w-full bg-transparent border rounded-md px-3 py-2 text-[13px] text-white placeholder:text-white/25 outline-none focus:border-cyan-400/50 transition"
                  style={{ borderColor: "var(--border-soft)" }}
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.15em] font-mono mb-1.5" style={{ color: "var(--text-dim)" }}>
                  Initials (avatar)
                </label>
                <input
                  type="text"
                  value={draft.author_initials}
                  onChange={(e) => set("author_initials", e.target.value.toUpperCase().slice(0, 3))}
                  maxLength={3}
                  className="w-full bg-transparent border rounded-md px-3 py-2 text-[13px] font-mono text-white placeholder:text-white/25 outline-none focus:border-cyan-400/50 transition"
                  style={{ borderColor: "var(--border-soft)" }}
                />
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
