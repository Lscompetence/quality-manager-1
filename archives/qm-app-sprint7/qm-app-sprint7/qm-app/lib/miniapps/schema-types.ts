// =============================================================================
// MiniApp schéma déclaratif — types
// Un MiniAppSchema décrit la structure d'une mini-app : ses tables (registres),
// leurs colonnes (avec types), ses onglets, et ses données seed.
// Le moteur générique <MiniApp schemaKey="..." /> consomme cette description.
//
// v2 (sprint 7) — couche « contrôles automatiques » :
//   - colonnes `computed`      → équivalent d'une formule de cellule
//   - `TableSchema.summary`    → équivalent d'une feuille Synthèse
//   - `MiniAppSchema.controls` → bandeau d'alertes en tête de mini-app
// Ces trois hooks sont des fonctions TS. Elles ne traversent JAMAIS la frontière
// serveur → client : le moteur résout le schéma lui-même via le registry.
// =============================================================================

export type Category = "AF" | "BC" | "VAE" | "CFA";

/** Tonalité d'un résultat calculé — mappée sur le code couleur des classeurs. */
export type Tone = "ok" | "warn" | "danger" | "neutral";

export type Row = Record<string, unknown>;

export type SelectOption = {
  value: string;
  label: string;
};

// -----------------------------------------------------------------------------
// Contexte de calcul
// -----------------------------------------------------------------------------

/** Contexte passé à une colonne `computed`. */
export type ComputeCtx = {
  /** La ligne courante */
  row: Row;
  /** Toutes les lignes de la table courante */
  rows: Row[];
  rowIndex: number;
  /** Toutes les tables de la mini-app (permet les lookups inter-tables) */
  tables: Record<string, Row[]>;
};

export type ComputedResult = { text: string; tone?: Tone };

/** Contexte passé à `TableSchema.summary`. */
export type SummaryCtx = {
  rows: Row[];
  tables: Record<string, Row[]>;
};

/** Une statistique de la bande de synthèse affichée au-dessus d'un registre. */
export type SummaryStat = {
  label: string;
  value: string;
  tone?: Tone;
  hint?: string;
};

/** Une alerte du bandeau « contrôles automatiques ». */
export type ControlAlert = {
  tone: "ok" | "warn" | "danger";
  message: string;
  /** Nombre de lignes concernées — affiché en pastille */
  count?: number;
};

// -----------------------------------------------------------------------------
// Colonnes
// -----------------------------------------------------------------------------

export type ColumnType =
  | "text"          // input texte
  | "textarea"      // textarea auto-resize
  | "date"          // input date
  | "select"        // liste déroulante
  | "number"        // input number
  | "computed"      // cellule calculée (lecture seule)
  | "attachments";  // composant PJ (générique)

export type Column =
  | {
      id: string;
      type: "text" | "textarea" | "date" | "number";
      label: string;
      width?: string;        // ex: "180px"
      placeholder?: string;
    }
  | {
      id: string;
      type: "select";
      label: string;
      options: SelectOption[];
      width?: string;
    }
  | {
      id: string;
      type: "attachments";
      label: string;
      width?: string;
    }
  | {
      id: string;
      type: "computed";
      label: string;
      width?: string;
      /**
       * Équivalent d'une formule de cellule. Retourne un texte, ou un texte
       * accompagné d'une tonalité (vert / orange / rouge / gris).
       * Une colonne computed n'est jamais persistée : elle est recalculée
       * à chaque rendu à partir des colonnes saisies.
       */
      compute: (ctx: ComputeCtx) => ComputedResult | string;
    };

// -----------------------------------------------------------------------------
// Tables, onglets, mini-app
// -----------------------------------------------------------------------------

export type TableSchema = {
  id: string;                   // ex: "registre", "annuaire", "planning"
  label: string;                // libellé humain ex: "Registre des CR"
  toastLabel?: string;          // ex: "CR ajouté"
  /** Texte affiché quand la table est vide */
  emptyLabel?: string;
  columns: Column[];
  /**
   * Fonction qui construit un libellé humain d'une ligne (pour la Vue Documents
   * et le contexte des PJ). Optionnel — défaut sur premier champ texte.
   */
  rowLabel?: (row: Row) => string;
  /**
   * Équivalent d'une feuille « Synthèse » : bande de KPI affichée au-dessus
   * du registre. Recalculée à chaque saisie.
   */
  summary?: (ctx: SummaryCtx) => SummaryStat[];
};

export type Tab = {
  id: string;                   // utilisé dans data-tab
  label: string;
  icon?: string;                // nom d'icône lucide (ex: "Eye")
  tableIds: string[];           // tables incluses dans cet onglet
};

export type MiniAppSchema = {
  key: string;                  // ex: "tableau-veille"
  name: string;
  shortName: string;
  description: string;
  /** Indicateurs RNQ couverts (ex: ["I23", "I24", "I25"]) */
  indicators: string[];
  critere: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  /**
   * Référence du modèle correspondant dans la base documentaire Qualiopi
   * (ex: "M27c"). Relie la mini-app à son classeur / ses modèles Word.
   */
  docRef?: string;
  /**
   * Catégories d'actions concernées. Si absent : toutes.
   * Filtre l'affichage dans la liste des mini-apps du dossier.
   */
  categories?: Category[];
  /**
   * Type de mini-app :
   * - "generic" (défaut) : rendue par le moteur générique (tables + onglets)
   * - "custom" : rendue par un composant React dédié (Cockpit, Matrice, etc.)
   */
  kind?: "generic" | "custom";
  /** Pour les mini-apps "generic" */
  tables?: TableSchema[];
  tabs?: Tab[];                  // si vide, on génère 1 onglet par table
  seed?: Record<string, Row[]>;  // optionnel : données d'exemple
  /**
   * Contrôles automatiques transverses — bandeau affiché en tête de mini-app.
   * Ne retourner que les alertes actives (liste vide = rien à signaler).
   */
  controls?: (tables: Record<string, Row[]>) => ControlAlert[];
  /** Texte d'aide affiché dans une modale "Mode d'emploi" */
  helpText?: {
    summary: string;
    sections?: { title: string; content: string }[];
  };
};

/**
 * State complet d'une mini-app pour un audit donné.
 * Stocké dans miniapp_data.data en JSONB.
 */
export type MiniAppData = {
  /** Tableau de lignes par tableId */
  tables: Record<string, Row[]>;
  /** Version du schéma (pour migrations) */
  schemaVersion: number;
};
