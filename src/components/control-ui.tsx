"use client";

import {
  Bug,
  Building2,
  Cpu,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  RefreshCw,
  Store,
  Terminal,
  UserRound,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";

import type { ReactNode } from "react";

export type ControlTab =
  | "overview"
  | "restaurants"
  | "devices"
  | "codes"
  | "bugs"
  | "events";

export const cn = (
  ...classes: Array<
    string | false | null | undefined
  >
) =>
  classes
    .filter(Boolean)
    .join(" ");

/* -------------------------------------------------------------------------- */
/* Navigation                                                                 */
/* -------------------------------------------------------------------------- */

type NavItem = {
  id: ControlTab;
  label: string;
  icon: LucideIcon;
};

const navItems: readonly NavItem[] = [
  {
    id: "overview",
    label: "Overview",
    icon: LayoutDashboard,
  },
  {
    id: "restaurants",
    label: "Restaurants",
    icon: Building2,
  },
  {
    id: "devices",
    label: "Devices",
    icon: Cpu,
  },
  {
    id: "codes",
    label: "Activation codes",
    icon: KeyRound,
  },
  {
    id: "bugs",
    label: "User bugs",
    icon: Bug,
  },
  {
    id: "events",
    label: "System events",
    icon: Terminal,
  },
];

/* -------------------------------------------------------------------------- */
/* Badge                                                                      */
/* -------------------------------------------------------------------------- */

type BadgeTone =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info";

const badgeStyles: Record<
  BadgeTone,
  string
> = {
  neutral:
    "bg-slate-100 text-slate-600 ring-slate-200",

  success:
    "bg-emerald-50 text-emerald-700 ring-emerald-200",

  warning:
    "bg-amber-50 text-amber-700 ring-amber-200",

  danger:
    "bg-rose-50 text-rose-700 ring-rose-200",

  info:
    "bg-sky-50 text-sky-700 ring-sky-200",
};

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: BadgeTone;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5",
        "rounded-full px-2.5 py-1",
        "text-[11px] font-semibold",
        "ring-1 ring-inset",
        badgeStyles[tone],
      )}
    >
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Button                                                                     */
/* -------------------------------------------------------------------------- */

type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger";

export function Button({
  children,
  className = "",
  variant = "primary",
  disabled = false,
  type = "button",
  onClick,
  icon,
}: {
  children: ReactNode;
  className?: string;
  variant?: ButtonVariant;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
  icon?: ReactNode;
}) {
  const variants: Record<
    ButtonVariant,
    string
  > = {
    primary:
      "bg-slate-950 text-white shadow-sm hover:bg-slate-800 disabled:bg-slate-300",

    secondary:
      "border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 disabled:text-slate-300",

    ghost:
      "text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:text-slate-300",

    danger:
      "bg-rose-600 text-white shadow-sm hover:bg-rose-700 disabled:bg-rose-300",
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2",
        "rounded-xl px-4 text-sm font-semibold",
        "transition-all duration-200",
        "focus:outline-none focus:ring-2 focus:ring-slate-300",
        "disabled:cursor-not-allowed",
        variants[variant],
        className,
      )}
    >
      {icon}

      {children}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Panel                                                                      */
/* -------------------------------------------------------------------------- */

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl",
        "border border-slate-200/80 bg-white",
        "shadow-[0_1px_3px_rgba(15,23,42,0.04)]",
        className,
      )}
    >
      {children}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Section Header                                                             */
/* -------------------------------------------------------------------------- */

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-teal-600">
            {eyebrow}
          </p>
        )}

        <h2 className="text-xl font-bold tracking-tight text-slate-950">
          {title}
        </h2>

        {description && (
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">
            {description}
          </p>
        )}
      </div>

      {action && (
        <div className="shrink-0">
          {action}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Stat Card                                                                  */
/* -------------------------------------------------------------------------- */

type StatTone =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "teal"
  | "blue"
  | "violet"
  | "amber"
  | "rose";

export function StatCard({
  label,
  value,
  description,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value?: string | number;
  description?: string;
  hint?: string;
  icon: LucideIcon;
  tone?: StatTone;
}) {
  const tones: Record<
    StatTone,
    string
  > = {
    default:
      "bg-slate-100 text-slate-600",

    success:
      "bg-emerald-50 text-emerald-600",

    warning:
      "bg-amber-50 text-amber-600",

    danger:
      "bg-rose-50 text-rose-600",

    teal:
      "bg-teal-50 text-teal-600",

    blue:
      "bg-blue-50 text-blue-600",

    violet:
      "bg-violet-50 text-violet-600",

    amber:
      "bg-amber-50 text-amber-600",

    rose:
      "bg-rose-50 text-rose-600",
  };

  return (
    <div
      className={cn(
        "group rounded-2xl border border-slate-200/80",
        "bg-white p-5",
        "shadow-[0_1px_3px_rgba(15,23,42,0.04)]",
        "transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-md",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
            {label}
          </p>

          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            {value ?? "—"}
          </p>
        </div>

        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center",
            "rounded-xl transition-transform duration-200",
            "group-hover:scale-105",
            tones[tone],
          )}
        >
          <Icon size={18} />
        </div>
      </div>

      {(hint || description) && (
        <p className="mt-3 text-xs leading-5 text-slate-400">
          {hint ?? description}
        </p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Tables                                                                     */
/* -------------------------------------------------------------------------- */

export function TableShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      {children}
    </div>
  );
}

export function Table({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <table className="w-full min-w-[720px] border-collapse text-left text-sm">
      {children}
    </table>
  );
}

export function TableHead({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <thead className="border-b border-slate-200 bg-slate-50/80">
      {children}
    </thead>
  );
}

export function Th({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <th className="whitespace-nowrap px-5 py-3.5 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
      {children}
    </th>
  );
}

export function Td({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <td
      className={cn(
        "px-5 py-4 align-middle text-slate-600",
        className,
      )}
    >
      {children}
    </td>
  );
}

/* -------------------------------------------------------------------------- */
/* Empty State                                                                */
/* -------------------------------------------------------------------------- */

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="px-6 py-16 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Store size={18} />
      </div>

      <p className="mt-4 text-sm font-semibold text-slate-800">
        {title}
      </p>

      <p className="mt-1 text-xs text-slate-400">
        {description}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Sidebar                                                                    */
/* -------------------------------------------------------------------------- */

export function Sidebar({
  active,
  onSelect,
  onLogout,
  mobileOpen,
  onClose,
  admin,
}: {
  active: ControlTab;
  onSelect: (tab: ControlTab) => void;
  onLogout: () => void;
  mobileOpen: boolean;
  onClose: () => void;
  admin: {
    name: string;
    email: string;
  };
}) {
  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[272px] flex-col",
          "border-r border-slate-800",
          "bg-[#0b1220] text-white",
          "transition-transform duration-300",
          "lg:translate-x-0",
          mobileOpen
            ? "translate-x-0"
            : "-translate-x-full",
        )}
      >
        <div className="flex h-[78px] items-center justify-between border-b border-white/10 px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-400 text-slate-950 shadow-lg shadow-teal-950/30">
              <Zap
                size={19}
                fill="currentColor"
              />
            </div>

            <div>
              <p className="text-sm font-bold tracking-tight">
                Kitchen Diaries
              </p>

              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Control Center
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-white lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-5">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">
            Workspace
          </p>

          {navItems.map(
            ({
              id,
              label,
              icon: Icon,
            }) => {
              const selected =
                active === id;

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    onSelect(id);
                    onClose();
                  }}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all duration-200",
                    selected
                      ? "bg-white/10 text-white shadow-sm"
                      : "text-slate-400 hover:bg-white/5 hover:text-white",
                  )}
                >
                  <Icon
                    size={17}
                    className={
                      selected
                        ? "text-teal-300"
                        : "text-slate-500 group-hover:text-slate-300"
                    }
                  />

                  <span>{label}</span>

                  {selected && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-teal-300" />
                  )}
                </button>
              );
            },
          )}
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className="mb-2 rounded-xl bg-white/5 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-slate-300">
                <UserRound size={16} />
              </div>

              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-white">
                  {admin.name}
                </p>

                <p className="truncate text-[11px] text-slate-500">
                  {admin.email}
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
          >
            <LogOut size={17} />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Topbar                                                                     */
/* -------------------------------------------------------------------------- */

export function Topbar({
  title,
  description,
  onMenu,
  onRefresh,
  refreshing = false,
  busy = false,
}: {
  title: string;
  description?: string;
  onMenu: () => void;
  onRefresh: () => void;
  refreshing?: boolean;
  busy?: boolean;
}) {
  const isRefreshing =
    refreshing || busy;

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <div className="flex min-h-[78px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            aria-label="Open navigation"
            onClick={onMenu}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 lg:hidden"
          >
            <Menu size={18} />
          </button>

          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold tracking-tight text-slate-900">
              {title}
            </h1>

            {description && (
              <p className="hidden truncate text-xs text-slate-400 sm:block">
                {description}
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={
              isRefreshing
                ? "animate-spin"
                : undefined
            }
          />

          <span className="hidden sm:inline">
            Refresh
          </span>
        </button>
      </div>
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/* Alert                                                                      */
/* -------------------------------------------------------------------------- */

export function AlertBanner({
  children,
  tone = "success",
}: {
  children: ReactNode;
  tone?:
    | "warning"
    | "danger"
    | "success"
    | "info";
}) {
  const styles = {
    warning:
      "border-amber-200 bg-amber-50 text-amber-800",

    danger:
      "border-rose-200 bg-rose-50 text-rose-800",

    success:
      "border-emerald-200 bg-emerald-50 text-emerald-800",

    info:
      "border-sky-200 bg-sky-50 text-sky-800",
  };

  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 text-sm",
        styles[tone],
      )}
    >
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Field                                                                      */
/* -------------------------------------------------------------------------- */

export function Field({
  label,
  children,
  description,
}: {
  label: string;
  children: ReactNode;
  description?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold text-slate-700">
        {label}
      </span>

      {children}

      {description && (
        <span className="mt-1.5 block text-[11px] text-slate-400">
          {description}
        </span>
      )}
    </label>
  );
}

export const fieldClass = cn(
  "h-10 w-full rounded-xl",
  "border border-slate-200 bg-white px-3",
  "text-sm text-slate-800",
  "outline-none transition-all",
  "placeholder:text-slate-400",
  "focus:border-slate-400",
  "focus:ring-4 focus:ring-slate-100",
);