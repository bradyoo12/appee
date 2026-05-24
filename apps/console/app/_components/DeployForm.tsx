'use client';

import { ArrowRight } from 'lucide-react';
import { useFormStatus } from 'react-dom';

// useFormStatus must be called inside a child of the <form>, not on the form
// itself — that's why SubmitButton and HeadlineTextarea exist as separate
// components.

function HeadlineTextarea() {
  const { pending } = useFormStatus();
  return (
    <textarea
      name="headline"
      rows={2}
      maxLength={120}
      disabled={pending}
      defaultValue="매일 아침 부드럽게 명상을 알려주는 앱"
      placeholder="예: 매일 아침 부드럽게 명상을 알려주는 앱"
      className="block w-full max-w-md rounded-btn border border-zinc-200 bg-white p-3 text-sm shadow-soft-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none disabled:bg-zinc-50 disabled:text-zinc-500 disabled:cursor-not-allowed"
    />
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      data-testid="deploy-submit"
      className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-btn px-6 py-3 shadow-warm transition-transform duration-200 hover:-translate-y-0.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
    >
      {pending ? (
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
  return (
    <form action={action} className="mt-8 flex flex-col items-center gap-4">
      <HeadlineTextarea />
      <SubmitButton />
    </form>
  );
}
