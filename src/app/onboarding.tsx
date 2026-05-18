import React, { useState } from "react";
import { Braces, Cloud, Columns2, Keyboard } from "lucide-react";

interface Props {
  onFinish(): void;
}

const steps = [
  {
    icon: Cloud,
    title: "Open Markdown from Drive",
    body: "MarkDrive catches Drive markdown files and opens them in a full-tab editor tied to the same file ID."
  },
  {
    icon: Columns2,
    title: "Write and Preview Together",
    body: "Use split, editor-only, or preview-only layouts with live rendering for diagrams, math, code, and callouts."
  },
  {
    icon: Braces,
    title: "Keep Drive in Sync",
    body: "Manual save, autosave, offline queuing, and conflict choices keep changes under your control."
  },
  {
    icon: Keyboard,
    title: "Work from the Keyboard",
    body: "Use familiar formatting shortcuts, find and replace, fullscreen, and Vim mode with :w saving to Drive."
  }
] as const;

export function Onboarding({ onFinish }: Props): React.ReactElement {
  const [index, setIndex] = useState(0);
  const step = steps[index];
  const Icon = step.icon;
  const last = index === steps.length - 1;

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal onboarding" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
        <div className="onboarding-icon"><Icon size={28} /></div>
        <p className="eyebrow">MarkDrive</p>
        <h2 id="onboarding-title">{step.title}</h2>
        <p>{step.body}</p>
        <div className="step-dots" aria-label={`Step ${index + 1} of ${steps.length}`}>
          {steps.map((item, dotIndex) => (
            <span key={item.title} className={dotIndex === index ? "active" : ""} />
          ))}
        </div>
        <div className="modal-actions">
          <button onClick={onFinish}>Skip</button>
          <button onClick={() => last ? onFinish() : setIndex((current) => current + 1)}>
            {last ? "Start Editing" : "Next"}
          </button>
        </div>
      </section>
    </div>
  );
}
