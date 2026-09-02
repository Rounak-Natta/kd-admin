"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bug,
  Building2,
  CircleDollarSign,
  Copy,
  ShieldCheck,
} from "lucide-react";

import {
  AlertBanner,
  Badge,
  Button,
  EmptyState,
  Field,
  Panel,
  SectionHeader,
  Sidebar,
  StatCard,
  Table,
  TableHead,
  TableShell,
  Td,
  Th,
  Topbar,
  fieldClass,
} from "@/components/control-ui";
import { resolvePlanPrice } from "@/config/subscription-plans";

type Tab =
  | "overview"
  | "restaurants"
  | "devices"
  | "codes"
  | "bugs"
  | "events";

type Overview = {
  restaurants: number;
  activeSubscriptions: number;
  activeDevices: number;
  failedSync: number;
  errorsLast24h: number;
  expiringNext30Days: number;
};

type Restaurant = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  users: Array<{
    id: string;
    name: string;
    email: string;
    lastLoginAt: string | null;
    isActive: boolean;
  }>;
  subscriptions: Array<{
    id: string;
    plan: string;
    status: string;
    startsAt: string;
    expiresAt: string;
    maxDevices: number;
    priceAmount: string | number | null;
    currency: string;
  }>;
  devices: Array<{
    id: string;
    name: string | null;
    status: string;
    appVersion: string | null;
    lastSeenAt: string | null;
  }>;
};

type Device = {
  id: string;
  name: string | null;
  status: string;
  lastSeenAt: string | null;
  appVersion: string | null;
  syncProtocolVersion: number | null;
  restaurant: {
    id: string;
    name: string;
  };
  _count: {
    syncOperations: number;
  };
};

type Code = {
  id: string;
  status: string;
  plan: string;
  durationMonths: number;
  maxDevices: number;
  priceAmount: string | number | null;
  currency: string;
  createdAt: string;
  restaurantName: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  notes: string | null;
  restaurant: {
    name: string;
  } | null;
};

type EventRow = {
  id: string;
  createdAt: string;
  severity: string;
  source: string;
  message: string;
  requestId: string | null;
};

type BugLog = {
  id: string;
  createdAt: string;
  severity: string;
  source: string;
  message: string;
  requestId: string | null;
  restaurantId: string | null;
  deviceId: string | null;
  metadata: Record<string, unknown> | null;
  restaurant: {
    id: string;
    name: string;
  } | null;
  device: {
    id: string;
    name: string | null;
    appVersion: string | null;
    status: string;
  } | null;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
};

type Page<T> = { items: T[]; nextCursor: string | null };
type BugLogPage = Page<BugLog>;

const formatDate = (
  value: string | null | undefined,
  withTime = false,
) => {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString(
    "en-IN",
    withTime
      ? {
          dateStyle: "medium",
          timeStyle: "short",
        }
      : {
          dateStyle: "medium",
        },
  );
};

const statusTone = (
  status: string,
):
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info" => {
  const normalized = status.toUpperCase();

  if (
    [
      "ACTIVE",
      "AVAILABLE",
      "USED",
      "SUCCESS",
      "COMPLETED",
    ].includes(normalized)
  ) {
    return "success";
  }

  if (
    ["PENDING", "EXPIRING", "WARN", "WARNING"].includes(normalized)
  ) {
    return "warning";
  }

  if (
    [
      "REVOKED",
      "DISABLED",
      "FAILED",
      "ERROR",
    ].includes(normalized)
  ) {
    return "danger";
  }

  return "info";
};

export default function ControlPanel({
  admin,
}: {
  admin: {
    name: string;
    email: string;
  };
}) {
  const [tab, setTab] =
    useState<Tab>("overview");

  const [overview, setOverview] =
    useState<Overview | null>(null);

  const [restaurants, setRestaurants] =
    useState<Restaurant[]>([]);

  const [devices, setDevices] =
    useState<Device[]>([]);

  const [codes, setCodes] =
    useState<Code[]>([]);

  const [events, setEvents] =
    useState<EventRow[]>([]);

  const [bugLogs, setBugLogs] =
    useState<BugLog[]>([]);

  const [bugCursor, setBugCursor] =
    useState<string | null>(null);
  const [restaurantCursor, setRestaurantCursor] = useState<string | null>(null);
  const [deviceCursor, setDeviceCursor] = useState<string | null>(null);
  const [codeCursor, setCodeCursor] = useState<string | null>(null);
  const [eventCursor, setEventCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const [selectedBugId, setSelectedBugId] =
    useState<string | null>(null);

  const [bugSeverity, setBugSeverity] =
    useState("ALL");

  const [bugRestaurant, setBugRestaurant] =
    useState("ALL");

  const [bugSearch, setBugSearch] =
    useState("");

  const [bugLoadingMore, setBugLoadingMore] =
    useState(false);

  const [busy, setBusy] =
    useState(false);

  const [newCode, setNewCode] =
    useState<string | null>(null);

  const [showGenerator, setShowGenerator] =
    useState(false);

  const [plan, setPlan] =
    useState<
      "BASIC" | "PRO" | "CUSTOM"
    >("PRO");

  const [durationMonths, setDurationMonths] =
    useState("12");

  const [maxDevicesInput, setMaxDevicesInput] =
    useState("1");

  const [customPrice, setCustomPrice] =
    useState("");

  const [restaurantNameInput, setRestaurantNameInput] = useState("");
  const [customerNameInput, setCustomerNameInput] = useState("");
  const [customerEmailInput, setCustomerEmailInput] = useState("");
  const [customerPasswordInput, setCustomerPasswordInput] = useState("");
  const [customerPhoneInput, setCustomerPhoneInput] = useState("");
  const [licenseNotes, setLicenseNotes] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const [mobileOpen, setMobileOpen] =
    useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    const endpoints = [
      "/api/control/overview",
      "/api/control/restaurants",
      "/api/control/devices",
      "/api/control/activation-codes",
      "/api/control/events",
      "/api/control/bug-logs?limit=200",
    ];

    try {
      const results = await Promise.allSettled(endpoints.map(async (url) => {
        const response = await fetch(url, { cache: "no-store" });
        const body = await response.json();
        if (!response.ok || !body.success) throw new Error(body.error || `Request failed: ${url}`);
        return body.data;
      }));

      const value = <T,>(index: number): T | null =>
        results[index]?.status === "fulfilled" ? (results[index] as PromiseFulfilledResult<T>).value : null;

      const overviewData = value<Overview>(0);
      const restaurantData = value<Page<Restaurant>>(1);
      const deviceData = value<Page<Device>>(2);
      const codeData = value<Page<Code>>(3);
      const eventData = value<Page<EventRow>>(4);
      const bugPage = value<BugLogPage>(5);

      if (overviewData) setOverview(overviewData);
      if (restaurantData) { setRestaurants(restaurantData.items); setRestaurantCursor(restaurantData.nextCursor); }
      if (deviceData) { setDevices(deviceData.items); setDeviceCursor(deviceData.nextCursor); }
      if (codeData) { setCodes(codeData.items); setCodeCursor(codeData.nextCursor); }
      if (eventData) { setEvents(eventData.items); setEventCursor(eventData.nextCursor); }
      if (bugPage) {
        setBugLogs(bugPage.items);
        setBugCursor(bugPage.nextCursor);
        setSelectedBugId((current) =>
          current && bugPage.items.some((item) => item.id === current) ? current : bugPage.items[0]?.id ?? null,
        );
      }

      const failures = results.filter((result) => result.status === "rejected");
      setActionError(failures.length ? `${failures.length} admin data source(s) could not be refreshed. Other sections remain available.` : null);
      failures.forEach((failure) => console.error("CONTROL_PANEL_PARTIAL_LOAD_ERROR", failure.reason));
    } finally {
      setBusy(false);
    }
  }, []);

  /*
   * The timeout intentionally schedules the initial
   * client-side fetch after the effect commits.
   *
   * This keeps the page compliant with the project's
   * react-hooks/set-state-in-effect ESLint rule while
   * preserving the existing client-side API architecture.
   */
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [load]);

  async function loadMorePage<T>(
    endpoint: string,
    cursor: string,
    current: T[],
    setItems: (items: T[]) => void,
    setCursor: (cursor: string | null) => void,
  ) {
    setLoadingMore(true);
    try {
      const response = await fetch(`${endpoint}&cursor=${encodeURIComponent(cursor)}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(body.error || "Unable to load more data");
      const page = body.data as Page<T>;
      const seen = new Set(current.map((item) => JSON.stringify(item)));
      setItems([...current, ...page.items.filter((item) => !seen.has(JSON.stringify(item)))]);
      setCursor(page.nextCursor);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to load more data");
    } finally {
      setLoadingMore(false);
    }
  }

  async function loadOlderBugLogs() {
    if (!bugCursor || bugLoadingMore) return;

    setBugLoadingMore(true);

    try {
      const response = await fetch(
        `/api/control/bug-logs?limit=200&cursor=${encodeURIComponent(bugCursor)}`,
        { cache: "no-store" },
      );
      const body = await response.json();

      if (!response.ok || !body.success) {
        throw new Error(body.error || "Unable to load older bug logs");
      }

      const page = body.data as BugLogPage;
      setBugLogs((current) => {
        const seen = new Set(current.map((item) => item.id));
        return [...current, ...page.items.filter((item) => !seen.has(item.id))];
      });
      setBugCursor(page.nextCursor);
    } catch (error) {
      console.error("CONTROL_BUG_LOG_LOAD_MORE_ERROR", error);
    } finally {
      setBugLoadingMore(false);
    }
  }

  async function logout() {
    try {
      await fetch(
        "/api/control/logout",
        {
          method: "POST",
        },
      );
    } finally {
      window.location.href =
        "/control/login";
    }
  }

  async function generateCode() {
    setActionError(null);

    const issuedRestaurantName = restaurantNameInput.trim();
    const issuedCustomerName = customerNameInput.trim();
    const issuedCustomerEmail = customerEmailInput.trim().toLowerCase();
    const issuedCustomerPhone = customerPhoneInput.trim();
    const issuedCustomerPassword = customerPasswordInput;

    if (issuedRestaurantName.length < 2 || issuedCustomerName.length < 2) {
      setActionError("Restaurant name and customer name are required.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(issuedCustomerEmail)) {
      setActionError("Enter a valid customer email.");
      return;
    }

    if (!/^\+?[0-9][0-9\s().-]{5,28}[0-9]$/.test(issuedCustomerPhone)) {
      setActionError("Enter a valid customer phone number.");
      return;
    }

    if (issuedCustomerPassword.length < 10 || issuedCustomerPassword.length > 72) {
      setActionError("Owner password must be between 10 and 72 characters.");
      return;
    }

    const duration =
      Number(durationMonths);

    const maxDevices =
      Number(maxDevicesInput);

    const price =
      customPrice.trim()
        ? Number(customPrice)
        : undefined;

    if (
      !Number.isInteger(duration) ||
      duration < 1 ||
      duration > 36
    ) {
      setActionError("Duration must be between 1 and 36 months.");
      return;
    }

    if (
      plan !== "CUSTOM" &&
      duration !== 6 &&
      duration !== 12
    ) {
      setActionError("Basic and Pro licenses support 6 or 12 months.");
      return;
    }

    if (
      !Number.isInteger(maxDevices) ||
      maxDevices < 1 ||
      maxDevices > 10
    ) {
      setActionError("Maximum devices must be between 1 and 10.");
      return;
    }

    if (
      plan === "CUSTOM" &&
      (!Number.isFinite(price) ||
        (price ?? 0) <= 0)
    ) {
      setActionError("Custom price must be greater than zero.");
      return;
    }

    setBusy(true);

    try {
      const response = await fetch(
        "/api/control/activation-codes",
        {
          method: "POST",
          headers: {
            "content-type":
              "application/json",
          },
          body: JSON.stringify({
            plan,
            durationMonths: duration,
            maxDevices,
            customPrice: price,
            restaurantName: issuedRestaurantName,
            customerName: issuedCustomerName,
            customerEmail: issuedCustomerEmail,
            password: issuedCustomerPassword,
            customerPhone: issuedCustomerPhone,
            notes: licenseNotes.trim() || undefined,
          }),
        },
      );

      const body =
        await response.json();

      if (
        !response.ok ||
        !body.success
      ) {
        throw new Error(
          body.error ||
            "Unable to generate code",
        );
      }

      setNewCode(
        body.data.code,
      );
      setRestaurantNameInput("");
      setCustomerNameInput("");
      setCustomerEmailInput("");
      setCustomerPasswordInput("");
      setCustomerPhoneInput("");
      setLicenseNotes("");

      setShowGenerator(false);
      setActionError(null);

      await load();
    } catch (error) {
      console.error(
        "CONTROL_ACTIVATION_CODE_ERROR",
        error,
      );
      setActionError(
        error instanceof Error ? error.message : "Unable to generate activation code.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function deviceAction(
    deviceId: string,
    action:
      | "activate"
      | "revoke",
  ) {
    const confirmed =
      window.confirm(
        action === "revoke"
          ? "Revoke this device?"
          : "Activate this device?",
      );

    if (!confirmed) {
      return;
    }

    setBusy(true);

    try {
      const response = await fetch(
        "/api/control/devices",
        {
          method: "PATCH",
          headers: {
            "content-type":
              "application/json",
          },
          body: JSON.stringify({
            deviceId,
            action,
          }),
        },
      );

      const body =
        await response.json();

      if (
        !response.ok ||
        !body.success
      ) {
        throw new Error(
          body.error ||
            "Unable to update device",
        );
      }

      await load();
    } catch (error) {
      console.error(
        "CONTROL_DEVICE_ACTION_ERROR",
        error,
      );
    } finally {
      setBusy(false);
    }
  }

  async function setMaxDevices(
    restaurantId: string,
    current: number,
  ) {
    const input =
      window.prompt(
        "Maximum active devices (1–10)",
        String(current),
      );

    if (input === null) {
      return;
    }

    const maxDevices =
      Number(input);

    if (
      !Number.isInteger(maxDevices) ||
      maxDevices < 1 ||
      maxDevices > 10
    ) {
      return;
    }

    setBusy(true);

    try {
      const response = await fetch(
        "/api/control/restaurants",
        {
          method: "PATCH",
          headers: {
            "content-type":
              "application/json",
          },
          body: JSON.stringify({
            restaurantId,
            maxDevices,
          }),
        },
      );

      const body =
        await response.json();

      if (
        !response.ok ||
        !body.success
      ) {
        throw new Error(
          body.error ||
            "Unable to update device limit",
        );
      }

      await load();
    } catch (error) {
      console.error(
        "CONTROL_DEVICE_LIMIT_ERROR",
        error,
      );
    } finally {
      setBusy(false);
    }
  }

  async function subscriberAction(restaurant: Restaurant, action: "renew" | "suspend" | "activate" | "cancel" | "set_account_active") {
    const subscription = restaurant.subscriptions[0];
    if (!subscription && action !== "set_account_active") return;

    const body: Record<string, unknown> = { restaurantId: restaurant.id, action };
    if (action === "renew") {
      const monthsInput = window.prompt("Renew for how many months? Basic/Pro: 6 or 12; Custom: 1–36", "12");
      if (monthsInput === null) return;
      const months = Number(monthsInput);
      if (!Number.isInteger(months) || months < 1 || months > 36) { setActionError("Renewal months must be between 1 and 36."); return; }
      const planInput = window.prompt("Plan: BASIC, PRO, or CUSTOM", subscription?.plan ?? "PRO");
      if (planInput === null) return;
      const nextPlan = planInput.trim().toUpperCase();
      if (!["BASIC", "PRO", "CUSTOM"].includes(nextPlan)) { setActionError("Invalid plan."); return; }
      if (nextPlan !== "CUSTOM" && months !== 6 && months !== 12) { setActionError("Basic and Pro renewals support only 6 or 12 months."); return; }
      body.months = months;
      body.plan = nextPlan;
      body.maxDevices = subscription?.maxDevices ?? 1;
      if (nextPlan === "CUSTOM") {
        const priceInput = window.prompt("Custom renewal price (INR)", String(subscription?.priceAmount ?? ""));
        if (priceInput === null) return;
        const customPrice = Number(priceInput);
        if (!Number.isFinite(customPrice) || customPrice <= 0) { setActionError("Custom price must be greater than zero."); return; }
        body.customPrice = customPrice;
      }
    } else if (action === "set_account_active") {
      body.isActive = !restaurant.isActive;
      if (!window.confirm(`${restaurant.isActive ? "Disable" : "Enable"} ${restaurant.name}?`)) return;
    } else if (!window.confirm(`${action[0]?.toUpperCase()}${action.slice(1)} subscription for ${restaurant.name}?`)) {
      return;
    }

    setBusy(true);
    setActionError(null);
    try {
      const response = await fetch("/api/control/restaurants", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Unable to update subscriber.");
      await load();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to update subscriber.");
    } finally {
      setBusy(false);
    }
  }

  const filteredBugLogs = useMemo(() => {
    const search = bugSearch.trim().toLowerCase();

    return bugLogs.filter((bug) => {
      if (bugSeverity !== "ALL" && bug.severity.toUpperCase() !== bugSeverity) {
        return false;
      }

      if (bugRestaurant !== "ALL" && bug.restaurantId !== bugRestaurant) {
        return false;
      }

      if (!search) return true;

      const haystack = [
        bug.message,
        bug.source,
        bug.restaurant?.name,
        bug.user?.name,
        bug.user?.email,
        bug.device?.name,
        typeof bug.metadata?.path === "string" ? bug.metadata.path : "",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(search);
    });
  }, [bugLogs, bugRestaurant, bugSearch, bugSeverity]);

  const selectedBug = useMemo(
    () => bugLogs.find((bug) => bug.id === selectedBugId) ?? null,
    [bugLogs, selectedBugId],
  );

  const bugRestaurants = useMemo(() => {
    const entries = new Map<string, string>();
    for (const bug of bugLogs) {
      if (bug.restaurant) entries.set(bug.restaurant.id, bug.restaurant.name);
    }
    return Array.from(entries.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [bugLogs]);

  const title = useMemo(() => {
    switch (tab) {
      case "restaurants":
        return "Restaurants";

      case "devices":
        return "Devices";

      case "codes":
        return "Subscriptions";

      case "bugs":
        return "User bugs";

      case "events":
        return "System events";

      default:
        return "Overview";
    }
  }, [tab]);

  return (
    <div className="min-h-screen bg-[#f6f8fb]">
      <Sidebar
        active={tab}
        onSelect={setTab}
        onLogout={() => {
          void logout();
        }}
        mobileOpen={mobileOpen}
        onClose={() =>
          setMobileOpen(false)
        }
        admin={admin}
      />

      <main className="lg:pl-[272px]">
        <Topbar
          title={title}
          description="Kitchen Diaries administration"
          onMenu={() =>
            setMobileOpen(true)
          }
          busy={busy}
          onRefresh={() => {
            void load();
          }}
        />

        <div className="mx-auto max-w-[1600px] space-y-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {tab === "overview" && (
            <>
              <SectionHeader
                eyebrow="Operations"
                title={`Good morning, ${admin.name}`}
                description="A live snapshot of your restaurant network, licensing and device health."
                action={
                  <Badge tone="success">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Systems operational
                  </Badge>
                }
              />

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label="Restaurants"
                  value={
                    overview?.restaurants
                  }
                  icon={Building2}
                  hint="Total onboarded"
                  tone="teal"
                />

                <StatCard
                  label="Active subscriptions"
                  value={
                    overview?.activeSubscriptions
                  }
                  icon={CircleDollarSign}
                  hint="Currently licensed"
                  tone="blue"
                />

                <StatCard
                  label="Active devices"
                  value={
                    overview?.activeDevices
                  }
                  icon={ShieldCheck}
                  hint="Connected endpoints"
                  tone="violet"
                />

                <StatCard
                  label="Failed sync operations"
                  value={
                    overview?.failedSync
                  }
                  icon={Activity}
                  hint="Needs attention"
                  tone="amber"
                />

                <StatCard
                  label="Errors · last 24h"
                  value={
                    overview?.errorsLast24h
                  }
                  icon={AlertTriangle}
                  hint="System event volume"
                  tone="rose"
                />

                <StatCard
                  label="Expiring · next 30d"
                  value={
                    overview?.expiringNext30Days
                  }
                  icon={CircleDollarSign}
                  hint="Renewals to follow up"
                  tone="amber"
                />
              </div>

              <Panel>
                <div className="p-6">
                  <SectionHeader
                    eyebrow="Health"
                    title="Network health"
                    description="Quick operational indicators across the Kitchen Diaries network."
                  />

                  <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <HealthItem
                      label="Restaurants"
                      value={
                        overview?.restaurants ??
                        0
                      }
                      detail="Total accounts"
                    />

                    <HealthItem
                      label="Devices"
                      value={
                        overview?.activeDevices ??
                        0
                      }
                      detail="Active endpoints"
                    />

                    <HealthItem
                      label="Failed sync"
                      value={
                        overview?.failedSync ??
                        0
                      }
                      detail="Requires attention"
                      warning
                    />

                    <HealthItem
                      label="Errors"
                      value={
                        overview?.errorsLast24h ??
                        0
                      }
                      detail="Last 24 hours"
                      warning
                    />
                  </div>
                </div>
              </Panel>
            </>
          )}

          {tab === "restaurants" && (
            <section>
              <SectionHeader
                eyebrow="Workspace"
                title="Restaurants"
                description="Review subscriptions, device limits and account status across your network."
              />

              <Panel className="mt-5">
                <TableShell>
                  <Table>
                    <TableHead>
                      <tr>
                        {[
                          "Restaurant",
                          "Customer / owner",
                          "Plan",
                          "Expires",
                          "Devices",
                          "Status",
                          "Actions",
                        ].map(
                          (heading) => (
                            <Th
                              key={
                                heading
                              }
                            >
                              {heading}
                            </Th>
                          ),
                        )}
                      </tr>
                    </TableHead>

                    <tbody>
                      {restaurants.map(
                        (restaurant) => {
                          const subscription =
                            restaurant
                              .subscriptions[0];

                          const activeDevices =
                            restaurant.devices
                              .length;

                          return (
                            <tr
                              key={
                                restaurant.id
                              }
                              className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"
                            >
                              <Td>
                                <div className="flex items-center gap-3">
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-xs font-bold text-teal-700">
                                    {restaurant.name
                                      .slice(
                                        0,
                                        1,
                                      )
                                      .toUpperCase()}
                                  </div>

                                  <div className="min-w-0">
                                    <p className="font-semibold text-slate-800">
                                      {
                                        restaurant.name
                                      }
                                    </p>

                                    <p className="mt-0.5 truncate text-xs text-slate-400">
                                      {restaurant.email ||
                                        "No email"}
                                    </p>
                                  </div>
                                </div>
                              </Td>

                              <Td>
                                <p className="font-semibold text-slate-800">
                                  {restaurant.users[0]?.name || "—"}
                                </p>
                                <p className="mt-0.5 text-xs text-slate-400">
                                  {restaurant.phone || restaurant.users[0]?.email || "No contact"}
                                </p>
                              </Td>

                              <Td>
                                {subscription ? (
                                  <Badge tone="info">
                                    {
                                      subscription.plan
                                    }
                                  </Badge>
                                ) : (
                                  "—"
                                )}
                              </Td>

                              <Td>
                                {formatDate(
                                  subscription?.expiresAt,
                                )}
                              </Td>

                              <Td>
                                <span className="font-semibold text-slate-700">
                                  {
                                    activeDevices
                                  }
                                </span>

                                <span className="text-slate-400">
                                  {" "}
                                  /{" "}
                                  {subscription?.maxDevices ??
                                    0}
                                </span>
                              </Td>

                              <Td>
                                <div className="flex flex-col items-start gap-1">
                                  <Badge tone={restaurant.isActive ? "success" : "danger"}>
                                    {restaurant.isActive ? "Account active" : "Account disabled"}
                                  </Badge>
                                  {subscription && (
                                    <Badge tone={statusTone(subscription.status)}>
                                      {subscription.status}
                                    </Badge>
                                  )}
                                </div>
                              </Td>

                              <Td>
                                <div className="flex flex-wrap gap-2">
                                  {subscription && (
                                    <>
                                      <Button variant="secondary" className="h-9 px-3 text-xs" onClick={() => void subscriberAction(restaurant, "renew")}>Renew</Button>
                                      <Button variant="secondary" className="h-9 px-3 text-xs" onClick={() => void setMaxDevices(restaurant.id, subscription.maxDevices)}>Devices</Button>
                                      {subscription.status === "SUSPENDED" ? (
                                        <Button variant="secondary" className="h-9 px-3 text-xs" onClick={() => void subscriberAction(restaurant, "activate")}>Activate</Button>
                                      ) : (
                                        <Button variant="secondary" className="h-9 px-3 text-xs" onClick={() => void subscriberAction(restaurant, "suspend")}>Suspend</Button>
                                      )}
                                    </>
                                  )}
                                  <Button variant="secondary" className="h-9 px-3 text-xs" onClick={() => void subscriberAction(restaurant, "set_account_active")}>
                                    {restaurant.isActive ? "Disable" : "Enable"}
                                  </Button>
                                </div>
                              </Td>
                            </tr>
                          );
                        },
                      )}

                      {!restaurants.length && (
                        <tr>
                          <td colSpan={7}>
                            <EmptyState
                              title="No restaurants yet"
                              description="Restaurant accounts will appear here once they are onboarded."
                            />
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </TableShell>
                {restaurantCursor && (
                  <div className="border-t border-slate-100 p-4 text-center">
                    <Button variant="secondary" disabled={loadingMore} onClick={() => void loadMorePage("/api/control/restaurants?limit=50", restaurantCursor, restaurants, setRestaurants, setRestaurantCursor)}>
                      {loadingMore ? "Loading…" : "Load more restaurants"}
                    </Button>
                  </div>
                )}
              </Panel>
            </section>
          )}

          {tab === "devices" && (
            <section>
              <SectionHeader
                eyebrow="Infrastructure"
                title="Devices"
                description="Monitor endpoints, software versions and sync activity for every restaurant."
              />

              <Panel className="mt-5">
                <TableShell>
                  <Table>
                    <TableHead>
                      <tr>
                        {[
                          "Device",
                          "Restaurant",
                          "Status",
                          "Last seen",
                          "Version",
                          "Sync ops",
                          "Actions",
                        ].map(
                          (heading) => (
                            <Th
                              key={
                                heading
                              }
                            >
                              {heading}
                            </Th>
                          ),
                        )}
                      </tr>
                    </TableHead>

                    <tbody>
                      {devices.map(
                        (device) => (
                          <tr
                            key={
                              device.id
                            }
                            className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"
                          >
                            <Td>
                              <p className="font-semibold text-slate-800">
                                {device.name ||
                                  "Unnamed device"}
                              </p>

                              <p className="mt-0.5 max-w-[180px] truncate font-mono text-[10px] text-slate-400">
                                {
                                  device.id
                                }
                              </p>
                            </Td>

                            <Td>
                              {
                                device
                                  .restaurant
                                  .name
                              }
                            </Td>

                            <Td>
                              <Badge
                                tone={statusTone(
                                  device.status,
                                )}
                              >
                                {
                                  device.status
                                }
                              </Badge>
                            </Td>

                            <Td>
                              {formatDate(
                                device.lastSeenAt,
                                true,
                              )}
                            </Td>

                            <Td>
                              <div className="text-xs font-medium text-slate-700">
                                {device.appVersion ||
                                  "—"}
                              </div>

                              <div className="mt-0.5 text-[11px] text-slate-400">
                                Sync{" "}
                                {device.syncProtocolVersion ??
                                  "—"}
                              </div>
                            </Td>

                            <Td>
                              {
                                device._count
                                  .syncOperations
                              }
                            </Td>

                            <Td>
                              <Button
                                variant={
                                  device.status ===
                                  "ACTIVE"
                                    ? "danger"
                                    : "secondary"
                                }
                                className="h-9 px-3 text-xs"
                                onClick={() => {
                                  void deviceAction(
                                    device.id,
                                    device.status ===
                                      "ACTIVE"
                                      ? "revoke"
                                      : "activate",
                                  );
                                }}
                              >
                                {device.status ===
                                "ACTIVE"
                                  ? "Revoke"
                                  : "Activate"}
                              </Button>
                            </Td>
                          </tr>
                        ),
                      )}

                      {!devices.length && (
                        <tr>
                          <td colSpan={7}>
                            <EmptyState
                              title="No devices connected"
                              description="Activated restaurant endpoints will appear here."
                            />
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </TableShell>
                {deviceCursor && (
                  <div className="border-t border-slate-100 p-4 text-center">
                    <Button variant="secondary" disabled={loadingMore} onClick={() => void loadMorePage("/api/control/devices?limit=50", deviceCursor, devices, setDevices, setDeviceCursor)}>
                      {loadingMore ? "Loading…" : "Load more devices"}
                    </Button>
                  </div>
                )}
              </Panel>
            </section>
          )}

          {tab === "codes" && (
            <section>
              <SectionHeader
                eyebrow="Licensing"
                title="Subscriptions & onboarding"
                description="Create subscriber accounts, subscriptions and track issued licenses."
                action={
                  <Button
                    onClick={() =>
                      setShowGenerator(
                        (value) =>
                          !value,
                      )
                    }
                  >
                    {showGenerator
                      ? "Close form"
                      : "Create subscriber"}
                  </Button>
                }
              />

              {showGenerator && (
                <Panel className="mt-5 p-5 sm:p-6">
                  <div className="mb-5">
                    <h3 className="font-bold text-slate-900">
                      New subscriber
                      subscription
                    </h3>

                    <p className="mt-1 text-xs text-slate-400">
                      Create the owner login, restaurant and subscription together.
                      The first successful login will activate the POS device.
                    </p>
                  </div>

                  {actionError && (
                    <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                      {actionError}
                    </div>
                  )}

                  <div className="mb-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                    <Field label="Restaurant name *">
                      <input value={restaurantNameInput} onChange={(event) => setRestaurantNameInput(event.target.value)} maxLength={120} className={fieldClass} placeholder="e.g. Spice Garden" />
                    </Field>
                    <Field label="Customer / owner name *">
                      <input value={customerNameInput} onChange={(event) => setCustomerNameInput(event.target.value)} maxLength={80} className={fieldClass} placeholder="Owner name" />
                    </Field>
                    <Field label="Customer email *">
                      <input type="email" value={customerEmailInput} onChange={(event) => setCustomerEmailInput(event.target.value)} maxLength={254} className={fieldClass} placeholder="owner@restaurant.com" />
                    </Field>
                    <Field label="Owner password *">
                      <input type="password" value={customerPasswordInput} onChange={(event) => setCustomerPasswordInput(event.target.value)} minLength={10} maxLength={72} className={fieldClass} placeholder="Minimum 10 characters" autoComplete="new-password" />
                    </Field>
                    <Field label="Customer phone *">
                      <input type="tel" value={customerPhoneInput} onChange={(event) => setCustomerPhoneInput(event.target.value)} maxLength={30} className={fieldClass} placeholder="+91 98765 43210" />
                    </Field>
                  </div>

                  <div className="mb-4">
                    <Field label="Sales / onboarding notes">
                      <textarea value={licenseNotes} onChange={(event) => setLicenseNotes(event.target.value)} maxLength={500} rows={2} className={`${fieldClass} h-auto py-2`} placeholder="Optional internal note" />
                    </Field>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <Field label="Plan">
                      <select
                        value={plan}
                        onChange={(event) =>
                          setPlan(
                            event.target
                              .value as
                              | "BASIC"
                              | "PRO"
                              | "CUSTOM",
                          )
                        }
                        className={
                          fieldClass
                        }
                      >
                        <option value="BASIC">
                          Basic
                        </option>

                        <option value="PRO">
                          Pro
                        </option>

                        <option value="CUSTOM">
                          Custom
                        </option>
                      </select>
                    </Field>

                    <Field label="Duration">
                      <select
                        value={
                          durationMonths
                        }
                        onChange={(event) =>
                          setDurationMonths(
                            event.target
                              .value,
                          )
                        }
                        className={
                          fieldClass
                        }
                      >
                        <option value="6">
                          6 months
                        </option>

                        <option value="12">
                          12 months
                        </option>

                        {plan ===
                          "CUSTOM" && (
                          <option value="1">
                            1 month
                          </option>
                        )}
                      </select>
                    </Field>

                    <Field label="Maximum devices">
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={
                          maxDevicesInput
                        }
                        onChange={(event) =>
                          setMaxDevicesInput(
                            event.target
                              .value,
                          )
                        }
                        className={
                          fieldClass
                        }
                      />
                    </Field>

                    {plan === "CUSTOM" ? (
                      <Field label="Price (₹)">
                        <input
                          type="number"
                          min="1"
                          value={
                            customPrice
                          }
                          onChange={(event) =>
                            setCustomPrice(
                              event.target
                                .value,
                            )
                          }
                          className={
                            fieldClass
                          }
                        />
                      </Field>
                    ) : (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
                          Price
                        </span>

                        <p className="mt-1 text-lg font-bold text-slate-900">
                          ₹{resolvePlanPrice(
                            plan,
                            Number(durationMonths),
                          )?.toLocaleString("en-IN") ?? "—"}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mt-5 flex justify-end">
                    <Button
                      disabled={busy}
                      onClick={() => {
                        void generateCode();
                      }}
                    >
                      Create subscriber
                    </Button>
                  </div>
                </Panel>
              )}

              {newCode && (
                <div className="mt-5">
                  <AlertBanner>
                    <p className="font-semibold">
                      Subscriber created successfully.
                    </p>

                    <p className="mt-0.5 text-xs text-emerald-700">
                      The owner can now sign in using the email and password you set.
                      This license reference is shown only once.
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <code className="rounded-lg border border-emerald-200 bg-white px-3 py-2 font-mono text-sm font-bold text-emerald-950">
                        {newCode}
                      </code>

                      <Button
                        variant="secondary"
                        className="h-9 px-3"
                        icon={
                          <Copy size={14} />
                        }
                        onClick={() => {
                          void navigator.clipboard?.writeText(
                            newCode,
                          );
                        }}
                      >
                        Copy
                      </Button>
                    </div>
                  </AlertBanner>
                </div>
              )}

              <Panel className="mt-5">
                <TableShell>
                  <Table>
                    <TableHead>
                      <tr>
                        {[
                          "Status",
                          "Plan",
                          "Duration",
                          "Price",
                          "Devices",
                          "Restaurant",
                          "Customer",
                          "Contact",
                          "Created",
                        ].map(
                          (heading) => (
                            <Th
                              key={
                                heading
                              }
                            >
                              {heading}
                            </Th>
                          ),
                        )}
                      </tr>
                    </TableHead>

                    <tbody>
                      {codes.map(
                        (code) => (
                          <tr
                            key={
                              code.id
                            }
                            className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"
                          >
                            <Td>
                              <Badge
                                tone={statusTone(
                                  code.status,
                                )}
                              >
                                {
                                  code.status
                                }
                              </Badge>
                            </Td>

                            <Td>
                              <Badge tone="info">
                                {
                                  code.plan
                                }
                              </Badge>
                            </Td>

                            <Td>
                              {
                                code.durationMonths
                              }{" "}
                              months
                            </Td>

                            <Td className="font-semibold text-slate-800">
                              {code.priceAmount ==
                              null
                                ? "Custom"
                                : `₹${Number(
                                    code.priceAmount,
                                  ).toLocaleString(
                                    "en-IN",
                                  )}`}
                            </Td>

                            <Td>
                              {
                                code.maxDevices
                              }
                            </Td>

                            <Td>
                              {code.restaurant?.name || code.restaurantName || "Unassigned"}
                            </Td>

                            <Td>
                              <p className="font-semibold text-slate-800">{code.customerName || "—"}</p>
                            </Td>

                            <Td>
                              <p className="text-xs font-medium text-slate-700">{code.customerEmail || "—"}</p>
                              <p className="mt-0.5 text-xs text-slate-400">{code.customerPhone || "—"}</p>
                            </Td>

                            <Td>
                              {formatDate(
                                code.createdAt,
                              )}
                            </Td>
                          </tr>
                        ),
                      )}

                      {!codes.length && (
                        <tr>
                          <td colSpan={9}>
                            <EmptyState
                              title="No activation codes"
                              description="Generated licenses will be listed here."
                            />
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </TableShell>
                {codeCursor && (
                  <div className="border-t border-slate-100 p-4 text-center">
                    <Button variant="secondary" disabled={loadingMore} onClick={() => void loadMorePage("/api/control/activation-codes?limit=50", codeCursor, codes, setCodes, setCodeCursor)}>
                      {loadingMore ? "Loading…" : "Load more licenses"}
                    </Button>
                  </div>
                )}
              </Panel>
            </section>
          )}

          {tab === "bugs" && (
            <section>
              <SectionHeader
                eyebrow="Support & observability"
                title="User bug logs"
                description="Automatic client, sync and order-operation failures reported by restaurant users. Sensitive credential fields are redacted before storage."
                action={
                  <Badge tone={filteredBugLogs.length ? "warning" : "success"}>
                    <Bug size={13} />
                    {filteredBugLogs.length} loaded
                  </Badge>
                }
              />

              <Panel className="mt-5">
                <div className="grid gap-3 border-b border-slate-100 p-4 md:grid-cols-[1fr_180px_240px]">
                  <input
                    value={bugSearch}
                    onChange={(event) => setBugSearch(event.target.value)}
                    className={fieldClass}
                    placeholder="Search error, user, restaurant, route…"
                  />

                  <select
                    value={bugSeverity}
                    onChange={(event) => setBugSeverity(event.target.value)}
                    className={fieldClass}
                  >
                    <option value="ALL">All severities</option>
                    <option value="ERROR">Errors</option>
                    <option value="WARN">Warnings</option>
                    <option value="INFO">Info</option>
                  </select>

                  <select
                    value={bugRestaurant}
                    onChange={(event) => setBugRestaurant(event.target.value)}
                    className={fieldClass}
                  >
                    <option value="ALL">All restaurants</option>
                    {bugRestaurants.map(([id, name]) => (
                      <option key={id} value={id}>{name}</option>
                    ))}
                  </select>
                </div>

                <TableShell>
                  <Table>
                    <TableHead>
                      <tr>
                        {["Time", "Severity", "Restaurant / user", "Source", "Error", "Device"].map((heading) => (
                          <Th key={heading}>{heading}</Th>
                        ))}
                      </tr>
                    </TableHead>

                    <tbody>
                      {filteredBugLogs.map((bug) => (
                        <tr
                          key={bug.id}
                          onClick={() => setSelectedBugId(bug.id)}
                          className={`cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50/70 ${selectedBugId === bug.id ? "bg-amber-50/50" : ""}`}
                        >
                          <Td className="whitespace-nowrap text-xs">
                            {formatDate(bug.createdAt, true)}
                          </Td>
                          <Td>
                            <Badge tone={statusTone(bug.severity)}>{bug.severity}</Badge>
                          </Td>
                          <Td>
                            <p className="font-semibold text-slate-800">{bug.restaurant?.name || "Unknown restaurant"}</p>
                            <p className="mt-0.5 text-xs text-slate-400">
                              {bug.user ? `${bug.user.name} · ${bug.user.role}` : "User unavailable"}
                            </p>
                          </Td>
                          <Td>
                            <span className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-[11px] text-slate-600">
                              {bug.source.replace(/^USER_BUG_/, "")}
                            </span>
                          </Td>
                          <Td>
                            <p className="max-w-[520px] truncate font-medium text-slate-700">{bug.message}</p>
                            {typeof bug.metadata?.path === "string" && (
                              <p className="mt-1 max-w-[520px] truncate font-mono text-[10px] text-slate-400">{bug.metadata.path}</p>
                            )}
                          </Td>
                          <Td>
                            <p className="text-xs font-medium text-slate-700">{bug.device?.name || "—"}</p>
                            <p className="mt-0.5 text-[10px] text-slate-400">{bug.device?.appVersion || "version —"}</p>
                          </Td>
                        </tr>
                      ))}

                      {!filteredBugLogs.length && (
                        <tr>
                          <td colSpan={6}>
                            <EmptyState
                              title="No matching bug logs"
                              description="Automatic user-facing errors will appear here when they are reported."
                            />
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </TableShell>

                {bugCursor && (
                  <div className="flex justify-center border-t border-slate-100 p-4">
                    <Button
                      variant="secondary"
                      disabled={bugLoadingMore}
                      onClick={() => { void loadOlderBugLogs(); }}
                    >
                      {bugLoadingMore ? "Loading…" : "Load older logs"}
                    </Button>
                  </div>
                )}
              </Panel>

              {selectedBug && (
                <Panel className="mt-5">
                  <div className="border-b border-slate-100 p-5">
                    <SectionHeader
                      eyebrow="Selected issue"
                      title={selectedBug.message}
                      description={`${selectedBug.restaurant?.name || "Unknown restaurant"} · ${formatDate(selectedBug.createdAt, true)}`}
                      action={<Badge tone={statusTone(selectedBug.severity)}>{selectedBug.severity}</Badge>}
                    />
                  </div>

                  <div className="grid gap-5 p-5 lg:grid-cols-2">
                    <div className="space-y-3 text-sm">
                      <p><span className="font-semibold text-slate-500">User:</span> {selectedBug.user ? `${selectedBug.user.name} (${selectedBug.user.email}) · ${selectedBug.user.role}` : "Unavailable"}</p>
                      <p><span className="font-semibold text-slate-500">Restaurant:</span> {selectedBug.restaurant?.name || selectedBug.restaurantId || "Unavailable"}</p>
                      <p><span className="font-semibold text-slate-500">Device:</span> {selectedBug.device?.name || selectedBug.deviceId || "Unavailable"}</p>
                      <p><span className="font-semibold text-slate-500">Source:</span> {selectedBug.source}</p>
                      <p><span className="font-semibold text-slate-500">Request ID:</span> <span className="font-mono text-xs">{selectedBug.requestId || "—"}</span></p>
                      <p><span className="font-semibold text-slate-500">Route:</span> <span className="font-mono text-xs">{typeof selectedBug.metadata?.path === "string" ? selectedBug.metadata.path : "—"}</span></p>
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Technical details</p>
                      <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap rounded-xl bg-slate-950 p-4 text-[11px] leading-5 text-slate-200">
                        {JSON.stringify(selectedBug.metadata ?? {}, null, 2)}
                      </pre>
                    </div>
                  </div>
                </Panel>
              )}
            </section>
          )}

          {tab === "events" && (
            <section>
              <SectionHeader
                eyebrow="Observability"
                title="System events"
                description="Review recent operational activity, errors and request traces."
              />

              <Panel className="mt-5">
                <TableShell>
                  <Table>
                    <TableHead>
                      <tr>
                        {[
                          "Time",
                          "Severity",
                          "Source",
                          "Message",
                          "Request",
                        ].map(
                          (heading) => (
                            <Th
                              key={
                                heading
                              }
                            >
                              {heading}
                            </Th>
                          ),
                        )}
                      </tr>
                    </TableHead>

                    <tbody>
                      {events.map(
                        (event) => (
                          <tr
                            key={
                              event.id
                            }
                            className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"
                          >
                            <Td className="whitespace-nowrap text-xs">
                              {formatDate(
                                event.createdAt,
                                true,
                              )}
                            </Td>

                            <Td>
                              <Badge
                                tone={statusTone(
                                  event.severity,
                                )}
                              >
                                {
                                  event.severity
                                }
                              </Badge>
                            </Td>

                            <Td>
                              <span className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-[11px] text-slate-600">
                                {
                                  event.source
                                }
                              </span>
                            </Td>

                            <Td>
                              <p className="max-w-[620px] truncate font-medium text-slate-700">
                                {
                                  event.message
                                }
                              </p>
                            </Td>

                            <Td>
                              <span className="font-mono text-[10px] text-slate-400">
                                {
                                  event.requestId ||
                                  "—"
                                }
                              </span>
                            </Td>
                          </tr>
                        ),
                      )}

                      {!events.length && (
                        <tr>
                          <td colSpan={5}>
                            <EmptyState
                              title="No system events"
                              description="Operational events will appear here as activity occurs."
                            />
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </TableShell>
                {eventCursor && (
                  <div className="border-t border-slate-100 p-4 text-center">
                    <Button variant="secondary" disabled={loadingMore} onClick={() => void loadMorePage("/api/control/events?limit=50", eventCursor, events, setEvents, setEventCursor)}>
                      {loadingMore ? "Loading…" : "Load more events"}
                    </Button>
                  </div>
                )}
              </Panel>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

function HealthItem({
  label,
  value,
  detail,
  warning = false,
}: {
  label: string;
  value: number;
  detail: string;
  warning?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-slate-500">
          {label}
        </span>

        <span
          className={
            warning && value > 0
              ? "h-2 w-2 rounded-full bg-amber-400"
              : "h-2 w-2 rounded-full bg-emerald-400"
          }
        />
      </div>

      <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
        {value}
      </p>

      <p className="mt-0.5 text-[11px] text-slate-400">
        {detail}
      </p>
    </div>
  );
}