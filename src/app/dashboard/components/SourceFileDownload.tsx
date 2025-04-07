"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SourceFileDownloadProps {
  sourceFile: {
    url: string;
    name: string;
    signedUrl?: string;
  };
}

export function SourceFileDownload({ sourceFile }: SourceFileDownloadProps) {
  const downloadSourceFile = async () => {
    try {
      if (!sourceFile.signedUrl) {
        throw new Error("No signed URL available");
      }

      const response = await fetch(sourceFile.signedUrl);
      if (!response.ok) {
        throw new Error("Download failed");
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;

      // Ensure the filename ends with .pdf
      const downloadFilename = sourceFile.name.endsWith(".pdf")
        ? sourceFile.name
        : `${sourceFile.name}.pdf`;

      a.download = downloadFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      toast(`${downloadFilename} is downloading to your device.`);
    } catch (error) {
      console.error("Download error:", error);
      toast("Could not download the file. Please try again.");
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground hover:bg-muted"
            onClick={downloadSourceFile}
            disabled={!sourceFile.signedUrl}
          >
            <FileDown className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Download source file</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
