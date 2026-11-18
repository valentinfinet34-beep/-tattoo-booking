"use client";

import { motion } from "framer-motion";

/**
 * Étapes qui arrivent une par une au défilement : chacune glisse depuis son
 * côté (gauche / droite en alternance) et la ligne qui les relie se dessine.
 * Animation légère, désactivée si la personne demande moins de mouvement.
 */
export type ScrollStep = {
  title: string;
  description: string;
};

export function ScrollSteps({ steps }: { steps: ScrollStep[] }) {
  return (
    <ol className="relative mx-auto flex max-w-3xl flex-col gap-10 md:gap-14">
      <motion.span
        aria-hidden="true"
        initial={{ scaleY: 0 }}
        whileInView={{ scaleY: 1 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        className="absolute bottom-4 left-6 top-4 w-px origin-top bg-gradient-to-b from-accent via-accent/50 to-transparent md:left-1/2"
      />
      {steps.map((step, index) => {
        const fromLeft = index % 2 === 0;
        return (
          <motion.li
            key={step.title}
            initial={{ opacity: 0, x: fromLeft ? -40 : 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className={`relative flex md:w-1/2 ${
              fromLeft ? "md:pr-12 md:text-right md:[&>div]:items-end" : "md:ml-auto md:pl-12"
            }`}
          >
            <div className="flex flex-col gap-2">
              <p className="font-display text-xs tracking-[0.2em] text-accent">
                ÉTAPE {index + 1}
              </p>
              <p className="font-display text-2xl tracking-wide text-foreground md:text-3xl">
                {step.title}
              </p>
              <p className="text-sm leading-relaxed text-muted md:text-base">
                {step.description}
              </p>
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}
