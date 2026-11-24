import { useCallback, useState } from 'react';
import useAuth from '@/hooks/useAuth';
import ProfileCompletionPrompt from '@/components/feature/ProfileCompletionPrompt';

export function isMemberRegistrationComplete(member: ReturnType<typeof useAuth>['member']): boolean {
  return Boolean(
    member?.name?.trim() && (member.email?.trim() || member.phone_verified) && member.phone?.trim() && member.birth_date
  );
}

export default function useProfileCompletionGate() {
  const { user, member } = useAuth();
  const [isPromptOpen, setPromptOpen] = useState(false);
  const registrationComplete = isMemberRegistrationComplete(member);

  const requireRegistration = useCallback(() => {
    if (!user || registrationComplete) return true;
    setPromptOpen(true);
    return false;
  }, [user, registrationComplete]);

  const openProfilePrompt = useCallback(() => setPromptOpen(true), []);

  const prompt = (
    <ProfileCompletionPrompt
      isOpen={isPromptOpen}
      onClose={() => setPromptOpen(false)}
    />
  );

  return { requireRegistration, openProfilePrompt, registrationComplete, prompt };
}
