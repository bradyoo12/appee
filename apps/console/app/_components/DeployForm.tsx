'use client';

import { ArrowRight } from 'lucide-react';
import { useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';

// Two-layer dedupe:
//   1. submittingRef — synchronous guard in onSubmit. Updated in the same
//      tick as the click event, so rapid 3-5x clicks fire submit handlers
//      back-to-back; the 2nd+ see ref=true and preventDefault. useFormStatus
//      + disabled alone is NOT enough — React re-renders after click
//      handlers, so within a single event-loop tick the button still
//      reads as enabled to subsequent click events.
//   2. useFormStatus().pending + submitting state — visual feedback once
//      React has had a chance to re-render. Ref doesn't trigger re-render
//      on its own, so we mirror it into state for disabled styling.

function HeadlineTextarea({ submitting }: { submitting: boolean }) {
  const { pending } = useFormStatus();
  const disabled = pending || submitting;
  return (
    <textarea
      name="headline"
      rows={2}
      maxLength={120}
      disabled={disabled}
      defaultValue="매일 아침 부드럽게 명상을 알려주는 앱"
      placeholder="예: 매일 아침 부드럽게 명상을 알려주는 앱"
      className="block w-full max-w-md rounded-btn border border-zinc-200 bg-white p-3 text-sm shadow-soft-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none disabled:bg-zinc-50 disabled:text-zinc-500 disabled:cursor-not-allowed"
    />
  );
}

function SubmitButton({ submitting }: { submitting: boolean }) {
  const { pending } = useFormStatus();
  const disabled = pending || submitting;
  return (
    <button
      type="submit"
      disabled={disabled}
      data-testid="deploy-submit"
      className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-btn px-6 py-3 shadow-warm transition-transform duration-200 hover:-translate-y-0.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
    >
      {disabled ? (
        <>
          <span className="inline-block w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          빌드 시작 중...
        </>
      ) : (
        <>
          Deploy hello world <ArrowRight className="w-4 h-4" />
        </>
      )}
    </button>
  );
}

export function DeployForm({ action }: { action: (formData: FormData) => Promise<void> }) {
  const submittingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      action={action}
      onSubmit={(e) => {
        // React 19's <form action> fires onSubmit BEFORE the action handler;
        // preventDefault() here cancels the action entirely. The ref check
        // is synchronous, so back-to-back clicks within the same tick are
        // all seen — only the first one proceeds.
        if (submittingRef.current) {
          e.preventDefault();
          return;
        }
        submittingRef.current = true;
        setSubmitting(true);
      }}
      className="mt-8 flex flex-col items-center gap-4"
    >
      <HeadlineTextarea submitting={submitting} />
      <SubmitButton submitting={submitting} />
    </form>
  );
}
