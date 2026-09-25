import { AlertTriangle } from "lucide-react";
import { CRITERES, getIndicator, type CritereNum } from "@/lib/constants/rnq";

/**
 * En-tête commun des mini-apps, repris des maquettes (`.app-header`) :
 * surtitre à la couleur du critère, titre 40px, description, pastilles des
 * indicateurs couverts. Partagé par l'espace admin et l'espace client.
 */
export function MiniAppHeader({
  critere,
  name,
  description,
  indicators,
  docRef,
  right,
}: {
  critere: number;
  name: string;
  description: string;
  indicators: string[];
  docRef?: string;
  right?: React.ReactNode;
}) {
  const meta = CRITERES[critere as CritereNum];
  const tone = meta ? `var(--${meta.colorVar})` : "var(--amethyst-br)";

  return (
    <div className="mb-[30px] grid gap-8 border-b border-[var(--border-soft)] pb-6 md:grid-cols-[1fr_auto]">
      <div>
        <div
          className="mb-3 inline-flex items-center gap-[7px] font-mono text-[10.5px] font-semibold uppercase tracking-[0.22em]"
          style={{ color: tone }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone, boxShadow: `0 0 8px ${tone}` }} />
          Critère {String(critere).padStart(2, "0")} · {meta?.title ?? "Mini-app"}
        </div>
        <h1 className="mb-3 font-sans text-[40px] font-light leading-[1.05] tracking-[-0.025em]">{name}</h1>
        <p className="max-w-[700px] text-[14.5px] leading-[1.55] text-[var(--text-mute)]">{description}</p>

        <div className="mt-3.5 flex flex-wrap gap-2">
          {indicators.map((code) => {
            const ind = getIndicator(code);
            return (
              <span
                key={code}
                title={ind?.title}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-soft)] bg-[var(--surface)] px-[11px] py-1 font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em]"
                style={{ color: tone }}
              >
                <span className="h-[5px] w-[5px] rounded-full" style={{ background: tone, boxShadow: `0 0 6px ${tone}` }} />
                {code}
                {ind?.v9Update && <AlertTriangle className="h-2.5 w-2.5" />}
              </span>
            );
          })}
          {docRef && (
            <span className="inline-flex items-center rounded-full border border-[var(--border-soft)] bg-[var(--surface)] px-[11px] py-1 font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--text-mute)]">
              Base doc · {docRef}
            </span>
          )}
        </div>
      </div>
      {right && <div className="flex flex-col items-end gap-3">{right}</div>}
    </div>
  );
}
