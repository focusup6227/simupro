// SimuPro Blog — static post data + helpers.
//
// Drop-in static content store. Swap to MDX / a CMS later by replacing the
// `posts` array and `getPostBySlug()` — the routing/UI doesn't care.

import type * as React from "react";

export type BlogCategory =
  | "Engineering"
  | "Protocol notes"
  | "Training tips"
  | "Release notes"
  | "From the field";

export type BlogPostSummary = {
  slug: string;
  title: string;
  excerpt: string;
  category: BlogCategory;
  /** ISO 8601 — the date the post was published. */
  publishedAt: string;
  readMinutes: number;
  author: {
    name: string;
    role: string;
    initials: string;
    avatarGradient: string; // tailwind "from-X to-Y"
  };
  /** Palette for the SVG hero illustration on the card. */
  palette: "orange" | "cyan" | "navy" | "amber" | "purple";
  thumb: "waveform" | "pulse" | "syringe" | "compass" | "book";
  badge?: string;
  featured?: boolean;
};

export type BlogPost = BlogPostSummary & {
  /** Full body — JSX/MDX-ish. Replaced when a CMS is wired up. */
  body: React.ReactNode;
};

// ── Posts ─────────────────────────────────────────────────────────────
import { Callout } from "@/components/blog/callout";

export const posts: BlogPost[] = [
  {
    slug: "monitor-renders-at-60fps",
    title: "Why our cardiac monitor renders at 60fps in the browser",
    excerpt:
      "A walk-through of the rendering pipeline: requestAnimationFrame-driven SVG sweeps, clipPath caveats, and why we ditched canvas for the strip but kept it for capnography. Plus the one Safari bug that ate three weekends.",
    category: "Engineering",
    publishedAt: "2026-05-14",
    readMinutes: 8,
    author: {
      name: "Jordan Reyes",
      role: "Lead engineer · Paramedic",
      initials: "JR",
      avatarGradient: "from-orange-400 to-orange-700",
    },
    palette: "orange",
    thumb: "waveform",
    featured: true,
    body: (
      <>
        <p className="lead">
          When we set out to build the SimuPro cardiac monitor, we had a
          non-negotiable:{" "}
          <strong>
            it must look and feel like the real thing on a Zoll, a LIFEPAK, or
            a Philips MRx
          </strong>{" "}
          — and it must do that in a browser tab, on a Chromebook, in a station
          crew room, mid-shift. Here&apos;s how we got there, where we burned
          weekends, and what we&apos;d do differently.
        </p>

        <h2 id="the-starting-problem">The starting problem</h2>
        <p>
          A live ECG strip looks deceptively simple. Three boxes wide,
          twenty-five millimeters per second, a sawtooth grid, and a glowing
          trace that wraps every ~6 seconds. Easy, right? Three weekends in,
          we had: a janky sweep that dropped frames on every state update, a
          clipPath that visibly clipped at the wrong subpixel on Firefox, and
          a capnograph that lagged the ECG by ~80ms on slower machines.
        </p>
        <p>
          We had a choice: <code>&lt;canvas&gt;</code> with manual draw calls,
          or <code>&lt;svg&gt;</code> with strategic mutation. We picked SVG,
          and that&apos;s most of what this post is about.
        </p>

        <h2 id="why-not-canvas">Why not canvas?</h2>
        <p>
          The instinct is canvas — it&apos;s designed for high-FPS pixel work.
          But for a clinical monitor specifically, three properties of SVG
          turned out to matter more than raw throughput.
        </p>

        <h3>Hit-testing for free</h3>
        <p>
          Learners can tap any waveform to bring up its alarm config. With
          canvas, that&apos;s a manual implementation: track every drawn
          segment, intersect with pointer events. With SVG, you get it as DOM{" "}
          <code>pointer-events</code>. We never wrote a hit-test routine.{" "}
          <em>One weekend saved, instantly.</em>
        </p>

        <h3>Subpixel crispness</h3>
        <p>
          An ECG trace at 1px stroke width is a brutal rendering target.
          Browsers gamma-correct strokes inconsistently between canvas and
          SVG. SVG, despite its quirks, gives us repeatable subpixel
          positioning when we use{" "}
          <code>shape-rendering=&quot;geometricPrecision&quot;</code> and round
          our path commands.
        </p>

        <Callout kind="note">
          If you&apos;re building an in-house monitor for a single hardware
          target, canvas is probably fine. We needed cross-browser parity from
          a Chromebook in a rural ambulance to a 5K iMac at a training center,
          and SVG won that bake-off by a margin we didn&apos;t expect.
        </Callout>

        <h2 id="the-raf-sweep-loop">The rAF sweep loop</h2>
        <p>
          Our sweep is one <code>requestAnimationFrame</code> loop per channel.
          Inside the loop, we don&apos;t re-render React — we mutate the{" "}
          <code>x</code> attribute of an SVG <code>&lt;g&gt;</code> directly.
          React knows nothing about the sweep, which means our component tree
          stays still.
        </p>

        <pre>
          <code>{`function sweep(ts: number) {
  const dt = ts - lastTs;
  lastTs = ts;
  const pxPerMs = sweepSpeedPx / 1000;
  cursorRef.current += dt * pxPerMs;
  // mutate, don't setState
  groupRef.current!.setAttribute(
    'transform',
    \`translate(\${-cursorRef.current % tileWidth}, 0)\`,
  );
  rafIdRef.current = requestAnimationFrame(sweep);
}`}</code>
        </pre>

        <Callout kind="win" title="Measure twice, ship once">
          We <em>almost</em> shipped a version that did setState on every tick
          — it &quot;felt&quot; fine in dev but pinned the CPU on production
          builds because of React&apos;s reconciliation cost. Always profile
          against a production bundle.
        </Callout>

        <h2 id="clippath-caveats">clipPath caveats</h2>
        <p>
          The strip wraps every ~6 seconds. That wrap is a{" "}
          <code>&lt;clipPath&gt;</code> — the trace renders into an infinitely
          long path, but only the visible window draws. Easy in theory; in
          practice, the clip-region{" "}
          <strong>cached at definition time on some browsers</strong>.
        </p>
        <p>
          Workaround: never animate the clipPath. Instead, give it a fixed
          viewport, and translate the contents underneath it.
        </p>

        <blockquote>
          &ldquo;Animate the contents, not the window.&rdquo; — eight words
          that saved us a week.
        </blockquote>

        <h2 id="the-safari-bug">The Safari bug that ate three weekends</h2>
        <p>
          Safari was rendering our ECG paths at the wrong subpixel offset
          after a tab returned from background. Couldn&apos;t reproduce in
          Chrome. Couldn&apos;t reproduce in Firefox.
        </p>
        <p>
          Root cause: Safari was caching transform matrices on offscreen
          elements differently. The fix was to set the transform on a wrapper
          that was never offscreen.
        </p>

        <Callout kind="warn" title="What we learned the hard way">
          Browser bugs in rendering pipelines aren&apos;t always reproducible
          in your dev environment. Build a staging environment that mirrors
          your weirdest production targets — including device wake/sleep
          cycles.
        </Callout>

        <h2 id="takeaways">Takeaways</h2>
        <ul>
          <li>
            For interactive, clinical-feeling SVG strips: stay in SVG, mutate
            the DOM directly, keep React out of the inner loop.
          </li>
          <li>
            Use canvas for fills, gradients, and decorative work where you
            don&apos;t need event handling.
          </li>
          <li>
            Never animate a clipPath — animate the contents underneath it.
          </li>
          <li>Profile against production. Always.</li>
          <li>
            Test sleep/wake cycles on every browser you ship to. Especially
            Safari.
          </li>
        </ul>

        <hr />

        <p className="italic text-white/55">
          The cardiac monitor is the centerpiece of the SimuPro cockpit. If
          you want to put hands on it, the free tier includes the full ECG
          monitor in every scenario — no card required.
        </p>
      </>
    ),
  },
  {
    slug: "nremt-pediatric-airway-revisions",
    title: "Inside the 2025 NREMT pediatric airway revisions",
    excerpt:
      "OPA vs. NPA, when to skip, and the timing changes that snuck into the suctioning protocol. We mapped them against the SimuPro pediatric scenario library.",
    category: "Protocol notes",
    publishedAt: "2026-05-10",
    readMinutes: 6,
    author: {
      name: "Lisa Tran",
      role: "Paramedic · Clinical lead",
      initials: "LT",
      avatarGradient: "from-cyan-500 to-blue-700",
    },
    palette: "cyan",
    thumb: "pulse",
    body: (
      <p className="lead">
        The 2025 NREMT pediatric airway revisions are subtle but consequential.
        Here&apos;s how we walked through them with our clinical advisory board
        and re-tagged 12 SimuPro scenarios to match. <em>(Full post coming
        soon.)</em>
      </p>
    ),
  },
  {
    slug: "d10-vs-d50",
    title:
      "D10 vs. D50: when the calculator says one thing and your gut says another",
    excerpt:
      "A real call recap from a SimuPro pilot agency, walked through frame-by-frame. Where the modern evidence has landed, and what it means for your protocols.",
    category: "Training tips",
    publishedAt: "2026-05-07",
    readMinutes: 5,
    author: {
      name: "Marcus Lin",
      role: "AEMT · Field clinician",
      initials: "ML",
      avatarGradient: "from-amber-500 to-orange-700",
    },
    palette: "amber",
    thumb: "syringe",
    body: <p className="lead">D10 vs. D50, full breakdown coming soon.</p>,
  },
  {
    slug: "v3-release-notes",
    title: "v3.0 — the replay timeline, finally",
    excerpt:
      "Scrub through any past run frame-by-frame. New protocol-audit panel. ECG trainer is out of beta. Three breaking changes for legacy scenario authors.",
    category: "Release notes",
    publishedAt: "2026-05-01",
    readMinutes: 3,
    author: {
      name: "SimuPro team",
      role: "Release notes",
      initials: "SP",
      avatarGradient: "from-orange-500 to-red-700",
    },
    palette: "navy",
    thumb: "compass",
    badge: "New release",
    body: <p className="lead">Full release notes coming soon.</p>,
  },
  {
    slug: "autonomic-responses-architecture",
    title:
      "How we model autonomic responses without a state-machine soup",
    excerpt:
      "Our physiology engine layers PK/PD on top of autonomic and volume models. Here's the architecture that lets meds and fluids change outcomes — without exploding.",
    category: "Engineering",
    publishedAt: "2026-04-24",
    readMinutes: 11,
    author: {
      name: "Devon Carter",
      role: "Sim engineer",
      initials: "DC",
      avatarGradient: "from-purple-500 to-indigo-800",
    },
    palette: "purple",
    thumb: "waveform",
    body: <p className="lead">Architecture deep-dive coming soon.</p>,
  },
  {
    slug: "rural-agency-case-study",
    title:
      "A rural agency ran SimuPro before their state audit. Here's what they found.",
    excerpt:
      "Forty paramedics. Sixteen weeks. One audit. The training supervisor walks through the gaps the sim surfaced — and the three they didn't want to admit existed.",
    category: "From the field",
    publishedAt: "2026-04-18",
    readMinutes: 9,
    author: {
      name: "Priya Shah",
      role: "Training supervisor",
      initials: "PS",
      avatarGradient: "from-rose-500 to-orange-700",
    },
    palette: "orange",
    thumb: "pulse",
    body: <p className="lead">Case study coming soon.</p>,
  },
  {
    slug: "sbar-handoffs",
    title: "SBAR handoffs that don't waste the ED nurse's time",
    excerpt:
      "Most radio reports bury the lede. Here's the SBAR rewrite we teach SimuPro learners — including the one sentence that earned us thank-you DMs from ED charge nurses.",
    category: "Training tips",
    publishedAt: "2026-04-11",
    readMinutes: 4,
    author: {
      name: "Lisa Tran",
      role: "Paramedic · Clinical lead",
      initials: "LT",
      avatarGradient: "from-cyan-500 to-blue-700",
    },
    palette: "cyan",
    thumb: "book",
    body: <p className="lead">SBAR rewrite coming soon.</p>,
  },
];

// ── Helpers ───────────────────────────────────────────────────────────
export function getPostBySlug(slug: string): BlogPost | undefined {
  return posts.find((p) => p.slug === slug);
}

export function getRelatedPosts(slug: string, limit = 3): BlogPostSummary[] {
  const current = getPostBySlug(slug);
  if (!current) return posts.slice(0, limit);
  const sameCategory = posts.filter(
    (p) => p.slug !== slug && p.category === current.category,
  );
  const others = posts.filter(
    (p) => p.slug !== slug && p.category !== current.category,
  );
  return [...sameCategory, ...others].slice(0, limit);
}

export function getFeaturedPost(): BlogPost | undefined {
  return posts.find((p) => p.featured) ?? posts[0];
}

export function getNonFeaturedPosts(): BlogPostSummary[] {
  const featured = getFeaturedPost();
  return posts.filter((p) => p.slug !== featured?.slug);
}

export function getCategoriesWithCounts(): Array<{
  name: BlogCategory | "All posts";
  count: number;
}> {
  const counts = new Map<BlogCategory, number>();
  for (const p of posts) {
    counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
  }
  return [
    { name: "All posts", count: posts.length },
    ...Array.from(counts.entries()).map(([name, count]) => ({ name, count })),
  ];
}

export function formatPostDate(iso: string): string {
  const d = new Date(iso);
  return d
    .toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
    .toUpperCase();
}
