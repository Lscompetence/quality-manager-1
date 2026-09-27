// =============================================================================
// Types Supabase — fichier généré manuellement pour Sprint 1.
// À régénérer après chaque migration via :
//   pnpm db:types
// =============================================================================

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

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
          /** Sprint 8 : abonnement piloté par LS Compétences */
          subscription_status: "active" | "suspended" | "cancelled";
          status_changed_at: string | null;
          last_payment_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["organizations"]["Row"]> & { name: string };
        Update: Partial<Database["public"]["Tables"]["organizations"]["Row"]>;
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          organization_id: string;
          email: string;
          first_name: string;
          last_name: string;
          role: "admin" | "editor" | "reader" | "client";
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
        Relationships: [
          {
            foreignKeyName: "users_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_access: {
        Row: {
          id: string;
          audit_id: string;
          user_id: string;
          invited_email: string;
          invited_by: string | null;
          organization_name: string;
          status: "active" | "revoked";
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["audit_access"]["Row"]> & {
          audit_id: string;
          user_id: string;
          invited_email: string;
          organization_name: string;
        };
        Update: Partial<Database["public"]["Tables"]["audit_access"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "audit_access_audit_id_fkey";
            columns: ["audit_id"];
            isOneToOne: false;
            referencedRelation: "audits";
            referencedColumns: ["id"];
          },
        ];
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
        Relationships: [];
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
          establishment_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["audits"]["Row"]> & {
          organization_id: string;
          establishment_id: string;
          name: string;
          audit_type: "initial" | "surveillance" | "renouvellement";
        };
        Update: Partial<Database["public"]["Tables"]["audits"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "audits_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audits_establishment_id_fkey";
            columns: ["establishment_id"];
            isOneToOne: false;
            referencedRelation: "establishments";
            referencedColumns: ["id"];
          },
        ];
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
        Relationships: [];
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
        Relationships: [];
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
        Relationships: [];
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
          /** Auteur de l'action notifiée (migration 000012) */
          actor_id: string | null;
          /** connexion client ou activité (migration 000013) */
          kind: "activity" | "client_login";
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
        Relationships: [];
      };
      notification_preferences: {
        Row: {
          user_id: string;
          preferences: Json;
          updated_at: string;
        };
        Insert: { user_id: string; preferences?: Json };
        Update: Partial<Database["public"]["Tables"]["notification_preferences"]["Row"]>;
        Relationships: [];
      };
      establishments: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          siret: string | null;
          declaration_nb: string | null;
          address: string | null;
          city: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["establishments"]["Row"]> & {
          organization_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["establishments"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "establishments_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      establishment_members: {
        Row: {
          establishment_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: { establishment_id: string; user_id: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["establishment_members"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "establishment_members_establishment_id_fkey";
            columns: ["establishment_id"];
            isOneToOne: false;
            referencedRelation: "establishments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "establishment_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      platform_admins: {
        Row: { user_id: string; created_at: string };
        Insert: { user_id: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["platform_admins"]["Row"]>;
        Relationships: [];
      };
      client_requests: {
        Row: {
          id: string;
          organization_id: string | null;
          kind: "ouverture_compte" | "reclamation" | "suggestion" | "support" | "autre";
          status: "a_traiter" | "traite";
          subject: string;
          message: string | null;
          contact_name: string | null;
          contact_email: string | null;
          organization_name: string | null;
          response: string | null;
          handled_at: string | null;
          handled_by: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["client_requests"]["Row"]> & {
          kind: "ouverture_compte" | "reclamation" | "suggestion" | "support" | "autre";
          subject: string;
        };
        Update: Partial<Database["public"]["Tables"]["client_requests"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "client_requests_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      auth_organization_id: { Args: Record<string, never>; Returns: string };
      auth_user_role: {
        Args: Record<string, never>;
        Returns: "admin" | "editor" | "reader" | "client";
      };
      is_platform_admin: { Args: Record<string, never>; Returns: boolean };
      platform_kpis: {
        Args: Record<string, never>;
        Returns: {
          requests_to_handle: number;
          requests_handled: number;
          clients_active: number;
          clients_suspended: number;
          clients_cancelled: number;
        }[];
      };
      platform_client_stats: {
        Args: Record<string, never>;
        Returns: { organization_id: string; establishments_count: number; users_count: number }[];
      };
    };
    CompositeTypes: Record<string, never>;
    Enums: {
      user_role: "admin" | "editor" | "reader" | "client";
      subscription_status: "active" | "suspended" | "cancelled";
      request_kind: "ouverture_compte" | "reclamation" | "suggestion" | "support" | "autre";
      request_status: "a_traiter" | "traite";
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
