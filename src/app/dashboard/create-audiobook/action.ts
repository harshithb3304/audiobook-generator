"use server";

import { createClient } from "@deepgram/sdk";
import { createClient as createSupabaseClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

// Validate that the Deepgram API key is set
if (!process.env.DEEPGRAM_API_KEY) {
  console.error("Missing DEEPGRAM_API_KEY environment variable");
}

// Create a Deepgram client
const deepgram = createClient(process.env.DEEPGRAM_API_KEY || "");

// Valid encoding types for Deepgram
type EncodingType =
  | "linear16"
  | "mulaw"
  | "alaw"
  | "mp3"
  | "opus"
  | "flac"
  | "aac";

export async function generateTTS(
  text: string,
  model: string,
  encoding: EncodingType,
  container: string,
  speechRate: number = 1.0
) {
  try {
    // Check text length limitations
    if (text.length > 2000) {
      throw new Error("Text exceeds the maximum length of 2000 characters");
    }

    // Make the TTS request to Deepgram
    const response = await deepgram.speak.request(
      { text },
      {
        model: model || "aura-asteria-en",
        encoding: encoding || "linear16",
        container: container || "wav",
        sample_rate: 24000, // High quality sample rate
        speed: speechRate,
      }
    );

    // Get the audio stream from the response
    const stream = await response.getStream();

    if (!stream) {
      throw new Error("Failed to generate audio stream");
    }

    // Read the stream into a buffer
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    // Combine chunks into a single Uint8Array
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const audioData = new Uint8Array(totalLength);

    let position = 0;
    for (const chunk of chunks) {
      audioData.set(chunk, position);
      position += chunk.length;
    }

    return {
      success: true,
      data: audioData,
      contentType: "audio/wav",
    };
  } catch (error) {
    console.error("Error in TTS generation:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function saveAudiobook(audiobookData: {
  title: string;
  description: string;
  duration: number;
  voiceId: string;
  sourceFilePath?: string;
  audioFilePath: string;
  sourceFileMetadata?: {
    name: string;
    type: string;
    size: number;
    text: string;
  };
  audioFileMetadata: {
    name: string;
    type: string;
    size: number;
  };
}) {
  const supabase = await createSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return { success: false, error: "User not authenticated" };
  }

  try {
    // Create audiobook record
    const { data: audiobookRecord, error: audiobookError } = await supabase
      .from("Audiobook")
      .insert({
        title: audiobookData.title,
        description: audiobookData.description,
        duration: audiobookData.duration,
        voiceid: audiobookData.voiceId,
        status: "completed",
        progress: 100,
        userid: userData.user.id,
      })
      .select()
      .single();

    if (audiobookError) {
      return {
        success: false,
        error: `Error creating audiobook record: ${audiobookError.message}`,
      };
    }

    // Create source file record if available
    if (
      audiobookData.sourceFilePath &&
      audiobookData.sourceFileMetadata &&
      audiobookRecord
    ) {
      await supabase.from("SourceFile").insert({
        name: audiobookData.sourceFileMetadata.name,
        type: audiobookData.sourceFileMetadata.type,
        size: audiobookData.sourceFileMetadata.size,
        url: audiobookData.sourceFilePath,
        text: audiobookData.sourceFileMetadata.text,
        audiobookid: audiobookRecord.id,
      });
    }

    // Create audio file record
    if (audiobookData.audioFilePath && audiobookRecord) {
      await supabase.from("AudioFile").insert({
        name: audiobookData.audioFileMetadata.name,
        type: audiobookData.audioFileMetadata.type,
        size: audiobookData.audioFileMetadata.size,
        duration: audiobookData.duration,
        url: audiobookData.audioFilePath,
        audiobookid: audiobookRecord.id,
      });
    }

    revalidatePath("/dashboard/library");
    return { success: true, audiobookId: audiobookRecord.id };
  } catch (error) {
    console.error("Error saving audiobook:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function getUploadUrls(fileInfo: {
  sourceFileName?: string;
  audioFileName: string;
}) {
  const supabase = await createSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return { success: false, error: "User not authenticated" };
  }

  try {
    const urls: { sourceUrl?: string; audioUrl: string } = { audioUrl: "" };

    // Get signed URL for source file if provided
    if (fileInfo.sourceFileName) {
      const sourceFilePath = `${userData.user.id}/${Date.now()}-${
        fileInfo.sourceFileName
      }`;
      const { data: sourceData, error: sourceError } = await supabase.storage
        .from("source-files")
        .createSignedUploadUrl(sourceFilePath);

      if (sourceError) throw sourceError;
      urls.sourceUrl = sourceData.signedUrl;
    }

    // Get signed URL for audio file
    const audioFilePath = `${userData.user.id}/complete-${Date.now()}-${
      fileInfo.audioFileName
    }`;
    const { data: audioData, error: audioError } = await supabase.storage
      .from("audio-files")
      .createSignedUploadUrl(audioFilePath);

    if (audioError) throw audioError;
    urls.audioUrl = audioData.signedUrl;

    return {
      success: true,
      data: {
        urls,
        paths: {
          sourcePath: fileInfo.sourceFileName
            ? `${userData.user.id}/${Date.now()}-${fileInfo.sourceFileName}`
            : undefined,
          audioPath: audioFilePath,
        },
      },
    };
  } catch (error) {
    console.error("Error getting signed URLs:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
