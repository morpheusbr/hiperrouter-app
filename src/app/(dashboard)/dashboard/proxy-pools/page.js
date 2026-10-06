"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { Badge, Button, Card, CardSkeleton, Input, Modal, Toggle, ConfirmModal } from "@/shared/components";
import { useNotificationStore } from "@/store/notificationStore";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";

function getStatusVariant(status) {
  if (status === "active") return "success";
  if (status === "error") return "error";
  return "default";
}

function getProxyProtocol(url, type) {
  if (type === "vercel") return "Vercel";
  if (type === "cloudflare") return "Cloudflare";
  if (type === "deno") return "Deno";
  if (!url) return "HTTP";
  try {
    const parsed = new URL(url);
    const proto = parsed.protocol.replace(":", "").toUpperCase();
    return proto || "HTTP";
  } catch {
    if (url.startsWith("socks5://") || url.startsWith("socks5h://")) return "SOCKS5";
    if (url.startsWith("https://")) return "HTTPS";
    return "HTTP";
  }
}

function formatDateTime(value) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never";
  return date.toLocaleString();
}

function normalizeFormData(data = {}) {
  return {
    name: data.name || "",
    proxyUrl: data.proxyUrl || "",
    noProxy: data.noProxy || "",
    isActive: data.isActive !== false,
    strictProxy: data.strictProxy === true,
  };
}

export default function ProxyPoolsPage() {
  const [proxyPools, setProxyPools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showBatchImportModal, setShowBatchImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState("url");
  const [showVercelModal, setShowVercelModal] = useState(false);
  const [showCloudflareModal, setShowCloudflareModal] = useState(false);
  const [showDenoModal, setShowDenoModal] = useState(false);
  const [showRelayMenu, setShowRelayMenu] = useState(false);
  const [editingProxyPool, setEditingProxyPool] = useState(null);
  const [formData, setFormData] = useState(normalizeFormData());
  const [batchImportText, setBatchImportText] = useState("");
  const [vercelForm, setVercelForm] = useState({ vercelToken: "", projectName: "vercel-relay" });
  const [cloudflareForm, setCloudflareForm] = useState({ accountId: "", apiToken: "", projectName: "cloudflare-relay" });
  const [denoForm, setDenoForm] = useState({ denoToken: "", orgDomain: "", projectName: "" });
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [testingId, setTestingId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [healthChecking, setHealthChecking] = useState(false);
  const [healthProgress, setHealthProgress] = useState({ current: 0, total: 0 });
  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirmState, setConfirmState] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("default");
  const relayMenuRef = useRef(null);
  const notify = useNotificationStore();
  const { copied, copy } = useCopyToClipboard();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (relayMenuRef.current && !relayMenuRef.current.contains(e.target)) {
        setShowRelayMenu(false);
      }
    };
    if (showRelayMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showRelayMenu]);

  const fetchProxyPools = useCallback(async () => {
    try {
      const res = await fetch("/api/proxy-pools?includeUsage=true", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) {
        setProxyPools(data.proxyPools || []);
      }
    } catch (error) {
      console.log("Error fetching proxy pools:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProxyPools();
  }, [fetchProxyPools]);

  const resetForm = () => {
    setEditingProxyPool(null);
    setFormData(normalizeFormData());
  };

  const openCreateModal = () => {
    resetForm();
    setShowFormModal(true);
  };

  const openEditModal = (proxyPool) => {
    setEditingProxyPool(proxyPool);
    setFormData(normalizeFormData(proxyPool));
    setShowFormModal(true);
  };

  const closeFormModal = () => {
    setShowFormModal(false);
    resetForm();
  };

  const handleSave = async () => {
    const payload = {
      name: formData.name.trim(),
      proxyUrl: formData.proxyUrl.trim(),
      noProxy: formData.noProxy.trim(),
      isActive: formData.isActive === true,
      strictProxy: formData.strictProxy === true,
    };

    if (!payload.name || !payload.proxyUrl) return;

    setSaving(true);
    try {
      const isEdit = !!editingProxyPool;
      const res = await fetch(isEdit ? `/api/proxy-pools/${editingProxyPool.id}` : "/api/proxy-pools", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await fetchProxyPools();
        closeFormModal();
        notify.success(editingProxyPool ? "Proxy pool updated" : "Proxy pool created");
      } else {
        const data = await res.json();
        notify.error(data.error || "Failed to save proxy pool");
      }
    } catch (error) {
      console.log("Error saving proxy pool:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (proxyPool) => {
    setConfirmState({
      title: "Delete Proxy Pool",
      message: `Delete proxy pool "${proxyPool.name}"?`,
      onConfirm: async () => {
        setConfirmState(null);
        try {
          const res = await fetch(`/api/proxy-pools/${proxyPool.id}`, { method: "DELETE" });
          if (res.ok) {
            setProxyPools((prev) => prev.filter((item) => item.id !== proxyPool.id));
            notify.success("Proxy pool deleted");
            return;
          }

          const data = await res.json();
          if (res.status === 409) {
            notify.warning(`Cannot delete: ${data.boundConnectionCount || 0} connection(s) are still using this pool.`);
          } else {
            notify.error(data.error || "Failed to delete proxy pool");
          }
        } catch (error) {
          console.log("Error deleting proxy pool:", error);
          notify.error("Failed to delete proxy pool");
        }
      }
    });
  };

  const handleTest = async (proxyPoolId) => {
    setTestingId(proxyPoolId);
    try {
      const res = await fetch(`/api/proxy-pools/${proxyPoolId}/test`, { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setProxyPools((prev) =>
          prev.map((p) =>
            p.id === proxyPoolId
              ? { ...p, testStatus: "error", lastTestedAt: new Date().toISOString(), lastError: data.error || "Failed to test proxy" }
              : p
          )
        );
        notify.error(data.error || "Failed to test proxy");
        return;
      }

      setProxyPools((prev) =>
        prev.map((p) =>
          p.id === proxyPoolId
            ? {
                ...p,
                testStatus: data.ok ? "active" : "error",
                lastTestedAt: new Date().toISOString(),
                latencyMs: data.ok ? (data.elapsedMs || null) : null,
                lastError: data.ok ? null : (data.error || "Proxy test failed"),
              }
            : p
        )
      );
      await fetchProxyPools();
      notify.success(data.ok ? `Proxy test passed (${data.elapsedMs || 0}ms)` : "Proxy test failed");
    } catch (error) {
      console.log("Error testing proxy pool:", error);
      notify.error("Failed to test proxy");
    } finally {
      setTestingId(null);
    }
  };

  const handleToggleActive = async (pool) => {
    const next = !pool.isActive;
    setProxyPools((prev) => prev.map((p) => p.id === pool.id ? { ...p, isActive: next } : p));
    try {
      const res = await fetch(`/api/proxy-pools/${pool.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: next }),
      });
      if (!res.ok) {
        setProxyPools((prev) => prev.map((p) => p.id === pool.id ? { ...p, isActive: pool.isActive } : p));
        notify.error("Failed to update active state");
      }
    } catch (error) {
      console.log("Error toggling active:", error);
      setProxyPools((prev) => prev.map((p) => p.id === pool.id ? { ...p, isActive: pool.isActive } : p));
    }
  };

  const stats = useMemo(() => {
    const total = proxyPools.length;
    const active = proxyPools.filter((p) => p.isActive === true).length;
    const errors = proxyPools.filter((p) => p.testStatus === "error" || p.lastError).length;
    const testedWithLatency = proxyPools.filter(
      (p) => typeof p.latencyMs === "number" && p.latencyMs > 0
    );
    const avgLatency =
      testedWithLatency.length > 0
        ? Math.round(
            testedWithLatency.reduce((acc, p) => acc + p.latencyMs, 0) /
              testedWithLatency.length
          )
        : null;
    return { total, active, errors, avgLatency };
  }, [proxyPools]);

  const filteredAndSortedPools = useMemo(() => {
    let list = [...proxyPools];

    if (statusFilter === "active") {
      list = list.filter((p) => p.isActive === true);
    } else if (statusFilter === "inactive") {
      list = list.filter((p) => !p.isActive);
    } else if (statusFilter === "error") {
      list = list.filter((p) => p.testStatus === "error" || p.lastError);
    } else if (statusFilter === "relay") {
      list = list.filter((p) => p.type === "vercel" || p.type === "cloudflare" || p.type === "deno");
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.proxyUrl && p.proxyUrl.toLowerCase().includes(q)) ||
          (p.noProxy && p.noProxy.toLowerCase().includes(q)) ||
          (p.type && p.type.toLowerCase().includes(q))
      );
    }

    if (sortBy === "latency-asc") {
      list.sort((a, b) => {
        const latA = typeof a.latencyMs === "number" ? a.latencyMs : 999999;
        const latB = typeof b.latencyMs === "number" ? b.latencyMs : 999999;
        return latA - latB;
      });
    } else if (sortBy === "latency-desc") {
      list.sort((a, b) => {
        const latA = typeof a.latencyMs === "number" ? a.latencyMs : -1;
        const latB = typeof b.latencyMs === "number" ? b.latencyMs : -1;
        return latB - latA;
      });
    } else if (sortBy === "name-asc") {
      list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    } else if (sortBy === "bound-desc") {
      list.sort((a, b) => (b.boundConnectionCount || 0) - (a.boundConnectionCount || 0));
    }

    return list;
  }, [proxyPools, statusFilter, searchQuery, sortBy]);

  const exportTargetPools = useMemo(() => {
    if (selectedIds.length > 0) {
      return proxyPools.filter((p) => selectedIds.includes(p.id));
    }
    return filteredAndSortedPools;
  }, [selectedIds, proxyPools, filteredAndSortedPools]);

  const exportText = useMemo(() => {
    return exportTargetPools
      .map((p) => {
        if (exportFormat === "credentials") {
          try {
            const u = new URL(p.proxyUrl);
            if (u.username && u.password) {
              return `${u.hostname}:${u.port}:${decodeURIComponent(u.username)}:${decodeURIComponent(u.password)}`;
            }
            return `${u.hostname}:${u.port}`;
          } catch {
            return p.proxyUrl;
          }
        }
        return p.proxyUrl;
      })
      .filter(Boolean)
      .join("\n");
  }, [exportTargetPools, exportFormat]);

  const handleDownloadExport = () => {
    const blob = new Blob([exportText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hiperrouter-proxies-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    notify.success("Export file downloaded");
  };

  const allSelected =
    filteredAndSortedPools.length > 0 &&
    filteredAndSortedPools.every((p) => selectedIds.includes(p.id));

  const toggleSelect = (id) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const toggleSelectAll = () =>
    setSelectedIds((prev) => {
      if (allSelected) {
        const currentFilteredIds = new Set(filteredAndSortedPools.map((p) => p.id));
        return prev.filter((id) => !currentFilteredIds.has(id));
      }
      const combined = new Set([...prev, ...filteredAndSortedPools.map((p) => p.id)]);
      return Array.from(combined);
    });

  const clearSelection = () => setSelectedIds([]);

  const bulkSetActive = async (isActive) => {
    const targets = selectedIds.length > 0 ? selectedIds : proxyPools.map((p) => p.id);
    if (targets.length === 0) return;
    setBulkBusy(true);
    try {
      let ok = 0; let failed = 0;
      for (const id of targets) {
        try {
          const res = await fetch(`/api/proxy-pools/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isActive }),
          });
          if (res.ok) ok += 1; else failed += 1;
        } catch { failed += 1; }
      }
      await fetchProxyPools();
      notify.success(`${isActive ? "Activated" : "Deactivated"} ${ok}${failed ? `, failed ${failed}` : ""}`);
    } finally {
      setBulkBusy(false);
    }
  };

  const bulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setConfirmState({
      title: "Delete Proxy Pools",
      message: `Delete ${selectedIds.length} proxy pool(s)?`,
      onConfirm: async () => {
        setConfirmState(null);
        setBulkBusy(true);
        try {
          let ok = 0; let blocked = 0; let failed = 0;
          for (const id of selectedIds) {
            try {
              const res = await fetch(`/api/proxy-pools/${id}`, { method: "DELETE" });
              if (res.ok) ok += 1;
              else if (res.status === 409) blocked += 1;
              else failed += 1;
            } catch { failed += 1; }
          }
          await fetchProxyPools();
          clearSelection();
          notify.success(`Deleted ${ok}${blocked ? `, ${blocked} bound` : ""}${failed ? `, ${failed} failed` : ""}`);
        } finally {
          setBulkBusy(false);
        }
      }
    });
  };

  const handleHealthCheck = async () => {
    const targets = selectedIds.length > 0
      ? proxyPools.filter((p) => selectedIds.includes(p.id))
      : filteredAndSortedPools;
    if (targets.length === 0) return;
    setHealthChecking(true);
    setHealthProgress({ current: 0, total: targets.length });
    let alive = 0; const deadIds = [];
    let done = 0;
    const CONCURRENCY = 10;
    const queue = [...targets];

    const worker = async () => {
      while (queue.length > 0) {
        const pool = queue.shift();
        if (!pool) break;
        try {
          const res = await fetch(`/api/proxy-pools/${pool.id}/test`, { method: "POST" });
          const data = await res.json();
          if (res.ok && data.ok) {
            alive += 1;
            setProxyPools((prev) =>
              prev.map((p) =>
                p.id === pool.id
                  ? {
                      ...p,
                      testStatus: "active",
                      lastTestedAt: new Date().toISOString(),
                      latencyMs: data.elapsedMs || null,
                      lastError: null,
                    }
                  : p
              )
            );
          } else {
            deadIds.push(pool.id);
            setProxyPools((prev) =>
              prev.map((p) =>
                p.id === pool.id
                  ? {
                      ...p,
                      testStatus: "error",
                      lastTestedAt: new Date().toISOString(),
                      latencyMs: null,
                      lastError: data?.error || "Test failed",
                    }
                  : p
              )
            );
          }
        } catch {
          deadIds.push(pool.id);
        } finally {
          done += 1;
          setHealthProgress({ current: done, total: targets.length });
        }
      }
    };

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, targets.length) }, worker));
    await fetchProxyPools();
    setHealthChecking(false);
    setHealthProgress({ current: 0, total: 0 });

    if (deadIds.length > 0) {
      setConfirmState({
        title: "Disable Dead Proxies",
        message: `Alive: ${alive}, Dead: ${deadIds.length}.\n\nDisable ${deadIds.length} dead proxies?`,
        onConfirm: async () => {
          setConfirmState(null);
          setBulkBusy(true);
          try {
            for (const id of deadIds) {
              try {
                await fetch(`/api/proxy-pools/${id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ isActive: false }),
                });
              } catch {}
            }
            await fetchProxyPools();
            notify.success(`Disabled ${deadIds.length} dead proxies`);
          } finally {
            setBulkBusy(false);
          }
        }
      });
    } else {
      notify.success(`Health check done. Alive: ${alive}, Dead: ${deadIds.length}`);
    }
  };

  // Cleanup selectedIds when pools change
  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => proxyPools.some((p) => p.id === id)));
  }, [proxyPools]);

  const openBatchImportModal = () => {
    setBatchImportText("");
    setShowBatchImportModal(true);
  };

  const closeBatchImportModal = () => {
    if (importing) return;
    setShowBatchImportModal(false);
  };

  const openVercelModal = () => {
    setVercelForm({ vercelToken: "", projectName: "vercel-relay" });
    setShowVercelModal(true);
  };

  const closeVercelModal = () => {
    if (deploying) return;
    setShowVercelModal(false);
  };

  const openCloudflareModal = () => {
    setCloudflareForm({ accountId: "", apiToken: "", projectName: "cloudflare-relay" });
    setShowCloudflareModal(true);
  };

  const closeCloudflareModal = () => {
    if (deploying) return;
    setShowCloudflareModal(false);
  };

  const openDenoModal = () => {
    setDenoForm({ denoToken: "", orgDomain: "", projectName: "" });
    setShowDenoModal(true);
  };

  const closeDenoModal = () => {
    if (deploying) return;
    setShowDenoModal(false);
  };

  const handleVercelDeploy = async () => {
    if (!vercelForm.vercelToken.trim()) return;
    setDeploying(true);
    try {
      const res = await fetch("/api/proxy-pools/vercel-deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vercelForm),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchProxyPools();
        closeVercelModal();
        notify.success(`Deployed: ${data.deployUrl}`);
      } else {
        notify.error(data.error || "Deploy failed");
      }
    } catch (error) {
      console.log("Error deploying Vercel relay:", error);
      notify.error("Deploy failed");
    } finally {
      setDeploying(false);
    }
  };

  const handleCloudflareDeploy = async () => {
    if (!cloudflareForm.accountId.trim() || !cloudflareForm.apiToken.trim()) return;
    setDeploying(true);
    try {
      const res = await fetch("/api/proxy-pools/cloudflare-deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cloudflareForm),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchProxyPools();
        closeCloudflareModal();
        notify.success(`Deployed: ${data.deployUrl}`);
      } else {
        notify.error(data.error || "Deploy failed");
      }
    } catch (error) {
      console.log("Error deploying Cloudflare relay:", error);
      notify.error("Deploy failed");
    } finally {
      setDeploying(false);
    }
  };

  const handleDenoDeploy = async () => {
    if (!denoForm.denoToken.trim()) return;
    setDeploying(true);
    try {
      const res = await fetch("/api/proxy-pools/deno-deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(denoForm),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchProxyPools();
        closeDenoModal();
        notify.success(`Deployed: ${data.deployUrl}`);
      } else {
        notify.error(data.error || "Deploy failed");
      }
    } catch (error) {
      console.log("Error deploying Deno relay:", error);
      notify.error("Deploy failed");
    } finally {
      setDeploying(false);
    }
  };

  const parseProxyLine = (line) => {
    const trimmed = line.trim();
    if (!trimmed) return null;

    if (trimmed.includes("://")) {
      const parsed = new URL(trimmed);
      const hostLabel = parsed.port ? `${parsed.hostname}:${parsed.port}` : parsed.hostname;
      return {
        proxyUrl: parsed.toString(),
        name: `Imported ${hostLabel}`,
      };
    }

    const parts = trimmed.split(":");
    if (parts.length === 4) {
      const [host, port, username, password] = parts;
      if (!host || !port || !username || !password) {
        throw new Error("Invalid host:port:user:pass format");
      }

      const proxyUrl = `http://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}`;
      const parsed = new URL(proxyUrl);
      return {
        proxyUrl: parsed.toString(),
        name: `Imported ${host}:${port}`,
      };
    }

    throw new Error("Unsupported format");
  };

  const handleBatchImport = async () => {
    const lines = batchImportText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      notify.warning("Please paste at least one proxy line.");
      return;
    }

    const parsedEntries = [];
    const invalidLines = [];

    lines.forEach((line, index) => {
      try {
        const parsed = parseProxyLine(line);
        if (parsed) {
          parsedEntries.push({
            ...parsed,
            lineNumber: index + 1,
          });
        }
      } catch (error) {
        invalidLines.push(`Line ${index + 1}: ${error.message}`);
      }
    });

    if (invalidLines.length > 0) {
      notify.error(`Invalid proxy format:\n${invalidLines.join("\n")}`);
      return;
    }

    setImporting(true);
    try {
      const existingKeys = new Set(
        proxyPools.map((pool) => `${(pool.proxyUrl || "").trim()}|||${(pool.noProxy || "").trim()}`)
      );

      let created = 0;
      let skipped = 0;
      let failed = 0;

      for (const entry of parsedEntries) {
        const dedupeKey = `${entry.proxyUrl}|||`;
        if (existingKeys.has(dedupeKey)) {
          skipped += 1;
          continue;
        }

        const res = await fetch("/api/proxy-pools", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: entry.name,
            proxyUrl: entry.proxyUrl,
            noProxy: "",
            isActive: true,
          }),
        });

        if (res.ok) {
          created += 1;
          existingKeys.add(dedupeKey);
        } else {
          failed += 1;
        }
      }

      await fetchProxyPools();
      setShowBatchImportModal(false);
      notify.success(`Batch import completed: Created ${created}, Skipped ${skipped}, Failed ${failed}`);
    } catch (error) {
      console.log("Error batch importing proxies:", error);
      notify.error("Batch import failed");
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-1 sm:gap-6 sm:px-0">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-1 sm:gap-6 sm:px-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold sm:text-2xl">Proxy Pools</h1>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:flex sm:items-center">
          <div className="relative" ref={relayMenuRef}>
            <Button
              size="sm"
              variant="secondary"
              icon="rocket_launch"
              onClick={() => setShowRelayMenu(!showRelayMenu)}
            >
              Deploy Relay
              <span className="material-symbols-outlined ml-1 text-[18px]">
                {showRelayMenu ? "expand_less" : "expand_more"}
              </span>
            </Button>

            {showRelayMenu && (
              <div className="absolute left-0 top-full z-50 mt-1 w-48 rounded-xl border border-black/10 bg-white p-1 shadow-xl dark:border-white/10 dark:bg-zinc-900 sm:left-auto sm:right-0">
                <button
                  onClick={() => {
                    openCloudflareModal();
                    setShowRelayMenu(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-main transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <span className="material-symbols-outlined text-[20px] text-orange-500">cloud</span>
                  Cloudflare Relay
                </button>
                <button
                  onClick={() => {
                    openVercelModal();
                    setShowRelayMenu(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-main transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <span className="material-symbols-outlined text-[20px] text-blue-500">cloud_upload</span>
                  Vercel Relay
                </button>
                <button
                  onClick={() => {
                    openDenoModal();
                    setShowRelayMenu(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-main transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <span className="material-symbols-outlined text-[20px] text-green-500">terminal</span>
                  Deno Relay
                </button>
              </div>
            )}
          </div>

          <Button size="sm" variant="secondary" icon="upload" onClick={openBatchImportModal}>
            Batch Import
          </Button>
          <Button size="sm" variant="secondary" icon="download" onClick={() => setShowExportModal(true)}>
            Export
          </Button>
          <Button size="sm" icon="add" onClick={openCreateModal}>Add Proxy Pool</Button>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Card className="flex min-w-0 flex-col gap-1 p-4">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-xs uppercase font-semibold">Total Proxies</span>
            <span className="material-symbols-outlined text-[18px]">dns</span>
          </div>
          <span className="truncate text-2xl font-bold">{stats.total}</span>
        </Card>
        <Card className="flex min-w-0 flex-col gap-1 p-4">
          <div className="flex items-center justify-between text-green-500">
            <span className="text-xs uppercase font-semibold text-text-muted">Active</span>
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
          </div>
          <span className="truncate text-2xl font-bold text-green-500">{stats.active}</span>
        </Card>
        <Card className="flex min-w-0 flex-col gap-1 p-4">
          <div className="flex items-center justify-between text-red-500">
            <span className="text-xs uppercase font-semibold text-text-muted">Errors / Dead</span>
            <span className="material-symbols-outlined text-[18px]">error</span>
          </div>
          <span className="truncate text-2xl font-bold text-red-500">{stats.errors}</span>
        </Card>
        <Card className="flex min-w-0 flex-col gap-1 p-4">
          <div className="flex items-center justify-between text-brand-400">
            <span className="text-xs uppercase font-semibold text-text-muted">Avg Latency</span>
            <span className="material-symbols-outlined text-[18px]">bolt</span>
          </div>
          <span className="truncate text-2xl font-bold text-brand-400">
            {stats.avgLatency !== null ? `${stats.avgLatency}ms` : "—"}
          </span>
        </Card>
      </div>

      <Card>
        {/* Search, Filter Pills & Sort Bar */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-text-muted pointer-events-none">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, URL, or no-proxy..."
              className="w-full rounded-lg border border-border/80 bg-surface-2 py-2 pl-9 pr-8 text-xs text-text-main placeholder:text-text-muted focus:border-brand-500/70 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Pills */}
            <div className="flex items-center rounded-lg border border-border/80 bg-surface-2 p-0.5 text-xs">
              {[
                { id: "all", label: "All" },
                { id: "active", label: "Active" },
                { id: "inactive", label: "Inactive" },
                { id: "error", label: "Error" },
                { id: "relay", label: "Relays" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                    statusFilter === tab.id
                      ? "bg-bg text-primary shadow-sm"
                      : "text-text-muted hover:text-text-main"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Sort Select */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none rounded-lg border border-border/80 bg-surface-2 py-1.5 pl-3 pr-8 text-xs text-text-main focus:border-brand-500/70 focus:outline-none focus:ring-1 focus:ring-brand-500/50"
              >
                <option value="default">Sort: Default</option>
                <option value="latency-asc">⚡ Lowest Latency</option>
                <option value="latency-desc">⚡ Highest Latency</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="bound-desc">Most Bound</option>
              </select>
              <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[16px] text-text-muted">
                expand_more
              </span>
            </div>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          {filteredAndSortedPools.length > 0 && (
            <label className="flex items-center gap-1.5 text-xs text-text-muted cursor-pointer">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                className="size-4 rounded border-black/20 dark:border-white/20"
              />
              {allSelected ? "Unselect all" : "Select all"}
            </label>
          )}
          <Badge variant="default">Showing: {filteredAndSortedPools.length}/{proxyPools.length}</Badge>
          <Badge variant="success">Active: {stats.active}</Badge>
          {statusFilter !== "all" && (
            <Badge variant="neutral" size="sm">
              Filter: {statusFilter}
            </Badge>
          )}
        </div>

        {(selectedIds.length > 0 || healthChecking) && (
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
            <span className="material-symbols-outlined text-[18px] text-primary">checklist</span>
            <span className="text-xs font-medium text-primary">
              {selectedIds.length > 0 ? `${selectedIds.length} selected` : "All matching pools"}
            </span>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                icon={healthChecking ? "progress_activity" : "health_and_safety"}
                onClick={handleHealthCheck}
                disabled={healthChecking || bulkBusy || filteredAndSortedPools.length === 0}
              >
                {healthChecking ? `Checking ${healthProgress.current}/${healthProgress.total}` : "Health Check"}
              </Button>
              {selectedIds.length > 0 && (
                <>
                  <Button size="sm" variant="secondary" icon="toggle_on" onClick={() => bulkSetActive(true)} disabled={bulkBusy || healthChecking}>
                    Activate
                  </Button>
                  <Button size="sm" variant="secondary" icon="toggle_off" onClick={() => bulkSetActive(false)} disabled={bulkBusy || healthChecking}>
                    Deactivate
                  </Button>
                  <Button size="sm" variant="secondary" icon="delete" onClick={bulkDelete} disabled={bulkBusy || healthChecking}>
                    Delete
                  </Button>
                  <Button size="sm" variant="ghost" onClick={clearSelection} disabled={bulkBusy || healthChecking}>
                    Clear
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        {proxyPools.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-text-main font-medium mb-1">No proxy pool entries yet</p>
            <p className="text-sm text-text-muted mb-4">
              Create a proxy pool entry, then assign it to connections.
            </p>
            <Button icon="add" onClick={openCreateModal}>Add Proxy Pool</Button>
          </div>
        ) : filteredAndSortedPools.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-text-main font-medium mb-1">No matching proxies</p>
            <p className="text-sm text-text-muted mb-4">
              No proxies match your search &ldquo;{searchQuery}&rdquo; and filter criteria.
            </p>
            <Button
              variant="secondary"
              icon="filter_alt_off"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
              }}
            >
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-black/[0.04] dark:divide-white/[0.05]">
            {filteredAndSortedPools.map((pool) => (
              <div key={pool.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(pool.id)}
                    onChange={() => toggleSelect(pool.id)}
                    className="mt-1 size-4 shrink-0 rounded border-black/20 dark:border-white/20"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="min-w-0 max-w-full truncate text-sm font-medium sm:max-w-[18rem]">{pool.name}</p>
                      <Badge variant={getStatusVariant(pool.testStatus)} size="sm" dot>
                        {pool.testStatus || "unknown"}
                      </Badge>
                      <Badge variant={pool.isActive ? "success" : "default"} size="sm">
                        {pool.isActive ? "active" : "inactive"}
                      </Badge>
                      <Badge variant="default" size="sm">
                        {getProxyProtocol(pool.proxyUrl, pool.type)}
                      </Badge>
                      {pool.latencyMs ? (
                        <Badge
                          variant={pool.latencyMs < 350 ? "success" : pool.latencyMs < 900 ? "warning" : "error"}
                          size="sm"
                          title={`Latency: ${pool.latencyMs}ms`}
                        >
                          ⚡ {pool.latencyMs}ms
                        </Badge>
                      ) : null}
                      <Badge variant="default" size="sm">
                        {pool.boundConnectionCount || 0} bound
                      </Badge>
                    </div>
                    <p className="text-xs text-text-muted truncate mt-1">{pool.proxyUrl}</p>
                    {pool.noProxy ? (
                      <p className="text-xs text-text-muted truncate">No proxy: {pool.noProxy}</p>
                    ) : null}
                    <p className="text-[11px] text-text-muted mt-1">
                      Last tested: {formatDateTime(pool.lastTestedAt)}
                      {pool.lastError ? ` · ${pool.lastError}` : ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-1">
                  <Toggle
                    size="sm"
                    checked={pool.isActive === true}
                    onChange={() => handleToggleActive(pool)}
                    title={pool.isActive ? "Disable" : "Enable"}
                  />
                  <button
                    onClick={() => handleTest(pool.id)}
                    className="p-2 rounded hover:bg-black/5 dark:hover:bg-white/5 text-text-muted hover:text-primary transition-colors"
                    title="Test proxy"
                    disabled={testingId === pool.id}
                  >
                    <span
                      className="material-symbols-outlined text-[18px]"
                      style={testingId === pool.id ? { animation: "spin 1s linear infinite" } : undefined}
                    >
                      {testingId === pool.id ? "progress_activity" : "science"}
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      copy(pool.proxyUrl, pool.id);
                      notify.success("Proxy URL copied");
                    }}
                    className="p-2 rounded hover:bg-black/5 dark:hover:bg-white/5 text-text-muted hover:text-primary transition-colors"
                    title={copied === pool.id ? "Copied!" : "Copy Proxy URL"}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {copied === pool.id ? "check" : "content_copy"}
                    </span>
                  </button>
                  <button
                    onClick={() => openEditModal(pool)}
                    className="p-2 rounded hover:bg-black/5 dark:hover:bg-white/5 text-text-muted hover:text-primary transition-colors"
                    title="Edit"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(pool)}
                    className="p-2 rounded hover:bg-red-500/10 text-red-500 transition-colors"
                    title="Delete"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        isOpen={showBatchImportModal}
        title="Batch Import Proxies"
        onClose={closeBatchImportModal}
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-text-main mb-1 block">Paste Proxy List (One per line)</label>
            <textarea
              value={batchImportText}
              onChange={(e) => setBatchImportText(e.target.value)}
              placeholder={"http://user:pass@127.0.0.1:7897\n127.0.0.1:7897:user:pass"}
              className="w-full min-h-[180px] py-2 px-3 text-sm text-text-main bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-md focus:ring-1 focus:ring-primary/30 focus:border-primary/50 focus:outline-none transition-all"
            />
            <p className="text-xs text-text-muted mt-1">
              Supported formats: protocol://user:pass@host:port, host:port:user:pass
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button fullWidth onClick={handleBatchImport} disabled={!batchImportText.trim() || importing}>
              {importing ? "Importing..." : "Import"}
            </Button>
            <Button fullWidth variant="ghost" onClick={closeBatchImportModal} disabled={importing}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showVercelModal}
        title="Deploy Vercel Relay"
        onClose={closeVercelModal}
      >
        <div className="flex flex-col gap-4">
          <div className="rounded-lg bg-blue-500/5 border border-blue-500/10 p-3 flex flex-col gap-1.5">
            <p className="text-sm text-text-main font-medium">What is Vercel Relay?</p>
            <p className="text-xs text-text-muted">
              Deploys an edge relay function to Vercel. All AI provider requests will be forwarded through Vercel&apos;s edge network, masking your real IP from providers.
            </p>
            <ul className="text-xs text-text-muted list-disc pl-4 space-y-0.5">
              <li>Your IP is replaced by Vercel&apos;s dynamic edge IPs (hundreds of IPs across 20+ global regions)</li>
              <li>Vercel serves millions of apps — providers can&apos;t block Vercel IPs without affecting legitimate traffic</li>
              <li>Free tier: 100GB bandwidth/month, 500K edge invocations</li>
              <li>Deploy multiple relays on different accounts for more IP diversity</li>
            </ul>
          </div>
          <Input
            label="Vercel API Token"
            value={vercelForm.vercelToken}
            onChange={(e) => setVercelForm((prev) => ({ ...prev, vercelToken: e.target.value }))}
            placeholder="your-vercel-api-token"
            hint={<>Token is used once for deployment and not stored. <a href="https://vercel.com/account/tokens" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Get token →</a></>}
            type="password"
          />
          <Input
            label="Project Name"
            value={vercelForm.projectName}
            onChange={(e) => setVercelForm((prev) => ({ ...prev, projectName: e.target.value }))}
            placeholder="my-relay"
            hint="Unique name for your Vercel project. Leave empty for auto-generated name."
          />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              fullWidth
              onClick={handleVercelDeploy}
              disabled={!vercelForm.vercelToken.trim() || deploying}
            >
              {deploying ? "Deploying... (may take ~1 min)" : "Deploy"}
            </Button>
            <Button fullWidth variant="ghost" onClick={closeVercelModal} disabled={deploying}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showCloudflareModal}
        title="Deploy Cloudflare Relay"
        onClose={closeCloudflareModal}
      >
        <div className="flex flex-col gap-4">
          <div className="rounded-lg bg-orange-500/5 border border-orange-500/10 p-3 flex flex-col gap-1.5">
            <p className="text-sm text-text-main font-medium">What is Cloudflare Relay?</p>
            <p className="text-xs text-text-muted">
              Deploys a Cloudflare Worker as a proxy relay. All AI provider requests will be forwarded through Cloudflare&apos;s global edge network.
            </p>
            <ul className="text-xs text-text-muted list-disc pl-4 space-y-0.5">
              <li>High performance global routing and IP masking via Cloudflare Workers</li>
              <li>Free tier: 100,000 requests per day</li>
              <li>Requires Cloudflare Account ID and a Workers API Token (Edit Workers permission)</li>
            </ul>
            <div className="mt-2 pt-2 border-t border-orange-500/10 text-xs text-text-muted">
              <p className="font-medium text-text-main mb-1">How to generate your API Token:</p>
              <ol className="list-decimal pl-4 space-y-0.5">
                <li>Go to <b>My Profile</b> → <b>API Tokens</b> → <b>Create Token</b></li>
                <li>Scroll down to <b>Custom Token</b> and click <b>Get started</b></li>
                <li>Under <b>Permissions</b>: Account | Workers Scripts | Edit</li>
                <li>Under <b>Account Resources</b>: Include | Account | <i>Your Account Name</i></li>
                <li>Click <b>Continue to summary</b> → <b>Create Token</b></li>
              </ol>
            </div>
          </div>
          <Input
            label="Account ID"
            value={cloudflareForm.accountId}
            onChange={(e) => setCloudflareForm((prev) => ({ ...prev, accountId: e.target.value }))}
            placeholder="your-cloudflare-account-id"
            hint={<>Found on the right side of the Cloudflare dashboard overview page.</>}
          />
          <Input
            label="API Token"
            value={cloudflareForm.apiToken}
            onChange={(e) => setCloudflareForm((prev) => ({ ...prev, apiToken: e.target.value }))}
            placeholder="your-cloudflare-api-token"
            hint={<>Requires "Workers Scripts: Edit" permission. <a href="https://dash.cloudflare.com/profile/api-tokens" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Get token →</a></>}
            type="password"
          />
          <Input
            label="Worker Name"
            value={cloudflareForm.projectName}
            onChange={(e) => setCloudflareForm((prev) => ({ ...prev, projectName: e.target.value }))}
            placeholder="my-relay"
            hint="Unique name for your Cloudflare Worker. Leave empty for auto-generated name."
          />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              fullWidth
              onClick={handleCloudflareDeploy}
              disabled={!cloudflareForm.accountId.trim() || !cloudflareForm.apiToken.trim() || deploying}
            >
              {deploying ? "Deploying..." : "Deploy Worker"}
            </Button>
            <Button fullWidth variant="ghost" onClick={closeCloudflareModal} disabled={deploying}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showDenoModal}
        title="Deploy Deno Relay"
        onClose={closeDenoModal}
      >
        <div className="flex flex-col gap-4">
          <div className="rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 p-3 flex flex-col gap-1.5">
            <p className="text-sm text-text-main font-medium">What is Deno Relay?</p>
            <p className="text-xs text-text-muted">
              Deploys a relay worker to Deno Deploy&apos;s global edge network. All AI provider requests are forwarded through Deno&apos;s edge, masking your real IP.
            </p>
            <ul className="text-xs text-text-muted list-disc pl-4 space-y-0.5">
              <li>Deno Deploy v2 runs on a high-performance global edge network</li>
              <li>Free tier: 1M requests & 100GiB outbound traffic per month</li>
              <li>No per-request CPU time limits (unlike Vercel/Cloudflare)</li>
              <li>Support up to 20 active apps & 50 custom domains</li>
              <li>Deploy multiple relays for maximum IP diversity</li>
            </ul>
            <div className="mt-2 pt-2 border-t border-black/10 dark:border-white/10 text-xs text-text-muted">
              <p className="font-medium text-text-main mb-1">How to generate API token:</p>
              <ol className="list-decimal pl-4 space-y-0.5">
                <li>Go to <b>console.deno.com</b></li>
                <li>Select your <b>Organization</b> → <b>Settings</b> → <b>Organization Tokens</b></li>
                <li>Create a <b>Organization Token</b> (prefix <b>ddo_</b>)</li>
              </ol>
            </div>
          </div>
          <Input
            label="Deno Deploy API Token"
            value={denoForm.denoToken}
            onChange={(e) => setDenoForm((prev) => ({ ...prev, denoToken: e.target.value }))}
            placeholder="ddo_xxxxxxxxxxxxxxxx"
            hint={<>Token is used once for deployment, not stored. Found in Organization Settings.</>}
            type="password"
          />
          <Input
            label="Organization Domain"
            value={denoForm.orgDomain}
            onChange={(e) => setDenoForm((prev) => ({ ...prev, orgDomain: e.target.value }))}
            placeholder="your-org.deno.net"
            hint="Organization's default domain. Your relay URL will be in the format: https://my-relay.your-org.deno.net"
          />
          <Input
            label="App Name"
            value={denoForm.projectName}
            onChange={(e) => setDenoForm((prev) => ({ ...prev, projectName: e.target.value }))}
            placeholder="deno-relay"
            hint="Unique app name. Leave empty for auto-generated name."
          />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              fullWidth
              onClick={handleDenoDeploy}
              disabled={!denoForm.denoToken.trim() || !denoForm.orgDomain.trim() || deploying}
            >
              {deploying ? "Deploying..." : "Deploy Relay"}
            </Button>
            <Button fullWidth variant="ghost" onClick={closeDenoModal} disabled={deploying}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showFormModal}
        title={editingProxyPool ? "Edit Proxy Pool" : "Add Proxy Pool"}
        onClose={closeFormModal}
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Name"
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Office Proxy"
          />
          <Input
            label="Proxy URL"
            value={formData.proxyUrl}
            onChange={(e) => setFormData((prev) => ({ ...prev, proxyUrl: e.target.value }))}
            placeholder="http://127.0.0.1:7897"
          />
          <Input
            label="No Proxy"
            value={formData.noProxy}
            onChange={(e) => setFormData((prev) => ({ ...prev, noProxy: e.target.value }))}
            placeholder="localhost,127.0.0.1,.internal"
            hint="Comma-separated hosts/domains to bypass proxy"
          />

          <div className="flex flex-col gap-3 rounded-lg border border-border/50 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-sm">Active</p>
              <p className="text-xs text-text-muted">Inactive pools are ignored by runtime resolution.</p>
            </div>
            <Toggle
              checked={formData.isActive === true}
              onChange={() => setFormData((prev) => ({ ...prev, isActive: !prev.isActive }))}
              disabled={saving}
            />
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-border/50 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-sm">Strict Proxy</p>
              <p className="text-xs text-text-muted">Fail request if proxy is unreachable instead of falling back to direct.</p>
            </div>
            <Toggle
              checked={formData.strictProxy === true}
              onChange={() => setFormData((prev) => ({ ...prev, strictProxy: !prev.strictProxy }))}
              disabled={saving}
            />
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              fullWidth
              onClick={handleSave}
              disabled={!formData.name.trim() || !formData.proxyUrl.trim() || saving}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button fullWidth variant="ghost" onClick={closeFormModal} disabled={saving}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Export Modal */}
      <Modal
        isOpen={showExportModal}
        title="Export Proxies"
        onClose={() => setShowExportModal(false)}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs text-text-muted">
              <span>
                Exporting {exportTargetPools.length} {selectedIds.length > 0 ? "selected" : "matching"} {exportTargetPools.length === 1 ? "proxy" : "proxies"}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setExportFormat("url")}
                  className={`px-2 py-0.5 rounded text-xs transition-colors ${
                    exportFormat === "url"
                      ? "bg-primary/15 text-primary font-medium"
                      : "text-text-muted hover:text-text-main"
                  }`}
                >
                  Full URL
                </button>
                <button
                  type="button"
                  onClick={() => setExportFormat("credentials")}
                  className={`px-2 py-0.5 rounded text-xs transition-colors ${
                    exportFormat === "credentials"
                      ? "bg-primary/15 text-primary font-medium"
                      : "text-text-muted hover:text-text-main"
                  }`}
                >
                  Host:Port[:User:Pass]
                </button>
              </div>
            </div>
            <textarea
              readOnly
              value={exportText}
              rows={9}
              className="w-full font-mono text-xs p-3 rounded-lg border border-border/80 bg-surface-2 text-text-main focus:outline-none"
              placeholder="No proxies to export"
            />
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Button
              fullWidth
              variant="secondary"
              icon={copied === "export-all" ? "check" : "content_copy"}
              onClick={() => {
                copy(exportText, "export-all");
                notify.success("Copied to clipboard");
              }}
              disabled={!exportText}
            >
              {copied === "export-all" ? "Copied" : "Copy All"}
            </Button>
            <Button
              fullWidth
              variant="secondary"
              icon="download"
              onClick={handleDownloadExport}
              disabled={!exportText}
            >
              Download .txt
            </Button>
            <Button
              fullWidth
              variant="ghost"
              onClick={() => setShowExportModal(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={!!confirmState}
        onClose={() => setConfirmState(null)}
        onConfirm={confirmState?.onConfirm}
        title={confirmState?.title || "Confirm"}
        message={confirmState?.message}
        variant="danger"
      />
    </div>
  );
}
