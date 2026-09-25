// =============================================================================
// MiniApp schéma déclaratif — types
// Un MiniAppSchema décrit la structure d'une mini-app : ses tables (registres),
// leurs colonnes (avec types), ses onglets, et ses données seed.
// Le moteur générique <MiniApp schema={...} /> consomme cette description.
// =============================================================================

export type ColumnType =
  | "text"          // input texte
  | "textarea"      // textarea auto-resize
  | "date"          // input date
  | "select"        // liste déroulante
  | "number"        // input number
  | "attachments";  // composant PJ (générique)

export type SelectOption = {
  value: string;
  label: string;
};

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
    };

export type TableSchema = {
  id: string;                   // ex: "registre", "annuaire", "planning"
  label: string;                // libellé humain ex: "Registre des CR"
  toastLabel?: string;          // ex: "CR ajouté"
  columns: Column[];
  /**
   * Fonction qui construit un libellé humain d'une ligne (pour la Vue Documents
   * et le contexte des PJ). Optionnel — défaut sur premier champ texte.
   */
  rowLabel?: (row: Row) => string;
};

export type Row = Record<string, unknown>;

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
   * Type de mini-app :
   * - "generic" (défaut) : rendue par le moteur générique (tables + onglets)
   * - "custom" : rendue par un composant React dédié (pour Cockpit, Matrice, etc.)
   */
  kind?: "generic" | "custom";
  /** Pour les mini-apps "generic" */
  tables?: TableSchema[];
  tabs?: Tab[];                  // si vide, on génère 1 onglet par table
  seed?: Record<string, Row[]>;  // optionnel : données d'exemple
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
