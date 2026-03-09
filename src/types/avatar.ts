export type AvatarMode = 'likeness_only' | 'likeness_environment';
export type AspectRatio = '16:9' | '9:16';

export interface Avatar {
  id: string;
  userId: string;
  name: string;
  prompt: string;
  expandedPrompt: string | null;
  mode: AvatarMode;
  aspectRatio: AspectRatio;
  referenceImageUrl: string | null;
  imageUrls: string[];
  createdAt: string;
}
