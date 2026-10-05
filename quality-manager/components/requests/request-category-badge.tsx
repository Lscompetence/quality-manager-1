import {
  AlertTriangle,
  CreditCard,
  HelpCircle,
  Lightbulb,
  MessageSquare,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { REQUEST_CATEGORY_LABEL, type RequestCategory } from "@/lib/requests/categories";

/**
 * Couleur, icône et libellé de chaque catégorie de demande. La couleur ne
 * porte jamais l'information seule : l'icône et le libellé l'accompagnent.
 */
export const REQUEST_CATEGORY_STYLE: Record<
  RequestCategory,
  { icon: LucideIcon; badge: string; bar: string; accent: string }
> = {
  // Réclamation : rouge — un client mécontent, à traiter en priorité
  reclamation: {
    icon: AlertTriangle,
    badge: "border-[#E85D5D]/40 bg-[#E85D5D]/10 text-[#D64545]",
    bar: "bg-[#E85D5D]",
    accent: "#E85D5D",
  },
  // Changement d'abonnement : améthyste — une action commerciale à appliquer
  abonnement: {
    icon: CreditCard,
    badge: "border-amethyst-bright/40 bg-amethyst-bright/10 text-[var(--amethyst-br)]",
    bar: "bg-[var(--amethyst-br)]",
    accent: "var(--amethyst-br)",
  },
  // Ouverture de compte : vert — un nouveau client potentiel
  ouverture_compte: {
    icon: UserPlus,
    badge: "border-c2/40 bg-c2/10 text-c2",
    bar: "bg-c2",
    accent: "var(--c2)",
  },
  // Demande d'aide : bleu
  support: {
    icon: HelpCircle,
    badge: "border-c4/40 bg-c4/10 text-c4",
    bar: "bg-c4",
    accent: "var(--c4)",
  },
  // Suggestion : ambre
  suggestion: {
    icon: Lightbulb,
    badge: "border-c3/40 bg-c3/10 text-c3",
    bar: "bg-c3",
    accent: "var(--c3)",
  },
  // Autre : neutre
  autre: {
    icon: MessageSquare,
    badge: "border-[var(--border-soft)] bg-[var(--surface-2)] text-[var(--text-mute)]",
    bar: "bg-[var(--text-faint)]",
    accent: "var(--text-faint)",
  },
};

export function RequestCategoryBadge({
  category,
  className,
}: {
  category: RequestCategory;
  className?: string;
}) {
  const style = REQUEST_CATEGORY_STYLE[category];
  const Icon = style.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        style.badge,
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {REQUEST_CATEGORY_LABEL[category]}
    </span>
  );
}

/** Statut d'une demande : orange « à traiter », vert « traité ». */
export function RequestStatusBadge({ status }: { status: "a_traiter" | "traite" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em]",
        status === "traite"
          ? "border-[rgba(88,214,154,0.35)] bg-[rgba(88,214,154,0.1)] text-[var(--status-on)]"
          : "border-c3/40 bg-c3/10 text-c3",
      )}
    >
      {status === "traite" ? "Traité" : "À traiter"}
    </span>
  );
}
