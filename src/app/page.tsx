import { prisma } from "@/lib/prisma";
import { SignInButton } from "@/components/SignInButton";
import { ComplaintFeed } from "@/components/ComplaintFeed";
import { MegaphoneIcon } from "@/components/icons";
import type { ComplaintDTO } from "@/lib/types";

export const dynamic = "force-dynamic";

async function getInitialComplaints(): Promise<ComplaintDTO[]> {
  const complaints = await prisma.complaint.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return complaints.map((c) => ({
    id: c.id,
    body: c.body,
    authorId: c.authorId,
    authorName: c.authorName,
    authorPhoto: c.authorPhoto,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }));
}

export default async function Home() {
  const initialComplaints = await getInitialComplaints();

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <MegaphoneIcon className="h-5 w-5 text-primary" />
            <span className="text-lg font-bold tracking-tight text-foreground">Complainathon</span>
          </div>
          <SignInButton />
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        <ComplaintFeed initialComplaints={initialComplaints} />
      </main>

      <footer className="mx-auto w-full max-w-2xl px-4 py-8 text-center text-xs text-muted">
        Public feed. Be civil. Everyone can read; only you can edit or delete your own posts.
      </footer>
    </>
  );
}
