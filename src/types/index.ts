/**
 * Tipos provisionales del dominio de Smokeame Ventana.
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
  /** true si el usuario es staff/superusuario (acceso al panel admin). */
  isStaff?: boolean;
  /** true si el usuario confirmó su email (requerido para entrar). */
  isEmailVerified?: boolean;
  /** Plan de suscripción: "free" o "pro". */
  plan?: "free" | "pro";
}

/** Conteos de desbloqueo de un mapa (lugares y lineups). */
export interface MapUnlockStats {
  totalPlaces: number;
  unlockedPlaces: number;
  totalLineups: number;
  unlockedLineups: number;
}

export interface Map {
  id: ID;
  name: string;
  imageUrl?: string;
  /** true si el mapa está disponible sin desbloquear. */
  isFree: boolean;
  /** true si solo los usuarios con plan Pro pueden comprarlo. */
  requiresProPlan?: boolean;
  /** true si el usuario ya lo desbloqueó. */
  unlocked: boolean;
  /** Costo en monedas para desbloquear el mapa (0 si es gratis). */
  unlockCost?: number;
  /** Conteos de desbloqueo de lugares y lineups. */
  unlockStats?: MapUnlockStats;
  places: Place[];
}

export interface Place {
  id: ID;
  mapId: ID;
  name: string;
  position: Position;
  /** true si el usuario ya lo desbloqueó. */
  unlocked?: boolean;
  /** Costo en monedas para desbloquear este lugar. */
  unlockCost?: number;
  /** Lineups del lugar (solo en el detalle del mapa). */
  lineups?: Lineup[];
}

export interface Lineup {
  id: ID;
  mapId: ID;
  placeId: ID;
  title: string;
  util: UtilityType;
  positions: Position[];
  description?: string;
  /** true si el usuario ya lo desbloqueó (con monedas). */
  unlocked?: boolean;
  /** Costo en monedas para desbloquear este lineup (0 si ya está desbloqueado). */
  unlockCost?: number;
  /** Cuántas preguntas están asociadas a este lineup. */
  questionCount?: number;
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
  /** Título del lineup asociado (si la pregunta pertenece a uno). */
  lineupTitle?: string;
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