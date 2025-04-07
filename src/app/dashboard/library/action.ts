"use server";

import prisma from "@/utils/prisma";
import { revalidatePath } from "next/cache";

export async function deleteAudiobook(id: string) {
  try {
    // Delete the audiobook and its associated files
    await prisma.audiobook.delete({
      where: {
        id: id,
      },
      include: {
        audioFile: true,
        sourceFile: true,
      },
    });

    // Revalidate both dashboard and library pages since they show audiobooks
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/library");

    return { success: true };
  } catch (error) {
    console.error("Error deleting audiobook:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
