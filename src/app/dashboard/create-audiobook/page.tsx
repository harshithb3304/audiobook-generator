import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import CreateAudiobookContent from "./components/CreateAudiobookContent";

// Maximum characters per TTS request
const MAX_CHARS_PER_REQUEST = 2000;

export default async function CreateAudiobookPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div>
      <main className="container mx-auto px-4 pt-24 pb-20">
        <h1 className="text-3xl font-bold mb-4">Create New Audiobook</h1>
        <p className="text-muted-foreground mb-10 max-w-2xl">
          Transform your text into natural-sounding audio with our AI
          technology. Follow the steps below to create your audiobook.
        </p>

        <div className="max-w-3xl mx-auto">
          <Suspense fallback={<LoadingSkeleton />}>
            <CreateAudiobookContent
              maxCharsPerRequest={MAX_CHARS_PER_REQUEST}
            />
          </Suspense>
        </div>
      </main>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <Card className="border shadow-lg">
      <CardContent className="p-8 space-y-8">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="px-3 py-1">
            Loading
          </Badge>
          <div className="h-8 w-40 bg-muted animate-pulse rounded"></div>
        </div>

        <div className="space-y-4">
          <div className="h-64 bg-muted animate-pulse rounded"></div>
          <div className="flex justify-end">
            <div className="h-10 w-24 bg-muted animate-pulse rounded"></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
