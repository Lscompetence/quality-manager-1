"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

export default function AppTemplate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    // Pas de `mode="wait"` ni d'animation de sortie : elles ajoutaient 0,7 s
    // ressentie à chaque clic (0,35 s de sortie puis 0,35 s d'entrée).
    // Une entrée courte suffit à garder l'effet sans retarder la navigation.
    <AnimatePresence initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.16, ease: "easeOut" }}
        className="flex-1 flex flex-col min-h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
