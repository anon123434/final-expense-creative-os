import type { AvatarRow } from "@/types/database";

const DEFAULT_AVATARS: AvatarRow[] = [];

type MockStore = { _mockAvatarRows?: AvatarRow[] };
const g = globalThis as typeof globalThis & MockStore;
if (!g._mockAvatarRows) g._mockAvatarRows = [...DEFAULT_AVATARS];
export const mockAvatarRows = g._mockAvatarRows;
