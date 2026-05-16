// SimuPro Blog index — /blog
//
// Marketing page. Same shell as the landing — wraps everything in
// `landing-shell blog-shell` so the navy palette + prose styles activate
// without bleeding into the rest of the app.

import type { Metadata } from "next";
import Link from "next/link";
import { LandingHeader } from "@/components/landing/header";
import { LandingFooter } from "@/components/landing/footer";
import { PostThumb } from "@/components/blog/post-thumb";
import {
  posts,
  getFeaturedPost,
  getNonFeaturedPosts,
  getCategoriesWithCounts,
  formatPostDate,
  type BlogPostSummary,
} from "@/lib/blog-data";

export const metadata: Metadata = {
  title: "Field Notes",
  description:
    "Stories, releases, and protocol breakdowns from the SimuPro team. Field-tested writeups on EMS training, protocol rewrites, and our physiology engine.",
};

export default function BlogIndexPage() {
  const featured = getFeaturedPost();
  const rest = getNonFeaturedPosts();
  const categories = getCategoriesWithCounts();

  return (
    <main className="landing-shell blog-shell">
      <LandingHeader />

      {/* Featured */}
      {featured && (
        <section
          className="relative field-grain overflow-hidden border-b border-white/[0.05]"
          style={{
            background:
              "linear-gradient(180deg, #04102b 0%, #061839 100%)",
          }}
        >
          <div
            className="absolute -top-32 -left-32 w-[36rem] h-[36rem] rounded-full pointer-events-none"
            style={{
              background:
                "radial-gradient(circle, rgba(255,122,24,0.12) 0%, transparent 60%)",
              filter: "blur(40px)",
            }}
          />
          <div
            className="absolute -bottom-32 -right-32 w-[36rem] h-[36rem] rounded-full pointer-events-none"
            style={{
              background:
                "radial-gradient(circle, rgba(63,184,229,0.14) 0%, transparent 60%)",
              filter: "blur(40px)",
            }}
          />

          <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 pt-16 pb-12 lg:pt-20 lg:pb-16">
            <div className="flex items-center gap-3 mb-5">
              <span className="text-[11px] uppercase tracking-[0.22em] text-orange-300/90 font-mono">
                // FIELD NOTES
              </span>
              <span
                className="h-px w-12"
                style={{
                  background:
                    "linear-gradient(to right, rgba(255,122,24,0.45), transparent)",
                }}
              />
              <span className="text-[11px] uppercase tracking-[0.18em] text-white/45 font-mono">
                Stories, releases, and protocol breakdowns
              </span>
            </div>

            <h1 className="font-display font-bold text-white text-[42px] sm:text-[54px] lg:text-[64px] leading-[0.98] max-w-4xl">
              Built for the call.{" "}
              <span
                style={{
                  background:
                    "linear-gradient(120deg, #16d1ff 0%, #8fdcf6 40%, #ffb56b 70%, #ff7a18 100%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Written from it.
              </span>
            </h1>

            <p className="mt-5 text-[16px] text-white/55 max-w-2xl leading-relaxed">
              Field-tested writeups on EMS training, protocol rewrites, the
              physiology engine behind our scenarios, and what we&apos;ve
              learned shipping a sim that actually fights back.
            </p>

            {/* Featured card */}
            <Link href={`/blog/${featured.slug}`} className="block mt-12 group">
              <div className="panel-navy rounded-2xl overflow-hidden grid lg:grid-cols-[1.1fr_1fr] transition group-hover:border-white/15">
                <div className="relative">
                  <PostThumb palette={featured.palette} kind={featured.thumb} />
                  <span className="absolute top-4 left-4 tag tag-orange">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-300 siren-blip" />
                    featured
                  </span>
                </div>
                <div className="p-7 lg:p-10 flex flex-col">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="tag tag-cyan">{featured.category}</span>
                    <span className="text-[11.5px] text-white/40 font-mono">
                      {featured.readMinutes} MIN READ ·{" "}
                      {formatPostDate(featured.publishedAt)}
                    </span>
                  </div>
                  <h2 className="font-display font-bold text-white text-[24px] sm:text-[28px] leading-[1.15] mb-3.5">
                    {featured.title}
                  </h2>
                  <p className="text-[14.5px] text-white/55 leading-relaxed mb-7 flex-1">
                    {featured.excerpt}
                  </p>
                  <div className="flex items-center justify-between mt-auto">
                    <Author author={featured.author} />
                    <span className="text-[13px] text-cyan-300 group-hover:text-white inline-flex items-center gap-1.5">
                      Read post <span>→</span>
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* Filters */}
      <section
        className="border-b border-white/[0.05]"
        style={{ background: "#04102b" }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-6 flex items-center flex-wrap gap-3">
          {categories.map((c, i) => {
            const active = i === 0;
            return (
              <button
                key={c.name}
                type="button"
                className={`h-8 px-3 rounded-md text-[12.5px] font-medium transition inline-flex items-center gap-2 ${
                  active ? "" : "cta-secondary"
                }`}
                style={
                  active
                    ? {
                        background: "rgba(255,122,24,0.10)",
                        border: "1px solid rgba(255,122,24,0.35)",
                        color: "var(--orange-soft)",
                      }
                    : undefined
                }
              >
                <span>{c.name}</span>
                <span
                  className="font-mono text-[10.5px]"
                  style={{
                    color: active ? "rgba(255,180,90,0.7)" : "var(--text-dim)",
                  }}
                >
                  {c.count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Grid */}
      <section className="py-14 lg:py-20" style={{ background: "#04102b" }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="flex items-end justify-between mb-9">
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-300/90 font-mono mb-2">
                // LATEST
              </div>
              <h2 className="font-display font-bold text-white text-[28px] sm:text-[34px] leading-tight">
                Recent posts
              </h2>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {rest.map((p) => (
              <PostCard key={p.slug} p={p} />
            ))}
          </div>
        </div>
      </section>

      <LandingFooter />
    </main>
  );
}

function PostCard({ p }: { p: BlogPostSummary }) {
  return (
    <Link href={`/blog/${p.slug}`} className="block group">
      <article className="panel-navy rounded-2xl overflow-hidden flex flex-col h-full transition group-hover:-translate-y-0.5 group-hover:border-white/15">
        <div className="relative">
          <PostThumb palette={p.palette} kind={p.thumb} />
          {p.badge && (
            <span className="absolute top-3 left-3 tag tag-orange">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-300 siren-blip" />
              {p.badge}
            </span>
          )}
        </div>
        <div className="p-6 flex flex-col flex-1">
          <div className="flex items-center gap-2 mb-3">
            <span className="tag">{p.category}</span>
            <span className="text-[10.5px] text-white/40 font-mono">
              {p.readMinutes} MIN · {formatPostDate(p.publishedAt)}
            </span>
          </div>
          <h3 className="font-display font-semibold text-white text-[18px] leading-[1.2] mb-2.5">
            {p.title}
          </h3>
          <p className="text-[13.5px] text-white/55 leading-relaxed mb-5 flex-1">
            {p.excerpt}
          </p>
          <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/[0.05]">
            <Author author={p.author} small />
            <span className="text-[12px] text-cyan-300 group-hover:text-white inline-flex items-center gap-1">
              Read <span>→</span>
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

function Author({
  author,
  small,
}: {
  author: BlogPostSummary["author"];
  small?: boolean;
}) {
  const size = small ? "w-7 h-7 text-[10px]" : "w-8 h-8 text-[11px]";
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`${size} rounded-full bg-gradient-to-br ${author.avatarGradient} flex items-center justify-center font-bold text-white`}
      >
        {author.initials}
      </div>
      <div className="leading-tight">
        <div className={small ? "text-[12px] text-white" : "text-[12.5px] text-white"}>
          {author.name}
        </div>
        <div
          className={
            small
              ? "text-[10px] text-white/40 font-mono"
              : "text-[10.5px] text-white/40 font-mono"
          }
        >
          {author.role}
        </div>
      </div>
    </div>
  );
}
