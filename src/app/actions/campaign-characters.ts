"use server";

import { revalidatePath } from "next/cache";
import { createCharacter, deleteCharacter } from "@/lib/repositories/campaign-character-repo";
import { uploadGeneratedImage } from "@/lib/services/gemini-image";
import { actionOk, actionFail, type ActionResult } from "@/lib/result";
import type { CampaignCharacter } from "@/types/campaign-character";

export async function createCharacterAction(
  campaignId: string,
  name: string,
  base64: string,
  mimeType: string
): Promise<ActionResult<{ character: CampaignCharacter }>> {
  try {
    const url = await uploadGeneratedImage(
      `assets/characters/${campaignId}/${Date.now()}.jpg`,
      base64,
      mimeType
    );
    const character = await createCharacter({ campaignId, name, referenceImageUrl: url });
    revalidatePath(`/campaigns/${campaignId}/visual-plan`);
    return actionOk({ character });
  } catch (err) {
    console.error("createCharacterAction:", err);
    return actionFail(err, "Failed to create character.");
  }
}

export async function deleteCharacterAction(
  characterId: string,
  campaignId: string
): Promise<ActionResult<null>> {
  try {
    await deleteCharacter(characterId);
    revalidatePath(`/campaigns/${campaignId}/visual-plan`);
    return actionOk(null);
  } catch (err) {
    console.error("deleteCharacterAction:", err);
    return actionFail(err, "Failed to delete character.");
  }
}
