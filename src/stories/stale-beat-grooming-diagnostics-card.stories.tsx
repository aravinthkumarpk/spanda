import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { expect, within } from "storybook/test";
import {
  StaleBeatGroomingDiagnosticsCard,
} from "@/components/stale-beat-grooming-diagnostics-card";
import type {
  StaleBeatGroomingActiveJob,
  StaleBeatGroomingStatus,
} from "@/lib/stale-beat-grooming-types";
import "@/app/globals.css";

const FIVE_MIN = 5 * 60 * 1000;

interface Fixtures {
  healthyJob: StaleBeatGroomingActiveJob;
  staleJob: StaleBeatGroomingActiveJob;
  staleJobWithoutVersion: StaleBeatGroomingActiveJob;
  staleJobNoOutput: StaleBeatGroomingActiveJob;
}

function buildFixtures(now: number): Fixtures {
  return {
    healthyJob: {
      jobId: "job-healthy",
      beatId: "foolery-aaaa",
      agentId: "codex",
      startedAt: now - 30_000,
      agentName: "Codex",
      agentVersion: "gpt-5.4",
      lastOutputAt: now - 5_000,
    },
    staleJob: {
      jobId: "job-stale",
      beatId: "foolery-bbbb",
      agentId: "claude",
      startedAt: now - FIVE_MIN,
      agentName: "Claude",
      agentVersion: "opus-4.7",
      lastOutputAt: now - FIVE_MIN,
    },
    staleJobWithoutVersion: {
      jobId: "job-stale-noversion",
      beatId: "foolery-cccc",
      agentId: "hermes",
      startedAt: now - 4 * 60 * 1000,
      agentName: "Hermes",
      lastOutputAt: now - 4 * 60 * 1000,
    },
    staleJobNoOutput: {
      jobId: "job-stale-no-output",
      beatId: "foolery-dddd",
      agentId: "opencode",
      startedAt: now - 6 * 60 * 1000,
      agentName: "OpenCode",
      agentVersion: "v0.3.1",
    },
  };
}

function statusFixture(
  jobs: StaleBeatGroomingActiveJob[],
): StaleBeatGroomingStatus {
  return {
    queueSize: 1,
    reviews: [],
    worker: {
      workerCount: 1,
      activeJobs: jobs,
      totalCompleted: 4,
      totalFailed: 1,
      recentFailures: [],
      recentCompletions: [],
      uptimeMs: 30 * 60 * 1000,
    },
  };
}

function storyQueryClient(
  jobs: StaleBeatGroomingActiveJob[],
): QueryClient {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
    },
  });
  client.setQueryData(["stale-beat-grooming-status"], {
    ok: true,
    data: statusFixture(jobs),
  });
  return client;
}

const meta = {
  title: "Components/StaleBeatGroomingDiagnosticsCard",
  component: StaleBeatGroomingDiagnosticsCard,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta<typeof StaleBeatGroomingDiagnosticsCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const HealthyOnly: Story = {
  render: () => {
    const { healthyJob } = buildFixtures(Date.now());
    return (
      <QueryClientProvider client={storyQueryClient([healthyJob])}>
        <StaleBeatGroomingDiagnosticsCard />
      </QueryClientProvider>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByTestId("stale-grooming-active-row-job-healthy");
    expect(
      canvas.queryByTestId("stale-grooming-diagnostics-job-healthy"),
    ).toBeNull();
  },
};

export const StaleSessionDiagnostics: Story = {
  render: () => {
    const { staleJob } = buildFixtures(Date.now());
    return (
      <QueryClientProvider client={storyQueryClient([staleJob])}>
        <StaleBeatGroomingDiagnosticsCard />
      </QueryClientProvider>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const panel = await canvas.findByTestId(
      "stale-grooming-diagnostics-job-stale",
    );
    expect(panel).toBeInTheDocument();

    const agent = within(panel).getByTestId("stale-grooming-agent-job-stale");
    expect(agent.textContent ?? "").toContain("Claude");
    expect(agent.textContent ?? "").toContain("opus-4.7");

    const lastOutput = within(panel).getByTestId(
      "stale-grooming-last-output-job-stale",
    );
    expect((lastOutput.textContent ?? "").trim().length).toBeGreaterThan(0);
    expect(lastOutput.textContent ?? "").toMatch(/ago/);

    const staleFor = within(panel).getByTestId(
      "stale-grooming-stale-for-job-stale",
    );
    expect((staleFor.textContent ?? "").trim().length).toBeGreaterThan(0);
  },
};

export const StaleSessionMissingVersion: Story = {
  render: () => {
    const { staleJobWithoutVersion } = buildFixtures(Date.now());
    return (
      <QueryClientProvider
        client={storyQueryClient([staleJobWithoutVersion])}
      >
        <StaleBeatGroomingDiagnosticsCard />
      </QueryClientProvider>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const agent = await canvas.findByTestId(
      "stale-grooming-agent-job-stale-noversion",
    );
    expect(agent.textContent ?? "").toContain("Hermes");
    expect(agent.textContent ?? "").toContain("version unknown");
  },
};

export const StaleSessionWithoutOutput: Story = {
  render: () => {
    const { staleJobNoOutput } = buildFixtures(Date.now());
    return (
      <QueryClientProvider client={storyQueryClient([staleJobNoOutput])}>
        <StaleBeatGroomingDiagnosticsCard />
      </QueryClientProvider>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const lastOutput = await canvas.findByTestId(
      "stale-grooming-last-output-job-stale-no-output",
    );
    expect(lastOutput.textContent ?? "").toContain("No output yet");
  },
};

export const Mixed: Story = {
  render: () => {
    const { healthyJob, staleJob } = buildFixtures(Date.now());
    return (
      <QueryClientProvider
        client={storyQueryClient([healthyJob, staleJob])}
      >
        <StaleBeatGroomingDiagnosticsCard />
      </QueryClientProvider>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByTestId("stale-grooming-active-row-job-healthy");
    expect(
      canvas.queryByTestId("stale-grooming-diagnostics-job-healthy"),
    ).toBeNull();
    expect(
      await canvas.findByTestId("stale-grooming-diagnostics-job-stale"),
    ).toBeInTheDocument();
  },
};
