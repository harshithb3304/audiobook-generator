import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import {
  BookAudio,
  Plus,
  Music,
  PlayCircle,
  Clock,
  Calendar,
  HeadphonesIcon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import prisma from "@/utils/prisma";
import "../animations.css";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();

  // Format seconds to mm:ss or hh:mm:ss
  const formatDuration = (seconds: number) => {
    if (!seconds) return "00:00";

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
    }

    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  const recentAudiobooks = await prisma.audiobook.findMany({
    where: {
      userid: user?.user?.id,
    },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      duration: true,
      createdAt: true,
      audioFile: {
        select: {
          url: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 5,
  });

  return (
    <Container className="px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">
        Welcome, {user?.user?.user_metadata?.full_name?.split(" ")[0] || "User"}
      </h1>
      <p className="text-muted-foreground mb-10">
        Create and manage your audiobooks
      </p>

      {/* Featured Create Card */}
      <div className="mb-10">
        <Card className="overflow-hidden">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="flex-1">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">
                  Transform text into natural sounding audiobooks
                </h2>
                <p className="text-muted-foreground mb-6 text-lg">
                  Use our advanced AI technology to convert your written content
                  into high-quality audio narration in minutes.
                </p>
                <Button size="lg" className="px-8" asChild>
                  <Link href="/dashboard/create-audiobook">
                    <Plus className="h-5 w-5 mr-2" />
                    Create New Audiobook
                  </Link>
                </Button>
              </div>
              <div className="w-full md:w-1/3 flex justify-center">
                <div className="relative w-32 h-32 md:w-40 md:h-40">
                  <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping opacity-75"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Music className="h-16 w-16 md:h-20 md:w-20 text-primary" />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Audiobooks */}
      <Card>
        <CardHeader className="border-b flex flex-row items-center justify-between">
          <div className="flex items-center gap-2 w-full">
            <HeadphonesIcon className="h-5 w-5 flex-shrink-0" />
            <CardTitle className="w-full">Recent Audiobooks</CardTitle>
          </div>
          <Button variant="outline" asChild>
            <Link href="/dashboard/library">View Library</Link>
          </Button>
        </CardHeader>
        <CardContent className="p-6">
          {recentAudiobooks.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {recentAudiobooks.map((audiobook) => (
                <Card key={audiobook.id}>
                  <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      {audiobook.status === "completed" ? (
                        <PlayCircle className="h-6 w-6" />
                      ) : (
                        <Clock className="h-6 w-6" />
                      )}
                    </div>

                    <div className="flex-grow">
                      <h3 className="text-lg font-medium">{audiobook.title}</h3>
                      <p className="text-muted-foreground text-sm line-clamp-1">
                        {audiobook.description || "No description"}
                      </p>
                    </div>

                    <div className="flex flex-col md:flex-row gap-2 md:gap-4 items-start md:items-center mt-2 md:mt-0">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm">
                          {formatDuration(audiobook.duration)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm">
                          {formatDistanceToNow(new Date(audiobook.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>

                      <div className="px-2 py-1 rounded-full text-xs bg-primary/10">
                        {audiobook.status.charAt(0).toUpperCase() +
                          audiobook.status.slice(1)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <BookAudio className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-medium mb-2">No audiobooks yet</h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">
                You haven&apos;t created any audiobooks yet. Start by converting
                your text or documents into audiobooks.
              </p>
              <Button asChild>
                <Link href="/dashboard/create-audiobook">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Audiobook
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audio waveform background effect */}
      <div className="fixed bottom-0 left-0 right-0 h-32 pointer-events-none overflow-hidden opacity-20">
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent z-10"></div>
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-sm bg-primary/20"
            style={{
              width: "2px",
              height: `${Math.random() * 60 + 10}px`,
              bottom: "0",
              left: `${i * 2}%`,
              opacity: Math.random() * 0.7 + 0.3,
              animation: `wave ${Math.random() * 2 + 1}s infinite alternate`,
            }}
          ></div>
        ))}
      </div>
    </Container>
  );
}
