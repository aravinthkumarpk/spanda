"use client";

import { Fragment, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchStaleBeatGroomingStatus } from "@/lib/stale-beat-grooming-api";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  StaleBeatGroomingActiveJob,
  StaleBeatGroomingCompletion,
  StaleBeatGroomingFailure,
  StaleBeatGroomingWorkerHealth,
} from "@/lib/stale-beat-grooming-types";

type WorkerStatus = "Idle" | "Processing" | "Slow";

export const STALE_SESSION_THRESHOLD_MS = 120_000;

export function isStaleSession(
  job: StaleBeatGroomingActiveJob,
  now: number,
): boolean {
  const lastActivity = job.lastOutputAt ?? job.startedAt;
  return now - lastActivity > STALE_SESSION_THRESHOLD_MS;
}

export function StaleBeatGroomingDiagnosticsCard() {
  const { data } = useQuery({
    queryKey: ["stale-beat-grooming-status"],
    queryFn: fetchStaleBeatGroomingStatus,
    refetchInterval: 5_000,
  });
  const now = useNow();

  if (!data?.ok || !data.data) return null;

  const { queueSize, worker } = data.data;
  const status = deriveStatus(worker, now);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stale Grooming Worker</CardTitle>
        <CardDescription>
          Queue and review status for stale beat grooming.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3">
          <Badge variant={status === "Idle" ? "secondary" : "default"}>
            {status}
          </Badge>
          <span className="text-sm text-muted-foreground">
            Workers: {worker.workerCount}
          </span>
          <span className="text-sm text-muted-foreground">
            Queue: {queueSize}
          </span>
          <span className="text-sm text-muted-foreground">
            Completed: {worker.totalCompleted}
          </span>
          <span className="text-sm text-muted-foreground">
            Failed: {worker.totalFailed}
          </span>
          {worker.uptimeMs != null && (
            <span className="text-sm text-muted-foreground">
              Uptime: {formatAge(worker.uptimeMs)}
            </span>
          )}
        </div>
        <ActiveJobsTable jobs={worker.activeJobs} now={now} />
        <FailuresTable failures={worker.recentFailures} />
        <CompletionsTable completions={worker.recentCompletions} />
      </CardContent>
    </Card>
  );
}

function deriveStatus(
  worker: StaleBeatGroomingWorkerHealth,
  now: number,
): WorkerStatus {
  if (worker.activeJobs.length === 0) return "Idle";
  const stale = worker.activeJobs.some((job) => isStaleSession(job, now));
  return stale ? "Slow" : "Processing";
}

function ActiveJobsTable({
  jobs,
  now,
}: {
  jobs: StaleBeatGroomingActiveJob[];
  now: number;
}) {
  if (jobs.length === 0) return null;
  return (
    <DiagnosticsTable title="Active Jobs" headers={["Beat", "Age", "Agent"]}>
      {jobs.map((job) => (
        <ActiveJobRow key={job.jobId} job={job} now={now} />
      ))}
    </DiagnosticsTable>
  );
}

function ActiveJobRow({
  job,
  now,
}: {
  job: StaleBeatGroomingActiveJob;
  now: number;
}) {
  const stale = isStaleSession(job, now);
  return (
    <Fragment>
      <TableRow data-testid={`stale-grooming-active-row-${job.jobId}`}>
        <TableCell className="font-mono text-xs">{job.beatId}</TableCell>
        <TableCell className="text-xs">
          {formatAge(now - job.startedAt)}
        </TableCell>
        <TableCell className="font-mono text-xs">{job.agentId}</TableCell>
      </TableRow>
      {stale && (
        <TableRow
          data-testid={`stale-grooming-diagnostics-${job.jobId}`}
          className="border-t-0"
        >
          <TableCell colSpan={3} className="pt-0">
            <StaleSessionDiagnostics job={job} now={now} />
          </TableCell>
        </TableRow>
      )}
    </Fragment>
  );
}

function StaleSessionDiagnostics({
  job,
  now,
}: {
  job: StaleBeatGroomingActiveJob;
  now: number;
}) {
  const lastActivity = job.lastOutputAt ?? job.startedAt;
  const staleSinceMs = Math.max(
    0,
    now - lastActivity - STALE_SESSION_THRESHOLD_MS,
  );
  return (
    <dl className="grid gap-1 text-xs sm:grid-cols-3">
      <DiagnosticField label="Agent">
        <span
          data-testid={`stale-grooming-agent-${job.jobId}`}
          className="font-mono"
        >
          {formatAgentLabel(job)}
        </span>
      </DiagnosticField>
      <DiagnosticField label="Last output">
        <span data-testid={`stale-grooming-last-output-${job.jobId}`}>
          {formatLastOutput(job.lastOutputAt)}
        </span>
      </DiagnosticField>
      <DiagnosticField label="Stale for">
        <span data-testid={`stale-grooming-stale-for-${job.jobId}`}>
          {formatAge(staleSinceMs)}
        </span>
      </DiagnosticField>
    </dl>
  );
}

function DiagnosticField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-xs">{children}</dd>
    </div>
  );
}

function formatAgentLabel(job: StaleBeatGroomingActiveJob): string {
  const name = job.agentName ?? job.agentId;
  const details = [job.agentModel, job.agentVersion].filter(Boolean);
  if (details.length > 0) return `${name} ${details.join(" ")}`;
  return `${name} (version unknown)`;
}

function formatLastOutput(lastOutputAt: number | undefined): string {
  if (!lastOutputAt) return "No output yet";
  const absolute = new Date(lastOutputAt).toLocaleTimeString();
  const relative = formatRelativePast(Date.now() - lastOutputAt);
  return `${absolute} (${relative})`;
}

function formatRelativePast(ms: number): string {
  if (ms < 1_000) return "just now";
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

function FailuresTable({
  failures,
}: {
  failures: StaleBeatGroomingFailure[];
}) {
  if (failures.length === 0) return null;
  return (
    <DiagnosticsTable
      title="Recent Failures"
      headers={["Beat", "Agent", "Model", "Version", "Reason", "When"]}
    >
      {failures.slice(0, 5).map((failure) => (
        <TableRow key={`${failure.jobId}-${failure.timestamp}`}>
          <TableCell className="font-mono text-xs">
            {failure.beatId}
          </TableCell>
          <AgentTableCells record={failure} />
          <TableCell className="max-w-[300px] truncate text-xs">
            {failure.reason}
          </TableCell>
          <TableCell className="text-xs">
            {new Date(failure.timestamp).toLocaleTimeString()}
          </TableCell>
        </TableRow>
      ))}
    </DiagnosticsTable>
  );
}

function CompletionsTable({
  completions,
}: {
  completions: StaleBeatGroomingCompletion[];
}) {
  if (completions.length === 0) return null;
  return (
    <DiagnosticsTable
      title="Recent Completions"
      headers={["Beat", "Agent", "Model", "Version", "Decision", "When"]}
    >
      {completions.slice(0, 5).map((completion) => (
        <TableRow key={`${completion.jobId}-${completion.timestamp}`}>
          <TableCell className="font-mono text-xs">
            {completion.beatId}
          </TableCell>
          <AgentTableCells record={completion} />
          <TableCell className="text-xs">
            {completion.decision ?? "completed"}
          </TableCell>
          <TableCell className="text-xs">
            {new Date(completion.timestamp).toLocaleTimeString()}
          </TableCell>
        </TableRow>
      ))}
    </DiagnosticsTable>
  );
}

function AgentTableCells({
  record,
}: {
  record: {
    agentName?: string;
    agentModel?: string;
    agentVersion?: string;
  };
}) {
  return (
    <>
      <TableCell className="font-mono text-xs">
        {formatDiagnosticValue(record.agentName)}
      </TableCell>
      <TableCell className="font-mono text-xs">
        {formatDiagnosticValue(record.agentModel)}
      </TableCell>
      <TableCell className="font-mono text-xs">
        {formatDiagnosticValue(record.agentVersion)}
      </TableCell>
    </>
  );
}

function formatDiagnosticValue(value: string | undefined): string {
  return value?.trim() || "unknown";
}

function DiagnosticsTable({
  title,
  headers,
  children,
}: {
  title: string;
  headers: string[];
  children: ReactNode;
}) {
  return (
    <div className="mt-4">
      <h4 className="mb-2 text-sm font-medium">{title}</h4>
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((header) => (
              <TableHead key={header}>{header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>{children}</TableBody>
      </Table>
    </div>
  );
}

function useNow(intervalMs = 1_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const handle = window.setInterval(
      () => setNow(Date.now()),
      intervalMs,
    );
    return () => window.clearInterval(handle);
  }, [intervalMs]);
  return now;
}

function formatAge(ms: number): string {
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ${secs % 60}s`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}
