"use client";

import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/utils/cn";
import { APP_CONFIG, UPDATER_CONFIG } from "@/shared/constants/config";
import { MEDIA_PROVIDER_KINDS } from "@/shared/constants/providers";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";
import { translate } from "@/i18n/runtime";
import Button from "./Button";
import { ConfirmModal } from "./Modal";

const VISIBLE_MEDIA_KINDS = ["embedding", "image", "video", "tts", "stt"];
const COMBINED_WEB_ITEM = { id: "web", label: "Web Fetch & Search", icon: "travel_explore", href: "/dashboard/media-providers/web" };

// Tactical Command Divisions:
const commandItems = [
  { href: "/dashboard/endpoint", label: "Endpoint & Key", icon: "radar", callsign: "C2-KEY" },
  { href: "/dashboard/providers", label: "Providers", icon: "dns", callsign: "NODES" },
  { href: "/dashboard/combos", label: "Combos", icon: "alt_route", callsign: "ROUTING" },
  { href: "/dashboard/cli-tools", label: "CLI Tools", icon: "terminal", callsign: "TAC-CLI" },
];

const intelItems = [
  { href: "/dashboard/usage", label: "Usage", icon: "monitoring", callsign: "METRICS" },
  { href: "/dashboard/rtk-analytics", label: "RTK Analytics", icon: "query_stats", callsign: "ANALYTICS" },
  { href: "/dashboard/quota", label: "Quota Tracker", icon: "data_usage", callsign: "QUOTAS" },
  { href: "/dashboard/token-saver", label: "Token Saver", icon: "compress", callsign: "OPTIMIZER" },
  { href: "/dashboard/console-log", label: "Console Log", icon: "receipt_long", callsign: "TTY-LOG" },
];

const infraItems = [
  { href: "/dashboard/proxy-pools", label: "Proxy Pools", icon: "lan", callsign: "POOLS" },
];

function NavItemLink({ item, active, onClose }) {
  return (
    <Link
      href={item.href}
      onClick={onClose}
      className={cn(
        "flex items-center justify-between px-3 py-1.5 rounded-md transition-all group border text-[13px]",
        active
          ? "bg-primary/15 text-primary border-primary/30 shadow-[0_0_12px_rgba(34,197,94,0.14)] font-medium"
          : "text-text-muted hover:text-text-main hover:bg-surface-2/70 border-transparent hover:border-border/50"
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span
          className={cn(
            "material-symbols-outlined text-[18px] transition-colors shrink-0",
            active ? "text-primary" : "text-text-muted group-hover:text-primary"
          )}
        >
          {item.icon}
        </span>
        <span className="tracking-tight truncate">{translate(item.label)}</span>
      </div>
      {item.callsign && (
        <span
          className={cn(
            "font-mono text-[9px] px-1.5 py-0.2 rounded uppercase tracking-wider transition-colors shrink-0",
            active
              ? "bg-primary/20 text-primary border border-primary/40 font-semibold"
              : "text-text-muted/40 group-hover:text-text-muted group-hover:bg-surface-3/50"
          )}
        >
          {item.callsign}
        </span>
      )}
    </Link>
  );
}

NavItemLink.propTypes = {
  item: PropTypes.shape({
    href: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    icon: PropTypes.string.isRequired,
    callsign: PropTypes.string,
  }).isRequired,
  active: PropTypes.bool.isRequired,
  onClose: PropTypes.func,
};

function TacticalSectionHeader({ title, code }) {
  return (
    <div className="pt-3.5 pb-1 px-3 flex items-center justify-between text-[10px] font-mono tracking-wider uppercase text-emerald-500/70 select-none">
      <span className="flex items-center gap-1.5 font-semibold">
        <span className="w-1.5 h-1.5 rounded-sm bg-emerald-500/80" />
        {title}
      </span>
      {code && <span className="text-[9px] text-text-muted/40 font-normal">{code}</span>}
    </div>
  );
}

TacticalSectionHeader.propTypes = {
  title: PropTypes.string.isRequired,
  code: PropTypes.string,
};

export default function Sidebar({ onClose }) {
  const pathname = usePathname();
  const [mediaOpen, setMediaOpen] = useState(false);
  const [isDisconnected, setIsDisconnected] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [shutdownCountdown, setShutdownCountdown] = useState(0);
  const [enableTranslator, setEnableTranslator] = useState(false);
  const { copied, copy } = useCopyToClipboard(2000);

  const INSTALL_CMD = UPDATER_CONFIG.installCmdLatest;

  useEffect(() => {
    fetch("/api/settings")
      .then(res => res.json())
      .then(data => { if (data.enableTranslator) setEnableTranslator(true); })
      .catch(() => {});
  }, []);

  // Lazy check for new npm version on mount
  useEffect(() => {
    fetch("/api/version")
      .then(res => res.json())
      .then(data => { if (data.hasUpdate) setUpdateInfo(data); })
      .catch(() => {});
  }, []);

  const isActive = (href) => {
    if (href === "/dashboard/endpoint") {
      return pathname === "/dashboard" || pathname.startsWith("/dashboard/endpoint");
    }
    return pathname.startsWith(href);
  };

  // Open manual update panel
  const handleUpdate = () => {
    setShowUpdateModal(false);
    setIsUpdating(true);
  };

  // Triggered by Copy button inside ManualUpdatePanel
  const handleCopyAndShutdown = async () => {
    try { await navigator.clipboard.writeText(INSTALL_CMD); } catch { /* clipboard blocked */ }
    copy(INSTALL_CMD);
    let remaining = UPDATER_CONFIG.shutdownCountdownSec;
    setShutdownCountdown(remaining);
    const timer = setInterval(() => {
      remaining -= 1;
      setShutdownCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
        fetch("/api/version/shutdown", { method: "POST" }).catch(() => {});
        setIsDisconnected(true);
      }
    }, 1000);
  };

  const handleCancelUpdate = () => {
    setIsUpdating(false);
    setShutdownCountdown(0);
  };

  return (
    <>
      <aside className="flex w-72 flex-col border-r border-border-subtle bg-sidebar/95 backdrop-blur-xl transition-colors duration-300 min-h-full">
        {/* Tactical HUD Header */}
        <div className="px-4 pt-3.5 pb-2.5 border-b border-border-subtle/80 bg-surface/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-mono text-[10px] font-semibold tracking-wider text-emerald-400 uppercase">
              DEFCON 1 // SYS ONLINE
            </span>
          </div>
          <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-surface-2 border border-border text-text-muted">
            :20128
          </span>
        </div>

        {/* Logo & Callsign */}
        <div className="px-4 py-3 flex flex-col gap-2 border-b border-border-subtle/60">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="relative p-1 rounded-md border border-primary/40 bg-surface shadow-[var(--shadow-warm)]">
              <img
                src="/hiperrouter-mark.svg"
                alt="HiperRouter"
                className="size-8 rounded-[4px]"
              />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-bold tracking-tight text-text-main group-hover:text-primary transition-colors">
                  {APP_CONFIG.name}
                </h1>
                <span className="font-mono text-[9px] px-1 rounded bg-primary/15 text-primary border border-primary/30 font-semibold">
                  C2
                </span>
              </div>
              <span className="font-mono text-[10px] text-emerald-400/70">
                TAC-ROUTER // v{APP_CONFIG.version}
              </span>
            </div>
          </Link>

          {updateInfo && (
            <div className="flex flex-col gap-1.5 rounded p-1.5 bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-[11px] font-mono font-semibold text-emerald-400">
                ↑ UPDATE AVAILABLE: v{updateInfo.latestVersion}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowUpdateModal(true)}
                  className="px-2 py-1 rounded bg-primary hover:bg-brand-600 text-black text-[11px] font-bold transition-colors cursor-pointer"
                >
                  Update
                </button>
                <button
                  onClick={() => copy(INSTALL_CMD)}
                  title="Copy install command"
                  className="flex-1 text-left hover:opacity-80 transition-opacity cursor-pointer min-w-0"
                >
                  <code className="block text-[10px] text-emerald-400/80 font-mono truncate">
                    {copied ? "✓ copied!" : INSTALL_CMD}
                  </code>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tactical Operations Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto custom-scrollbar">
          {/* DIVISION 01: CENTRAL DE COMANDO */}
          <TacticalSectionHeader title="01 // Comando" code="C2-ROUTING" />
          <div className="space-y-0.5">
            {commandItems.map((item) => (
              <NavItemLink
                key={item.href}
                item={item}
                active={isActive(item.href)}
                onClose={onClose}
              />
            ))}
          </div>

          {/* DIVISION 02: TELEMETRIA & INTEL */}
          <TacticalSectionHeader title="02 // Telemetria" code="OPS-INTEL" />
          <div className="space-y-0.5">
            {intelItems.map((item) => (
              <NavItemLink
                key={item.href}
                item={item}
                active={isActive(item.href)}
                onClose={onClose}
              />
            ))}
          </div>

          {/* DIVISION 03: INFRAESTRUTURA & MULTIMÍDIA */}
          <TacticalSectionHeader title="03 // Infra & Sistema" code="SYS-MODS" />
          <div className="space-y-0.5">
            {/* Media Providers accordion */}
            <button
              onClick={() => setMediaOpen((v) => !v)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-1.5 rounded-md transition-all group border text-[13px]",
                pathname.startsWith("/dashboard/media-providers")
                  ? "bg-primary/15 text-primary border-primary/30 shadow-[0_0_12px_rgba(34,197,94,0.14)] font-medium"
                  : "text-text-muted hover:text-text-main hover:bg-surface-2/70 border-transparent hover:border-border/50"
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="material-symbols-outlined text-[18px] shrink-0">perm_media</span>
                <span className="tracking-tight truncate">{translate("Media Providers")}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="font-mono text-[9px] px-1.5 py-0.2 rounded uppercase text-text-muted/50 group-hover:text-text-muted">
                  MEDIA
                </span>
                <span
                  className="material-symbols-outlined text-[14px] transition-transform"
                  style={{ transform: mediaOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                >
                  expand_more
                </span>
              </div>
            </button>

            {mediaOpen && (
              <div className="pl-3 ml-2 border-l border-border-subtle/80 space-y-0.5 my-1">
                {MEDIA_PROVIDER_KINDS.filter((k) => VISIBLE_MEDIA_KINDS.includes(k.id)).map((kind) => {
                  const subActive = pathname.startsWith(`/dashboard/media-providers/${kind.id}`);
                  return (
                    <Link
                      key={kind.id}
                      href={`/dashboard/media-providers/${kind.id}`}
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1 rounded text-xs transition-all group",
                        subActive
                          ? "bg-primary/15 text-primary font-medium"
                          : "text-text-muted hover:bg-surface-2 hover:text-text-main"
                      )}
                    >
                      <span className="material-symbols-outlined text-[15px] shrink-0">{kind.icon}</span>
                      <span className="truncate">{kind.label}</span>
                    </Link>
                  );
                })}
                <Link
                  key={COMBINED_WEB_ITEM.id}
                  href={COMBINED_WEB_ITEM.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1 rounded text-xs transition-all group",
                    pathname.startsWith(COMBINED_WEB_ITEM.href)
                      ? "bg-primary/15 text-primary font-medium"
                      : "text-text-muted hover:bg-surface-2 hover:text-text-main"
                  )}
                >
                  <span className="material-symbols-outlined text-[15px] shrink-0">{COMBINED_WEB_ITEM.icon}</span>
                  <span className="truncate">{COMBINED_WEB_ITEM.label}</span>
                </Link>
              </div>
            )}

            {infraItems.map((item) => (
              <NavItemLink
                key={item.href}
                item={item}
                active={isActive(item.href)}
                onClose={onClose}
              />
            ))}

            {/* Debug translator */}
            {enableTranslator && (
              <NavItemLink
                item={{ href: "/dashboard/translator", label: "Translator", icon: "translate", callsign: "TRANSLATE" }}
                active={isActive("/dashboard/translator")}
                onClose={onClose}
              />
            )}

            {/* Settings */}
            <NavItemLink
              item={{ href: "/dashboard/profile", label: "Settings", icon: "tune", callsign: "CONFIG" }}
              active={isActive("/dashboard/profile")}
              onClose={onClose}
            />
          </div>
        </nav>

        {/* Tactical Telemetry Footer */}
        <div className="p-3 mx-3 mb-3 rounded-lg border border-border-subtle/80 bg-surface/60 flex items-center justify-between text-[11px] font-mono shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(34,197,94,0.8)]" />
            <span className="text-[10px] text-emerald-400 font-semibold tracking-wider">TOC ACTIVE</span>
          </div>
          <span className="text-[9px] text-text-subtle tracking-wider uppercase">
            AES-GCM // LOCAL
          </span>
        </div>
      </aside>

      {/* Update Confirmation Modal */}
      <ConfirmModal
        isOpen={showUpdateModal}
        onClose={() => setShowUpdateModal(false)}
        onConfirm={handleUpdate}
        title="Update HiperRouter"
        message={`Show install command for v${updateInfo?.latestVersion || ""}? You can copy it and shutdown to install manually.`}
        confirmText="Show Command"
        cancelText="Cancel"
        variant="primary"
      />

      {/* Disconnected / Updating Overlay */}
      {(isDisconnected || isUpdating) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
          {isUpdating ? (
            <ManualUpdatePanel
              latestVersion={updateInfo?.latestVersion}
              installCmd={INSTALL_CMD}
              copied={copied}
              onCopyAndShutdown={handleCopyAndShutdown}
              onCancel={handleCancelUpdate}
              countdown={shutdownCountdown}
              isDisconnected={isDisconnected}
            />
          ) : (
            <div className="text-center p-8">
              <div className="flex items-center justify-center size-16 rounded-full bg-red-500/20 text-red-500 mx-auto mb-4">
                <span className="material-symbols-outlined text-[32px]">power_off</span>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Server Disconnected</h2>
              <p className="text-text-muted mb-6">The proxy server has been stopped.</p>
              <Button variant="secondary" onClick={() => globalThis.location.reload()}>
                Reload Page
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

Sidebar.propTypes = {
  onClose: PropTypes.func,
};

function ManualUpdatePanel({ latestVersion, installCmd, copied, onCopyAndShutdown, onCancel, countdown, isDisconnected }) {
  const isCountingDown = countdown > 0;
  return (
    <div className="w-full max-w-lg rounded-xl bg-neutral-900/95 border border-white/10 p-6 text-white">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center justify-center size-11 rounded-full bg-amber-500/20 text-amber-400">
          <span className="material-symbols-outlined text-[24px]">content_copy</span>
        </div>
        <div>
          <h2 className="text-lg font-semibold">Update HiperRouter{latestVersion ? ` to v${latestVersion}` : ""}</h2>
          <p className="text-xs text-white/60">
            {isDisconnected
              ? "Server stopped. Paste the command into a terminal to install."
              : isCountingDown
                ? `Command copied. Server will stop in ${countdown}s...`
                : "Click the button below to copy the install command and shutdown."}
          </p>
        </div>
      </div>

      <p className="text-sm text-white/80 mb-2">Install command:</p>
      <div className="w-full px-3 py-2 rounded bg-white/5 mb-4">
        <code className="text-xs font-mono text-amber-400 break-all">{installCmd}</code>
      </div>

      <ol className="text-xs text-white/70 space-y-1 list-decimal list-inside mb-4">
        <li>Click <strong>Copy & Shutdown</strong> below.</li>
        <li>Paste the command into your terminal and press Enter.</li>
        <li>Run <code className="px-1 rounded bg-white/10 text-green-400">hiperrouter</code> again after install.</li>
      </ol>

      {isDisconnected ? (
        <Button variant="secondary" fullWidth onClick={() => globalThis.location.reload()}>
          Reload Page
        </Button>
      ) : (
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={isCountingDown}>
            Cancel
          </Button>
          <Button variant="primary" fullWidth onClick={onCopyAndShutdown} disabled={isCountingDown}>
            {copied ? "✓ Copied — shutting down..." : isCountingDown ? `Shutting down in ${countdown}s` : "Copy & Shutdown"}
          </Button>
        </div>
      )}
    </div>
  );
}

ManualUpdatePanel.propTypes = {
  latestVersion: PropTypes.string,
  installCmd: PropTypes.string.isRequired,
  copied: PropTypes.bool,
  onCopyAndShutdown: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  countdown: PropTypes.number,
  isDisconnected: PropTypes.bool,
};
