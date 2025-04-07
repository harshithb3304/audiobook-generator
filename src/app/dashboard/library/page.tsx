import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import prisma from "@/utils/prisma";
import { createClient } from "@/utils/supabase/server";
import { format as dateFormat } from "date-fns";
import {
  Calendar,
  Clock,
  HeadphonesIcon,
  Music,
  Plus,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import AudioPlayer from "@/components/AudioPlayer";
import DeleteAudio from "../components/DeleteAudio";
import { SourceFileDownload } from "../components/SourceFileDownload";

export default async function LibraryPage() {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();

  const audiobooks = await prisma.audiobook.findMany({
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
          name: true,
        },
      },
      voiceid: true,
      speechrate: true,
      sourceFile: {
        select: {
          url: true,
          name: true,
          size: true,
          type: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Get signed URLs for all files
  const audiobooksWithSignedUrls = await Promise.all(
    audiobooks.map(async (audiobook) => {
      let signedAudioUrl: string | undefined = undefined;
      let signedSourceUrl: string | undefined = undefined;

      if (audiobook.audioFile?.url) {
        const { data: audioData } = await supabase.storage
          .from("audio-files")
          .createSignedUrl(audiobook.audioFile.url, 3600);
        signedAudioUrl = audioData?.signedUrl;
      }

      if (audiobook.sourceFile?.url) {
        const { data: sourceData } = await supabase.storage
          .from("source-files")
          .createSignedUrl(audiobook.sourceFile.url, 3600);
        signedSourceUrl = sourceData?.signedUrl;
      }

      return {
        ...audiobook,
        audioFile: audiobook.audioFile
          ? {
              ...audiobook.audioFile,
              signedUrl: signedAudioUrl,
            }
          : null,
        sourceFile: audiobook.sourceFile
          ? {
              ...audiobook.sourceFile,
              signedUrl: signedSourceUrl,
            }
          : null,
      };
    })
  );

  // Format seconds to mm:ss or hh:mm:ss
  const formatDuration = (seconds: number) => {
    if (!seconds) return "00:00";

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
    }

    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "processing":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "failed":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    }
  };

  return (
    <div className="min-h-screen">
      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div className="flex flex-row items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">My Library</h1>
              <p className="text-muted-foreground">
                Manage and play your audiobooks
              </p>
            </div>
          </div>

          <Button asChild>
            <Link href="/dashboard/create-audiobook">
              <Plus className="mr-2 h-5 w-5" /> Create New Audiobook
            </Link>
          </Button>
        </div>

        {/* Audiobooks List */}
        <Card className="mb-10">
          <CardHeader className="border-b">
            <div className="flex items-center gap-2 w-full">
              <HeadphonesIcon className="h-5 w-5 flex-shrink-0" />
              <CardTitle className="w-full">Your Audiobooks</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {audiobooksWithSignedUrls.length > 0 ? (
              <div className="divide-y">
                {audiobooksWithSignedUrls.map((audiobook) => (
                  <div key={audiobook.id} className="p-5">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      {/* Main info */}
                      <div className="flex-grow">
                        <div className="flex items-start gap-4">
                          <div className="flex-grow">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-lg font-medium">
                                {audiobook.title}
                              </h3>
                              <div
                                className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(
                                  audiobook.status
                                )}`}
                              >
                                {audiobook.status.charAt(0).toUpperCase() +
                                  audiobook.status.slice(1)}
                              </div>
                            </div>

                            {audiobook.description && (
                              <p className="text-muted-foreground text-sm mb-2 line-clamp-2">
                                {audiobook.description}
                              </p>
                            )}

                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                              <div className="flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                <span>
                                  {formatDuration(audiobook.duration)}
                                </span>
                              </div>

                              <div className="flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                <span>
                                  {dateFormat(
                                    new Date(audiobook.createdAt),
                                    "MMM d, yyyy"
                                  )}
                                </span>
                              </div>

                              {audiobook.voiceid && (
                                <div className="flex items-center">
                                  <Music className="h-3 w-3 mr-1" />
                                  <span>
                                    Voice: {audiobook.voiceid.split("-")[1]}
                                  </span>
                                </div>
                              )}

                              {audiobook.speechrate !== 1.0 && (
                                <div className="flex items-center">
                                  <RefreshCw className="h-3 w-3 mr-1" />
                                  <span>Speed: {audiobook.speechrate}x</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-4">
                          {audiobook.sourceFile && (
                            <SourceFileDownload
                              sourceFile={audiobook.sourceFile}
                            />
                          )}
                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            <DeleteAudio audiobookid={audiobook.id} />
                          </div>
                        </div>
                      </div>
                    </div>
                    {audiobook.audioFile?.signedUrl && (
                      <div className="mt-4">
                        <AudioPlayer
                          audioUrl={audiobook.audioFile.signedUrl}
                          fileName={audiobook.title}
                          fileType="mp3"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="rounded-full w-16 h-16 flex items-center justify-center mb-4">
                  <HeadphonesIcon className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-medium mb-2">No audiobooks yet</h3>
                <p className="text-muted-foreground max-w-md text-center mb-6">
                  You haven&apos;t created any audiobooks yet. Start by
                  converting your text or documents into audiobooks.
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
      </main>
    </div>
  );
}
