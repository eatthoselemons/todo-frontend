export type Intensity = "none" | "minimal" | "standard" | "extra";

export interface IntensityConfig {
  motionScale: number; // 0..2
  particles: number; // count multiplier
  sound: "off" | "subtle" | "normal" | "rich";
  haptics: "off" | "light" | "medium" | "strong";
  pointsMultiplier: number;
}

export interface ThemeManifest {
  id: string;
  name: string;
  version: string;
  author?: string;
  description?: string;
  compatibleAppRange: string; // semver range
  tokensCssHref?: string; // optional external CSS to adopt
  settingsSchema?: Record<string, any>; // JSON Schema
  intensities: Record<Intensity, IntensityConfig>;
  contributes?: {
    effects?: readonly string[]; // known event ids this theme handles
    sounds?: Readonly<Record<string, string>>; // id -> url
    assets?: Readonly<Record<string, string>>; // id -> url
  };
}

export interface AnimationEffect {
  target: string; // CSS selector or logical target id (e.g. "task:123")
  kind: "burst" | "liquidSplash" | "liquidFill" | "rise" | "shake" | "confetti" | "lottie" | "celebrationSplash";
  params?: Record<string, any>;
  durationMs?: number;
}

export type ParticleEffect =
  | {
      kind: "confetti";
      count: number;
      origin?: { x: number; y: number };
      colorSet?: string[];
      spread?: number; // degrees
      velocity?: number; // px/s
    }
  | {
      kind: "bubbles";
      count: number;
      origin?: { x: number; y: number };
      colorSet?: string[];
      riseSpeed?: number; // px/s
      wobble?: number; // px amplitude
    }
  | {
      kind: "sparks";
      count: number;
      origin?: { x: number; y: number };
      colorSet?: string[];
      trail?: boolean;
    }
  | {
      kind: "sparkles";
      count: number;
      origin?: { x: number; y: number };
      colorSet?: string[];
      sizeRange?: [number, number]; // px
    };

export interface SoundEffect {
  id: string;
  volume?: number;
}

export interface HapticEffect {
  pattern: number[] | "light" | "medium" | "strong";
}

export interface PointsEffect {
  delta: number;
  reason?: string;
}

export interface EffectDescriptor {
  animations?: AnimationEffect[];
  particles?: ParticleEffect[];
  sound?: SoundEffect;
  haptics?: HapticEffect;
  points?: PointsEffect;
}

export interface TaskCompleteEvent {
  type: "task:complete";
  taskId: string;
  isRoot?: boolean;
  clientPos?: { x: number; y: number };
  targetElement?: HTMLElement;
}

export interface TaskCreateEvent {
  type: "task:create";
  taskId: string;
  clientPos?: { x: number; y: number };
}

export interface TaskDeleteEvent {
  type: "task:delete";
  taskId: string;
}

export interface BranchCompleteEvent {
  type: "branch:complete";
  taskId: string;
  clientPos?: { x: number; y: number };
  targetElement?: HTMLElement;
}

export interface MilestoneEvent {
  type: "milestone";
  label: string;
  value: number;
}

export interface IdleEvent {
  type: "idle";
  timestamp: number;
}

export type ThemeEvent =
  | TaskCompleteEvent
  | TaskCreateEvent
  | TaskDeleteEvent
  | BranchCompleteEvent
  | MilestoneEvent
  | IdleEvent;

export interface ThemeContext {
  intensity: Intensity;
  userSettings: Record<string, any>;
  animations: boolean;
  sounds: boolean;
  haptics: boolean;
}

export interface ThemeServices {
  preloadSound?: (id: string, url: string) => Promise<void>;
  preloadImage?: (id: string, url: string) => Promise<void>;
  log?: (message: string) => void;
}

export interface ThemeModule {
  manifest: ThemeManifest;
  install?: (services: ThemeServices) => Promise<void> | void;
  uninstall?: () => void;
  getEffects?: (event: ThemeEvent, ctx: ThemeContext) => EffectDescriptor | void;
}
