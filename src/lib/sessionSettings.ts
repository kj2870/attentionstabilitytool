export type SessionSettings = {
  soundEnabled: boolean;
  fireSoundEnabled: boolean;
  showCameraPreview: boolean;
};

export const defaultSessionSettings: SessionSettings = {
  soundEnabled: true,
  fireSoundEnabled: true,
  showCameraPreview: true,
};