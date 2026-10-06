"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, Button, CardSkeleton } from "@/shared/components";

// Formatação compacta de números (ex: 1.5M, 240K)
function formatCompact(num) {
  if (num === null || num === undefined) return "0";
  const n = Number(num);
  if (Number.isNaN(n)) return "0";
  if (n >= 1000000000) return (n / 1000000000).toFixed(1) + "B";
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return n.toLocaleString();
}

// Formatação legível de tempo em milissegundos
function formatDuration(ms) {
  if (!ms || ms < 0) return "0ms";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const sec = ms / 1000;
  if (sec < 60) return `${sec.toFixed(1)}s`;
  const min = Math.floor(sec / 60);
  const remSec = Math.round(sec % 60);
  return `${min}m ${remSec}s`;
}

export default function RtkAnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch("/api/rtk/gain");
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const json = await res.json();
      if (json.success) {
        setData(json);
        setError(null);
      } else {
        throw new Error(json.error || "Falha ao obter dados do RTK");
      }
    } catch (err) {
      console.error("[RTK Analytics] Erro ao carregar dados:", err);
      setError(err.message);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Auto-refresh a cada 5 segundos
    const interval = setInterval(() => {
      fetchData();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading && !data) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-48 bg-black/10 dark:bg-white/10 rounded-md animate-pulse mb-2" />
            <div className="h-4 w-72 bg-black/5 dark:bg-white/5 rounded-md animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <CardSkeleton />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">RTK Analytics</h1>
            <p className="text-sm text-text-muted mt-1">
              Monitoramento em tempo real de economia de tokens
            </p>
          </div>
        </div>
        <Card className="border-red-500/30 bg-red-500/5">
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <span className="material-symbols-outlined text-4xl text-red-500 mb-2">
              error
            </span>
            <h3 className="text-lg font-semibold text-red-500">
              Erro ao carregar dados do RTK
            </h3>
            <p className="text-sm text-text-muted mt-2 max-w-md">
              {error}
            </p>
            <Button
              className="mt-6"
              size="sm"
              onClick={() => fetchData(true)}
            >
              Tentar novamente
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const stats = data?.stats || {
    totalCommands: 0,
    inputTokens: 0,
    outputTokens: 0,
    savedTokens: 0,
    totalExecTimeMs: 0,
  };
  const topCommands = data?.topCommands || [];
  const history = data?.history || [];

  // Calcular taxa de economia percentual global
  const totalInput = Number(stats.inputTokens) || 0;
  const totalSaved = Number(stats.savedTokens) || 0;
  const efficiency = totalInput > 0
    ? ((totalSaved / totalInput) * 100).toFixed(1)
    : "0.0";

  // Preparar dados do gráfico temporal
  const chartData = history
    .slice()
    .reverse()
    .map((h) => {
      const date = new Date(h.timestamp);
      return {
        time: date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
        saved: h.saved_tokens || 0,
        pct: Number((h.savings_pct || 0).toFixed(1)),
        cmd: h.original_cmd,
      };
    });

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              RTK Analytics
            </h1>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Ao vivo</span>
            </div>
          </div>
          <p className="text-sm text-text-muted mt-1">
            Métricas de economia de tokens via proxy CLI Rust Token Killer
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5"
          >
            <span
              className={`material-symbols-outlined text-[16px] ${
                refreshing ? "animate-spin" : ""
              }`}
            >
              refresh
            </span>
            <span>{refreshing ? "Atualizando..." : "Atualizar"}</span>
          </Button>
        </div>
      </div>

      {/* Info notice se não houver dados */}
      {stats.totalCommands === 0 && (
        <Card className="border-cyan-500/30 bg-cyan-500/5 p-4">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-cyan-400 text-xl mt-0.5">
              info
            </span>
            <div className="text-sm">
              <p className="font-medium text-cyan-400">
                Nenhum comando registrado no histórico do RTK ainda
              </p>
              <p className="text-text-muted mt-1 text-xs">
                Para começar a registrar economia de tokens, utilize comandos prefixados
                com <code className="bg-black/20 px-1.5 py-0.5 rounded font-mono text-cyan-300">rtk</code> no
                terminal (exemplo: <code className="bg-black/20 px-1.5 py-0.5 rounded font-mono text-cyan-300">rtk git status</code> ou <code className="bg-black/20 px-1.5 py-0.5 rounded font-mono text-cyan-300">rtk grep</code>).
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Tokens Economizados */}
        <Card className="relative overflow-hidden group">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-xs uppercase font-semibold tracking-wider">
              Total Economizado
            </span>
            <span className="material-symbols-outlined text-cyan-400 text-xl">
              savings
            </span>
          </div>
          <div className="text-3xl font-extrabold text-cyan-400 tracking-tight">
            {formatCompact(stats.savedTokens)}
          </div>
          <p className="text-xs text-text-muted mt-1">
            Tokens cortados do contexto
          </p>
          <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-colors pointer-events-none" />
        </Card>

        {/* Card 2: Eficiência Global */}
        <Card className="relative overflow-hidden group">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-xs uppercase font-semibold tracking-wider">
              Eficiência Global
            </span>
            <span className="material-symbols-outlined text-purple-400 text-xl">
              speed
            </span>
          </div>
          <div className="text-3xl font-extrabold text-purple-400 tracking-tight">
            {efficiency}%
          </div>
          <p className="text-xs text-text-muted mt-1">
            Taxa média de redução
          </p>
          <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-colors pointer-events-none" />
        </Card>

        {/* Card 3: Total de Comandos */}
        <Card className="relative overflow-hidden group">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-xs uppercase font-semibold tracking-wider">
              Comandos Executados
            </span>
            <span className="material-symbols-outlined text-emerald-400 text-xl">
              terminal
            </span>
          </div>
          <div className="text-3xl font-extrabold text-emerald-400 tracking-tight">
            {Number(stats.totalCommands || 0).toLocaleString()}
          </div>
          <p className="text-xs text-text-muted mt-1">
            Operações intermediadas pelo CLI
          </p>
          <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-colors pointer-events-none" />
        </Card>

        {/* Card 4: Tempo Gasto */}
        <Card className="relative overflow-hidden group">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-xs uppercase font-semibold tracking-wider">
              Tempo Total
            </span>
            <span className="material-symbols-outlined text-amber-400 text-xl">
              schedule
            </span>
          </div>
          <div className="text-3xl font-extrabold text-amber-400 tracking-tight">
            {formatDuration(stats.totalExecTimeMs)}
          </div>
          <p className="text-xs text-text-muted mt-1">
            Tempo acumulado de execução
          </p>
          <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-colors pointer-events-none" />
        </Card>
      </div>

      {/* Main Charts & Rankings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico Temporal */}
        <Card className="lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-text-main flex items-center gap-2">
                <span className="w-1.5 h-4 bg-cyan-400 rounded-full" />
                Fluxo de Economia em Tempo Real
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Volume de tokens economizados nas últimas 50 execuções
              </p>
            </div>
          </div>

          <div className="h-[320px] w-full mt-2">
            {mounted && chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="rtkSavedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="currentColor"
                    className="text-black/5 dark:text-white/5"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="time"
                    stroke="currentColor"
                    className="text-text-muted text-[11px]"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="currentColor"
                    className="text-text-muted text-[11px]"
                    tickFormatter={formatCompact}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(18, 18, 24, 0.95)",
                      borderColor: "rgba(255, 255, 255, 0.1)",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "#fff",
                      boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                    }}
                    formatter={(val, name) => [
                      formatCompact(val),
                      name === "saved" ? "Tokens Economizados" : name,
                    ]}
                    labelFormatter={(label, payload) => {
                      const item = payload?.[0]?.payload;
                      return item?.cmd ? `${label} • ${item.cmd}` : label;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="saved"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#rtkSavedGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-text-muted text-xs">
                Aguardando mais execuções para renderizar o gráfico...
              </div>
            )}
          </div>
        </Card>

        {/* Top Commands Ranking */}
        <Card className="flex flex-col">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-text-main flex items-center gap-2">
              <span className="w-1.5 h-4 bg-purple-400 rounded-full" />
              Comandos mais Econômicos
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Top 10 comandos que mais pouparam tokens
            </p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 max-h-[320px] pr-1">
            {topCommands.length === 0 ? (
              <div className="text-center py-10 text-xs text-text-muted">
                Nenhum dado registrado
              </div>
            ) : (
              topCommands.map((cmd, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span
                      className="font-mono text-xs font-medium text-cyan-600 dark:text-cyan-300 truncate max-w-[180px]"
                      title={cmd.original_cmd}
                    >
                      {cmd.original_cmd}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-text-muted font-mono">
                      {cmd.count}x
                    </span>
                  </div>

                  <div className="flex justify-between items-baseline mt-2">
                    <span className="text-xs text-text-muted">
                      Economia: <strong className="text-text-main">{formatCompact(cmd.saved)}</strong>
                    </span>
                    <span className="text-xs font-semibold text-emerald-500">
                      -{Number(cmd.avg_pct || 0).toFixed(1)}%
                    </span>
                  </div>

                  <div className="w-full bg-black/5 dark:bg-white/5 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-cyan-400"
                      style={{
                        width: `${Math.min(100, Math.max(0, cmd.avg_pct || 0))}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Histórico Recente */}
      <Card>
        <div className="mb-4">
          <h2 className="text-base font-semibold text-text-main flex items-center gap-2">
            <span className="w-1.5 h-4 bg-emerald-400 rounded-full" />
            Histórico Recente de Execuções
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            Últimas operações interceptadas e otimizadas pelo RTK
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border-subtle text-[11px] uppercase tracking-wider text-text-muted">
                <th className="pb-2.5 font-semibold">Comando</th>
                <th className="pb-2.5 font-semibold text-right">Tokens Salvos</th>
                <th className="pb-2.5 font-semibold text-right">Redução</th>
                <th className="pb-2.5 font-semibold text-right">Duração</th>
                <th className="pb-2.5 font-semibold text-right">Horário</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle text-xs">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-text-muted">
                    Nenhuma execução registrada recentemente
                  </td>
                </tr>
              ) : (
                history.slice(0, 15).map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-2.5 pr-4 font-mono text-cyan-600 dark:text-cyan-300 truncate max-w-xs" title={row.original_cmd}>
                      {row.original_cmd}
                    </td>
                    <td className="py-2.5 text-right font-medium text-text-main">
                      {formatCompact(row.saved_tokens)}
                    </td>
                    <td className="py-2.5 text-right font-semibold text-emerald-500">
                      -{Number(row.savings_pct || 0).toFixed(1)}%
                    </td>
                    <td className="py-2.5 text-right text-text-muted">
                      {formatDuration(row.exec_time_ms)}
                    </td>
                    <td className="py-2.5 text-right text-text-muted text-[11px]">
                      {new Date(row.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
