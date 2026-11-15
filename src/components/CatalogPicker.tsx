"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search, X } from "lucide-react";
import {
  OTHER,
  itemLabel,
  searchCatalog,
  type CatalogGroup,
} from "@/lib/tattoo-catalog";

/**
 * Sélecteur avec recherche pour les longues listes (zones du corps, styles).
 * Sur téléphone, il s'ouvre comme un panneau qui monte du bas de l'écran ;
 * sur ordinateur, comme une fenêtre centrée.
 */

type AccentVars = React.CSSProperties;

function readAccent(element: HTMLElement | null): AccentVars {
  if (!element) return {};
  const computed = getComputedStyle(element);
  const vars: Record<string, string> = {};
  for (const name of ["--color-accent", "--color-accent-hover"]) {
    const value = computed.getPropertyValue(name).trim();
    if (value) vars[name] = value;
  }
  return vars as AccentVars;
}

function labelOf(groups: CatalogGroup[], value: string): string {
  for (const group of groups) {
    const found = group.items.find((item) => item.value === value);
    if (found) return itemLabel(found);
  }
  return value;
}

type TriggerProps = {
  id?: string;
  title: string;
  groups: CatalogGroup[];
  placeholder: string;
  searchPlaceholder?: string;
  invalid?: boolean;
};

export function CatalogPicker({
  value,
  onChange,
  ...props
}: TriggerProps & { value: string; onChange: (value: string) => void }) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [accent, setAccent] = useState<AccentVars>({});

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <>
      <button
        ref={triggerRef}
        id={props.id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${props.title} : ${
          value ? labelOf(props.groups, value) : props.placeholder
        }`}
        onClick={() => {
          setAccent(readAccent(triggerRef.current));
          setOpen(true);
        }}
        style={props.invalid ? { borderColor: "rgb(248 113 113 / 0.7)" } : undefined}
        className="input-field flex items-center justify-between gap-2 text-left"
      >
        <span className={`min-w-0 truncate ${value ? "" : "text-muted"}`}>
          {value ? labelOf(props.groups, value) : props.placeholder}
        </span>
        <ChevronDown size={16} className="shrink-0 text-muted" aria-hidden="true" />
      </button>

      {open && (
        <PickerDialog
          title={props.title}
          groups={props.groups}
          searchPlaceholder={props.searchPlaceholder}
          selected={new Set(value ? [value] : [])}
          multiple={false}
          accent={accent}
          onToggle={(next) => {
            onChange(next);
            close();
          }}
          onClose={close}
        />
      )}
    </>
  );
}

export function CatalogMultiPicker({
  values,
  onChange,
  buttonLabel,
  ...props
}: Omit<TriggerProps, "placeholder"> & {
  values: string[];
  onChange: (values: string[]) => void;
  buttonLabel: string;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [accent, setAccent] = useState<AccentVars>({});

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const toggle = (value: string) => {
    onChange(
      values.includes(value) ? values.filter((v) => v !== value) : [...values, value]
    );
  };

  return (
    <>
      <button
        ref={triggerRef}
        id={props.id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setAccent(readAccent(triggerRef.current));
          setOpen(true);
        }}
        className="btn-secondary w-full text-sm sm:w-auto"
      >
        {buttonLabel}
      </button>

      {open && (
        <PickerDialog
          title={props.title}
          groups={props.groups}
          searchPlaceholder={props.searchPlaceholder}
          selected={new Set(values)}
          multiple
          accent={accent}
          onToggle={toggle}
          onClear={() => onChange([])}
          onClose={close}
        />
      )}
    </>
  );
}

function PickerDialog({
  title,
  groups,
  searchPlaceholder,
  selected,
  multiple,
  accent,
  onToggle,
  onClear,
  onClose,
}: {
  title: string;
  groups: CatalogGroup[];
  searchPlaceholder?: string;
  selected: Set<string>;
  multiple: boolean;
  accent: AccentVars;
  onToggle: (value: string) => void;
  onClear?: () => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const firstSelectedRef = useRef<HTMLButtonElement | null>(null);
  const onCloseRef = useRef(onClose);
  const [query, setQuery] = useState("");

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  const filtered = useMemo(() => searchCatalog(groups, query), [groups, query]);
  const hasOther = useMemo(
    () => groups.some((group) => group.items.some((item) => item.value === OTHER)),
    [groups]
  );

  // Ouverture : on bloque le défilement de la page, on place le curseur et on
  // montre le choix actuel. Fermeture : tout est remis comme avant.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Sur ordinateur, on peut taper tout de suite. Sur téléphone, on évite
    // d'ouvrir le clavier d'office : il cacherait la moitié de la liste.
    if (window.matchMedia("(pointer: fine)").matches) searchRef.current?.focus();
    else panelRef.current?.focus();
    firstSelectedRef.current?.scrollIntoView({ block: "center" });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        "button:not([disabled]), input:not([disabled])"
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const firstSelectedValue = filtered
    .flatMap((group) => group.items)
    .find((item) => selected.has(item.value))?.value;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 sm:items-center sm:p-4"
      style={accent}
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className="flex h-[88dvh] w-full flex-col rounded-t-2xl sm:h-auto sm:max-h-[80dvh] border border-white/10 bg-surface text-foreground shadow-2xl outline-none sm:max-w-md sm:rounded-2xl"
      >
        <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-4">
          <p id={titleId} className="font-display text-xl tracking-wide">
            {title}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-white/10 hover:text-foreground"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-4 pb-3">
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              aria-hidden="true"
            />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder ?? "Rechercher…"}
              aria-label={searchPlaceholder ?? "Rechercher"}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="search"
              // Style direct : la classe .input-field impose son propre retrait.
              style={{ paddingLeft: "2.25rem" }}
              className="input-field text-base"
            />
          </div>
        </div>

        <div
          role="listbox"
          aria-labelledby={titleId}
          aria-multiselectable={multiple || undefined}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-3"
        >
          {filtered.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-muted">
              <p>Aucun résultat pour « {query.trim()} ».</p>
              {hasOther && !multiple && (
                <button
                  type="button"
                  onClick={() => onToggle(OTHER)}
                  className="btn-secondary mt-4 text-sm"
                >
                  Choisir « Autre » et préciser
                </button>
              )}
            </div>
          )}

          {filtered.map((group) => (
            <div key={group.label} role="group" aria-label={group.label} className="mb-2">
              <p className="px-3 pb-1 pt-3 text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
                {group.label}
              </p>
              {group.items.map((item) => {
                const isSelected = selected.has(item.value);
                const isFirstSelected = item.value === firstSelectedValue;
                return (
                  <button
                    key={item.value}
                    ref={isFirstSelected ? firstSelectedRef : undefined}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => onToggle(item.value)}
                    className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                      isSelected
                        ? "bg-accent/15 text-foreground"
                        : "text-foreground/90 hover:bg-white/[0.06]"
                    }`}
                  >
                    <span className="min-w-0">{itemLabel(item)}</span>
                    {isSelected && (
                      <Check size={16} className="shrink-0 text-accent" aria-hidden="true" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {multiple && (
          <div className="flex items-center justify-between gap-3 border-t border-white/10 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
            <button
              type="button"
              onClick={onClear}
              disabled={selected.size === 0}
              className="text-sm text-muted transition-colors hover:text-foreground disabled:opacity-40"
            >
              Tout décocher
            </button>
            <button type="button" onClick={onClose} className="btn-primary text-sm">
              Valider ({selected.size})
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
