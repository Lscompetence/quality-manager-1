"use client";

import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function AppLoading() {
  return (
    <div className="flex h-[80vh] w-full items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center gap-4"
      >
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">Chargement en cours...</p>
      </motion.div>
    </div>
  );
}
