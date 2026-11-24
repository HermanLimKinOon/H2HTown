import { useNavigate } from 'react-router-dom';
import TranslatableText from '@/i18n/TranslatableText';

interface ProfileCompletionPromptProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileCompletionPrompt({ isOpen, onClose }: ProfileCompletionPromptProps) {
  const navigate = useNavigate();
  if (!isOpen) return null;

  const completeProfile = () => {
    onClose();
    navigate('/members/register');
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4" role="presentation" onMouseDown={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="complete-profile-title" onMouseDown={(event) => event.stopPropagation()} className="w-full max-w-md rounded-2xl bg-background-50 p-6 shadow-2xl">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-100 text-accent-700"><i className="ri-user-settings-line text-xl" /></div>
        <h2 id="complete-profile-title" className="font-heading text-xl font-bold text-foreground-900"><TranslatableText i18nKey="registration_gate.title" /></h2>
        <p className="mt-2 text-sm leading-relaxed text-foreground-600"><TranslatableText i18nKey="registration_gate.message" /></p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="rounded-full border border-background-300 px-5 py-2.5 text-sm font-semibold text-foreground-700 hover:bg-background-100"><TranslatableText i18nKey="registration_gate.not_now" /></button>
          <button type="button" onClick={completeProfile} className="rounded-full bg-accent-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-600"><TranslatableText i18nKey="registration_gate.complete" /></button>
        </div>
      </section>
    </div>
  );
}
