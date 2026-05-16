"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSupabase } from "@/supabase";
import { useToast } from "@/hooks/use-toast";
import { Panel } from "@/components/app/app-primitives";
import { Icons } from "@/components/app/icons";
import type { BlogPostRow } from "@/lib/blog-db";

export default function AdminBlogPage() {
  const client = useSupabase();
  const router = useRouter();
  const { toast } = useToast();
  const [posts, setPosts] = React.useState<BlogPostRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!client) return;
    client
      .from("blog_posts")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) setPosts(data as BlogPostRow[]);
        setLoading(false);
      });
  }, [client]);

  async function handleDelete(id: string, title: string) {
    if (!client) return;
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    const { error } = await client.from("blog_posts").delete().eq("id", id);
    if (error) {
      toast({ variant: "destructive", title: "Delete failed", description: error.message });
    } else {
      setPosts((prev) => prev.filter((p) => p.id !== id));
      toast({ title: "Deleted", description: `"${title}" removed.` });
    }
  }

  async function handleToggleStatus(post: BlogPostRow) {
    if (!client) return;
    const next: "draft" | "published" = post.status === "published" ? "draft" : "published";
    const published_at = next === "published" ? new Date().toISOString() : post.published_at;
    const { error } = await client
      .from("blog_posts")
      .update({ status: next, published_at, updated_at: new Date().toISOString() })
      .eq("id", post.id);
    if (error) {
      toast({ variant: "destructive", title: "Update failed", description: error.message });
    } else {
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, status: next, published_at: published_at ?? p.published_at } : p))
      );
    }
  }

  return (
    <div className="app-shell p-7 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.22em] font-mono mb-1" style={{ color: "var(--orange)" }}>
            // ADMIN
          </div>
          <h1 className="font-display font-bold text-white text-[28px] leading-tight">
            Field Notes
          </h1>
          <p className="text-[13px] mt-1" style={{ color: "var(--text-mute)" }}>
            Manage blog posts for SEO and community.
          </p>
        </div>
        <Link
          href="/dashboard/admin/blog/new"
          className="inline-flex items-center gap-2 h-9 px-4 rounded-lg text-[13px] font-semibold transition"
          style={{ background: "var(--orange)", color: "#fff" }}
        >
          <Icons.Plus className="w-4 h-4" />
          New post
        </Link>
      </div>

      <Panel>
        <div className="px-5 py-3 border-b flex items-center gap-3" style={{ borderColor: "var(--border-soft)" }}>
          <Icons.Book className="w-4 h-4" style={{ color: "var(--text-mute)" }} />
          <span className="font-display font-semibold text-[14px] text-white">Posts</span>
          <span className="ml-auto text-[11px] font-mono" style={{ color: "var(--text-mute)" }}>
            {posts.length} total
          </span>
        </div>

        {loading ? (
          <div className="px-5 py-10 text-center text-[13px]" style={{ color: "var(--text-mute)" }}>
            Loading…
          </div>
        ) : posts.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-[13.5px] mb-4" style={{ color: "var(--text-mute)" }}>
              No posts yet. Write your first one.
            </p>
            <Link
              href="/dashboard/admin/blog/new"
              className="inline-flex items-center gap-2 h-8 px-3 rounded-md text-[12.5px] font-medium transition"
              style={{ background: "rgba(255,122,24,0.1)", color: "var(--orange-soft)", border: "1px solid rgba(255,122,24,0.2)" }}
            >
              <Icons.Plus className="w-3.5 h-3.5" />
              New post
            </Link>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border-hair)" }}>
            {posts.map((post) => (
              <div key={post.id} className="px-5 py-4 flex items-center gap-4 hover:bg-white/[0.015] transition">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      className="text-[10px] uppercase tracking-[0.15em] font-mono px-1.5 py-0.5 rounded"
                      style={
                        post.status === "published"
                          ? { background: "rgba(52,211,153,0.1)", color: "var(--success)", border: "1px solid rgba(52,211,153,0.2)" }
                          : { background: "rgba(255,255,255,0.04)", color: "var(--text-dim)", border: "1px solid var(--border-soft)" }
                      }
                    >
                      {post.status}
                    </span>
                    <span className="text-[11px] font-mono" style={{ color: "var(--text-dim)" }}>
                      {post.category}
                    </span>
                  </div>
                  <p className="text-[14px] text-white font-medium truncate">{post.title}</p>
                  <p className="text-[12px] truncate mt-0.5" style={{ color: "var(--text-mute)" }}>
                    {post.excerpt}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {post.status === "published" && (
                    <Link
                      href={`/blog/${post.slug}`}
                      target="_blank"
                      className="h-7 w-7 rounded-md flex items-center justify-center transition hover:bg-white/[0.05]"
                      style={{ color: "var(--text-mute)" }}
                      title="View live post"
                    >
                      <Icons.Arrow className="w-3.5 h-3.5" />
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(post)}
                    className="h-7 px-2 rounded-md text-[11px] font-mono transition hover:bg-white/[0.05]"
                    style={{ color: "var(--text-mute)" }}
                    title={post.status === "published" ? "Unpublish" : "Publish"}
                  >
                    {post.status === "published" ? "Unpublish" : "Publish"}
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(`/dashboard/admin/blog/${post.id}`)}
                    className="h-7 px-2 rounded-md text-[11px] font-mono transition hover:bg-white/[0.05]"
                    style={{ color: "var(--cyan-soft)" }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(post.id, post.title)}
                    className="h-7 w-7 rounded-md flex items-center justify-center transition hover:bg-red-500/10"
                    style={{ color: "var(--danger)" }}
                    title="Delete"
                  >
                    <Icons.X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
