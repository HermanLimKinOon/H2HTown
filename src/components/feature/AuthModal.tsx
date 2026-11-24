import TranslatableText from '@/i18n/TranslatableText';
import { useState, useCallback } from 'react';
import useAuth from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';


interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnTo?: string;
}

type AuthMode = 'choose' | 'email' | 'email_sent' | 'password' | 'phone' | 'phone_otp';

export default function AuthModal({ isOpen, onClose, returnTo }: AuthModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signInWithGoogle, signInWithEmail, signInWithPassword, signInWithPhone, verifyPhoneOtp } = useAuth();

  const [mode, setMode] = useState<AuthMode>('choose');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [otpError, setOtpError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  const resetForm = useCallback(() => {
    setMode('choose');
    setEmail('');
    setPassword('');
    setPhone('');
    setOtp('');
    setEmailError('');
    setPasswordError('');
    setPhoneError('');
    setOtpError('');
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const handleGoogleLogin = useCallback(async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle(returnTo);
    } catch {
      setGoogleLoading(false);
    }
  }, [signInWithGoogle, returnTo]);

  const handleSendMagicLink = useCallback(async () => {
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setEmailLoading(true);
    setEmailError('');

    const result = await signInWithEmail(trimmed, returnTo);
    setEmailLoading(false);

    if (result.success) {
      setEmail(trimmed);
      setMode('email_sent');
    } else {
      setEmailError(result.error || 'Failed to send magic link');
    }
  }, [email, signInWithEmail, returnTo]);

  const handlePasswordLogin = useCallback(async () => {
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError(t('auth.invalid_email', { keySeparator: false }));
      return;
    }
    if (!password) {
      setPasswordError(t('auth.password_required', { keySeparator: false }));
      return;
    }
    setPasswordLoading(true);
    setEmailError('');
    setPasswordError('');
    const result = await signInWithPassword(trimmed, password, returnTo);
    setPasswordLoading(false);
    if (result.success) handleClose();
    else setPasswordError(result.error || t('auth.sign_in_failed', { keySeparator: false }));
  }, [email, password, signInWithPassword, handleClose, t, returnTo]);

  const handleSendPhoneOtp = useCallback(async () => {
    const cleaned = phone.replace(/[\s\-()]/g, '');
    if (!cleaned || cleaned.length < 8) {
      setPhoneError('Please enter a valid phone number');
      return;
    }

    const formattedPhone = cleaned.startsWith('+') ? cleaned : `+60${cleaned.replace(/^0+/, '')}`;

    setPhoneLoading(true);
    setPhoneError('');

    const result = await signInWithPhone(formattedPhone);
    setPhoneLoading(false);

    if (result.success) {
      setPhone(formattedPhone);
      setMode('phone_otp');
    } else {
      setPhoneError(result.error || 'Failed to send verification code');
    }
  }, [phone, signInWithPhone]);

  const handleVerifyPhoneOtp = useCallback(async () => {
    if (!otp || otp.length < 4) {
      setOtpError('Please enter the verification code');
      return;
    }

    setOtpLoading(true);
    setOtpError('');

    const result = await verifyPhoneOtp(phone, otp, returnTo);
    setOtpLoading(false);

    if (result.success) {
      handleClose();
    } else {
      setOtpError(result.error || 'Invalid verification code');
    }
  }, [otp, phone, verifyPhoneOtp, handleClose, returnTo]);

  const handleResendMagicLink = useCallback(async () => {
    const result = await signInWithEmail(email, returnTo);
    if (!result.success) {
      setEmailError(result.error || 'Failed to resend magic link');
    }
  }, [email, signInWithEmail, returnTo]);

  if (!isOpen) return null;

  const modeTitle = (() => {
    switch (mode) {
      case 'choose': return 'Welcome to H2H';
      case 'email': return 'Enter Your Email';
      case 'password': return t('auth.sign_in_email_password', { keySeparator: false });
      case 'email_sent': return 'Check Your Email';
      case 'phone': return 'Enter Your Phone';
      case 'phone_otp': return 'Verify Phone';
      default: return 'Welcome to H2H';
    }
  })();

  const modeSubtitle = (() => {
    switch (mode) {
      case 'choose': return 'Sign in to access member rewards and more';
      case 'email': return "We'll send a magic link to your inbox — no password needed";
      case 'password': return t('auth.sign_in_with_email_password_subtitle', { keySeparator: false });
      case 'email_sent': return `Magic link sent to ${email}`;
      case 'phone': return "We'll send a verification code to your phone";
      case 'phone_otp': return `Code sent to ${phone}`;
      default: return 'Sign in to access member rewards and more';
    }
  })();

  return createPortal((
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative w-full max-w-sm bg-background-50 rounded-2xl p-6 md:p-7 z-10">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-background-100 transition-colors cursor-pointer"
        >
          <i className="ri-close-line text-foreground-500"></i>
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-accent-100 flex items-center justify-center mx-auto mb-3">
            <i className="ri-user-smile-line text-accent-600 text-xl"></i>
          </div>
          <h2 className="font-heading text-xl font-bold text-foreground-800">
            {modeTitle}
          </h2>
          <p className="text-foreground-500 text-xs mt-1">
            {modeSubtitle}
          </p>
        </div>

        {mode === 'choose' && (
          <div className="space-y-3">
            {/* Google Login */}
            <button
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-background-200/70 bg-background-50 hover:bg-background-100 text-sm font-semibold text-foreground-800 transition-colors cursor-pointer disabled:opacity-50"
            >
              {googleLoading ? (
                <i className="ri-loader-4-line animate-spin text-lg"></i>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              {t('ui.continue_with_google.ccc5b0e', { keySeparator: false })}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-background-200/70"></div>
              <span className="text-xs text-foreground-400 font-medium">or</span>
              <div className="flex-1 h-px bg-background-200/70"></div>
            </div>

            {/* Email Login */}
            <button
              onClick={() => setMode('email')}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-background-200/70 bg-background-50 hover:bg-background-100 text-sm font-semibold text-foreground-800 transition-colors cursor-pointer"
            >
              <i className="ri-mail-line text-lg text-primary-600"></i>
              {t('ui.continue_with_email.8800145', { keySeparator: false })}
            </button>

            {/* Email and password Login */}
            <button
              onClick={() => setMode('password')}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-background-200/70 bg-background-50 hover:bg-background-100 text-sm font-semibold text-foreground-800 transition-colors cursor-pointer"
            >
              <i className="ri-lock-password-line text-lg text-primary-600"></i>
              {t('auth.sign_in_password_option', { keySeparator: false })}
            </button>

            {/* Phone Login */}
            <button
              onClick={() => setMode('phone')}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-background-200/70 bg-background-50 hover:bg-background-100 text-sm font-semibold text-foreground-800 transition-colors cursor-pointer"
            >
              <i className="ri-smartphone-line text-lg text-emerald-600"></i>
              {t('ui.continue_with_phone.78d18fe', { keySeparator: false })}
            </button>

            <p className="text-center text-sm text-foreground-600 pt-2">
              {t('auth.no_account_yet', { keySeparator: false })}{' '}
              <button type="button" onClick={() => { handleClose(); navigate('/members/register'); }} className="text-primary-600 hover:text-primary-700 font-semibold cursor-pointer">
                {t('auth.register', { keySeparator: false })}
              </button>
            </p>
          </div>
        )}

        {mode === 'email' && (
          <div className="space-y-4">
            <div>
              <label htmlFor="auth-email" className="block text-xs font-medium text-foreground-600 mb-1.5">{t('ui.email_address.09ba557', { keySeparator: false })}</label>
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-background-200/70 bg-background-50">
                <i className="ri-mail-line text-foreground-400 flex-shrink-0"></i>
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                  placeholder="you@example.com"
                  className="flex-1 bg-transparent outline-none text-sm text-foreground-800 placeholder:text-foreground-400"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSendMagicLink(); }}
                />
              </div>
              {emailError && <p className="text-red-500 text-xs mt-1">{emailError}</p>}
            </div>

            <button
              onClick={handleSendMagicLink}
              disabled={emailLoading}
              className="w-full px-4 py-3 rounded-xl bg-accent-500 hover:bg-accent-600 disabled:bg-accent-300 text-white font-semibold text-sm transition-colors cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
            >
              {emailLoading ? (
                <><i className="ri-loader-4-line animate-spin"></i> <TranslatableText i18nKey="ui.sending.c338c19" /></>
              ) : (
                <><i className="ri-send-plane-line"></i> <TranslatableText i18nKey="ui.send_magic_link.a319abf" /></>
              )}
            </button>

            <button
              onClick={() => { setMode('choose'); setEmailError(''); }}
              className="w-full text-center text-sm text-foreground-500 hover:text-foreground-700 transition-colors cursor-pointer"
            >
              <TranslatableText i18nKey="ui.extra_back.b52b36b" /></button>
          </div>
        )}

        {mode === 'password' && (
          <div className="space-y-4">
            <div>
              <label htmlFor="auth-password-email" className="block text-xs font-medium text-foreground-600 mb-1.5">{t('ui.email_address.09ba557', { keySeparator: false })}</label>
              <input id="auth-password-email" type="email" autoComplete="email" value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl border border-background-200/70 bg-background-50 text-sm text-foreground-800 placeholder:text-foreground-400" />
              {emailError && <p className="text-red-500 text-xs mt-1">{emailError}</p>}
            </div>
            <div>
              <label htmlFor="auth-password" className="block text-xs font-medium text-foreground-600 mb-1.5">{t('auth.password', { keySeparator: false })}</label>
              <input id="auth-password" type="password" autoComplete="current-password" value={password}
                onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter') void handlePasswordLogin(); }}
                className="w-full px-4 py-3 rounded-xl border border-background-200/70 bg-background-50 text-sm text-foreground-800" />
              {passwordError && <p className="text-red-500 text-xs mt-1">{passwordError}</p>}
            </div>
            <button type="button" onClick={() => void handlePasswordLogin()} disabled={passwordLoading}
              className="w-full px-4 py-3 rounded-xl bg-accent-500 hover:bg-accent-600 disabled:bg-accent-300 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2">
              {passwordLoading ? <i className="ri-loader-4-line animate-spin" /> : <i className="ri-login-circle-line" />}
              {t('auth.sign_in', { keySeparator: false })}
            </button>
            <button type="button" onClick={() => { setMode('email'); setPasswordError(''); }} className="w-full text-center text-sm text-primary-600 hover:text-primary-700">
              {t('auth.use_magic_link', { keySeparator: false })}
            </button>
            <button type="button" onClick={() => { setMode('choose'); setPasswordError(''); setEmailError(''); }} className="w-full text-center text-sm text-foreground-500 hover:text-foreground-700">
              <TranslatableText i18nKey="ui.extra_back.b52b36b" />
            </button>
          </div>
        )}

        {mode === 'email_sent' && (
          <div className="space-y-4">
            <div className="text-center py-2">
              <div className="w-14 h-14 rounded-full bg-accent-100 flex items-center justify-center mx-auto mb-3">
                <i className="ri-mail-check-line text-accent-600 text-2xl"></i>
              </div>
              <p className="text-sm text-foreground-700 leading-relaxed">
                <TranslatableText i18nKey="ui.extra_we_sent_a_magic_link_to.b4c300d" /><strong className="text-foreground-900">{email}</strong><TranslatableText i18nKey="ui.extra_click_the_button_in_the_email_.8726380" /></p>
              <p className="text-xs text-foreground-400 mt-2">
                <TranslatableText i18nKey="ui.didn_t_receive_it_check_your_spam_folder_o.29992cc" />
              </p>
              {emailError && <p className="text-red-500 text-xs mt-2">{emailError}</p>}
            </div>

            <button
              onClick={handleResendMagicLink}
              className="w-full px-4 py-3 rounded-xl border border-background-200/70 bg-background-50 hover:bg-background-100 text-sm font-semibold text-foreground-800 transition-colors cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <i className="ri-refresh-line"></i> {t('ui.resend_magic_link.6392d5e', { keySeparator: false })}
            </button>

            <button
              onClick={() => { setMode('email'); setEmailError(''); }}
              className="w-full text-center text-sm text-foreground-500 hover:text-foreground-700 transition-colors cursor-pointer"
            >
              {t('ui.use_a_different_email.9725dd7', { keySeparator: false })}
            </button>
          </div>
        )}

        {mode === 'phone' && (
          <div className="space-y-4">
            <div>
              <label htmlFor="auth-phone" className="block text-xs font-medium text-foreground-600 mb-1.5">{t('ui.phone_number.ab25d61', { keySeparator: false })}</label>
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-background-200/70 bg-background-50">
                <span className="text-sm text-foreground-500 flex-shrink-0">+60</span>
                <input
                  id="auth-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setPhoneError(''); }}
                  placeholder="12-345-6789"
                  className="flex-1 bg-transparent outline-none text-sm text-foreground-800 placeholder:text-foreground-400"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSendPhoneOtp(); }}
                />
              </div>
              {phoneError && <p className="text-red-500 text-xs mt-1">{phoneError}</p>}
            </div>

            <button
              onClick={handleSendPhoneOtp}
              disabled={phoneLoading}
              className="w-full px-4 py-3 rounded-xl bg-accent-500 hover:bg-accent-600 disabled:bg-accent-300 text-white font-semibold text-sm transition-colors cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
            >
              {phoneLoading ? (
                <><i className="ri-loader-4-line animate-spin"></i> <TranslatableText i18nKey="ui.sending.c338c19" /></>
              ) : (
                <><i className="ri-send-plane-line"></i> <TranslatableText i18nKey="ui.send_code.f687607" /></>
              )}
            </button>

            <button
              onClick={() => { setMode('choose'); setPhoneError(''); }}
              className="w-full text-center text-sm text-foreground-500 hover:text-foreground-700 transition-colors cursor-pointer"
            >
              <TranslatableText i18nKey="ui.extra_back.b52b36b" /></button>
          </div>
        )}

        {mode === 'phone_otp' && (
          <div className="space-y-4">
            <div>
              <label htmlFor="auth-phone-otp" className="block text-xs font-medium text-foreground-600 mb-1.5">{t('ui.verification_code.50cdc18', { keySeparator: false })}</label>
              <input
                id="auth-phone-otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '')); setOtpError(''); }}
                placeholder={t('ui.enter_6_digit_code.4c9c785', { keySeparator: false })}
                className="w-full px-4 py-3 rounded-xl border border-background-200/70 bg-background-50 text-sm text-foreground-800 placeholder:text-foreground-400 text-center tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-primary-300 transition-all"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleVerifyPhoneOtp(); }}
              />
              {otpError && <p className="text-red-500 text-xs mt-1 text-center">{otpError}</p>}
            </div>

            <button
              onClick={handleVerifyPhoneOtp}
              disabled={otpLoading || otp.length < 4}
              className="w-full px-4 py-3 rounded-xl bg-accent-500 hover:bg-accent-600 disabled:bg-accent-300 text-white font-semibold text-sm transition-colors cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
            >
              {otpLoading ? (
                <><i className="ri-loader-4-line animate-spin"></i> <TranslatableText i18nKey="ui.verifying.bf6ea54" /></>
              ) : (
                <><i className="ri-check-line"></i> <TranslatableText i18nKey="ui.verify_sign_in.71a991c" /></>
              )}
            </button>

            <div className="flex items-center justify-between text-xs">
              <button
                onClick={() => { setMode('phone'); setOtp(''); setOtpError(''); }}
                className="text-foreground-500 hover:text-foreground-700 transition-colors cursor-pointer"
              >
                {t('ui.change_number.6c3b408', { keySeparator: false })}
              </button>
              <button
                onClick={() => { handleSendPhoneOtp(); setOtp(''); setOtpError(''); }}
                className="text-accent-600 hover:text-accent-700 font-medium transition-colors cursor-pointer"
              >
                {t('ui.resend_code.1d3cb8a', { keySeparator: false })}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  ), document.body);
}
