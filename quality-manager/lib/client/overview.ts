import { createClient } from "@/lib/supabase/server";
import {
  CRITERES,
  getIndicatorsByCritere,
  type Category,
  type CritereNum,
} from "@/lib/constants/rnq";

/**
 * Données de l'espace client : ses dossiers confiés, leur avancement et
 * leurs documents. Tout passe par la session du client, donc par les
 * politiques RLS : il ne peut rien lire d'autre que ce qui lui est confié.
 */

export type ClientDossierSummary = {
  auditId: string;
  name: string;
  auditType: string;
  categories: Category[];
  status: string;
  auditDate: string | null;
  organizationName: string;
  total: number;
  done: number;
  coverage: number;
};

export type PendingIndicator = {
  auditId: string;
  auditName: string;
  critereNum: CritereNum;
  code: string;
  num: number;
  title: string;
  status: string;
};

export type CritereProgress = {
  num: CritereNum;
  title: string;
  colorVar: string;
  total: number;
  done: number;
  pct: number;
};

export type ClientDocument = {
  id: string;
  auditId: string | null;
  auditName: string;
  kind: "upload" | "ref";
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  storage_path: string | null;
  external_url: string | null;
  created_at: string;
  context_label: string | null;
};

export type ClientOverview = {
  dossiers: ClientDossierSummary[];
  criteres: CritereProgress[];
  pending: PendingIndicator[];
  documents: ClientDocument[];
  total: number;
  done: number;
  coverage: number;
  nextAudit: { date: string; auditName: string; daysLeft: number } | null;
  organizationNames: string[];
};

export async function loadClientOverview(userId: string): Promise<ClientOverview> {
  const supabase = await createClient();

  const { data: accesses } = await supabase
    .from("audit_access")
    .select("id, organization_name, audit:audits(id, name, audit_type, categories, status, audit_date)")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const rows = (accesses ?? []).filter((a) => a.audit);
  const auditIds = rows.map((a) => a.audit!.id);

  const [{ data: indicators }, { data: attachments }] = auditIds.length
    ? await Promise.all([
        supabase.from("audit_indicators").select("audit_id, indicator_code, status").in("audit_id", auditIds),
        supabase
          .from("attachments")
          .select(
            "id, audit_id, kind, file_name, file_size, mime_type, storage_path, external_url, created_at, context_label",
          )
          .in("audit_id", auditIds)
          .order("created_at", { ascending: false }),
      ])
    : [{ data: [] }, { data: [] }];

  // Statut par dossier et par indicateur ; un indicateur sans ligne est « à traiter ».
  const statusOf = new Map<string, string>();
  for (const ind of indicators ?? []) statusOf.set(`${ind.audit_id}:${ind.indicator_code}`, ind.status);

  const critereTotals = new Map<CritereNum, { total: number; done: number }>();
  const pending: PendingIndicator[] = [];

  const dossiers: ClientDossierSummary[] = rows.map((row) => {
    const audit = row.audit!;
    const categories = (audit.categories ?? []) as Category[];
    let total = 0;
    let done = 0;

    for (const c of [1, 2, 3, 4, 5, 6, 7] as CritereNum[]) {
      const acc = critereTotals.get(c) ?? { total: 0, done: 0 };
      for (const ind of getIndicatorsByCritere(c, categories)) {
        const status = statusOf.get(`${audit.id}:${ind.code}`) ?? "a_traiter";
        total++;
        acc.total++;
        if (status === "complet") {
          done++;
          acc.done++;
        } else if (status !== "non_applicable") {
          pending.push({
            auditId: audit.id,
            auditName: audit.name,
            critereNum: c,
            code: ind.code,
            num: ind.num,
            title: ind.title,
            status,
          });
        }
      }
      critereTotals.set(c, acc);
    }

    return {
      auditId: audit.id,
      name: audit.name,
      auditType: audit.audit_type,
      categories,
      status: audit.status,
      auditDate: audit.audit_date,
      organizationName: row.organization_name,
      total,
      done,
      coverage: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  });

  const criteres: CritereProgress[] = Object.values(CRITERES).map((c) => {
    const t = critereTotals.get(c.num as CritereNum) ?? { total: 0, done: 0 };
    return {
      num: c.num as CritereNum,
      title: c.title,
      colorVar: c.colorVar,
      total: t.total,
      done: t.done,
      pct: t.total > 0 ? Math.round((t.done / t.total) * 100) : 0,
    };
  });

  const nameOf = new Map(dossiers.map((d) => [d.auditId, d.name]));
  const documents: ClientDocument[] = (attachments ?? []).map((a) => ({
    ...a,
    auditId: a.audit_id,
    auditName: a.audit_id ? (nameOf.get(a.audit_id) ?? "Dossier") : "Dossier",
  }));

  // Prochain audit à venir parmi ses dossiers.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = dossiers
    .filter((d) => d.auditDate && new Date(d.auditDate) >= today)
    .sort((a, b) => new Date(a.auditDate!).getTime() - new Date(b.auditDate!).getTime())[0];

  const total = dossiers.reduce((s, d) => s + d.total, 0);
  const done = dossiers.reduce((s, d) => s + d.done, 0);

  return {
    dossiers,
    criteres,
    // Les indicateurs « en cours » d'abord : ce sont ceux qui attendent une pièce.
    pending: pending.sort((a, b) => (a.status === b.status ? a.num - b.num : a.status === "en_cours" ? -1 : 1)),
    documents,
    total,
    done,
    coverage: total > 0 ? Math.round((done / total) * 100) : 0,
    nextAudit: upcoming
      ? {
          date: upcoming.auditDate!,
          auditName: upcoming.name,
          daysLeft: Math.round((new Date(upcoming.auditDate!).getTime() - today.getTime()) / 86_400_000),
        }
      : null,
    organizationNames: [...new Set(dossiers.map((d) => d.organizationName).filter(Boolean))],
  };
}
