import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { PostCard as PostCardData } from "@/lib/blog/queries";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/common/SectionHeading";
import { Reveal, RevealItem } from "@/components/common/Reveal";
import { PostCard } from "@/components/blog/PostCard";

export function BlogSection({ posts }: { posts: PostCardData[] }) {
  if (posts.length === 0) return null;

  return (
    <section
      id="blog"
      aria-labelledby="blog-title"
      className="relative scroll-mt-28 py-12 sm:py-16"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Blog"
          title={
            <span id="blog-title">
              Panduan <span className="text-royal">terbaru</span>
            </span>
          }
          note="Tips top up, cara bayar, dan strategi bermain."
          action={
            <Button variant="glass" size="sm" asChild>
              <Link href="/blog">
                Lihat semua artikel
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          }
        />

        <Reveal stagger={0.1} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <RevealItem key={post.id}>
              <PostCard post={post} />
            </RevealItem>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
