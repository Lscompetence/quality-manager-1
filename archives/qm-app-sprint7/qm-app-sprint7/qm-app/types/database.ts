// =============================================================================
// Types Supabase — fichier généré manuellement pour Sprint 1.
// À régénérer après chaque migration via :
//   pnpm db:types
// =============================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          legal_form: string | null;
          siret: string | null;
          declaration_nb: string | null;
          address: string | null;
          phone: string | null;
          email: string | null;
          website: string | null;
          logo_url: string | null;
          accent_color: string;
          default_theme: string;
          plan: "essentiel" | "pro" | "reseau";
          billing_cycle: "monthly" | "annual";
          billing_email: string | null;
          vat_number: string | null;
          next_billing_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["organizations"]["Row"]> & { name: string };
        Update: Partial<Database["public"]["Tables"]["organizations"]["Row"]>;
      };
      users: {
        Row: {
          id: string;
          organization_id: string;
          email: string;
          first_name: string;
          last_name: string;
          role: "admin" | "editor" | "reader";
          avatar_url: string | null;
          last_seen_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["users"]["Row"]> & {
          id: string;
          organization_id: string;
          email: string;
          first_name: string;
          last_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Row"]>;
      };
      certifications: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          code: string | null;
          issuer: string | null;
          level: string | null;
          categories: ("AF" | "BC" | "VAE" | "CFA")[];
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["certifications"]["Row"]> & {
          organization_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["certifications"]["Row"]>;
      };
      audits: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          audit_type: "initial" | "surveillance" | "renouvellement";
          categories: ("AF" | "BC" | "VAE" | "CFA")[];
          status: "en_cours" | "cloture" | "archive";
          audit_date: string | null;
          certificateur: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["audits"]["Row"]> & {
          organization_id: string;
          name: string;
          audit_type: "initial" | "surveillance" | "renouvellement";
        };
        Update: Partial<Database["public"]["Tables"]["audits"]["Row"]>;
      };
      audit_indicators: {
        Row: {
          id: string;
          audit_id: string;
          organization_id: string;
          indicator_code: string;
          critere_num: number;
          status: "a_traiter" | "en_cours" | "complet" | "non_applicable";
          notes: string | null;
          updated_by: string | null;
          updated_at: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["audit_indicators"]["Row"]> & {
          audit_id: string;
          organization_id: string;
          indicator_code: string;
          critere_num: number;
        };
        Update: Partial<Database["public"]["Tables"]["audit_indicators"]["Row"]>;
      };
      miniapp_data: {
        Row: {
          id: string;
          audit_id: string;
          organization_id: string;
          miniapp_key: string;
          data: Json;
          schema_version: number;
          updated_by: string | null;
          updated_at: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["miniapp_data"]["Row"]> & {
          audit_id: string;
          organization_id: string;
          miniapp_key: string;
        };
        Update: Partial<Database["public"]["Tables"]["miniapp_data"]["Row"]>;
      };
      attachments: {
        Row: {
          id: string;
          organization_id: string;
          audit_id: string | null;
          miniapp_key: string | null;
          context_path: string | null;
          context_label: string | null;
          kind: "upload" | "ref";
          file_name: string;
          file_size: number | null;
          mime_type: string | null;
          storage_path: string | null;
          external_url: string | null;
          uploaded_by: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["attachments"]["Row"]> & {
          organization_id: string;
          kind: "upload" | "ref";
          file_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["attachments"]["Row"]>;
      };
      notifications: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          category: "echeance" | "alerte" | "equipe" | "system" | "success";
          title: string;
          source_label: string | null;
          source_url: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["notifications"]["Row"]> & {
          organization_id: string;
          user_id: string;
          category: "echeance" | "alerte" | "equipe" | "system" | "success";
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Row"]>;
      };
      notification_preferences: {
        Row: {
          user_id: string;
          preferences: Json;
          updated_at: string;
        };
        Insert: { user_id: string; preferences?: Json };
        Update: Partial<Database["public"]["Tables"]["notification_preferences"]["Row"]>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      auth_organization_id: { Args: Record<string, never>; Returns: string };
      auth_user_role: {
        Args: Record<string, never>;
        Returns: "admin" | "editor" | "reader";
      };
    };
    Enums: {
      user_role: "admin" | "editor" | "reader";
      plan_tier: "essentiel" | "pro" | "reseau";
      billing_cycle: "monthly" | "annual";
      audit_type: "initial" | "surveillance" | "renouvellement";
      audit_status: "en_cours" | "cloture" | "archive";
      category: "AF" | "BC" | "VAE" | "CFA";
      indicator_status: "a_traiter" | "en_cours" | "complet" | "non_applicable";
      attachment_type: "upload" | "ref";
      notification_category: "echeance" | "alerte" | "equipe" | "system" | "success";
    };
  };
}
