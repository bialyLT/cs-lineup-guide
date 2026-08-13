/**
 * Tipos provisionales del dominio de LineupLab.
 *
 * Son la base para negociar el contrato con los serializers de Django.
 * Se espera que cambien al definir la API — mantenerlos simples y agnósticos.
 */

export type ID = string;

export type QuestionType =
  | "reference"
  | "utility"
  | "landing_spot"
  | "key_combo"
  | "player_position"
  | "map_location";

export type UtilityType =
  | "smoke"
  | "flashbang"
  | "he"
  | "molotov"
  | "decoy";

/** Coordenadas relativas (0-100) sobre la imagen de referencia. Jer nunca en píxeles. */
export interface Position {
  x: number;
  y: number;
}

export interface User {
  id: ID;
  username: string;
  displayName?: string;
  email?: string;
}

export interface Map {
  id: ID;
  name: string;
  imageUrl?: string;
  /** true si el mapa está disponible sin desbloquear. */
  isFree: boolean;
  /** true si el usuario ya lo desbloqueó. */
  unlocked: boolean;
}

export interface Place {
  id: ID;
  mapId: ID;
  name: string;
  position: Position;
}

export interface Lineup {
  id: ID;
  mapId: ID;
  placeId: ID;
  title: string;
  util: UtilityType;
  positions: Position[];
}

export interface Option {
  id: ID;
  text?: string;
  /** Solo en preguntas visuales: marcador sobre la imagen. */
  position?: Position;
  isCorrect?: boolean;
}

export interface Question {
  id: ID;
  type: QuestionType;
  prompt: string;
  helperText?: string;
  imageUrl?: string;
  /** usa las últimas utilidades previstas (ej. "MOL84"). */
  keyCombo?: string;
  options: Option[];
}

export interface Quiz {
  id: ID;
  title: string;
  mapIds: ID[];
  questions: Question[];
}

/**
 * Progreso del usuario. El nivel se calcula siempre a partir de la xp
 * (ver src/lib/xp.ts): nunca se guarda un atributo de nivel separado.
 */
export interface Progression {
  xp: number;
  streak: number;
  coins: number;
  bestStreak?: number;
}

/** Estados de desbloqueo de contenido. */
export type UnlockState = "free" | "unlocked" | "locked";