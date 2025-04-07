"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Wand2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { GoogleGenAI } from "@google/genai";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface TextProcessorProps {
  originalText: string;
  onProcessedText: (text: string) => void;
  onError: (error: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const TextProcessor: React.FC<TextProcessorProps> = ({
  originalText,
  onProcessedText,
  onError,
  isLoading,
  setIsLoading,
}) => {
  const [processedText, setProcessedText] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("original");
  const [apiError, setApiError] = useState<string | null>(null);
  const [useProcessed, setUseProcessed] = useState<boolean>(false);

  // Function to process text through Google's Gemini API
  const processTextWithGemini = async () => {
    setIsLoading(true);
    setApiError(null);

    try {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

      if (!apiKey) {
        throw new Error(
          "Google API key is not configured. Please add your API key in the settings."
        );
      }

      const genAI = new GoogleGenAI({ apiKey });

      const response = await genAI.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `
  I have extracted text from a document that includes the story narrative and extraneous elements such as copyright notices, author names, and page numbers.
  
  My goal is to clean and format the text as a JSON array of story chunks, suitable for direct conversion to an audiobook. Each chunk should be a meaningful segment of the story and designed for easy stitching in an audiobook.
  
  Instructions:
  
  1. Extract and Preserve Narrative: Carefully identify and extract ONLY the continuous story content. Do NOT include any copyright notices, author names, page numbers, headers, footers, citations, references, or any other metadata.
  
  2. JSON Array Output: Return a JSON array where each element is a JSON object with the following structure:
  
  [
    {
      "chunkId": 1,
      "text": "The beginning of the story chunk..."
    },
    {
      "chunkId": 2,
      "text": "Continuation of the story..."
    }
  ]
  
  3. Character Limit Enforcement:
  - Each "text" field must contain a maximum of 2000 characters.
  - If a sentence exceeds 2000 characters, split it at the nearest grammatically sound point *before* the 2000-character mark. Prioritize complete sentences.
  
  4. Meaningful Chunking: Split the text into chunks at natural sentence breaks (periods, question marks, or exclamation points) whenever possible. Avoid breaking in the middle of sentences or clauses.
  
  5. Complete Story: Ensure the output contains the entire narrative, from beginning to end, without any missing sections or summaries. The output should follow a natural story flow.
  
  Here is the text to process:
  
  ${originalText}
  
  Output: (A JSON array of story chunks, as described above)
        `,
      });

      const jsonOutput = response.candidates?.[0]?.content?.parts?.[0]?.text;

      // Clean up Markdown formatting from model output
      const cleanText = jsonOutput
        ?.replace(/^```json\s*/, "")
        .replace(/^```\s*/, "")
        .replace(/```$/, "");

      // Define the expected structure
      interface ChunkData {
        chunkId: number;
        text: string;
      }

      let parsedJson: ChunkData[];

      try {
        parsedJson = JSON.parse(cleanText || "[]");
      } catch (err) {
        console.error("Failed to parse JSON:", err);
        throw new Error("Model did not return valid JSON array");
      }

      const cleanedText = parsedJson.map((chunk) => chunk.text).join("\n\n");

      if (!cleanedText || cleanedText.length < 50) {
        console.log("No meaningful text content in the response", cleanedText);
        throw new Error("No meaningful text content in the response");
      }

      setProcessedText(cleanedText);
      // Only update the text in the parent if the user has chosen to use processed text
      if (useProcessed) {
        onProcessedText(cleanedText);
      }
      // Auto-switch to processed tab when processing completes
      setActiveTab("processed");
    } catch (error) {
      console.error("Error processing text:", error);
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      setApiError(errorMessage);
      onError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle switch toggle for using processed text
  const handleUseProcessedToggle = (checked: boolean) => {
    setUseProcessed(checked);
    if (checked) {
      onProcessedText(processedText);
    } else {
      onProcessedText(originalText);
    }
  };

  useEffect(() => {
    // Reset processed text when original text changes
    setProcessedText("");
    setApiError(null);
    // Reset to original tab when text changes
    setActiveTab("original");
    // Reset the switch when text changes
    setUseProcessed(false);
  }, [originalText]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-white">Text Preparation</h3>
      </div>

      {apiError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{apiError}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="original">Original</TabsTrigger>
          <TabsTrigger value="processed" disabled={!processedText}>
            Processed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="original">
          <Textarea
            value={originalText || "Upload or paste text to get started..."}
            readOnly
            className="min-h-[200px]"
          />
        </TabsContent>

        <TabsContent value="processed">
          <Textarea
            value={
              processedText ||
              "Process your text to see the cleaned version here..."
            }
            readOnly
            className="min-h-[200px]"
          />
        </TabsContent>
      </Tabs>

      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          {processedText && (
            <div className="flex items-center space-x-2">
              <Switch
                id="use-processed"
                checked={useProcessed}
                onCheckedChange={handleUseProcessedToggle}
                disabled={!processedText}
              />
              <Label htmlFor="use-processed">Use processed</Label>
            </div>
          )}
          <div className="text-sm text-muted-foreground">
            {processedText
              ? "Text has been processed and optimized for narration"
              : "Process text to remove formatting and prepare for narration"}
          </div>
        </div>
        <Button
          onClick={processTextWithGemini}
          disabled={!originalText || isLoading}
        >
          {isLoading ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-transparent"></div>
              Processing...
            </>
          ) : (
            <>
              <Wand2 className="mr-2 h-4 w-4" />
              Process Text
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default TextProcessor;
