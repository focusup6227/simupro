// SimuPro Blog post — /blog/[slug]
//
// Static post detail. Wraps in `landing-shell blog-shell` so the navy
// palette + prose styles activate.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { LandingHeader } from "@/components/landing/header";
import { LandingFooter } from "@/components/landing/footer";
import { PostThumb } from "@/components/blog/post-thumb";
import { ProgressBar } from "@/components/blog/progress-bar";
import {
  getPostBySlug,
  getRelatedPosts,
  formatPostDate,
  posts,
  type BlogPostSummary,
} from "@/lib/blog-data";

export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: "Post not found" };
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.publishedAt,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const related = getRelatedPosts(slug, 3);

  return (
    <main className="landing-shell blog-shell">
      <LandingHeader />
      <ProgressBar />

      {/* Article hero */}
      <section
        className="relative field-grain overflow-hidden border-b border-white/[0.05]"
        style={{
          background:
            "linear-gradient(180deg, #04102b 0%, #061839 100%)",
        }}
      >
        <div
          className="absolute -top-32 -right-24 w-[36rem] h-[36rem] rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(63,184,229,0.16) 0%, transparent 60%)",
            filter: "blur(40px)",
          }}
        />
        <div
          className="absolute -bottom-40 -left-24 w-[36rem] h-[36rem] rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(255,122,24,0.12) 0%, transparent 60%)",
            filter: "blur(40px)",
          }}
        />

        <div className="relative z-10 max-w-3xl mx-auto px-6 lg:px-10 pt-12 pb-14 lg:pt-16 lg:pb-20">
          <div className="flex items-center gap-2 text-[11.5px] font-mono text-white/45 mb-7">
            <Link href="/blog" className="hover:text-white">
              Field Notes
            </Link>
            <span className="text-white/25">/</span>
            <span className="hover:text-white">{post.category}</span>
          </div>

          <div className="flex items-center gap-2.5 mb-5">
            <span className="tag tag-cyan">{post.category}</span>
            <span className="text-[11.5px] text-white/40 font-mono">
              {post.readMinutes} MIN READ · {formatPostDate(post.publishedAt)}
            </span>
          </div>

          <h1 className="font-display font-bold text-white text-[40px] sm:text-[52px] lg:text-[58px] leading-[1.02] mb-5">
            {post.title}
          </h1>

          <p className="text-[19px] text-white/55 leading-[1.55] max-w-2xl">
            {post.excerpt}
          </p>

          <div className="mt-9 flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-full bg-gradient-to-br ${post.author.avatarGradient} flex items-center justify-center text-[13px] font-bold text-white`}
            >
              {post.author.initials}
            </div>
            <div className="leading-tight">
              <div className="text-[14px] text-white font-medium">
                {post.author.name}
              </div>
              <div className="text-[11.5px] text-white/45 font-mono">
                {post.author.role}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Body */}
      <div className="max-w-3xl mx-auto px-6 lg:px-10 py-12 lg:py-16">
        <article className="prose-sim">{post.body}</article>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <section
          className="py-16 lg:py-24 border-t border-white/[0.05]"
          style={{ background: "#04102b" }}
        >
          <div className="max-w-5xl mx-auto px-6 lg:px-10">
            <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-300/90 font-mono mb-3">
              // KEEP READING
            </div>
            <h2 className="font-display font-bold text-white text-[26px] sm:text-[32px] leading-tight mb-8">
              Related posts
            </h2>
            <div className="grid sm:grid-cols-3 gap-5">
              {related.map((r) => (
                <RelatedCard key={r.slug} p={r} />
              ))}
            </div>
          </div>
        </section>
      )}

      <LandingFooter />
    </main>
  );
}

function RelatedCard({ p }: { p: BlogPostSummary }) {
  return (
    <Link href={`/blog/${p.slug}`} className="block group">
      <article className="panel-navy rounded-2xl overflow-hidden flex flex-col h-full transition group-hover:border-white/15">
        <PostThumb palette={p.palette} kind={p.thumb} />
        <div className="p-5 flex flex-col flex-1">
          <span className="tag tag-cyan w-fit mb-2.5">{p.category}</span>
          <h3 className="font-display font-semibold text-white text-[15.5px] leading-[1.25] mb-3 flex-1">
            {p.title}
          </h3>
          <div className="text-[10.5px] text-white/35 font-mono">
            {p.readMinutes} MIN READ
          </div>
        </div>
      </article>
    </Link>
  );
}
