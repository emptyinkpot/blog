import React from 'react';
import { expect } from 'storybook/test';
import ActionButton from './admin/ActionButton';
import LogPanel from './admin/LogPanel';
import MetricCard from './admin/MetricCard';
import StatusBadge from './admin/StatusBadge';
import ChatPanel from './ai/ChatPanel';
import StateTimeline from './publish/StateTimeline';
import ProviderTable from './token-pool/ProviderTable';

const meta = {
  tags: ['ai-generated']
};

export default meta;

export const AdminAtoms = {
  render: () => (
    <main className="console-main">
      <section className="page-stack">
        <div className="metric-grid">
          <MetricCard label="Ready articles" value="128" />
          <MetricCard label="Queue health" value="99%" />
          <MetricCard label="Runtime checks" value="12" />
        </div>
        <div className="button-row">
          <ActionButton>Publish</ActionButton>
          <ActionButton tone="secondary">Preview</ActionButton>
          <ActionButton tone="danger">Rollback</ActionButton>
          <StatusBadge status="healthy" />
        </div>
        <LogPanel title="Deploy log" lines={['workspace checked', 'build complete', 'rsync queued']} />
      </section>
    </main>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Ready articles')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Publish' })).toHaveClass(/action-button-primary/);
  }
};

export const PublishAndProviderSurfaces = {
  render: () => (
    <main className="console-main">
      <section className="page-stack">
        <StateTimeline steps={['draft', 'build', 'deploy', 'success']} state="deploy" />
        <ProviderTable
          providers={[
            { name: 'openai:gpt-5', status: 'healthy', successRate: '99.2%', latency: '840ms', cost: '$12.40', failCount: 1 },
            { name: 'anthropic:claude', status: 'cooldown', successRate: '96.1%', latency: '1.2s', cost: '$8.10', failCount: 3 }
          ]}
        />
      </section>
    </main>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('columnheader', { name: 'Provider' })).toBeVisible();
    await expect(canvas.getByText('deploy')).toHaveClass(/timeline-step-active/);
  }
};

export const AiChatThread = {
  render: () => (
    <main className="console-main">
      <section className="card chat-shell">
        <ChatPanel
          messages={[
            { role: 'user', content: '整理这篇文章的 factpack。' },
            { role: 'assistant', content: '已提取主张、证据和待核查来源。' }
          ]}
        />
      </section>
    </main>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText('已提取主张、证据和待核查来源。')).toBeVisible();
  }
};
