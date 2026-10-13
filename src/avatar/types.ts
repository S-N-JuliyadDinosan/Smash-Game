export type Landmark = { x: number; y: number; z: number };
export type AvatarData = {
  id: string;
  photo: HTMLCanvasElement;
  landmarks: Landmark[];
  skin: string;
  hair: string;
  faceWidth: number;
  faceHeight: number;
};
export type GenerationProgress = { percent: number; label: string };
export interface AvatarProvider {
  id: string;
  name: string;
  privacy: string;
  generate(
    photo: HTMLCanvasElement,
    onProgress: (progress: GenerationProgress) => void,
    signal: AbortSignal,
  ): Promise<AvatarData>;
}
