"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Wand2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import AudioPlayer from "@/components/AudioPlayer";
import { generateTTS } from "../action";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

interface AudioGeneratorProps {
  text: string;
  segments: string[];
  voiceId: string;
  outputFormat: string;
  onAudioGenerated: (blob: Blob, duration: number) => void;
}

export default function AudioGenerator({
  text,
  segments,
  voiceId,
  outputFormat,
  onAudioGenerated,
}: AudioGeneratorProps) {
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [audioBlobs, setAudioBlobs] = useState<Blob[]>([]);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [ffmpeg] = useState(() => new FFmpeg());
  const [ffmpegLoaded, setFFmpegLoaded] = useState(false);

  // Initialize FFmpeg
  useEffect(() => {
    const loadFFmpeg = async () => {
      try {
        // Load FFmpeg
        const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
        await ffmpeg.load({
          coreURL: await toBlobURL(
            `${baseURL}/ffmpeg-core.js`,
            "text/javascript"
          ),
          wasmURL: await toBlobURL(
            `${baseURL}/ffmpeg-core.wasm`,
            "application/wasm"
          ),
        });
        console.log("FFmpeg loaded successfully");
        setFFmpegLoaded(true);
      } catch (error) {
        console.error("Error loading FFmpeg:", error);
        setGenerationError("Failed to load audio processing library");
      }
    };

    loadFFmpeg();
  }, [ffmpeg]);

  // Utility function to concatenate audio blobs using FFmpeg
  const concatenateAudioBlobs = async (audioBlobs: Blob[]): Promise<Blob> => {
    console.log(
      `Starting FFmpeg audio concatenation of ${audioBlobs.length} blobs...`
    );

    try {
      // Create a text file with the list of input files
      let fileList = "";

      // Write each blob to FFmpeg's virtual filesystem
      for (let i = 0; i < audioBlobs.length; i++) {
        const inputFileName = `input${i}.wav`;
        const data = await fetchFile(audioBlobs[i]);
        await ffmpeg.writeFile(inputFileName, data);
        fileList += `file ${inputFileName}\n`;
        console.log(
          `Written blob ${i + 1}/${audioBlobs.length} to virtual filesystem`
        );
      }

      // Write the file list
      await ffmpeg.writeFile("filelist.txt", fileList);
      console.log("File list created:", fileList);

      // Concatenate the audio files
      console.log("Starting FFmpeg concatenation...");
      await ffmpeg.exec([
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        "filelist.txt",
        "-c",
        "copy",
        "output.wav",
      ]);
      console.log("FFmpeg concatenation completed");

      // Read the output file
      const data = await ffmpeg.readFile("output.wav");
      console.log("Read concatenated file from filesystem");

      // Clean up files
      for (let i = 0; i < audioBlobs.length; i++) {
        await ffmpeg.deleteFile(`input${i}.wav`);
      }
      await ffmpeg.deleteFile("filelist.txt");
      await ffmpeg.deleteFile("output.wav");
      console.log("Cleaned up temporary files");

      // Create final blob
      const finalBlob = new Blob([data], { type: "audio/wav" });
      console.log("Created final blob:", {
        size: (finalBlob.size / 1024 / 1024).toFixed(2) + " MB",
        type: finalBlob.type,
      });

      return finalBlob;
    } catch (error) {
      console.error("Error in FFmpeg concatenation:", error);
      throw new Error("Failed to concatenate audio files");
    }
  };

  // Process segments in parallel with a concurrency limit
  const processSegmentsInParallel = async (
    segments: string[],
    concurrencyLimit: number = 3
  ) => {
    if (!ffmpegLoaded) {
      throw new Error("Audio processing library not loaded");
    }

    const results: { index: number; blob: Blob }[] = [];
    let currentIndex = 0;

    const processNext = async () => {
      const index = currentIndex++;
      if (index >= segments.length) return null;

      const segment = segments[index];
      if (!segment.trim()) return null;

      try {
        const blob = await processSegment(segment);
        return { index, blob };
      } catch (error) {
        console.error(`Error processing segment ${index}:`, error);
        throw error;
      }
    };

    const workers = Array(Math.min(concurrencyLimit, segments.length))
      .fill(null)
      .map(async () => {
        while (true) {
          const result = await processNext();
          if (!result) break;
          results.push(result);

          // Update progress
          const progress = (results.length / segments.length) * 100;
          setProgress(progress);
          setCurrentSegmentIndex(results.length - 1);
        }
      });

    await Promise.all(workers);

    // Sort results by original index
    return results.sort((a, b) => a.index - b.index).map((r) => r.blob);
  };

  // Process a single segment with the server action
  const processSegment = async (segmentText: string) => {
    try {
      const encoding = "linear16";
      const result = await generateTTS(
        segmentText,
        voiceId,
        encoding,
        outputFormat
      );

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to process TTS request");
      }

      // Convert Uint8Array to Blob
      const contentType = result.contentType || "audio/wav";
      const audioBlob = new Blob([result.data], { type: contentType });
      return audioBlob;
    } catch (error) {
      console.error("Error processing segment:", error);
      throw error;
    }
  };

  // Generate audio for preview
  const generateAudioPreview = async () => {
    if (segments.length === 0) {
      setGenerationError("No text provided for TTS conversion");
      return;
    }

    setProcessing(true);
    setProgress(0);
    setAudioBlobs([]);
    setGenerationError(null);

    try {
      // For preview, just use the first segment to keep it quick
      const firstSegment = segments[0];
      setCurrentSegmentIndex(0);

      // Skip empty segments
      if (!firstSegment.trim()) {
        setGenerationError("Text is empty");
        setProcessing(false);
        return;
      }

      const audioBlob = await processSegment(firstSegment);

      // Update preview
      if (previewAudioUrl) {
        URL.revokeObjectURL(previewAudioUrl);
      }

      const previewUrl = URL.createObjectURL(audioBlob);
      setPreviewAudioUrl(previewUrl);

      // Store the blob
      setAudioBlobs([audioBlob]);

      // Set 100% progress for the preview
      setProgress(100);

      // Load the audio to get its duration
      const audio = new Audio(previewUrl);
      audio.addEventListener("loadedmetadata", () => {
        const audioDuration = audio.duration;
        onAudioGenerated(audioBlob, audioDuration);
      });
    } catch (error) {
      setGenerationError(
        `Error generating audio: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setProcessing(false);
    }
  };

  // Process all segments for full audiobook generation
  const generateFullAudio = async () => {
    if (segments.length === 0) {
      setGenerationError("No text provided for TTS conversion");
      return;
    }

    setProcessing(true);
    setProgress(0);
    setGenerationError(null);

    try {
      // Process segments in parallel
      const processedBlobs = await processSegmentsInParallel(segments);

      // Combine all audio blobs into one
      if (processedBlobs.length > 0) {
        const combinedBlob = await concatenateAudioBlobs(processedBlobs);

        // Clean up previous audio URL
        if (previewAudioUrl) {
          URL.revokeObjectURL(previewAudioUrl);
        }

        const previewUrl = URL.createObjectURL(combinedBlob);
        setPreviewAudioUrl(previewUrl);
        setAudioBlobs(processedBlobs);

        // Calculate total duration
        const audio = new Audio(previewUrl);
        await new Promise<void>((resolve) => {
          audio.onloadedmetadata = () => {
            const totalDuration = audio.duration;
            onAudioGenerated(combinedBlob, totalDuration);
            resolve();
          };
          audio.onerror = () => {
            console.error("Error loading audio metadata");
            resolve();
          };
        });
      }
    } catch (error) {
      setGenerationError(
        `Error generating full audio: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setProcessing(false);
    }
  };

  // Calculate estimated audio duration (rough estimate: 150 words per minute)
  const estimateAudioDuration = () => {
    const wordCount = text.split(/\s+/).length;
    const durationInMinutes = wordCount / (150 * 1.0);
    return durationInMinutes * 60; // Convert to seconds
  };

  return (
    <div className="space-y-4">
      {processing ? (
        <div className="bg-muted rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="font-medium">Generating audio preview</p>
              <p className="text-sm text-muted-foreground">
                Processing text segment {currentSegmentIndex + 1} of{" "}
                {segments.length}...
              </p>
            </div>
            <div className="text-primary bg-primary/10 px-2 py-1 rounded text-xs font-medium">
              {Math.round(progress)}%
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      ) : previewAudioUrl ? (
        <div className="space-y-4">
          <AudioPlayer
            audioUrl={previewAudioUrl}
            fileName="audiobook-preview"
            fileType={outputFormat}
          />

          {segments.length > 1 && (
            <Alert>
              <AlertDescription>
                This is a preview of the first segment only. The full audiobook
                will contain all {segments.length} segments, estimated at{" "}
                {Math.ceil(estimateAudioDuration() / 60)} minutes.
              </AlertDescription>
            </Alert>
          )}
        </div>
      ) : (
        <div className="bg-muted/30 border rounded-lg p-6 text-center">
          <p className="text-muted-foreground mb-6">
            Generate a preview to hear how your audiobook will sound with the
            selected voice
          </p>
          <Button
            onClick={generateAudioPreview}
            disabled={segments.length === 0}
          >
            <Wand2 className="h-4 w-4 mr-2" />
            Generate Preview
          </Button>
        </div>
      )}

      {generationError && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{generationError}</AlertDescription>
        </Alert>
      )}

      {segments.length > 1 &&
        audioBlobs.length <= 1 &&
        previewAudioUrl &&
        !processing && (
          <div className="mt-4">
            <Button
              onClick={generateFullAudio}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
            >
              <Wand2 className="h-4 w-4 mr-2" />
              Generate Full Audiobook ({segments.length} segments)
            </Button>
          </div>
        )}

      {segments.length > 0 && (
        <div className="text-sm text-muted-foreground mt-4">
          <p>
            Text will be processed in {segments.length} segment
            {segments.length !== 1 ? "s" : ""} due to length limitations.
          </p>
          <p className="mt-1">
            Total characters: {text.length} | Words: {text.split(/\s+/).length}{" "}
            | Estimated Duration: {Math.ceil(estimateAudioDuration() / 60)}{" "}
            minutes
          </p>
        </div>
      )}
    </div>
  );
}
