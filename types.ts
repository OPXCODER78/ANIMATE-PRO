
export interface AnimationVariation {
  id: string;
  name: string;
  html: string;
  customCss?: string;
  javascript?: string;
  assetBase64?: string; 
  assetMimeType?: string;
  assetType?: 'image' | 'video';
}

export type GeminiAnimationResponse = AnimationVariation[];

export interface GeneratedUi {
  html: string;
  customCss?: string;
  javascript?: string; // Added for UI animations
}

export interface GeneratedSite {
  id: string; // Will be generated client-side
  name: string; // From AI
  html: string; // From AI
  customCss?: string; // From AI
  javascript?: string; // From AI
}

export interface UiIconFile {
  file: File;
  svgString: string;
  conceptualName: string;
}
