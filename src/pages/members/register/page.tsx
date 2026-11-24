import TranslatableText from '@/i18n/TranslatableText';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import supabase from '@/lib/supabase';
import useAuth from '@/hooks/useAuth';
import AuthModal from '@/components/feature/AuthModal';
import PhoneBindModal from '@/components/feature/PhoneBindModal';
import Navbar from '@/components/feature/Navbar';
import Footer from '@/components/feature/Footer';
import { useTranslation } from 'react-i18next';
import { isMemberRegistrationComplete } from '@/hooks/useProfileCompletionGate';


// ============================================================
// Countdown + Flash Deal helpers
// ============================================================
function getFlashEndTime(): Date {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  if (end.getTime() - now.getTime() < 2 * 60 * 60 * 1000) {
    end.setDate(end.getDate() + 1);
  }
  return end;
}

function formatCountdown(ms: number): { h: string; m: string; s: string; expired: boolean } {
  if (ms <= 0) return { h: '00', m: '00', s: '00', expired: true };
  const totalSec = Math.floor(ms / 1000);
  const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
  const s = String(totalSec % 60).padStart(2, '0');
  return { h, m, s, expired: false };
}

// ============================================================
// Flash Deal Card
// ============================================================
interface FlashDealData {
  title: string;
  subtitle: string;
  image: string;
  originalPrice: number;
  flashPrice: number;
  isFree: boolean;
  initialStock: number;
  stockDecreaseMs: number;
  linkUrl: string;
}

function FlashDealCard({ deal, flashEndTime }: { deal: FlashDealData; flashEndTime: number }) {
  const { t } = useTranslation();
  const [stock, setStock] = useState(deal.initialStock);
  const [now, setNow] = useState(Date.now());
  const stockRef = useRef(deal.initialStock);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const intv = setInterval(() => {
      stockRef.current = Math.max(0, stockRef.current - 1);
      setStock(stockRef.current);
    }, deal.stockDecreaseMs);
    return () => clearInterval(intv);
  }, [deal.stockDecreaseMs]);

  const remaining = flashEndTime - now;
  const cd = formatCountdown(remaining);
  const stockPercent = (stock / deal.initialStock) * 100;
  const urgencyLabel = stockPercent < 30 ? 'Almost Gone!' : stockPercent < 60 ? 'Selling Fast' : 'Hot Deal';
  const isAlmostGone = stockPercent < 30;
  const isDealGone = cd.expired || stock <= 0;

  return (
    <div className="group relative bg-background-50 rounded-2xl border border-background-200/70 overflow-hidden hover:border-accent-200 transition-all duration-300">
      {/* Urgency Top Banner */}
      <div className={`px-4 py-2 text-center text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 ${
        isAlmostGone ? 'bg-red-500 text-white animate-pulse' : stockPercent < 60 ? 'bg-amber-500 text-white' : 'bg-accent-500 text-white'
      }`}>
        <i className={`${isAlmostGone ? 'ri-fire-line' : 'ri-flashlight-line'} text-sm`}></i>
        {urgencyLabel}
        <span className="opacity-75"><TranslatableText i18nKey="ui.only.f0c5bef" />{stock} <TranslatableText i18nKey="ui.extra_left.12c0f1f" /></span>
      </div>

      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-background-100">
        <img src={deal.image} alt={deal.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute top-3 left-3">
          <span className="px-3 py-1.5 rounded-full bg-red-500 text-white text-xs font-bold whitespace-nowrap shadow-lg">
            {deal.isFree ? 'FREE' : `-${Math.round(((deal.originalPrice - deal.flashPrice) / deal.originalPrice) * 100)}% OFF`}
          </span>
        </div>
        <div className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-black/75 backdrop-blur-sm text-white text-[11px] font-bold whitespace-nowrap flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${isAlmostGone ? 'bg-red-400 animate-pulse' : stockPercent < 60 ? 'bg-amber-400' : 'bg-emerald-400'}`} />
          {stock} <TranslatableText i18nKey="ui.extra_left.12c0f1f" /></div>
      </div>

      {/* Info */}
      <div className="p-5 md:p-6">
        <p className="text-foreground-500 text-[11px] font-medium uppercase tracking-wide mb-1">{deal.subtitle}</p>
        <h3 className="font-heading font-bold text-foreground-800 text-base md:text-lg mb-4 leading-snug">{deal.title}</h3>

        {/* Countdown */}
        <div className="mb-4 p-3 rounded-xl bg-background-100 border border-background-200/60">
          <p className="text-[10px] text-foreground-500 font-medium uppercase tracking-wider mb-2 text-center">
            {cd.expired ? t('ui.deal_ended.9a83792', { keySeparator: false }) : 'Offer Ends In'}
          </p>
          <div className="flex items-center justify-center gap-2">
            {[{ val: cd.h, label: 'Hrs' }, { val: cd.m, label: 'Min' }, { val: cd.s, label: 'Sec' }].map((seg, i) => (
              <div key={seg.label} className="flex items-center gap-2">
                <div className="bg-foreground-900 text-white px-3 py-2 rounded-lg text-xl md:text-2xl font-mono font-bold leading-none min-w-[48px] text-center">{seg.val}</div>
                <span className="text-foreground-500 text-[10px] font-medium uppercase">{seg.label}</span>
                {i < 2 && <span className="text-foreground-400 font-bold text-lg">:</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Stock Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-foreground-500"><TranslatableText i18nKey="ui.stock_remaining.439582d" /></span>
            <span className={`font-bold ${isAlmostGone ? 'text-red-500' : 'text-foreground-700'}`}>{stockPercent.toFixed(0)}%</span>
          </div>
          <div className="w-full h-2 bg-background-200 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 ${
              isAlmostGone ? 'bg-gradient-to-r from-red-500 to-red-400' : stockPercent < 60 ? 'bg-gradient-to-r from-amber-500 to-amber-400' : 'bg-gradient-to-r from-accent-400 to-accent-300'
            }`} style={{ width: `${stockPercent}%` }} />
          </div>
        </div>

        {/* Price */}
        <div className="flex items-end justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl md:text-3xl font-heading font-bold text-foreground-800">
                {deal.isFree ? 'FREE' : `RM ${deal.flashPrice.toFixed(1)}`}
              </span>
              {!deal.isFree && <span className="text-sm text-foreground-400 line-through">RM {deal.originalPrice.toFixed(2)}</span>}
            </div>
            {!deal.isFree && <p className="text-emerald-600 text-xs font-medium mt-0.5"><TranslatableText i18nKey="ui.you_save_rm.f22552f" />{(deal.originalPrice - deal.flashPrice).toFixed(2)}</p>}
          </div>
        </div>

        {/* CTA — links to shop / courses */}
        <a
          href={isDealGone ? undefined : deal.linkUrl}
          className={`block w-full py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap text-center cursor-pointer flex items-center justify-center gap-2 ${
            isDealGone
              ? 'bg-background-200 text-foreground-400 cursor-not-allowed pointer-events-none'
              : isAlmostGone
              ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
              : 'bg-accent-500 hover:bg-accent-600 text-white'
          }`}
        >
          {cd.expired ? t('ui.deal_ended.9a83792', { keySeparator: false }) : stock <= 0 ? 'Sold Out' : (
            <><i className="ri-shopping-cart-2-line"></i>{deal.isFree ? 'View Course' : 'Shop Now'}</>
          )}
        </a>
      </div>
    </div>
  );
}

// ============================================================
// Form interfaces (for direct registration — no ref code)
// ============================================================
interface FormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  birthDate: string;
  referralCode: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  phone?: string;
  birthDate?: string;
}

// ============================================================
// Main Page
// ============================================================
export default function MemberRegister() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlRefCode = (searchParams.get('ref') || '').trim().toUpperCase();
  const { user, member, loading, isAuthReady, refreshMember, signOut } = useAuth();
  const hasVerifiedPhone = Boolean(user?.phone && user.phone_confirmed_at);
  const shouldCollectPassword = !user || !isMemberRegistrationComplete(member);
  const flashEndTimeRef = useRef<number>(getFlashEndTime().getTime());
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);
  const [phoneBindOpen, setPhoneBindOpen] = useState(false);
  const [processingReferral, setProcessingReferral] = useState(false);
  const [referralResult, setReferralResult] = useState<'idle' | 'success' | 'error'>('idle');
  const [referralMessage, setReferralMessage] = useState('');
  const referralProcessedRef = useRef(false);
  const referralPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ============================================================
  // Direct registration form state (no ref code)
  // ============================================================
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    birthDate: '',
    referralCode: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [formLoading, setFormLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [referralLink, setReferralLink] = useState('');

  const flashDeals: FlashDealData[] = [
    {
      title: 'Probiotics + Dietary Fiber Drink',
      subtitle: 'Gut Health · Digestive Wellness',
      image: 'https://readdy.ai/api/search-image?query=Premium%20probiotic%20dietary%20fiber%20wellness%20drink%20in%20elegant%20frosted%20glass%20bottle%20with%20minimalist%20label%20placed%20on%20clean%20white%20marble%20countertop%20surrounded%20by%20fresh%20green%20herbs%20sliced%20citrus%20fruit%20soft%20diffused%20natural%20window%20light%20professional%20health%20product%20lifestyle%20photography%20warm%20neutral%20cream%20background%20high%20end%20editorial%20composition&width=800&height=600&seq=flash-probiotic-v3&orientation=landscape',
      originalPrice: 59.9,
      flashPrice: 39.9,
      isFree: false,
      initialStock: 87,
      stockDecreaseMs: 8000,
      linkUrl: '/shop',
    },
    {
      title: 'Modern Child Sickness Basic Treatment — 5 Min Guide',
      subtitle: 'Parenting · Health Education · Quick Lesson',
      image: 'https://readdy.ai/api/search-image?query=Warm%20intimate%20modern%20living%20room%20scene%20gentle%20mother%20comforting%20young%20child%20on%20cozy%20beige%20sofa%20soft%20natural%20sunlight%20streaming%20through%20sheer%20curtains%20Scandinavian%20interior%20decor%20with%20neutral%20cream%20tones%20professional%20family%20healthcare%20editorial%20photography%20nurturing%20atmosphere%20soft%20focus%20background&width=800&height=600&seq=flash-child-health-v3&orientation=landscape',
      originalPrice: 20,
      flashPrice: 0,
      isFree: true,
      initialStock: 124,
      stockDecreaseMs: 5000,
      linkUrl: '/courses',
    },
  ];

  // ============================================================
  // PROCESS REFERRAL — runs when user signs in via AuthModal
  // on the register?ref=XXX page
  // ============================================================
  const processReferral = useCallback(async (authUser: typeof user, refCode: string) => {
    if (!authUser || !refCode) return;
    setProcessingReferral(true);
    setReferralResult('idle');

    try {
      const metadata = authUser.user_metadata;
      const displayName = metadata?.full_name || metadata?.name || authUser.email?.split('@')[0] || 'New Member';

      // Ensure the caller's member record + wallet exist (normally created by the
      // auth trigger) and link the referral, all server-side via SECURITY DEFINER.
      const { data: reg, error } = await supabase.rpc('register_member', {
        p_name: displayName,
        p_referral_code: refCode,
      });
      if (!error && reg?.success === false) throw new Error(reg.error || 'Registration failed.');
      const data = reg?.referral;

      if (error) {
        console.error('register_member RPC error:', error.message);
        setReferralResult('error');
        setReferralMessage('Failed to process referral. Please try again.');
        setProcessingReferral(false);
        return;
      }

      if (data?.success) {
        setReferralResult('success');
        setReferralMessage(`Welcome, ${displayName}! You and your friend will each earn RM5 after your first purchase.`);
        referralProcessedRef.current = true;
        await refreshMember();
        sessionStorage.removeItem('pendingReferralCode');

        // Check if phone needs binding
        const { data: profileData } = await supabase.rpc('get_member_profile');
        if (profileData?.member && !profileData.member.phone_verified) {
          setPhoneBindOpen(true);
        } else {
          setTimeout(() => navigate('/members/profile', { replace: true }), 1500);
        }
      } else if (data?.error === 'already_referred') {
        setReferralResult('success');
        setReferralMessage('Your account is linked! You and your friend will earn RM5 after your first purchase.');
        referralProcessedRef.current = true;
        await refreshMember();
        sessionStorage.removeItem('pendingReferralCode');

        const { data: profileData } = await supabase.rpc('get_member_profile');
        if (profileData?.member && !profileData.member.phone_verified) {
          setPhoneBindOpen(true);
        } else {
          setTimeout(() => navigate('/members/profile', { replace: true }), 1000);
        }
      } else {
        setReferralResult('error');
        setReferralMessage(data?.error || 'Failed to process referral.');
      }
    } catch (err) {
      console.error('processReferral exception:', err);
      setReferralResult('error');
      setReferralMessage(err instanceof Error ? err.message : 'Failed to process referral. Please try again.');
    } finally {
      setProcessingReferral(false);
    }
  }, [refreshMember, navigate]);

  // Auto-process referral when user appears (after AuthModal sign-in)
  useEffect(() => {
    if (!urlRefCode || !user || referralProcessedRef.current) return;

    // If member already loaded → redirect to profile (already processed or existing member)
    if (member) {
      navigate('/members/profile', { replace: true });
      return;
    }

    // If still loading, poll until member data arrives or timeout
    if (loading) {
      let pollCount = 0;
      referralPollRef.current = setInterval(async () => {
        pollCount++;
        const { data: { user: freshUser } } = await supabase.auth.getUser();
        if (!freshUser) {
          if (referralPollRef.current) clearInterval(referralPollRef.current);
          return;
        }
        const { data: rpcResult } = await supabase.rpc('get_member_profile');
        if (rpcResult?.member) {
          if (referralPollRef.current) clearInterval(referralPollRef.current);
          if (!referralProcessedRef.current) {
            await processReferral(freshUser, urlRefCode);
          }
        } else if (pollCount >= 10 && !referralProcessedRef.current) {
          // Timeout — member not created by trigger, create manually
          if (referralPollRef.current) clearInterval(referralPollRef.current);
          await processReferral(freshUser, urlRefCode);
        }
      }, 800);
    } else if (!referralProcessedRef.current) {
      // Not loading and no member — trigger might have failed, process manually
      processReferral(user, urlRefCode);
    }

    return () => {
      if (referralPollRef.current) clearInterval(referralPollRef.current);
    };
  }, [urlRefCode, user, member, loading, processReferral, navigate]);

  // Also check sessionStorage for pending referral (survives OAuth redirect to profile)
  useEffect(() => {
    if (!user || referralProcessedRef.current) return;
    const storedRef = sessionStorage.getItem('pendingReferralCode');
    if (storedRef) {
      processReferral(user, storedRef);
    }
  }, [user, processReferral]);

  // ============================================================
  // Handle Sign-in & Join click
  // ============================================================
  const handleSignInAndJoin = useCallback(() => {
    if (urlRefCode) {
      sessionStorage.setItem('pendingReferralCode', urlRefCode);
    }
    setAuthModalOpen(true);
  }, [urlRefCode]);

  // ============================================================
  // Pre-fill details from the signed-in member as well as auth metadata. This
  // lets an existing account finish registration by supplying only fields
  // that were not saved previously (for example, a missing phone number).
  // ============================================================
  useEffect(() => {
    if (user && !urlRefCode) {
      const metadata = user.user_metadata || {};
      setFormData((prev) => ({
        ...prev,
        name: member?.name || metadata.full_name || metadata.name || prev.name,
        email: user.email || member?.email || prev.email,
        phone: member?.phone || user.phone || metadata.phone || prev.phone,
        birthDate: member?.birth_date || metadata.birth_date || prev.birthDate,
      }));
    }
  }, [user, member, urlRefCode]);

  // Redirect if already a member and no referral processing needed
  useEffect(() => {
    if (isMemberRegistrationComplete(member) && !processingReferral && !referralProcessedRef.current) {
      navigate('/members/profile', { replace: true });
    }
  }, [member, processingReferral, navigate]);

  // ============================================================
  // Direct registration form logic (no ref code)
  // ============================================================
  const validate = useCallback((): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Please enter your name';
    // A confirmed Supabase phone is sufficient to register. Email can still
    // be used by accounts that have not verified a phone.
    if ((!user || !user.email) && !hasVerifiedPhone) {
      if (!formData.email.trim()) {
        newErrors.email = 'Please enter your email';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
      }
    } else if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (shouldCollectPassword) {
      if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
      if (formData.confirmPassword !== formData.password) newErrors.confirmPassword = t('auth.passwords_do_not_match', { keySeparator: false });
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Please enter your phone number';
    } else if (!/^[0-9+\-\s]{7,20}$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }
    if (!formData.birthDate) newErrors.birthDate = 'Please select your birth date';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, user, hasVerifiedPhone, shouldCollectPassword, t]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }, [errors]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const hp = (e.currentTarget as HTMLFormElement).querySelector('input[name="company_alt"]') as HTMLInputElement;
    if (hp && hp.value.trim()) {
      setStatus('success');
      setStatusMessage('Welcome to H2H Rewards!');
      return;
    }

    setFormLoading(true);
    setStatus('idle');
    let signInConfirmationRequired = false;

    try {
      let reg;
      let regErr;
      if (user) {
        if (!user.email && !hasVerifiedPhone) {
          const requestedEmail = formData.email.trim().toLowerCase();
          const { error: emailError } = await supabase.auth.updateUser(
            {
              email: requestedEmail,
              // Keep the registration details while Supabase waits for the
              // email confirmation. The member row is created after the
              // address is confirmed and the form is submitted again.
              data: {
                full_name: formData.name.trim(),
                phone: formData.phone.trim(),
                birth_date: formData.birthDate,
              },
            },
            { emailRedirectTo: `${window.location.origin}/members/register` },
          );
          if (emailError) throw emailError;

          setStatus('success');
          setStatusMessage(t('registration.email_confirmation_sent', { email: requestedEmail, keySeparator: false }));
          return;
        }

        ({ data: reg, error: regErr } = await supabase.rpc('register_member', {
            p_name: formData.name.trim(),
            p_phone: formData.phone.trim(),
            p_birth_date: formData.birthDate || null,
            p_referral_code: formData.referralCode.trim() || null,
            p_pay_referral_bonus: true,
          }));
      } else {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: formData.email.trim(),
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/members/profile`,
            data: {
              full_name: formData.name.trim(),
              phone: formData.phone.trim(),
              birth_date: formData.birthDate,
            },
          },
        });
        if (signUpError) throw signUpError;
        signInConfirmationRequired = !signUpData.session;
        setNeedsEmailConfirmation(signInConfirmationRequired);

        // Email confirmation may be required by Supabase. In that case create
        // the member as a guest; signing in later with this email links it.
        const registration = signUpData.session
          ? await supabase.rpc('register_member', {
              p_name: formData.name.trim(),
              p_phone: formData.phone.trim(),
              p_birth_date: formData.birthDate || null,
              p_referral_code: formData.referralCode.trim() || null,
              p_pay_referral_bonus: false,
            })
          : await supabase.rpc('register_guest_member', {
            p_name: formData.name.trim(),
            p_email: formData.email.trim(),
            p_phone: formData.phone.trim(),
            p_birth_date: formData.birthDate || null,
            p_referral_code: formData.referralCode.trim() || null,
          });
        reg = registration.data;
        regErr = registration.error;
        if (signInConfirmationRequired && reg?.success === false && reg.error === 'email_taken') {
          // Some auth setups provision the member row from the new auth user
          // before this guest-registration RPC runs.
          reg = { success: true };
          regErr = null;
        }
      }
      if (regErr) throw regErr;
      if (reg?.success === false) {
        const messages: Record<string, string> = {
          email_taken: 'This email is already registered. Please sign in instead.',
          email_mismatch: t('registration.email_mismatch', { keySeparator: false }),
          phone_taken: 'This phone number is already registered to another member.',
          phone_mismatch: 'The phone number in your profile does not match the phone number verified for this account.',
          already_registered: 'This email or phone number is already registered.',
          invalid_name: 'Please enter a valid name.',
          invalid_email: 'Please enter a valid email address.',
          invalid_phone: 'Please enter a valid phone number.',
        };
        if (reg.error === 'email_taken') setErrors((prev) => ({ ...prev, email: messages.email_taken }));
        if (reg.error === 'phone_taken' || reg.error === 'phone_mismatch') {
          setErrors((prev) => ({ ...prev, phone: messages[reg.error] }));
        }
        throw new Error(messages[reg.error] || 'Registration failed. Please try again.');
      }

      if (user && shouldCollectPassword) {
        const { error: passwordError } = await supabase.auth.updateUser({ password: formData.password });
        if (passwordError) throw passwordError;
      }
      if (user) {
        await refreshMember();
        const { data: savedProfile, error: profileError } = await supabase.rpc('get_member_profile');
        if (profileError) throw profileError;
        const savedMember = savedProfile?.member;
        if (!(savedMember?.name?.trim() && (savedMember.email?.trim() || savedMember.phone_verified) && savedMember.phone?.trim() && savedMember.birth_date)) {
          throw new Error(t('registration.profile_still_incomplete', { keySeparator: false }));
        }
      }

      const link = reg?.referral_code ? `${window.location.origin}/members/register?ref=${reg.referral_code}` : '';
      setReferralLink(link);
      setStatus('success');
      let msg = `Welcome to H2H Rewards, ${formData.name}!`;
      if (reg.referral?.bonus_paid) {
        msg += ' You earned 5 bonus points.';
      } else if (reg.referral?.success) {
        msg += ' You and your friend will each earn RM5 after your first purchase.';
      } else if (reg.referral?.error === 'referrer_not_found') {
        msg += ' (The referral code was not found.)';
      }
      if (!user) {
        msg += signInConfirmationRequired
          ? ` Check ${formData.email.trim()} for a confirmation email, then sign in with your email and password.`
          : ` You can now sign in with ${formData.email.trim()} and your password to view your points.`;
      }
      setStatusMessage(msg);
    } catch (err) {
      setStatus('error');
      setStatusMessage(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setFormLoading(false);
    }
  }, [formData, validate, user, hasVerifiedPhone, shouldCollectPassword, refreshMember, t]);

  const copyLink = useCallback(() => {
    navigator.clipboard.writeText(referralLink);
    setStatusMessage('Referral link copied to clipboard!');
  }, [referralLink]);

  // ============================================================
  // SUCCESS STATE — direct registration only
  // ============================================================
  if (status === 'success' && !urlRefCode) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-amber-50 via-yellow-50/70 to-amber-100/80">
        <Navbar />
        <div className="pt-24 md:pt-32 pb-16 md:pb-24">
          <div className="mx-auto px-4 md:px-6 max-w-[1440px]">
            <div className="max-w-lg mx-auto">
              <div className="bg-background-50 rounded-2xl border border-background-200/70 p-6 md:p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                  <i className="ri-check-line text-emerald-600 text-2xl"></i>
                </div>
                <h2 className="font-heading text-xl font-bold text-foreground-800 mb-2"><TranslatableText i18nKey="ui.you_are_in.156d979" /></h2>
                <p className="text-foreground-600 text-sm mb-6">{statusMessage}</p>
                {referralLink && <div className="bg-background-100 rounded-xl p-4 mb-4 text-left">
                  <div className="text-xs text-foreground-500 mb-1.5 font-medium">{t('ui.your_referral_link.d5b05bb', { keySeparator: false })}</div>
                  <div className="flex items-center gap-2">
                    <input type="text" readOnly value={referralLink} className="flex-1 bg-background-50 border border-background-200/70 rounded-lg px-3 py-2 text-xs text-foreground-700 font-mono" />
                    <button onClick={copyLink} className="px-3 py-2 rounded-lg bg-accent-500 hover:bg-accent-600 text-white text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1">
                      <i className="ri-file-copy-line"></i><TranslatableText i18nKey="ui.extra_copy.af74f7c" /></button>
                  </div>
                  <p className="text-[11px] text-foreground-500 mt-2"><TranslatableText i18nKey="ui.share_this_link_you_and_your_friend_each_g.61e695b" /></p>
                </div>}
                {needsEmailConfirmation ? (
                  <button type="button" onClick={() => setAuthModalOpen(true)} className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-accent-500 hover:bg-accent-600 text-white font-semibold text-sm transition-colors cursor-pointer">
                    <i className="ri-login-circle-line"></i>{t('auth.sign_in', { keySeparator: false })}
                  </button>
                ) : (
                  <a href="/members/profile" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-accent-500 hover:bg-accent-600 text-white font-semibold text-sm transition-colors cursor-pointer">
                    <i className="ri-user-line"></i>{t('ui.go_to_my_profile.03d61c6', { keySeparator: false })}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
        <Footer />
        <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      </main>
    );
  }

  // ============================================================
  // REFERRAL FLOW — hero + flash deals + Sign-in & Join
  // ============================================================
  if (urlRefCode) {
    const loggedIn = !!user;

    return (
      <main className="min-h-screen bg-background-50">
        <Navbar />

        {/* Hero Section */}
        <section className="relative pt-20 md:pt-24 overflow-hidden">
          <div className="absolute inset-0">
            <img
              src="https://readdy.ai/api/search-image?query=Premium%20abstract%20dark%20gradient%20background%20with%20warm%20golden%20light%20rays%20and%20soft%20glowing%20particles%20elegant%20luxury%20brand%20atmosphere%20with%20deep%20charcoal%20and%20champagne%20gold%20tones%20sophisticated%20event%20invitation%20aesthetic&width=1600&height=900&seq=register-hero-bg&orientation=landscape"
              alt=""
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
          </div>
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-20 left-[10%] w-64 h-64 rounded-full bg-accent-500/30 blur-3xl" />
            <div className="absolute bottom-20 right-[10%] w-96 h-96 rounded-full bg-amber-500/20 blur-3xl" />
          </div>

          <div className="relative mx-auto px-4 md:px-6 max-w-[1440px] py-14 md:py-20">
            <div className="text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 text-white/90 text-xs font-semibold mb-6">
                <i className="ri-gift-line"></i>
                <TranslatableText i18nKey="ui.you_have_been_invited.8660a69" />
              </div>

              <h1 className="font-heading text-2xl md:text-4xl lg:text-5xl font-extrabold text-white mb-3 leading-tight">
                <TranslatableText i18nKey="ui.join_h2h_claim.09a1d5a" />{' '}
                <span className="bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-300 bg-clip-text text-transparent">
                  <TranslatableText i18nKey="ui.exclusive_rewards.26658d2" />
                </span>
              </h1>

              <p className="text-white/70 text-sm md:text-base max-w-xl mx-auto mb-6 leading-relaxed">
                <TranslatableText i18nKey="ui.your_friend_invited_you_to_h2h_sign_up_now.a5428b4" /><strong className="text-amber-300"><TranslatableText i18nKey="ui.rm5_bonus_points.09f2e42" /></strong><TranslatableText i18nKey="ui.extra_plus_grab_these_invite_only_fl.169dcea" /></p>

              {/* Referral code badge */}
              <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-5 py-3 mb-8">
                <span className="text-white/60 text-xs font-medium"><TranslatableText i18nKey="ui.referral_code.462243f" /></span>
                <span className="text-white font-mono font-bold text-lg tracking-wider">{urlRefCode}</span>
                <span className="text-amber-400 text-xs font-semibold"><TranslatableText i18nKey="ui.valid.8df186a" /></span>
              </div>

              {/* Sign-in & Join OR Processing / Result */}
              {!isAuthReady || loading ? (
                <div className="flex items-center justify-center gap-2 text-white/70">
                  <i className="ri-loader-4-line animate-spin"></i>
                  <span className="text-sm"><TranslatableText i18nKey="ui.loading.b04ba49" /></span>
                </div>
              ) : processingReferral ? (
                <div className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 text-white font-bold text-base">
                  <i className="ri-loader-4-line animate-spin text-amber-400"></i>
                  <TranslatableText i18nKey="ui.processing_your_referral.9535db7" />
                </div>
              ) : referralResult === 'success' ? (
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-sm font-semibold">
                    <i className="ri-check-double-line"></i>
                    {referralMessage}
                  </div>
                  <br />
                  <button
                    onClick={() => navigate('/members/profile')}
                    className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-amber-400 to-accent-500 hover:from-amber-500 hover:to-accent-600 text-white font-bold text-base transition-all cursor-pointer shadow-lg shadow-amber-500/30 hover:shadow-amber-500/40 whitespace-nowrap"
                  >
                    <i className="ri-user-line"></i>
                    {t('ui.go_to_my_profile.03d61c6', { keySeparator: false })}
                  </button>
                </div>
              ) : referralResult === 'error' ? (
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-red-500/20 border border-red-400/30 text-red-300 text-sm font-semibold">
                    <i className="ri-error-warning-line"></i>
                    {referralMessage}
                  </div>
                  <br />
                  <button
                    onClick={() => { setReferralResult('idle'); referralProcessedRef.current = false; }}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/20 hover:bg-white/30 text-white font-semibold text-sm transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <i className="ri-refresh-line"></i>
                    {t('ui.try_again.cef2fe0', { keySeparator: false })}
                  </button>
                </div>
              ) : !loggedIn ? (
                <button
                  onClick={handleSignInAndJoin}
                  className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-amber-400 to-accent-500 hover:from-amber-500 hover:to-accent-600 text-white font-bold text-base transition-all cursor-pointer shadow-lg shadow-amber-500/30 hover:shadow-amber-500/40 hover:-translate-y-0.5 whitespace-nowrap"
                >
                  <i className="ri-login-circle-line text-lg"></i>
                  <TranslatableText i18nKey="ui.sign_in_join_earn_rm5_point.701e75e" /></button>
              ) : null}
            </div>
          </div>
        </section>

        {/* Flash Deals Grid */}
        <section className="py-10 md:py-16 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-background-50 via-amber-50/30 to-background-50" />
          <div className="relative mx-auto px-4 md:px-6 max-w-[1440px]">
            <div className="text-center mb-8 md:mb-10">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-100 border border-red-200 text-red-600 text-xs font-bold uppercase tracking-wider mb-4">
                <i className="ri-flashlight-fill"></i>{t('ui.flash_sale.5e88e96', { keySeparator: false })}
              </div>
              <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground-800 mb-3">
                <TranslatableText i18nKey="ui.invite_only_flash_deals.5de625c" />
              </h2>
              <p className="text-foreground-500 text-sm md:text-base max-w-lg mx-auto">
                <TranslatableText i18nKey="ui.sign_in_above_to_claim_these_exclusive_dea.94bae1d" />
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 max-w-5xl mx-auto" data-product-shop>
              {flashDeals.map((deal) => (
                <FlashDealCard key={deal.title} deal={deal} flashEndTime={flashEndTimeRef.current} />
              ))}
            </div>

            {/* Bottom CTA */}
            {!loggedIn && isAuthReady && !loading && (
              <div className="text-center mt-10">
                <p className="text-foreground-500 text-sm mb-4">
                  <TranslatableText i18nKey="ui.sign_in_to_claim_these_exclusive_deals_ear.12225e0" /></p>
                <button
                  onClick={handleSignInAndJoin}
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-gradient-to-r from-amber-400 to-accent-500 hover:from-amber-500 hover:to-accent-600 text-white font-bold text-base transition-all cursor-pointer shadow-lg shadow-accent-500/20 whitespace-nowrap"
                >
                  <i className="ri-login-circle-line"></i>
                  <TranslatableText i18nKey="ui.sign_in_join_now_earn_rm5_point.6c0e9dd" /></button>
              </div>
            )}
          </div>
        </section>

        <Footer />
        <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
        <PhoneBindModal
          isOpen={phoneBindOpen}
          onClose={() => setPhoneBindOpen(false)}
          onSuccess={() => {
            refreshMember();
            setPhoneBindOpen(false);
            setTimeout(() => navigate('/members/profile', { replace: true }), 800);
          }}
        />
      </main>
    );
  }

  // ============================================================
  // DIRECT REGISTRATION — no ref code
  // ============================================================
  return (
    <main className="min-h-screen bg-background-50">
      <Navbar />

      <div className="pt-24 md:pt-32 pb-16 md:pb-24">
        <div className="mx-auto px-4 md:px-6 max-w-[1440px]">
          <div className="max-w-lg mx-auto">
            {/* Header */}
            <div className="text-center mb-8 md:mb-10">
              <div className="w-16 h-16 rounded-2xl bg-accent-100 flex items-center justify-center mx-auto mb-4">
                <i className="ri-vip-crown-line text-accent-600 text-2xl"></i>
              </div>
              <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground-800">
                <TranslatableText i18nKey="ui.join_h2h_rewards.bc4ceac" />
              </h1>
              {user && (
                <div className="flex items-center justify-center gap-1.5 mt-1.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                    <i className="ri-check-line text-emerald-600 text-xs"></i>
                  </div>
                  <span className="text-emerald-700 text-xs font-medium"><TranslatableText i18nKey="ui.signed_in_as.a02107c" />{user.email || user.phone}</span>
                </div>
              )}
              <p className="text-foreground-600 text-sm md:text-base mt-2">
                <TranslatableText i18nKey="ui.become_a_member_and_start_earning_points_o.a0f7ddd" />
              </p>
            </div>

            <form onSubmit={handleSubmit} className="bg-background-50 rounded-2xl border border-background-200/70 p-6 md:p-8">
              {/* Honeypot */}
              <div className="absolute opacity-0 -z-10" aria-hidden="true">
                <input type="text" name="company_alt" tabIndex={-1} autoComplete="off" aria-hidden="true" readOnly className="w-0 h-0" />
              </div>

              <div className="space-y-5">
                {/* Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-foreground-700 mb-1.5">
                    {t('ui.full_name.64346b4', { keySeparator: false })} <span className="text-red-500">*</span>
                  </label>
                  <input id="name" name="name" type="text" value={formData.name} onChange={handleChange}
                    className={`w-full px-4 py-3 rounded-xl border bg-background-50 text-sm text-foreground-800 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-300 transition-all ${errors.name ? 'border-red-300 focus:ring-red-200' : 'border-background-200/70'}`}
                    placeholder="e.g. Sarah Lim" />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>

                {/* Email */}
                {!(hasVerifiedPhone && !user?.email) && <div>
                  <label htmlFor="email" className="block text-sm font-medium text-foreground-700 mb-1.5">
                    <TranslatableText i18nKey="ui.extra_email.84add5b" />{!hasVerifiedPhone && <span className="text-red-500">*</span>}
                  </label>
                  <input id="email" name="email" type="email" value={user?.email || formData.email} onChange={handleChange} readOnly={Boolean(user?.email)}
                    className={`w-full px-4 py-3 rounded-xl border bg-background-50 text-sm text-foreground-800 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-300 transition-all ${errors.email ? 'border-red-300 focus:ring-red-200' : 'border-background-200/70'}`}
                    placeholder="you@example.com" />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                  {user && (
                    <p className="text-foreground-500 text-[11px] mt-1">
                      {user.email
                        ? <><TranslatableText i18nKey="ui.your_membership_is_linked_to_the_account_y.fd6a4ca" />{' '}
                          <button type="button" onClick={() => void signOut()} className="text-primary-600 hover:underline cursor-pointer">
                            {t('ui.use_a_different_account.9bdf700', { keySeparator: false })}
                          </button></>
                        : t('registration.phone_account_add_email_hint', { keySeparator: false })}
                    </p>
                  )}
                </div>}

                {/* Password for email/password sign-in */}
                {shouldCollectPassword && (
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-foreground-700 mb-1.5">
                      <TranslatableText i18nKey="auth.password" /><span className="text-red-500">*</span>
                    </label>
                    <input id="password" name="password" type="password" value={formData.password} onChange={handleChange}
                      autoComplete="new-password" minLength={6}
                      className={`w-full px-4 py-3 rounded-xl border bg-background-50 text-sm text-foreground-800 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-300 transition-all ${errors.password ? 'border-red-300 focus:ring-red-200' : 'border-background-200/70'}`}
                      placeholder={t('auth.password_min_length', { keySeparator: false, count: 6 })} />
                    {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                  </div>
                )}

                {shouldCollectPassword && (
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground-700 mb-1.5">
                      <TranslatableText i18nKey="auth.confirm_password" /><span className="text-red-500">*</span>
                    </label>
                    <input id="confirmPassword" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange}
                      autoComplete="new-password" minLength={6}
                      className={`w-full px-4 py-3 rounded-xl border bg-background-50 text-sm text-foreground-800 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-300 transition-all ${errors.confirmPassword ? 'border-red-300 focus:ring-red-200' : 'border-background-200/70'}`}
                      placeholder={t('auth.reenter_password', { keySeparator: false })} />
                    {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
                  </div>
                )}

                {/* Phone */}
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-foreground-700 mb-1.5">
                    {t('ui.phone_number.ab25d61', { keySeparator: false })} <span className="text-red-500">*</span>
                  </label>
                  <input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange}
                    className={`w-full px-4 py-3 rounded-xl border bg-background-50 text-sm text-foreground-800 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-300 transition-all ${errors.phone ? 'border-red-300 focus:ring-red-200' : 'border-background-200/70'}`}
                    placeholder="+60 12-345-6789" />
                  {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                </div>

                {/* Birth Date */}
                <div>
                  <label htmlFor="birthDate" className="block text-sm font-medium text-foreground-700 mb-1.5">
                    {t('ui.birth_date.a6989f1', { keySeparator: false })} <span className="text-red-500">*</span>
                  </label>
                  <input id="birthDate" name="birthDate" type="date" value={formData.birthDate} onChange={handleChange}
                    className={`w-full px-4 py-3 rounded-xl border bg-background-50 text-sm text-foreground-800 focus:outline-none focus:ring-2 focus:ring-primary-300 transition-all ${errors.birthDate ? 'border-red-300 focus:ring-red-200' : 'border-background-200/70'}`} />
                  {errors.birthDate && <p className="text-red-500 text-xs mt-1">{errors.birthDate}</p>}
                  <p className="text-foreground-500 text-[11px] mt-1"><TranslatableText i18nKey="ui.used_for_your_birthday_gift.bf70d23" /></p>
                </div>

                {/* Referral Code */}
                <div>
                  <label htmlFor="referralCode" className="block text-sm font-medium text-foreground-700 mb-1.5">
                    <TranslatableText i18nKey="ui.referral_code.462243f" /><span className="text-foreground-400 font-normal"><TranslatableText i18nKey="ui.optional.c53994e" /></span>
                  </label>
                  <input id="referralCode" name="referralCode" type="text" value={formData.referralCode}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border bg-background-50 text-sm text-foreground-800 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-300 transition-all uppercase border-background-200/70"
                    placeholder="e.g. H2HABC123" />
                  <p className="text-foreground-500 text-[11px] mt-1"><TranslatableText i18nKey="ui.have_a_friend_code_enter_it_here_you_both.f4da19d" /></p>
                </div>
              </div>

              {/* Error */}
              {status === 'error' && (
                <div className="mt-5 p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2">
                  <i className="ri-error-warning-line text-red-500 mt-0.5"></i>
                  <p className="text-red-600 text-sm">{statusMessage}</p>
                </div>
              )}

              {/* Submit */}
              <button type="submit" disabled={formLoading}
                className="w-full mt-6 px-6 py-3.5 rounded-full bg-accent-500 hover:bg-accent-600 disabled:bg-accent-300 text-white font-semibold text-sm transition-colors cursor-pointer inline-flex items-center justify-center gap-2">
                {formLoading ? (
                  <><i className="ri-loader-4-line animate-spin"></i><TranslatableText i18nKey="ui.processing.272bc02" /></>
                ) : (
                  <><i className="ri-user-add-line"></i><TranslatableText i18nKey="ui.join_h2h_member_free.beaba7f" /></>
                )}
              </button>

              <p className="text-center text-foreground-500 text-xs mt-4">
                <TranslatableText i18nKey="ui.by_joining_you_agree_to_our_membership_ter.1de92fd" />
              </p>
            </form>
            {!user && (
              <p className="text-center text-foreground-600 text-sm mt-5">
                {t('auth.already_have_account', { keySeparator: false })}{' '}
                <button type="button" onClick={() => setAuthModalOpen(true)} className="text-primary-600 hover:text-primary-700 font-semibold cursor-pointer">
                  {t('auth.sign_in', { keySeparator: false })}
                </button>
              </p>
            )}
          </div>
        </div>
      </div>

      <Footer />
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </main>
  );
}
