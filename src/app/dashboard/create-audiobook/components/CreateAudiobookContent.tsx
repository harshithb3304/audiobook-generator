"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, BookAudio, Plus, Volume2, Wand2 } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import TextProcessor from "../../components/TextProcessor";
import { saveAudiobook } from "../action";
import AudioGenerator from "./AudioGenerator";
import AudioPlayer from "@/components/AudioPlayer";
import FileUploader from "./FileUploader";
import { getUploadUrls } from "../action";

interface CreateAudiobookContentProps {
  maxCharsPerRequest: number;
}

export default function CreateAudiobookContent({
  maxCharsPerRequest,
}: CreateAudiobookContentProps) {
  const router = useRouter();

  // Content state
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [processedText, setProcessedText] = useState("");
  const [textProcessingError, setTextProcessingError] = useState<string | null>(
    null
  );
  const [textProcessingLoading, setTextProcessingLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // TTS specific state
  const [voiceId, setVoiceId] = useState("aura-asteria-en");
  const outputFormat = "wav";
  const [segments, setSegments] = useState<string[]>([]);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Split text into manageable segments
  useEffect(() => {
    if (text && text.length > 0) {
      // Split by paragraphs first
      const paragraphs = text.split(/\n\s*\n/);

      const newSegments: string[] = [];

      // Process each paragraph
      paragraphs.forEach((paragraph) => {
        // Skip empty paragraphs
        if (paragraph.trim().length === 0) {
          return;
        }

        // If paragraph fits in one segment
        if (paragraph.length <= maxCharsPerRequest) {
          newSegments.push(paragraph);
        } else {
          // Split paragraph into sentences
          const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];

          let currentSegment = "";

          // Group sentences into segments
          sentences.forEach((sentence) => {
            if ((currentSegment + sentence).length <= maxCharsPerRequest) {
              currentSegment += sentence;
            } else {
              if (currentSegment.length > 0) {
                newSegments.push(currentSegment);
              }

              // If a single sentence is too long, we need to split it
              if (sentence.length > maxCharsPerRequest) {
                // Split into chunks of maximum allowed size
                let remainingSentence = sentence;
                while (remainingSentence.length > 0) {
                  const chunk = remainingSentence.substring(
                    0,
                    maxCharsPerRequest
                  );
                  newSegments.push(chunk);
                  remainingSentence =
                    remainingSentence.substring(maxCharsPerRequest);
                }
                currentSegment = "";
              } else {
                currentSegment = sentence;
              }
            }
          });

          // Add the last segment if not empty
          if (currentSegment.length > 0) {
            newSegments.push(currentSegment);
          }
        }
      });

      setSegments(newSegments);
    }
  }, [text, maxCharsPerRequest]);

  const handleProcessedText = (cleanedText: string) => {
    setProcessedText(cleanedText);
    setTextProcessingError(null);
  };

  const handleProcessingError = (error: string) => {
    setTextProcessingError(error);
  };

  const handleFileSelected = (selectedFile: File) => {
    setFile(selectedFile);
  };

  const handleTextExtracted = (extractedText: string) => {
    setText(extractedText);
  };

  const handleAudioGenerated = (blob: Blob, duration: number) => {
    setAudioBlob(blob);
    setAudioDuration(duration);

    // Create URL for the audio blob
    if (previewAudioUrl) {
      URL.revokeObjectURL(previewAudioUrl);
    }
    setPreviewAudioUrl(URL.createObjectURL(blob));
  };

  // Handle the final generation and save to DB
  const handleFinalGenerate = async () => {
    if (!audioBlob) {
      setGenerationError("Please generate a preview audio first");
      return;
    }

    setLoading(true);

    try {
      // Create File objects
      const completeAudioFile = new File(
        [audioBlob],
        `complete-audiobook-${Date.now()}.${outputFormat}`,
        { type: "audio/wav" }
      );

      let sourceTextFile: File | null = null;
      if (text && !file) {
        // Create text file from content if no source file was uploaded
        const textBlob = new Blob([text], { type: "text/plain" });
        sourceTextFile = new File([textBlob], "content.txt", {
          type: "text/plain",
        });
      }

      // Get signed URLs for uploads
      const urlsResult = await getUploadUrls({
        sourceFileName:
          file?.name || (sourceTextFile ? "content.txt" : undefined),
        audioFileName: completeAudioFile.name,
      });

      if (!urlsResult.success || !urlsResult.data) {
        throw new Error(urlsResult.error || "Failed to get upload URLs");
      }

      const { urls, paths } = urlsResult.data;

      // Upload files directly to storage
      if (urls.sourceUrl) {
        const sourceFileToUpload = file || sourceTextFile;
        if (sourceFileToUpload) {
          const sourceUploadResult = await fetch(urls.sourceUrl, {
            method: "PUT",
            headers: {
              "Content-Type": sourceFileToUpload.type,
            },
            body: sourceFileToUpload,
          });

          if (!sourceUploadResult.ok) {
            throw new Error("Failed to upload source file");
          }
        }
      }

      const audioUploadResult = await fetch(urls.audioUrl, {
        method: "PUT",
        headers: {
          "Content-Type": completeAudioFile.type,
        },
        body: completeAudioFile,
      });

      if (!audioUploadResult.ok) {
        throw new Error("Failed to upload audio file");
      }

      // Create a title from the file name or a default
      const title = file ? file.name.replace(/\.[^/.]+$/, "") : "My Audiobook";

      // Save audiobook metadata using server action
      const result = await saveAudiobook({
        title,
        description: `Generated from ${file ? file.name : "text input"}`,
        duration: Math.ceil(audioDuration),
        voiceId,
        sourceFilePath: paths.sourcePath,
        audioFilePath: paths.audioPath,
        sourceFileMetadata:
          file || sourceTextFile
            ? {
                name: file?.name || "content.txt",
                type: file?.type || "text/plain",
                size: file?.size || sourceTextFile?.size || 0,
                text,
              }
            : undefined,
        audioFileMetadata: {
          name: completeAudioFile.name,
          type: completeAudioFile.type,
          size: completeAudioFile.size,
        },
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      // All operations completed, show success
      setPreviewMode(true);
    } catch (error) {
      console.error("Error saving audiobook:", error);
      setGenerationError(
        `Failed to save audiobook: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  // Calculate estimated audio duration (rough estimate: 150 words per minute)
  const estimateAudioDuration = () => {
    const wordCount = text.split(/\s+/).length;
    const durationInMinutes = wordCount / (150 * 1.0);
    return durationInMinutes * 60; // Convert to seconds
  };

  return (
    <>
      {/* Progress indicator */}
      <div className="flex items-center mb-10">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex-1">
            <div className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium mr-2 ${
                  s === step
                    ? "bg-primary text-primary-foreground"
                    : s < step
                    ? "bg-green-500 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {s}
              </div>
              <div className="flex-1">
                <div
                  className={`h-1 ${
                    s < step
                      ? "bg-green-500"
                      : s === step
                      ? "bg-primary"
                      : "bg-muted"
                  }`}
                ></div>
              </div>
            </div>
            <p
              className={`text-xs mt-1 ${
                s === step
                  ? "text-primary"
                  : s < step
                  ? "text-green-500"
                  : "text-muted-foreground"
              }`}
            >
              {s === 1 ? "Input Content" : s === 2 ? "Customize" : "Generate"}
            </p>
          </div>
        ))}
      </div>

      <Card className="border shadow-lg">
        <CardContent className="p-8">
          {step === 1 && (
            <div className="space-y-8">
              <div className="flex items-center gap-3">
                <Badge
                  variant="outline"
                  className="bg-primary/10 text-primary border-primary/30 py-1 px-3 text-sm"
                >
                  Step 1
                </Badge>
                <h2 className="text-2xl font-semibold">Add Your Content</h2>
              </div>

              <div className="space-y-6">
                <FileUploader
                  onTextExtracted={handleTextExtracted}
                  onFileSelected={handleFileSelected}
                />
              </div>

              {text.trim() !== "" && (
                <div className="mt-6 pt-6 border-t">
                  <TextProcessor
                    originalText={text}
                    onProcessedText={handleProcessedText}
                    onError={handleProcessingError}
                    isLoading={textProcessingLoading}
                    setIsLoading={setTextProcessingLoading}
                  />

                  {textProcessingError && (
                    <Alert variant="destructive" className="mt-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{textProcessingError}</AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              <div className="flex justify-end mt-6">
                <Button
                  onClick={() => {
                    // Use processed text if available, otherwise use original text
                    if (processedText) {
                      setText(processedText);
                    }
                    setStep(2);
                  }}
                  disabled={
                    (!file && text.trim() === "") || textProcessingLoading
                  }
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8">
              <div className="flex items-center gap-3">
                <Badge
                  variant="outline"
                  className="bg-primary/10 text-primary border-primary/30 py-1 px-3 text-sm"
                >
                  Step 2
                </Badge>
                <h2 className="text-2xl font-semibold">
                  Customize Voice & Settings
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label>Voice Style</Label>
                  <Select value={voiceId} onValueChange={setVoiceId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a voice" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aura-asteria-en">
                        Asteria - Female (US)
                      </SelectItem>
                      <SelectItem value="aura-luna-en">
                        Luna - Female (US)
                      </SelectItem>
                      <SelectItem value="aura-stella-en">
                        Stella - Female (US)
                      </SelectItem>
                      <SelectItem value="aura-athena-en">
                        Athena - Female (UK)
                      </SelectItem>
                      <SelectItem value="aura-hera-en">
                        Hera - Female (US)
                      </SelectItem>
                      <SelectItem value="aura-orion-en">
                        Orion - Male (US)
                      </SelectItem>
                      <SelectItem value="aura-arcas-en">
                        Arcas - Male (US)
                      </SelectItem>
                      <SelectItem value="aura-perseus-en">
                        Perseus - Male (US)
                      </SelectItem>
                      <SelectItem value="aura-angus-en">
                        Angus - Male (Ireland)
                      </SelectItem>
                      <SelectItem value="aura-orpheus-en">
                        Orpheus - Male (US)
                      </SelectItem>
                      <SelectItem value="aura-helios-en">
                        Helios - Male (UK)
                      </SelectItem>
                      <SelectItem value="aura-zeus-en">
                        Zeus - Male (US)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label>Output Format</Label>
                  <div className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                    WAV
                  </div>
                </div>
              </div>

              <div className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Audio Preview</h3>
                  <a
                    href="https://developers.deepgram.com/docs/tts-models"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    Listen to voice samples
                  </a>
                </div>

                <AudioGenerator
                  text={text}
                  segments={segments}
                  voiceId={voiceId}
                  outputFormat={outputFormat}
                  onAudioGenerated={handleAudioGenerated}
                />
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button onClick={() => setStep(3)} disabled={!previewAudioUrl}>
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === 3 && !previewMode && (
            <div className="space-y-8">
              <div className="flex items-center gap-3">
                <Badge
                  variant="outline"
                  className="bg-primary/10 text-primary border-primary/30 py-1 px-3 text-sm"
                >
                  Step 3
                </Badge>
                <h2 className="text-2xl font-semibold">
                  Generate Your Audiobook
                </h2>
              </div>

              <div className="bg-muted/30 border rounded-lg p-6">
                <h3 className="text-lg font-medium mb-6">Summary</h3>

                <div className="space-y-4 mb-8">
                  <div className="flex justify-between border-b pb-3">
                    <span className="text-muted-foreground">
                      Content source:
                    </span>
                    <span className="font-medium">
                      {file ? file.name : "Text input"}
                    </span>
                  </div>
                  <div className="flex justify-between border-b pb-3">
                    <span className="text-muted-foreground">Voice:</span>
                    <span className="font-medium">
                      {voiceId.split("-")[1] || "Asteria"} -
                      {voiceId.includes("aura-a") ||
                      voiceId.includes("aura-l") ||
                      voiceId.includes("aura-s") ||
                      voiceId.includes("aura-h")
                        ? " Female"
                        : " Male"}
                    </span>
                  </div>
                  <div className="flex justify-between border-b pb-3">
                    <span className="text-muted-foreground">Speech rate:</span>
                    <span className="font-medium">
                      {1.0}({1.0}x)
                    </span>
                  </div>
                  <div className="flex justify-between border-b pb-3">
                    <span className="text-muted-foreground">Format:</span>
                    <span className="font-medium">WAV</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Estimated length:
                    </span>
                    <span className="font-medium">
                      {Math.ceil(
                        audioDuration
                          ? audioDuration / 60
                          : estimateAudioDuration() / 60
                      )}{" "}
                      minutes
                    </span>
                  </div>
                </div>

                <div className="pt-4">
                  <p className="text-muted-foreground text-sm mb-6">
                    You&apos;ve successfully generated a preview of your
                    audiobook. Now you can save it to your library for future
                    use. The AI has analyzed your text to create
                    natural-sounding narration with proper emphasis and pacing.
                  </p>

                  {loading ? (
                    <div className="flex flex-col items-center justify-center p-10">
                      <div className="relative w-16 h-16 mb-6">
                        <div className="absolute top-0 left-0 w-full h-full border-4 border-primary/30 rounded-full"></div>
                        <div className="absolute top-0 left-0 w-full h-full border-4 border-transparent border-t-primary rounded-full animate-spin"></div>
                      </div>
                      <p className="text-primary font-medium mb-2">
                        Saving your audiobook...
                      </p>
                      <p className="text-muted-foreground text-sm">
                        This may take a few moments
                      </p>
                    </div>
                  ) : (
                    <div className="flex justify-between">
                      <Button variant="outline" onClick={() => setStep(2)}>
                        Back
                      </Button>
                      <Button onClick={handleFinalGenerate}>
                        <Wand2 className="h-4 w-4 mr-2" />
                        Save Audiobook
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {generationError && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{generationError}</AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {step === 3 && previewMode && (
            <div className="space-y-8">
              <div className="flex items-center gap-3">
                <Badge
                  variant="outline"
                  className="bg-green-500/20 text-green-500 border-green-500/30 py-1 px-3 text-sm"
                >
                  Complete
                </Badge>
                <h2 className="text-2xl font-semibold">
                  Your Audiobook is Ready
                </h2>
              </div>

              <div className="bg-muted/30 border rounded-lg p-6">
                <div className="flex flex-col md:flex-row gap-6 items-center mb-8">
                  <div className="w-24 h-24 border rounded-lg flex items-center justify-center flex-shrink-0">
                    <BookAudio className="h-12 w-12 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium mb-1">
                      {file
                        ? file.name.replace(/\.[^/.]+$/, "")
                        : "My Audiobook"}
                    </h3>
                    <p className="text-muted-foreground text-sm mb-3">
                      {voiceId.split("-")[1] || "Asteria"} •
                      {` ${Math.floor(audioDuration / 60)}:${String(
                        Math.floor(audioDuration % 60)
                      ).padStart(2, "0")} mins`}{" "}
                      •{outputFormat.toUpperCase()}
                    </p>
                    <div className="flex gap-3">
                      <Button size="sm">
                        <Volume2 className="h-4 w-4 mr-2" />
                        Listen
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Audio player for completion screen */}
                {previewAudioUrl && (
                  <div className="mb-6">
                    <AudioPlayer
                      audioUrl={previewAudioUrl}
                      fileName="audiobook-complete"
                      fileType={outputFormat}
                    />
                  </div>
                )}

                <div className="border-t pt-6">
                  <h4 className="font-medium mb-3">What&apos;s next?</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button
                      variant="outline"
                      onClick={() => router.push("/dashboard/library")}
                    >
                      <BookAudio className="h-4 w-4 mr-2" />
                      View in My Library
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setStep(1);
                        setFile(null);
                        setText("");
                        setPreviewMode(false);
                        setAudioBlob(null);

                        // Clean up audio URL
                        if (previewAudioUrl) {
                          URL.revokeObjectURL(previewAudioUrl);
                          setPreviewAudioUrl(null);
                        }
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Another Audiobook
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
