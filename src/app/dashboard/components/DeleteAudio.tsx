"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteAudiobook } from "../library/action";
import React, { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export default function DeleteAudio({ audiobookid }: { audiobookid: string }) {
  const [openDeleteDialog, setOpenDeleteDialog] = React.useState(false);
  const [audioDeleting, setAudioDeleting] = useState<boolean>(false);

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="destructive"
              size="icon"
              onClick={() => setOpenDeleteDialog(true)}
              disabled={audioDeleting}
            >
              {audioDeleting ? (
                <span className="animate-spin h-4 w-4 border-2 border-red-400 rounded-full border-t-transparent" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Delete audiobook</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <AlertDialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Audiobook</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this audiobook? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setAudioDeleting(true);
                const result = await deleteAudiobook(audiobookid);
                if (result.success) {
                  setOpenDeleteDialog(false);
                  setAudioDeleting(false);
                  toast.success("Audiobook deleted successfully");
                } else {
                  setAudioDeleting(false);
                  toast.error(result.error || "Failed to delete audiobook");
                }
              }}
            >
              {audioDeleting ? (
                <span className="flex items-center">
                  <span className="animate-spin mr-2 h-4 w-4 border-2 border-white rounded-full border-t-transparent" />
                  Deleting...
                </span>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
