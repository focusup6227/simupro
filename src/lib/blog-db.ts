// Server-only helpers for fetching blog posts from Supabase.
// Falls back gracefully if the DB isn't set up yet.

import { createServerSupabaseClient } from '@/lib/supabase/server-client';
import type { Database } from '@/lib/supabase/database.types';

export type BlogPostRow = Database['public']['Tables']['blog_posts']['Row'];

export async function getPublishedPostsFromDB(): Promise<BlogPostRow[]> {
  try {
    const client = createServerSupabaseClient();
    const { data, error } = await client
      .from('blog_posts')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false });
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getPostBySlugFromDB(slug: string): Promise<BlogPostRow | null> {
  try {
    const client = createServerSupabaseClient();
    const { data, error } = await client
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .single();
    if (error) return null;
    return data;
  } catch {
    return null;
  }
}

export async function getAllPostsFromDB(): Promise<BlogPostRow[]> {
  try {
    const client = createServerSupabaseClient();
    const { data, error } = await client
      .from('blog_posts')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

export function dbPostToSummary(p: BlogPostRow) {
  return {
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    category: p.category as import('@/lib/blog-data').BlogCategory,
    publishedAt: p.published_at ?? p.created_at,
    readMinutes: p.read_minutes,
    featured: p.featured,
    palette: (p.palette as 'orange' | 'cyan' | 'navy' | 'amber' | 'purple') ?? 'cyan',
    thumb: 'waveform' as const,
    author: {
      name: p.author_name,
      role: p.author_role,
      initials: p.author_initials,
      avatarGradient: 'from-cyan-500 to-blue-600',
    },
  };
}
