/**
 * Configuración declarativa del panel de administración.
 *
 * Cada entrada describe un recurso CRUD del backend (`/api/admin/<key>/`):
 * qué columnas mostrar en la tabla y qué campos editar en el formulario.
 * Es la única fuente de verdad para que las páginas genéricas funcionen.
 */

export type AdminFieldType =
  | "text"
  | "textarea"
  | "url"
  | "number"
  | "boolean"
  | "select"
  | "relation"
  | "datetime"
  | "password"
  | "image"
  | "map-position"
  | "options-editor";

export interface AdminOptionsEditorConfig {
  /** Recurso donde viven las opciones (ej. "options"). */
  relatedResource: string;
  /** Campo del recurso que apunta al registro actual (ej. "question"). */
  relationField: string;
  /** Campo de imagen del registro actual (ej. "image_url"). */
  imageField: string;
  /** Campos de salida x/y en el recurso relacionado. */
  positionOutput: { x: string; y: string };
}

export interface AdminField {
  name: string;
  label: string;
  type: AdminFieldType;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  /** Campo deshabilitado en el formulario (información de solo lectura). */
  readOnly?: boolean;
  /** No se muestra en el formulario (ej. id). */
  hidden?: boolean;
  /** Opciones para type: "select". */
  options?: { value: string; label: string }[];
  /** Recurso relacionado para type: "relation". */
  resource?: string;
  /** Campo legible del recurso relacionado para opciones y columnas. */
  displayField?: string;
  /** Campo extra del registro relacionado para desambiguar la etiqueta
   * (ej. "map_name" → "A site (Mirage)"). */
  displayContext?: string;
  /** Relación múltiple (ManyToMany). */
  multiple?: boolean;
  step?: string;
  min?: number;
  max?: number;
  /** Solo escritura: en edición se omite del payload si queda vacío. */
  writeOnly?: boolean;
  /** Permite null (ej. coordenadas opcionales). */
  nullable?: boolean;
  /** Carpeta destino en el bucket para type: "image". */
  uploadTo?: string;
  /** Para type: "image": si el registro tiene valor en la relación indicada
   * (ej. "lineup"), elige una imagen de esa relación en vez de subir una. */
  imageSource?: { relationField: string; resource: string };
  /** Para type: "map-position": la relación cuyo registro tiene la imagen del mapa
   * (ej. { relationField: "map", imageField: "image_url" }). */
  positionSource?: { relationField: string; imageField: string };
  /** Para type: "map-position": campos de salida x/y del payload
   * (ej. { x: "position_x", y: "position_y" }). */
  positionOutput?: { x: string; y: string };
  /** Para type: "options-editor": configuración del editor de opciones. */
  optionsEditor?: AdminOptionsEditorConfig;
}

export interface AdminFilter {
  /** Nombre del filtro y del query param (ej. "map"). */
  name: string;
  label: string;
  /** De dónde salen las opciones del desplegable. */
  options: "relation" | "select";
  /** Para options: "relation": recurso del que se listan las opciones. */
  resource?: string;
  /** Para options: "relation": campo legible de las opciones. */
  displayField?: string;
  /** Para options: "relation": campo extra para desambiguar la etiqueta. */
  displayContext?: string;
  /** Para options: "select": lista fija de valores. */
  optionsList?: { value: string; label: string }[];
  /** Acota las opciones según otro filtro activo (ej. el lugar depende del mapa:
   *  { filter: "map", map: "map" } fetchea los lugares con ?map=<mapa activo>). */
  dependsOn?: { filter: string; map: string };
}

export interface AdminResourceConfig {
  /** Segmento de URL y nombre del recurso en la API. */
  key: string;
  /** Etiqueta plural (ej. "Usuarios"). */
  label: string;
  /** Etiqueta singular (ej. "Usuario"). */
  singular: string;
  description?: string;
  /** Columnas a mostrar en la tabla de listado. */
  listColumns: string[];
  fields: AdminField[];
  /** true → sin crear/editar/eliminar (ej. audit-logs). */
  readOnly?: boolean;
  /** Filtros del listado vía query string (ej. lineups → map, place, util). */
  filters?: AdminFilter[];
  /** Acción por fila que enlaza a un recurso relacionado (ej. Lugares de un mapa). */
  rowLink?: { label: string; href: (id: number | string) => string };
  /** Acciones de cabecera que enlazan a otra sección (ej. ver reportes). */
  headerActions?: { label: string; href: string }[];
}

const UTILITY_TYPES = [
  { value: "smoke", label: "Smoke" },
  { value: "flashbang", label: "Flashbang" },
  { value: "he", label: "HE" },
  { value: "molotov", label: "Molotov" },
  { value: "decoy", label: "Decoy" },
];

const QUESTION_TYPES = [
  { value: "reference", label: "Adivinar la referencia" },
  { value: "utility", label: "¿Qué utilidad lanzar?" },
  { value: "landing_spot", label: "¿Dónde cae la utilidad?" },
  { value: "key_combo", label: "Combinación de teclas" },
  { value: "player_position", label: "Posición del jugador" },
  { value: "map_location", label: "Lugares del mapa" },
];

const UNLOCK_VIA = [
  { value: "free", label: "Gratuito (único)" },
  { value: "starter", label: "Inicial" },
  { value: "coins", label: "Monedas" },
];

const AUDIT_ACTIONS = [
  { value: "create", label: "Crear" },
  { value: "update", label: "Actualizar" },
  { value: "delete", label: "Eliminar" },
];

export const adminResources: AdminResourceConfig[] = [
  {
    key: "users",
    label: "Usuarios",
    singular: "Usuario",
    description: "Cuentas del sistema y sus permisos.",
    listColumns: ["id", "username", "email", "display_name", "plan", "is_staff", "is_active"],
    fields: [
      { name: "id", label: "ID", type: "number", hidden: true },
      { name: "username", label: "Nombre de usuario", type: "text", required: true },
      { name: "email", label: "Email", type: "text" },
      { name: "display_name", label: "Nombre visible", type: "text" },
      { name: "first_name", label: "Nombre", type: "text" },
      { name: "last_name", label: "Apellido", type: "text" },
      {
        name: "plan",
        label: "Plan",
        type: "select",
        options: [
          { value: "free", label: "Free" },
          { value: "pro", label: "Pro" },
        ],
        helpText: "Free: solo Mirage y Dust II. Pro: todos los mapas.",
      },
      { name: "is_staff", label: "Staff (acceso al panel)", type: "boolean" },
      { name: "is_superuser", label: "Superusuario", type: "boolean" },
      { name: "is_active", label: "Activo", type: "boolean" },
      {
        name: "password",
        label: "Contraseña",
        type: "password",
        writeOnly: true,
        helpText: "Se guarda hasheada. Dejalo vacío para no cambiarla.",
      },
      { name: "date_joined", label: "Fecha de alta", type: "datetime", readOnly: true },
      { name: "last_login", label: "Último acceso", type: "datetime", readOnly: true },
    ],
  },
  {
    key: "maps",
    label: "Mapas",
    singular: "Mapa",
    description: "Mapas del juego disponibles en los quizzes.",
    listColumns: ["id", "name", "slug", "is_free", "order"],
    rowLink: {
      label: "Lugares",
      href: (id) => `/admin/places?map=${id}`,
    },
    fields: [
      { name: "id", label: "ID", type: "number", hidden: true },
      { name: "name", label: "Nombre", type: "text", required: true },
      { name: "slug", label: "Slug", type: "text", required: true },
      { name: "image_url", label: "Imagen", type: "image", uploadTo: "maps" },
      { name: "is_free", label: "Gratis", type: "boolean" },
      { name: "order", label: "Orden", type: "number" },
    ],
  },
  {
    key: "places",
    label: "Lugares",
    singular: "Lugar",
    description: "Lugares dentro de cada mapa (A site, Apartamento…).",
    listColumns: ["id", "map", "name", "order"],
    filters: [
      { name: "map", label: "Mapa", options: "relation", resource: "maps", displayField: "name" },
    ],
    fields: [
      { name: "id", label: "ID", type: "number", hidden: true },
      { name: "map", label: "Mapa", type: "relation", resource: "maps", displayField: "name", required: true },
      { name: "name", label: "Nombre", type: "text", required: true },
      { name: "order", label: "Orden", type: "number" },
      {
        name: "position",
        label: "Posición en el mapa",
        type: "map-position",
        positionSource: { relationField: "map", imageField: "image_url" },
        positionOutput: { x: "position_x", y: "position_y" },
      },
      {
        name: "hit_radius",
        label: "Radio de zona (%)",
        type: "number",
        helpText: "Radio de tolerancia (0-100) para preguntas de tipo área. El toque cuenta como acierto dentro de este círculo.",
      },
    ],
  },
  {
    key: "lineups",
    label: "Lineups",
    singular: "Lineup",
    description: "Lineups concretos dentro de un lugar.",
    listColumns: ["id", "place", "title", "util", "question_count", "order"],
    filters: [
      { name: "map", label: "Mapa", options: "relation", resource: "maps", displayField: "name" },
      { name: "place", label: "Lugar", options: "relation", resource: "places", displayField: "name", displayContext: "map_name", dependsOn: { filter: "map", map: "map" } },
      { name: "util", label: "Utilidad", options: "select", optionsList: UTILITY_TYPES },
    ],
    fields: [
      { name: "id", label: "ID", type: "number", hidden: true },
      { name: "place", label: "Lugar", type: "relation", resource: "places", displayField: "name", displayContext: "map_name", required: true },
      { name: "title", label: "Título", type: "text", required: true },
      { name: "util", label: "Utilidad", type: "select", options: UTILITY_TYPES, required: true },
      { name: "description", label: "Descripción", type: "textarea" },
      { name: "order", label: "Orden", type: "number" },
    ],
    rowLink: {
      label: "Imágenes",
      href: (id) => `/admin/lineup-images?lineup=${id}`,
    },
  },
  {
    key: "lineup-images",
    label: "Imágenes de lineup",
    singular: "Imagen de lineup",
    description: "Galería de imágenes de cada lineup. Las preguntas de un lineup eligen una de estas imágenes.",
    listColumns: ["id", "lineup", "image_url", "order"],
    filters: [
      { name: "map", label: "Mapa", options: "relation", resource: "maps", displayField: "name" },
      {
        name: "lineup",
        label: "Lineup",
        options: "relation",
        resource: "lineups",
        displayField: "title",
        displayContext: "map_name",
        dependsOn: { filter: "map", map: "map" },
      },
    ],
    fields: [
      { name: "id", label: "ID", type: "number", hidden: true },
      {
        name: "lineup",
        label: "Lineup",
        type: "relation",
        resource: "lineups",
        displayField: "title",
        displayContext: "map_name",
        required: true,
      },
      { name: "image_url", label: "Imagen", type: "image", uploadTo: "questions" },
      { name: "order", label: "Orden", type: "number" },
    ],
  },
  {
    key: "questions",
    label: "Preguntas",
    singular: "Pregunta",
    description: "Preguntas de los quizzes: de un lineup, de un lugar o del mapa.",
    headerActions: [
      { label: "Ver reportes", href: "/admin/question-reports" },
    ],
    listColumns: ["id", "map", "lineup", "place", "type", "prompt"],
    filters: [
      { name: "map", label: "Mapa", options: "relation", resource: "maps", displayField: "name" },
      { name: "place", label: "Lugar", options: "relation", resource: "places", displayField: "name", displayContext: "map_name", dependsOn: { filter: "map", map: "map" } },
      { name: "lineup", label: "Lineup", options: "relation", resource: "lineups", displayField: "title", displayContext: "map_name", dependsOn: { filter: "map", map: "map" } },
      { name: "type", label: "Tipo", options: "select", optionsList: QUESTION_TYPES },
    ],
    fields: [
      { name: "id", label: "ID", type: "number", hidden: true },
      { name: "map", label: "Mapa", type: "relation", resource: "maps", displayField: "name", required: true },
      {
        name: "lineup",
        label: "Lineup",
        type: "relation",
        resource: "lineups",
        displayField: "title",
        displayContext: "map_name",
        nullable: true,
        helpText: "Opcional: dejalo vacío para preguntas de lugar o del mapa.",
      },
      {
        name: "place",
        label: "Lugar",
        type: "relation",
        resource: "places",
        displayField: "name",
        displayContext: "map_name",
        nullable: true,
        helpText: "Opcional: preguntas de un lugar (sin lineup). Si también cargás un lineup, la pregunta queda ligada a ese lineup.",
      },
      { name: "type", label: "Tipo", type: "select", options: QUESTION_TYPES, required: true },
      { name: "prompt", label: "Enunciado", type: "textarea", required: true },
      { name: "helper_text", label: "Ayuda", type: "textarea" },
      {
        name: "image_url",
        label: "Imagen",
        type: "image",
        uploadTo: "questions",
        imageSource: { relationField: "lineup", resource: "lineup-images" },
        helpText: "Si la pregunta tiene un lineup, elegí una de sus imágenes. Sin lineup, subís una.",
      },
      {
        name: "options",
        label: "Opciones de respuesta",
        type: "options-editor",
        optionsEditor: {
          relatedResource: "options",
          relationField: "question",
          imageField: "image_url",
          positionOutput: { x: "position_x", y: "position_y" },
        },
      },
    ],
  },
  {
    key: "options",
    label: "Opciones",
    singular: "Opción",
    description: "Opciones de respuesta de cada pregunta.",
    listColumns: ["id", "question", "text", "is_correct", "order"],
    fields: [
      { name: "id", label: "ID", type: "number", hidden: true },
      { name: "question", label: "Pregunta", type: "relation", resource: "questions", displayField: "prompt", required: true },
      { name: "text", label: "Texto", type: "text" },
      { name: "position_x", label: "Posición X (0-100)", type: "number", step: "0.01", nullable: true },
      { name: "position_y", label: "Posición Y (0-100)", type: "number", step: "0.01", nullable: true },
      { name: "is_correct", label: "Correcta", type: "boolean" },
      { name: "order", label: "Orden", type: "number" },
    ],
  },
  {
    key: "quizzes",
    label: "Quizzes",
    singular: "Quiz",
    description: "Quizzes generados por los usuarios.",
    listColumns: ["id", "title", "user", "created_at"],
    fields: [
      { name: "id", label: "ID", type: "number", hidden: true },
      { name: "user", label: "Usuario", type: "relation", resource: "users", displayField: "username", required: true },
      { name: "title", label: "Título", type: "text", required: true },
      { name: "maps", label: "Mapas", type: "relation", resource: "maps", displayField: "name", multiple: true },
      { name: "created_at", label: "Creado", type: "datetime", readOnly: true },
    ],
  },
  {
    key: "quiz-questions",
    label: "Preguntas de quiz",
    singular: "Pregunta de quiz",
    description: "Snapshot de preguntas dentro de un quiz.",
    listColumns: ["id", "quiz", "question", "order"],
    fields: [
      { name: "id", label: "ID", type: "number", hidden: true },
      { name: "quiz", label: "Quiz", type: "relation", resource: "quizzes", displayField: "title", required: true },
      { name: "question", label: "Pregunta", type: "relation", resource: "questions", displayField: "prompt", required: true },
      { name: "order", label: "Orden", type: "number" },
    ],
  },
  {
    key: "progressions",
    label: "Progresiones",
    singular: "Progresión",
    description: "Contadores (XP, monedas, rachas) de cada usuario.",
    listColumns: ["id", "user", "xp", "coins", "streak"],
    fields: [
      { name: "id", label: "ID", type: "number", hidden: true },
      { name: "user", label: "Usuario", type: "relation", resource: "users", displayField: "username", required: true },
      { name: "xp", label: "Experiencia", type: "number", min: 0 },
      { name: "coins", label: "Monedas", type: "number", min: 0 },
      { name: "streak", label: "Racha", type: "number", min: 0 },
      { name: "best_streak", label: "Mejor racha", type: "number", min: 0 },
      { name: "last_streak_at", label: "Última racha", type: "datetime", readOnly: true },
    ],
  },
  {
    key: "map-unlocks",
    label: "Desbloqueos de mapa",
    singular: "Desbloqueo de mapa",
    listColumns: ["id", "user", "map", "unlocked_at"],
    fields: [
      { name: "id", label: "ID", type: "number", hidden: true },
      { name: "user", label: "Usuario", type: "relation", resource: "users", displayField: "username", required: true },
      { name: "map", label: "Mapa", type: "relation", resource: "maps", displayField: "name", required: true },
      { name: "unlocked_at", label: "Desbloqueado", type: "datetime", readOnly: true },
    ],
  },
  {
    key: "place-unlocks",
    label: "Desbloqueos de lugar",
    singular: "Desbloqueo de lugar",
    listColumns: ["id", "user", "place", "via", "unlocked_at"],
    fields: [
      { name: "id", label: "ID", type: "number", hidden: true },
      { name: "user", label: "Usuario", type: "relation", resource: "users", displayField: "username", required: true },
      { name: "place", label: "Lugar", type: "relation", resource: "places", displayField: "name", displayContext: "map_name", required: true },
      { name: "via", label: "Vía", type: "select", options: UNLOCK_VIA },
      { name: "unlocked_at", label: "Desbloqueado", type: "datetime", readOnly: true },
    ],
  },
  {
    key: "lineup-unlocks",
    label: "Desbloqueos de lineup",
    singular: "Desbloqueo de lineup",
    listColumns: ["id", "user", "lineup", "unlocked_at"],
    fields: [
      { name: "id", label: "ID", type: "number", hidden: true },
      { name: "user", label: "Usuario", type: "relation", resource: "users", displayField: "username", required: true },
      { name: "lineup", label: "Lineup", type: "relation", resource: "lineups", displayField: "title", displayContext: "map_name", required: true },
      { name: "unlocked_at", label: "Desbloqueado", type: "datetime", readOnly: true },
    ],
  },
  {
    key: "question-type-unlocks",
    label: "Desbloqueos de tipo",
    singular: "Desbloqueo de tipo",
    description: "Desbloqueo de tipos de pregunta por usuario.",
    listColumns: ["id", "user", "question_type", "unlocked_at"],
    fields: [
      { name: "id", label: "ID", type: "number", hidden: true },
      { name: "user", label: "Usuario", type: "relation", resource: "users", displayField: "username", required: true },
      { name: "question_type", label: "Tipo de pregunta", type: "select", options: QUESTION_TYPES, required: true },
      { name: "unlocked_at", label: "Desbloqueado", type: "datetime", readOnly: true },
    ],
  },
  {
    key: "question-types",
    label: "Tipos de pregunta",
    singular: "Tipo de pregunta",
    description: "Configura qué tipos de pregunta se desbloquean desde el inicio y a qué nivel, con sus restricciones.",
    listColumns: ["id", "question_type", "label", "unlock_level", "order"],
    fields: [
      { name: "id", label: "ID", type: "number", hidden: true },
      {
        name: "question_type",
        label: "Tipo de pregunta",
        type: "select",
        options: QUESTION_TYPES,
        required: true,
        helpText: "Identificador fijo del tipo; no conviene cambiarlo.",
      },
      { name: "label", label: "Etiqueta", type: "text", required: true },
      {
        name: "unlock_level",
        label: "Nivel de desbloqueo",
        type: "number",
        nullable: true,
        helpText: "0 = desde el inicio. 1+ = nivel requerido. Vacío = solo con monedas.",
      },
      { name: "order", label: "Orden", type: "number" },
      {
        name: "utility_levels",
        label: "Niveles por utilidad",
        type: "textarea",
        helpText: 'Solo para "¿Qué utilidad lanzar?": JSON {"smoke": 2, "molotov": 3, "flashbang": 4, "he": 5, "decoy": 6}.',
      },
    ],
  },
  {
    key: "video-reward-config",
    label: "Video con recompensa",
    singular: "Configuración de video",
    description:
      "Monedas y cooldown del reward por ver un video (recompensa por publicidad). Fila única.",
    listColumns: ["id", "coins", "cooldown_hours", "enabled"],
    fields: [
      { name: "id", label: "ID", type: "number", hidden: true },
      { name: "coins", label: "Monedas por video", type: "number", min: 0, required: true },
      { name: "cooldown_hours", label: "Cooldown (horas)", type: "number", min: 0, required: true },
      { name: "enabled", label: "Habilitado", type: "boolean" },
      {
        name: "video_url",
        label: "Video (URL o tag)",
        type: "textarea",
        helpText:
          "URL de un video placeholder o, más adelante, el tag HTML/JS de la red de rewarded video (Playwire).",
      },
    ],
  },
  {
    key: "video-reward-claims",
    label: "Reclamos de video",
    singular: "Reclamo de video",
    description: "Reclamos de recompensa por video de cada usuario. Solo lectura.",
    readOnly: true,
    listColumns: ["id", "username", "claimed_at"],
    fields: [
      { name: "id", label: "ID", type: "number", hidden: true },
      { name: "user", label: "Usuario", type: "relation", resource: "users", displayField: "username", readOnly: true },
      { name: "username", label: "Usuario", type: "text", readOnly: true },
      { name: "claimed_at", label: "Reclamado", type: "datetime", readOnly: true },
    ],
  },
  {
    key: "audit-logs",
    label: "Auditoría",
    singular: "Registro de auditoría",
    description: "Trail de operaciones del panel. Solo lectura.",
    readOnly: true,
    listColumns: ["id", "actor", "action", "model_name", "object_id", "created_at"],
    fields: [
      { name: "id", label: "ID", type: "number", hidden: true },
      { name: "actor", label: "Actor", type: "relation", resource: "users", displayField: "username", readOnly: true },
      { name: "action", label: "Acción", type: "select", options: AUDIT_ACTIONS, readOnly: true },
      { name: "app_label", label: "App", type: "text", readOnly: true },
      { name: "model_name", label: "Modelo", type: "text", readOnly: true },
      { name: "object_id", label: "Objeto", type: "text", readOnly: true },
      { name: "summary", label: "Resumen", type: "text", readOnly: true },
      { name: "ip_address", label: "IP", type: "text", readOnly: true },
      { name: "created_at", label: "Fecha", type: "datetime", readOnly: true },
    ],
  },
  {
    key: "question-reports",
    label: "Reportes de preguntas",
    singular: "Reporte",
    description: "Reportes anónimos de preguntas enviados por los usuarios.",
    readOnly: true,
    listColumns: ["id", "question", "reason_display", "detail", "created_at"],
    fields: [
      { name: "id", label: "ID", type: "number", hidden: true },
      { name: "question", label: "Pregunta", type: "relation", resource: "questions", displayField: "prompt", readOnly: true },
      { name: "reason_display", label: "Motivo", type: "text", readOnly: true },
      { name: "detail", label: "Detalle", type: "textarea", readOnly: true },
      { name: "created_at", label: "Creado", type: "datetime", readOnly: true },
    ],
  },
];

export const adminResourceByKey = new Map(
  adminResources.map((resource) => [resource.key, resource]),
);

export function getAdminResource(key: string): AdminResourceConfig | undefined {
  return adminResourceByKey.get(key);
}