"use client";

import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Upload, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Define types for PDF.js with module declaration
interface PDFPage {
  getTextContent: () => Promise<{ items: Array<{ str?: string }> }>;
}

interface PDFDocumentProxy {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PDFPage>;
}

interface PDFDocumentLoadingTask {
  promise: Promise<PDFDocumentProxy>;
  onPassword: (callback: (password: string) => void) => void;
}

interface PDFjs {
  getDocument: (
    source: string | ArrayBuffer | { data: ArrayBuffer }
  ) => PDFDocumentLoadingTask;
  GlobalWorkerOptions: {
    workerSrc: string;
  };
}

// Use module declaration instead of global interface augmentation
declare global {
  interface Window {
    pdfjsLib: PDFjs;
  }
}

interface FileUploaderProps {
  onTextExtracted: (text: string) => void;
  onFileSelected: (file: File) => void;
}

export default function FileUploader({
  onTextExtracted,
  onFileSelected,
}: FileUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [extractionLoading, setExtractionLoading] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);

  // Function to extract text from a text file
  const extractTextFromTextFile = useCallback(
    (file: File) => {
      setExtractionLoading(true);
      setExtractionError(null);

      const reader = new FileReader();

      reader.onload = (e) => {
        const content = e.target?.result as string;
        onTextExtracted(content);
        setExtractionLoading(false);
      };

      reader.onerror = () => {
        setExtractionError("Failed to read the text file. Please try again.");
        setExtractionLoading(false);
      };

      reader.readAsText(file);
    },
    [onTextExtracted]
  );

  // Function to extract text from a PDF file
  const extractTextFromPdf = useCallback(
    async (file: File) => {
      setExtractionLoading(true);
      setExtractionError(null);

      try {
        // Load PDF.js from CDN if not already loaded
        if (typeof window !== "undefined" && !window.pdfjsLib) {
          const script = document.createElement("script");
          script.src =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js";
          script.async = true;

          await new Promise<void>((resolve, reject) => {
            script.onload = () => resolve();
            script.onerror = () =>
              reject(new Error("Failed to load PDF.js library"));
            document.head.appendChild(script);
          });
        }

        // Convert the file to an ArrayBuffer
        const arrayBuffer = await new Promise<ArrayBuffer>(
          (resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
            reader.onerror = (e) =>
              reject(
                new Error(
                  "Failed to read file: " + e.target?.error?.message ||
                    "Unknown error"
                )
              );
            reader.readAsArrayBuffer(file);
          }
        );

        // Check if pdfjsLib is loaded
        if (!window.pdfjsLib) {
          throw new Error("PDF.js library failed to load");
        }

        // Use pdfjsLib to extract text
        const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer })
          .promise;

        // Extract text from each page
        const numPages = pdf.numPages;
        let extractedText = "";

        for (let i = 1; i <= numPages; i++) {
          try {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();

            const pageText = textContent.items
              .map((item) => item.str || "")
              .join(" ");

            extractedText += pageText + "\n\n";
          } catch (pageError) {
            console.error(`Error extracting text from page ${i}:`, pageError);
            // Continue with other pages
          }
        }

        if (extractedText.trim().length === 0) {
          setExtractionError(
            "Could not extract text from this PDF. The file may be scanned or contain only images."
          );
        } else {
          onTextExtracted(extractedText);
        }
      } catch (error) {
        console.error("Error extracting text from PDF:", error);
        setExtractionError(
          "Failed to extract text from the PDF. Please try another file or paste the text manually."
        );
      } finally {
        setExtractionLoading(false);
      }
    },
    [onTextExtracted]
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles && acceptedFiles.length > 0) {
        const selectedFile = acceptedFiles[0];
        setFile(selectedFile);
        onFileSelected(selectedFile);

        // Get the file extension
        const fileExt = selectedFile.name.split(".").pop()?.toLowerCase();

        // Process based on file type
        if (fileExt === "txt") {
          extractTextFromTextFile(selectedFile);
        } else if (fileExt === "pdf") {
          extractTextFromPdf(selectedFile);
        } else {
          onTextExtracted("");
          setExtractionError(
            "File type not supported for text extraction. Upload a .txt or .pdf file to see its content here."
          );
        }
      }
    },
    [
      onFileSelected,
      extractTextFromTextFile,
      extractTextFromPdf,
      onTextExtracted,
    ]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/plain": [".txt"],
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
    multiple: false,
  });

  return (
    <div>
      <label className="block text-sm font-medium mb-2">Upload Document</label>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors bg-muted/30 
          ${
            isDragActive
              ? "border-primary bg-primary/5"
              : "hover:border-primary/50"
          }`}
      >
        {extractionLoading ? (
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4"></div>
            <p className="text-muted-foreground">Extracting content...</p>
          </div>
        ) : (
          <>
            <input {...getInputProps()} />
            <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              {isDragActive
                ? "Drop the file here..."
                : "Drag and drop your file here, or click to browse"}
            </p>
            <Button variant="outline" className="hover:cursor-pointer">
              Browse Files
            </Button>
            {file && <p className="mt-4 text-primary">Selected: {file.name}</p>}
          </>
        )}
      </div>

      {extractionError && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{extractionError}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
