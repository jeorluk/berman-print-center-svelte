export enum DialogType {
  // settings,
  about,
}

export const DIALOG_SIZES: Record<keyof typeof DialogType, [number, number]> = {
  // settings: [400, 300],
  about: [400, 280],
};
