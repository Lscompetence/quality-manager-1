import { CheckSquare, Link2, MonitorPlay } from "lucide-react";

export function BrandPanel() {
  return (
    <div className="hidden flex-col justify-between p-14 lg:flex">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-amethyst to-amethyst-bright text-white font-semibold text-lg shadow-[0_6px_18px_-4px_rgba(107,79,187,0.45)]">
          Q
        </div>
        <div className="flex flex-col">
          <div className="text-base font-medium tracking-tight">Quality Manager</div>
          <div className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground mt-0.5">
            LS COMPÉTENCES
          </div>
        </div>
      </div>

      <div>
        <div className="mb-6 inline-flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-amethyst-bright">
          <span className="h-1.5 w-1.5 rounded-full bg-amethyst-bright shadow-[0_0_8px_var(--amethyst-bright)]" />
          SAAS QUALIOPI · POUR OF & CFA
        </div>
        <h1 className="mb-6 max-w-xl font-sans text-5xl font-extralight leading-[1.08] tracking-tight">
          L'audit Qualiopi <b className="font-medium text-amethyst-bright">n'est plus un cauchemar.</b>
        </h1>
        <p className="mb-9 max-w-lg text-base leading-relaxed text-muted-foreground">
          Quality Manager structure votre conformité au référentiel RNQ V9&nbsp;: 32 indicateurs, 19
          mini-apps, toutes vos preuves attachées et prêtes pour l'audit.
        </p>

        <div className="flex flex-col gap-3.5 max-w-lg">
          <Feature
            icon={<CheckSquare className="h-3.5 w-3.5" />}
            text="32 indicateurs couverts"
            sub="Toutes les preuves Qualiopi rangées, traçables, attachées"
          />
          <Feature
            icon={<Link2 className="h-3.5 w-3.5" />}
            text="Vue Documents"
            sub="Vos preuves organisées par critère, prêtes à montrer à l'auditeur"
          />
          <Feature
            icon={<MonitorPlay className="h-3.5 w-3.5" />}
            text="Mini-apps métier"
            sub="Veille, suivi assiduité, matrice compétences, évaluation acquis… tout est là"
          />
        </div>
      </div>

      <div className="font-mono text-[11px] text-muted-foreground">
        © 2026 LS Compétences
        <a href="#" className="ml-4 text-secondary-foreground/80 hover:text-amethyst-bright transition-colors">
          CGU
        </a>
        <a href="#" className="ml-4 text-secondary-foreground/80 hover:text-amethyst-bright transition-colors">
          Confidentialité
        </a>
        <a href="#" className="ml-4 text-secondary-foreground/80 hover:text-amethyst-bright transition-colors">
          Aide
        </a>
      </div>
    </div>
  );
}

function Feature({ icon, text, sub }: { icon: React.ReactNode; text: string; sub: string }) {
  return (
    <div className="flex items-start gap-3.5 rounded-xl border border-border bg-card/30 px-4 py-3 backdrop-blur-md">
      <div className="grid h-7 w-7 place-items-center rounded-lg bg-amethyst-bright/10 text-amethyst-bright shrink-0">
        {icon}
      </div>
      <div className="text-xs leading-snug text-muted-foreground">
        <b className="font-medium text-foreground">{text}</b>
        <span> · {sub}</span>
      </div>
    </div>
  );
}
