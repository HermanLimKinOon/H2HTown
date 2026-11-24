import TranslatableText from '@/i18n/TranslatableText';
import { useState, useCallback } from 'react';
import useAuth from '@/hooks/useAuth';
import supabase from '@/lib/supabase';
import { useTranslation } from 'react-i18next';


interface PhoneBindModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type BindStep = 'phone' | 'otp' | 'done';

export default function PhoneBindModal({ isOpen, onClose, onSuccess }: PhoneBindModalProps) {
  const { t } = useTranslation();
  const { refreshMember } = useAuth();
  const [step, setStep] = useState<BindStep>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [fullPhone, setFullPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const reset = useCallback(() => {
    setStep('phone');
    setPhoneNumber('');
    setFullPhone('');
    setOtp('');
    setError('');
    setLoading(false);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const formatPhone = useCallback((input: string) => {
    const cleaned = input.replace(/[^0-9]/g, '');
    if (cleaned.startsWith('60')) {
      return '+' + cleaned;
    }
    if (cleaned.startsWith('0')) {
      return '+60' + cleaned.slice(1);
    }
    return '+60' + cleaned;
  }, []);

  const handleSendOtp = useCallback(async () => {
    const cleaned = phoneNumber.replace(/[^0-9]/g, '');
    if (!cleaned || cleaned.length < 9) {
      setError('Please enter a valid Malaysian phone number');
      return;
    }
    const formatted = formatPhone(phoneNumber);
    setError('');
    setLoading(true);

    try {
      // Step 1: Update auth user phone (fails if already taken)
      const { error: updateErr } = await supabase.auth.updateUser({
        phone: formatted,
      });
      if (updateErr) {
        if (updateErr.message.includes('already') || updateErr.message.includes('Phone')) {
          setError('This phone number is already bound to another account.');
        } else {
          setError(updateErr.message);
        }
        setLoading(false);
        return;
      }

      // Step 2: Send OTP
      const { error: sendErr } = await supabase.auth.signInWithOtp({
        phone: formatted,
        options: { shouldCreateUser: false },
      });
      if (sendErr) {
        setError(sendErr.message || 'Failed to send OTP. Please try again.');
        setLoading(false);
        return;
      }

      setFullPhone(formatted);
      setStep('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [phoneNumber, formatPhone]);

  const handleVerifyOtp = useCallback(async () => {
    if (!otp || otp.length < 4) {
      setError('Please enter the verification code');
      return;
    }
    setError('');
    setLoading(true);

    try {
      // Step 1: Verify OTP
      const { error: verifyErr } = await supabase.auth.verifyOtp({
        phone: fullPhone,
        token: otp,
        type: 'sms',
      });
      if (verifyErr) {
        setError(verifyErr.message || 'Invalid verification code');
        setLoading(false);
        return;
      }

      // Step 2: Bind phone in members table via RPC
      const { data: bindData, error: bindErr } = await supabase.rpc('bind_member_phone', {
        p_phone: fullPhone.replace('+', ''),
        p_phone_country_code: '+60',
      });

      if (bindErr) {
        setError(bindErr.message || 'Failed to bind phone. Please contact support.');
        setLoading(false);
        return;
      }

      if (bindData?.success) {
        setStep('done');
        await refreshMember();
        setTimeout(() => {
          onSuccess();
          handleClose();
        }, 1500);
      } else {
        setError(bindData?.error || 'Failed to bind phone.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [otp, fullPhone, refreshMember, onSuccess, handleClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={step !== 'done' ? handleClose : undefined} />
      <div className="relative w-full max-w-sm bg-background-50 rounded-2xl shadow-lg p-6 md:p-7 z-10">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-background-100 transition-colors cursor-pointer"
        >
          <i className="ri-close-line text-foreground-500"></i>
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-accent-100 flex items-center justify-center mx-auto mb-3">
            <i className="ri-smartphone-line text-accent-600 text-xl"></i>
          </div>
          <h2 className="font-heading text-xl font-bold text-foreground-800">
            {step === 'phone' && 'Bind Your Phone'}
            {step === 'otp' && 'Verify OTP'}
            {step === 'done' && 'Phone Verified!'}
          </h2>
          <p className="text-foreground-500 text-xs mt-1">
            {step === 'phone' && 'A valid phone number is required for rewards and security.'}
            {step === 'otp' && `Enter the code sent to ${fullPhone}`}
            {step === 'done' && 'Your phone is now verified and bound to your account.'}
          </p>
        </div>

        {step === 'phone' && (
          <div className="space-y-4">
            <div>
              <label htmlFor="bind-phone" className="block text-xs font-medium text-foreground-600 mb-1.5"><TranslatableText i18nKey="ui.malaysian_phone_number.6d524aa" /></label>
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-background-200/70 bg-background-50">
                <span className="text-sm text-foreground-500 flex-shrink-0">+60</span>
                <input
                  id="bind-phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => { setPhoneNumber(e.target.value.replace(/[^0-9]/g, '')); setError(''); }}
                  placeholder="12-345-6789"
                  className="flex-1 bg-transparent outline-none text-sm text-foreground-800 placeholder:text-foreground-400"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSendOtp(); }}
                />
              </div>
              {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
            </div>

            <button
              onClick={handleSendOtp}
              disabled={loading}
              className="w-full px-4 py-3 rounded-xl bg-accent-500 hover:bg-accent-600 disabled:bg-accent-300 text-white font-semibold text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <><i className="ri-loader-4-line animate-spin"></i> <TranslatableText i18nKey="ui.sending.c338c19" /></>
              ) : (
                <><i className="ri-send-plane-line"></i> <TranslatableText i18nKey="ui.send_otp.6de6347" /></>
              )}
            </button>
          </div>
        )}

        {step === 'otp' && (
          <div className="space-y-4">
            <div>
              <label htmlFor="bind-otp" className="block text-xs font-medium text-foreground-600 mb-1.5">{t('ui.verification_code.50cdc18', { keySeparator: false })}</label>
              <input
                id="bind-otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '')); setError(''); }}
                placeholder={t('ui.enter_6_digit_code.4c9c785', { keySeparator: false })}
                className="w-full px-4 py-3 rounded-xl border border-background-200/70 bg-background-50 text-sm text-foreground-800 placeholder:text-foreground-400 text-center tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-primary-300 transition-all"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleVerifyOtp(); }}
              />
              {error && <p className="text-red-500 text-xs mt-1 text-center">{error}</p>}
            </div>

            <button
              onClick={handleVerifyOtp}
              disabled={loading || otp.length < 4}
              className="w-full px-4 py-3 rounded-xl bg-accent-500 hover:bg-accent-600 disabled:bg-accent-300 text-white font-semibold text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <><i className="ri-loader-4-line animate-spin"></i> <TranslatableText i18nKey="ui.verifying.bf6ea54" /></>
              ) : (
                <><i className="ri-check-line"></i> <TranslatableText i18nKey="ui.verify_bind.dad28b0" /></>
              )}
            </button>

            <div className="flex items-center justify-between text-xs">
              <button
                onClick={() => { setStep('phone'); setOtp(''); setError(''); }}
                className="text-foreground-500 hover:text-foreground-700 transition-colors cursor-pointer"
              >
                {t('ui.change_number.6c3b408', { keySeparator: false })}
              </button>
              <button
                onClick={() => { handleSendOtp(); setOtp(''); setError(''); }}
                className="text-accent-600 hover:text-accent-700 font-medium transition-colors cursor-pointer"
              >
                {t('ui.resend_code.1d3cb8a', { keySeparator: false })}
              </button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <i className="ri-check-line text-emerald-600 text-2xl"></i>
            </div>
            <p className="text-emerald-700 text-sm font-medium"><TranslatableText i18nKey="ui.your_phone_is_now_verified.94595c3" /></p>
          </div>
        )}
      </div>
    </div>
  );
}
