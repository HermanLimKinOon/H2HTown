import TranslatableText from '@/i18n/TranslatableText';
import { useState, useCallback, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import supabase from '@/lib/supabase';
import useAuth from '@/hooks/useAuth';
import AuthModal from '@/components/feature/AuthModal';
import PhoneBindModal from '@/components/feature/PhoneBindModal';
import Navbar from '@/components/feature/Navbar';
import Footer from '@/components/feature/Footer';
import { useProducts } from '@/hooks/useProducts';
import { useFavorites } from '@/hooks/useFavorites';
import { useCourses } from '@/hooks/useCourses';
import { useCourseFavorites } from '@/hooks/useCourseFavorites';
import { useTranslation } from 'react-i18next';


/* ─── Credit-card visual components (mirrors Home/Rewards) ─── */
function CreditCardChip({ colorClass }: { colorClass: string }) {
  return (
    <div className={`w-9 h-7 rounded-md bg-gradient-to-br ${colorClass} border border-white/20 relative overflow-hidden flex items-center justify-center`}>
      <div className="absolute inset-0.5 rounded-sm border border-white/10" />
      <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-4 h-3 border border-white/20 rounded-sm" />
      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 w-2 h-3 border-l border-white/20" />
    </div>
  );
}

function ContactlessIcon({ className = '' }: { className?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M8.5 8.5C7 10 7 14 8.5 15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
      <path d="M11 6C8.5 8.5 8.5 15.5 11 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.85" />
      <path d="M13.5 3.5C9.5 7.5 9.5 16.5 13.5 20.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function CardPattern() {
  return (
    <div className="absolute inset-0 opacity-[0.08] pointer-events-none">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="cardPattern" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
            <circle cx="30" cy="30" r="1.5" fill="currentColor" />
            <circle cx="0" cy="0" r="1" fill="currentColor" />
            <circle cx="60" cy="0" r="1" fill="currentColor" />
            <circle cx="0" cy="60" r="1" fill="currentColor" />
            <circle cx="60" cy="60" r="1" fill="currentColor" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#cardPattern)" />
      </svg>
    </div>
  );
}

const tierConfig: Record<string, {
  bgGradient: string;
  chipColor: string;
  textColor: string;
  mutedTextColor: string;
  accentTextColor: string;
  borderColor: string;
  shadowColor: string;
  contactlessOpacity: string;
  cornerColor: string;
}> = {
  Member: {
    bgGradient: 'from-orange-400 via-amber-500 to-orange-300',
    chipColor: 'from-amber-300 to-yellow-500',
    textColor: 'text-amber-900',
    mutedTextColor: 'text-amber-900/50',
    accentTextColor: 'text-amber-800',
    borderColor: 'border-orange-300/60',
    shadowColor: 'shadow-orange-200/50',
    contactlessOpacity: 'text-amber-900/40',
    cornerColor: 'border-amber-900/20',
  },
  Silver: {
    bgGradient: 'from-slate-300 via-gray-200 to-slate-400',
    chipColor: 'from-gray-100 to-gray-400',
    textColor: 'text-slate-700',
    mutedTextColor: 'text-slate-700/50',
    accentTextColor: 'text-slate-600',
    borderColor: 'border-slate-300/60',
    shadowColor: 'shadow-slate-200/50',
    contactlessOpacity: 'text-slate-600/40',
    cornerColor: 'border-slate-700/20',
  },
  Gold: {
    bgGradient: 'from-yellow-300 via-amber-400 to-yellow-200',
    chipColor: 'from-yellow-200 to-amber-500',
    textColor: 'text-yellow-900',
    mutedTextColor: 'text-yellow-900/50',
    accentTextColor: 'text-yellow-800',
    borderColor: 'border-yellow-400/60',
    shadowColor: 'shadow-yellow-200/50',
    contactlessOpacity: 'text-yellow-900/40',
    cornerColor: 'border-yellow-900/20',
  },
  VIP: {
    bgGradient: 'from-neutral-700 via-neutral-800 to-neutral-900',
    chipColor: 'from-neutral-500 to-neutral-700',
    textColor: 'text-white',
    mutedTextColor: 'text-white/50',
    accentTextColor: 'text-white/90',
    borderColor: 'border-neutral-600/60',
    shadowColor: 'shadow-neutral-900/30',
    contactlessOpacity: 'text-white/40',
    cornerColor: 'border-white/20',
  },
};

/* ─── Benefits data ─── */
const allBenefits = [
  { tier: 'Member', benefits: ['ui.access_all_free_courses.83900f6', 'ui.earn_points_on_every_purchase.ed19c1d', 'ui.member_exclusive_live_alerts.7bbd150'] },
  { tier: 'Silver', benefits: ['ui.birthday_gift.a82d435', 'ui.1_free_designated_course_per_year.ce98613', 'ui.all_member_benefits.97b4cd5'] },
  { tier: 'Gold', benefits: ['ui.birthday_gift.a82d435', 'ui.2_free_designated_courses_per_year.395e08c', 'ui.vip_launch_event_invites.f70553f', 'ui.all_silver_benefits.7cdb725'] },
  { tier: 'VIP', benefits: ['ui.birthday_gift.a82d435', 'ui.2_free_designated_courses_per_year.395e08c', 'ui.vip_launch_event_invites.f70553f', 'ui.5_extra_discount_on_all_products_courses.3c19a1e', 'ui.all_gold_benefits.4f10c80'] },
];

const tierOrder = ['Member', 'Silver', 'Gold', 'VIP'];

/* ─── Profile page ─── */
const genderOptions = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Prefer not to say', value: 'undisclosed' },
];

const countryCodes = [
  { code: '+60', label: 'Malaysia +60' },
  { code: '+65', label: 'Singapore +65' },
  { code: '+62', label: 'Indonesia +62' },
  { code: '+66', label: 'Thailand +66' },
  { code: '+63', label: 'Philippines +63' },
  { code: '+84', label: 'Vietnam +84' },
  { code: '+1', label: 'US/Canada +1' },
  { code: '+44', label: 'UK +44' },
  { code: '+86', label: 'China +86' },
  { code: '+91', label: 'India +91' },
  { code: '+81', label: 'Japan +81' },
  { code: '+82', label: 'South Korea +82' },
  { code: '+61', label: 'Australia +61' },
  { code: '+64', label: 'New Zealand +64' },
];

const malaysianStates = [
  'Johor', 'Kedah', 'Kelantan', 'Kuala Lumpur', 'Labuan',
  'Melaka', 'Negeri Sembilan', 'Pahang', 'Penang', 'Perak',
  'Perlis', 'Putrajaya', 'Sabah', 'Sarawak', 'Selangor', 'Terengganu',
];

export default function Profile() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, member, wallet, loading, isAuthReady, memberError, signOut, refreshMember } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [phoneBindOpen, setPhoneBindOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'summary' | 'detail'>('summary');
  const [activeSection, setActiveSection] = useState<'profile' | 'info' | 'address' | 'favorites'>('profile');
  const { products } = useProducts();
  const { productIds: favoriteIds, loading: favoritesLoading, error: favoritesError, toggle: toggleFavorite } = useFavorites(member?.id);
  const { courses } = useCourses();
  const { courseIds: favoriteCourseIds, loading: favoriteCoursesLoading, error: favoriteCoursesError, toggle: toggleCourseFavorite } = useCourseFavorites(member?.id);
  const favoriteProducts = products.filter((product) => favoriteIds.includes(product.id));
  const favoriteCourses = courses.filter((course) => favoriteCourseIds.includes(course.id));

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const section = params.get('section');
    if (section === 'favorites' || section === 'info' || section === 'address' || section === 'profile') {
      setActiveSection(section);
    }
    if (section === 'info' && params.get('edit') === '1') setViewMode('detail');
  }, [location.search]);

  // Detail form state
  const [phoneCode, setPhoneCode] = useState('+60');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [gender, setGender] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [addressUnit, setAddressUnit] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [area, setArea] = useState('');

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [passwordStep, setPasswordStep] = useState<'closed' | 'verify'>('closed');
  const [passwordOtp, setPasswordOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordMessageSuccess, setPasswordMessageSuccess] = useState(false);
  const [singingOut, setSingingOut] = useState(false);
  const [profileCompletionClaimed, setProfileCompletionClaimed] = useState(false);
  const [referralPoints, setReferralPoints] = useState<number>(0);
  const checkedRef = useRef(false);
  const formEditedRef = useRef(false);
  const formRestoredRef = useRef(false);

  // Restore form state from sessionStorage on mount (handles tab switch)
  useEffect(() => {
    if (formRestoredRef.current) return;
    try {
      const saved = sessionStorage.getItem('profileDetailForm');
      if (saved) {
        const parsed = JSON.parse(saved);
        setPhoneCode(parsed.phoneCode || '+60');
        setPhoneNumber(parsed.phoneNumber || '');
        setGender(parsed.gender || '');
        setBirthYear(parsed.birthYear || '');
        setBirthMonth(parsed.birthMonth || '');
        setBirthDay(parsed.birthDay || '');
        setAddressLine(parsed.addressLine || '');
        setAddressUnit(parsed.addressUnit || '');
        setPostalCode(parsed.postalCode || '');
        setArea(parsed.area || '');
        formEditedRef.current = true;
      }
    } catch { /* ignore */ }
    formRestoredRef.current = true;
  }, []);

  // Persist form state to sessionStorage whenever any field changes
  useEffect(() => {
    if (!formEditedRef.current) return;
    sessionStorage.setItem('profileDetailForm', JSON.stringify({
      phoneCode, phoneNumber, gender, birthYear, birthMonth, birthDay,
      addressLine, addressUnit, postalCode, area,
    }));
  }, [phoneCode, phoneNumber, gender, birthYear, birthMonth, birthDay, addressLine, addressUnit, postalCode, area]);

  // Clear sessionStorage when leaving the profile page entirely
  useEffect(() => {
    return () => {
      sessionStorage.removeItem('profileDetailForm');
    };
  }, []);

  // Process pending referral from sessionStorage (set by register?ref= page before AuthModal)
  useEffect(() => {
    if (!user || !member) return;
    const storedRef = sessionStorage.getItem('pendingReferralCode');
    if (!storedRef) return;

    const processStoredReferral = async () => {
      try {
        const { data, error } = await supabase.rpc('process_referral', {
          p_referral_code: storedRef,
          p_new_member_id: member.id,
        });

        if (error) {
          console.error('process_referral RPC error:', error.message);
          sessionStorage.removeItem('pendingReferralCode');
          return;
        }

        if (data?.success) {
          console.log('Referral processed:', data.message);
        } else if (data?.error === 'already_referred' || data?.error === 'self_referral') {
          // Already handled — just clear
        } else if (data?.error) {
          console.error('process_referral failed:', data.error);
        }

        sessionStorage.removeItem('pendingReferralCode');
        await refreshMember();
      } catch (err) {
        console.error('process_referral exception:', err);
        sessionStorage.removeItem('pendingReferralCode');
      }
    };

    processStoredReferral();
  }, [user, member, refreshMember]);

  // Fetch referral points
  useEffect(() => {
    if (!member) return;
    const fetchReferralPoints = async () => {
      const { data, error } = await supabase.rpc('get_referral_points');
      if (!error && typeof data === 'number') {
        setReferralPoints(data);
      }
    };
    fetchReferralPoints();
  }, [member]);

  // Check if profile completion was already claimed
  useEffect(() => {
    if (!member || checkedRef.current) return;
    checkedRef.current = true;

    const checkIfClaimed = async () => {
      const { data } = await supabase.rpc('has_claimed_profile_completion');
      if (data === true) setProfileCompletionClaimed(true);
    };
    checkIfClaimed();
  }, [member]);

  // Populate form when entering detail mode (only if user hasn't edited yet)
  useEffect(() => {
    if (member && !formEditedRef.current) {
      setPhoneCode(member.phone_country_code || '+60');
      setPhoneNumber(member.phone || '');
      setGender(member.gender || '');
      if (member.birth_date) {
        const parts = member.birth_date.split('-');
        if (parts.length === 3) {
          setBirthYear(parts[0]);
          setBirthMonth(parts[1]);
          setBirthDay(parts[2]);
        }
      } else {
        setBirthYear('');
        setBirthMonth('');
        setBirthDay('');
      }
      setAddressLine(member.address_line || '');
      setAddressUnit(member.address_unit || '');
      setPostalCode(member.postal_code || '');
      setArea(member.area || '');
    }
  }, [member]);

  // Mark form as edited on any field change
  const markFormEdited = useCallback(() => {
    if (!formEditedRef.current) {
      formEditedRef.current = true;
    }
  }, []);

  const isProfileIncomplete = member
    ? (!member.phone_country_code || !member.phone || !member.gender || !member.birth_date || !member.address_line || !member.postal_code || !member.area)
    : false;

  const canClaimCompletion = isProfileIncomplete && !profileCompletionClaimed;

  const handleSaveAndClaimPoints = useCallback(async () => {
    if (!member || !user) return;
    if (!addressUnit.trim() || !addressLine.trim() || !postalCode.trim() || !area.trim()) {
      setSaveSuccess(false);
      setSaveMsg('Please complete Unit, Postal Code, Address, and Area / State.');
      return;
    }
    setSaving(true);
    setSaveMsg('');
    setSaveSuccess(false);

    try {
      const combinedBirthDate = birthYear && birthMonth && birthDay
        ? `${birthYear}-${birthMonth.padStart(2, '0')}-${birthDay.padStart(2, '0')}`
        : null;

      // Update profile via SECURITY DEFINER RPC (bypasses table-level GRANT)
      const { data: updateData, error: updateErr } = await supabase.rpc('update_member_profile', {
        p_phone_country_code: phoneCode,
        p_phone: phoneNumber.trim() || null,
        p_gender: gender || null,
        p_birth_date: combinedBirthDate,
        p_address_line: addressLine.trim() || null,
        p_postal_code: postalCode.trim() || null,
        p_area: area.trim() || null,
      });

      if (updateErr) throw updateErr;
      if (updateData?.error) throw new Error(updateData.error);

      const { data: addressData, error: addressErr } = await supabase.rpc('update_member_address', {
        p_address_line: addressLine.trim(),
        p_address_unit: addressUnit.trim(),
        p_postal_code: postalCode.trim(),
        p_area: area.trim(),
      });
      if (addressErr) throw addressErr;
      if (addressData?.success === false || addressData?.error) throw new Error(addressData.error || 'Failed to save shipping address.');

      // Check if this is first-time full completion — grant 3 points
      const allFieldsFilled = phoneCode && phoneNumber.trim() && gender && combinedBirthDate && addressUnit.trim() && addressLine.trim() && postalCode.trim() && area.trim();

      if (allFieldsFilled && !profileCompletionClaimed) {
        // Server re-checks the saved profile and grants the bonus at most once.
        const { data: claimData, error: pointsErr } = await supabase.rpc('claim_profile_completion');

        if (claimData?.error === 'already_claimed') {
          setSaveMsg('Profile updated successfully!');
          setProfileCompletionClaimed(true);
        } else if (pointsErr || !claimData?.success) {
          console.error('Failed to grant points:', pointsErr?.message ?? claimData?.error);
          setSaveMsg('Profile updated! Points could not be granted — please contact support.');
        } else {
          setSaveMsg('Profile updated! You earned +3 bonus points!');
          setProfileCompletionClaimed(true);
        }
      } else if (allFieldsFilled && profileCompletionClaimed) {
        setSaveMsg('Profile updated successfully!');
      } else {
        setSaveMsg('Profile updated! Fill all fields to earn your +3 bonus points.');
      }
      setSaveSuccess(true);

      await refreshMember();
      setViewMode('summary');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save profile';
      setSaveMsg(msg);
    } finally {
      setSaving(false);
    }
  }, [member, user, phoneCode, phoneNumber, gender, birthYear, birthMonth, birthDay, addressLine, addressUnit, postalCode, area, profileCompletionClaimed, refreshMember]);

  const handleStartPasswordChange = useCallback(async () => {
    if (!user) return;
    const destination = user.email && user.email_confirmed_at
      ? user.email
      : user.phone && user.phone_confirmed_at
        ? user.phone
        : null;
    if (!destination) {
      setPasswordMessage(t('account_password.no_verified_contact', { keySeparator: false }));
      setPasswordMessageSuccess(false);
      return;
    }

    setPasswordBusy(true);
    setPasswordMessage('');
    try {
      const { error } = await supabase.auth.reauthenticate();
      if (error) throw error;
      setPasswordStep('verify');
      setPasswordMessage(t('account_password.code_sent', { destination, keySeparator: false }));
      setPasswordMessageSuccess(true);
    } catch (err) {
      setPasswordMessage(err instanceof Error ? err.message : t('account_password.send_failed', { keySeparator: false }));
      setPasswordMessageSuccess(false);
    } finally {
      setPasswordBusy(false);
    }
  }, [user, t]);

  const handleConfirmPasswordChange = useCallback(async () => {
    if (passwordOtp.trim().length < 6) {
      setPasswordMessage(t('account_password.enter_code', { keySeparator: false }));
      setPasswordMessageSuccess(false);
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMessage(t('account_password.password_minimum', { keySeparator: false }));
      setPasswordMessageSuccess(false);
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordMessage(t('auth.passwords_do_not_match', { keySeparator: false }));
      setPasswordMessageSuccess(false);
      return;
    }

    setPasswordBusy(true);
    setPasswordMessage('');
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword, nonce: passwordOtp.trim() });
      if (error) throw error;
      setPasswordMessage(t('account_password.updated', { keySeparator: false }));
      setPasswordMessageSuccess(true);
      setPasswordStep('closed');
      setPasswordOtp('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      setPasswordMessage(err instanceof Error ? err.message : t('account_password.update_failed', { keySeparator: false }));
      setPasswordMessageSuccess(false);
    } finally {
      setPasswordBusy(false);
    }
  }, [passwordOtp, newPassword, confirmNewPassword, t]);

  const handleResendPasswordCode = useCallback(async () => {
    setPasswordBusy(true);
    setPasswordMessage('');
    try {
      const { error } = await supabase.auth.reauthenticate();
      if (error) throw error;
      setPasswordMessage(t('account_password.code_resent', { keySeparator: false }));
      setPasswordMessageSuccess(true);
    } catch (err) {
      setPasswordMessage(err instanceof Error ? err.message : t('account_password.send_failed', { keySeparator: false }));
      setPasswordMessageSuccess(false);
    } finally {
      setPasswordBusy(false);
    }
  }, [t]);

  const handleSignOut = useCallback(async () => {
    setSingingOut(true);
    await signOut();
    navigate('/');
  }, [signOut, navigate]);

  const handleSaveAddress = useCallback(async () => {
    if (!member || !user) return;
    if (!addressUnit.trim() || !addressLine.trim() || !postalCode.trim() || !area.trim()) {
      setSaveSuccess(false);
      setSaveMsg('Please enter your unit, postal code, address, and area/state.');
      return;
    }
    setSaving(true);
    setSaveMsg('');
    setSaveSuccess(false);
    try {
      const { data, error } = await supabase.rpc('update_member_address', {
        p_address_line: addressLine.trim(),
        p_address_unit: addressUnit.trim() || null,
        p_postal_code: postalCode.trim(),
        p_area: area.trim(),
      });
      if (error) throw error;
      if (data?.success === false || data?.error) throw new Error(data.error || 'Failed to save address.');
      await refreshMember();
      setSaveSuccess(true);
      setSaveMsg(t('ui.address_saved_successfully.b2538ee', { keySeparator: false }));
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : 'Failed to save address.');
    } finally {
      setSaving(false);
    }
  }, [member, user, addressLine, addressUnit, postalCode, area, refreshMember]);

  // Auto-retry loading member data if user exists but member is missing.
  // Keep retrying even after memberError — first OAuth loads often hit
  // not_authenticated / permission races and used to flash the error page.
  useEffect(() => {
    if (!user || member || loading) return;
    let attempts = 0;
    const timer = setInterval(() => {
      attempts++;
      void refreshMember();
      if (attempts >= 8) clearInterval(timer);
    }, 1500);
    return () => clearInterval(timer);
  }, [user, member, loading, refreshMember]);

  // Prefer spinner over error flash while OAuth / member setup is still settling.
  // After 18s, allow the real error UI so users are not stuck forever.
  const [allowErrorUi, setAllowErrorUi] = useState(false);
  useEffect(() => {
    if (!user || member) {
      setAllowErrorUi(false);
      return;
    }
    if (!memberError) return;
    const timer = window.setTimeout(() => setAllowErrorUi(true), 18000);
    return () => window.clearTimeout(timer);
  }, [user, member, memberError]);

  const transientSetup =
    Boolean(memberError) &&
    /permission denied|not ready|not_authenticated|session not ready/i.test(memberError || '');
  const showSetupSpinner = Boolean(user && !member && !allowErrorUi && (loading || !memberError || transientSetup));

  // Loading
  if (loading || !isAuthReady || showSetupSpinner) {
    return (
      <main className="min-h-screen bg-background-50">
        <Navbar />
        <div className="pt-28 md:pt-36 pb-20 flex items-center justify-center">
          <div className="text-center px-4">
            <i className="ri-loader-4-line animate-spin text-accent-500 text-3xl"></i>
            <p className="mt-4 text-sm text-foreground-500"><TranslatableText i18nKey="ui.setting_up_your_profile.8955bfe" /></p>
          </div>
        </div>
      </main>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <main className="min-h-screen bg-background-50">
        <Navbar />
        <div className="pt-28 md:pt-36 pb-20 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="w-16 h-16 rounded-2xl bg-background-100 flex items-center justify-center mx-auto mb-4">
              <i className="ri-shield-user-line text-foreground-400 text-2xl"></i>
            </div>
            <h1 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-2">
              {t('ui.my_profile.9ba8d39', { keySeparator: false })}
            </h1>
            <p className="text-foreground-600 text-sm mb-6">
              <TranslatableText i18nKey="ui.sign_in_to_view_your_profile_and_rewards.e6edac9" />
            </p>
            <button
              onClick={() => setAuthModalOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-accent-500 hover:bg-accent-600 text-white font-semibold text-sm transition-colors cursor-pointer"
            >
              <i className="ri-login-circle-line"></i>
              <TranslatableText i18nKey="ui.extra_sign_in.f8492cc" /></button>
          </div>
        </div>
        <Footer />
        <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      </main>
    );
  }

  // Logged in but no member record yet
  if (!member) {
    const hasError = Boolean(memberError);
    const notFound = memberError?.toLowerCase().includes('no member record found');
    return (
      <main className="min-h-screen bg-background-50">
        <Navbar />
        <div className="pt-28 md:pt-36 pb-20 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${hasError ? (notFound ? 'bg-amber-100' : 'bg-red-100') : 'bg-amber-100'}`}>
              <i className={`text-2xl ${hasError ? (notFound ? 'ri-user-search-line text-amber-600' : 'ri-error-warning-line text-red-500') : 'ri-loader-4-line animate-spin text-amber-600'}`}></i>
            </div>
            <h1 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-2">
              {hasError ? (notFound ? t('ui.member_profile_missing.45b6a8a', { keySeparator: false }) : t('ui.something_went_wrong.9cd1f1a', { keySeparator: false })) : t('ui.setting_up_your_profile.36c476d', { keySeparator: false })}
            </h1>
            <p className="text-foreground-600 text-sm mb-6">
              {hasError
                ? (notFound
                    ? t('ui.we_could_not_find_a_member_profile_linked.dbd82f2', { keySeparator: false })
                    : t('ui.we_could_not_load_your_member_profile.e4effd5', { keySeparator: false }))
                : "We're preparing your H2H member profile — this should only take a moment."}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-4">
              {notFound ? (
                <Link
                  to="/members/register"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-accent-500 hover:bg-accent-600 text-white font-semibold text-sm transition-colors cursor-pointer"
                >
                  <i className="ri-user-add-line"></i>
                  {t('ui.register_now.74d8290', { keySeparator: false })}
                </Link>
              ) : (
                <button
                  onClick={() => refreshMember()}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-accent-500 hover:bg-accent-600 text-white font-semibold text-sm transition-colors cursor-pointer"
                >
                  <i className="ri-refresh-line"></i>
                  {t('ui.try_again.cef2fe0', { keySeparator: false })}
                </button>
              )}
              <button
                onClick={() => navigate('/members/register')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-background-200/70 text-foreground-700 font-medium text-sm hover:bg-background-100 transition-colors cursor-pointer"
              >
                <i className="ri-user-add-line"></i>
                <TranslatableText i18nKey="ui.manual_registration.4d0aba4" />
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  const tierIdx = tierOrder.indexOf(member.tier);
  const cfg = tierConfig[member.tier] || tierConfig.Member;

  // ======================
  // DETAIL VIEW (editing)
  // ======================
  if (viewMode === 'detail') {
    return (
      <main className="min-h-screen bg-background-50">
        <Navbar />

        <div className="pt-24 md:pt-32 pb-16 md:pb-24">
          <div className="mx-auto px-4 md:px-6 max-w-[1440px]">
            <div className="max-w-2xl mx-auto">

              {/* Header */}
              <div className="flex items-center gap-4 mb-8">
                <button
                  onClick={() => { setViewMode('summary'); setSaveMsg(''); }}
                  className="w-10 h-10 rounded-xl border border-background-200/70 flex items-center justify-center hover:bg-background-100 transition-colors cursor-pointer"
                >
                  <i className="ri-arrow-left-line text-foreground-600"></i>
                </button>
                <div>
                  <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground-800"><TranslatableText i18nKey="ui.my_profile_detail.f90236c" /></h1>
                  <p className="text-foreground-500 text-sm mt-1"><TranslatableText i18nKey="ui.fill_in_your_details_to_earn_3_bonus_point.ba4fbec" /></p>
                </div>
              </div>

              {/* Form */}
              <div className="bg-background-50 rounded-2xl border border-background-200/70 p-6 md:p-8 space-y-7">

                {/* Phone Number */}
                <div>
                  <label className="block text-sm font-semibold text-foreground-800 mb-2">
                    {t('ui.phone_number.ab25d61', { keySeparator: false })} <span className="text-red-400">*</span>
                  </label>
                  <div className="flex gap-2">
                    <div className="relative w-[140px] flex-shrink-0">
                      <select
                        value={phoneCode}
                        onChange={(e) => { setPhoneCode(e.target.value); markFormEdited(); }}
                        className="w-full h-11 px-3 pr-8 rounded-xl border border-background-200/70 bg-background-50 text-sm text-foreground-800 focus:outline-none focus:ring-2 focus:ring-primary-300 appearance-none cursor-pointer"
                      >
                        {countryCodes.map((c) => (
                          <option key={c.code} value={c.code}>{c.label}</option>
                        ))}
                      </select>
                      <i className="ri-arrow-down-s-line absolute right-2.5 top-1/2 -translate-y-1/2 text-foreground-400 pointer-events-none text-xs"></i>
                    </div>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => { setPhoneNumber(e.target.value.replace(/[^0-9]/g, '')); markFormEdited(); }}
                      placeholder="12 345 6789"
                      maxLength={15}
                      className="flex-1 h-11 px-4 rounded-xl border border-background-200/70 bg-background-50 text-sm text-foreground-800 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-300"
                    />
                  </div>
                  <p className="text-foreground-400 text-xs mt-1.5"><TranslatableText i18nKey="ui.select_country_code_then_enter_number_with.6f12c38" /></p>
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-sm font-semibold text-foreground-800 mb-2">
                    <TranslatableText i18nKey="ui.extra_gender.8a754c6" /><span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={gender}
                      onChange={(e) => { setGender(e.target.value); markFormEdited(); }}
                      className="w-full h-11 px-4 pr-10 rounded-xl border border-background-200/70 bg-background-50 text-sm text-foreground-800 focus:outline-none focus:ring-2 focus:ring-primary-300 appearance-none cursor-pointer"
                    >
                      <option value=""><TranslatableText i18nKey="ui.select_gender.589b2bc" /></option>
                      {genderOptions.map((g) => (
                        <option key={g.value} value={g.value}>{g.label}</option>
                      ))}
                    </select>
                    <i className="ri-arrow-down-s-line absolute right-3.5 top-1/2 -translate-y-1/2 text-foreground-400 pointer-events-none text-sm"></i>
                  </div>
                </div>

                {/* Birthday */}
                <div>
                  <label className="block text-sm font-semibold text-foreground-800 mb-2">
                    <TranslatableText i18nKey="ui.extra_birthday.a6b9d69" /><span className="text-red-400">*</span>
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={birthYear}
                        onChange={(e) => { setBirthYear(e.target.value.replace(/[^0-9]/g, '').slice(0, 4)); markFormEdited(); }}
                        placeholder="YYYY"
                        maxLength={4}
                        className="w-full h-11 px-4 rounded-xl border border-background-200/70 bg-background-50 text-sm text-foreground-800 placeholder:text-foreground-400 text-center focus:outline-none focus:ring-2 focus:ring-primary-300"
                      />
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={birthMonth}
                        onChange={(e) => {
                          const v = e.target.value.replace(/[^0-9]/g, '').slice(0, 2);
                          if (v === '' || (parseInt(v) >= 1 && parseInt(v) <= 12)) { setBirthMonth(v); markFormEdited(); }
                        }}
                        placeholder="MM"
                        maxLength={2}
                        className="w-full h-11 px-4 rounded-xl border border-background-200/70 bg-background-50 text-sm text-foreground-800 placeholder:text-foreground-400 text-center focus:outline-none focus:ring-2 focus:ring-primary-300"
                      />
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={birthDay}
                        onChange={(e) => {
                          const v = e.target.value.replace(/[^0-9]/g, '').slice(0, 2);
                          if (v === '' || (parseInt(v) >= 1 && parseInt(v) <= 31)) { setBirthDay(v); markFormEdited(); }
                        }}
                        placeholder="DD"
                        maxLength={2}
                        className="w-full h-11 px-4 rounded-xl border border-background-200/70 bg-background-50 text-sm text-foreground-800 placeholder:text-foreground-400 text-center focus:outline-none focus:ring-2 focus:ring-primary-300"
                      />
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-background-200/70 pt-1">
                  <p className="text-sm font-semibold text-foreground-700 mb-3">{t('ui.shipping_address.dbd7c38', { keySeparator: false })}</p>
                </div>

                {/* Unit */}
                <div>
                  <label className="block text-sm font-semibold text-foreground-800 mb-2">
                    <TranslatableText i18nKey="ui.extra_unit.f6b935a" /><span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={addressUnit}
                    onChange={(e) => { setAddressUnit(e.target.value); markFormEdited(); }}
                    placeholder="e.g. A-12-3"
                    className="w-full h-11 px-4 rounded-xl border border-background-200/70 bg-background-50 text-sm text-foreground-800 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-300"
                  />
                </div>

                {/* Postal Code */}
                <div>
                  <label className="block text-sm font-semibold text-foreground-800 mb-2">
                    {t('ui.postal_code.c7ac934', { keySeparator: false })} <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={postalCode}
                    onChange={(e) => { setPostalCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 5)); markFormEdited(); }}
                    placeholder="e.g. 50450"
                    maxLength={5}
                    className="w-full h-11 px-4 rounded-xl border border-background-200/70 bg-background-50 text-sm text-foreground-800 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-300"
                  />
                </div>

                {/* Address Line */}
                <div>
                  <label className="block text-sm font-semibold text-foreground-800 mb-2">
                    <TranslatableText i18nKey="ui.extra_address.d70f93d" /><span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={addressLine}
                    onChange={(e) => { setAddressLine(e.target.value); markFormEdited(); }}
                    placeholder="e.g. No. 12, Jalan Ampang, Kampung Baru"
                    className="w-full h-11 px-4 rounded-xl border border-background-200/70 bg-background-50 text-sm text-foreground-800 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-300"
                  />
                </div>

                {/* Area / State */}
                <div>
                  <label className="block text-sm font-semibold text-foreground-800 mb-2">
                    {t('ui.area_state.2db9898', { keySeparator: false })} <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={area}
                      onChange={(e) => { setArea(e.target.value); markFormEdited(); }}
                      className="w-full h-11 px-4 pr-10 rounded-xl border border-background-200/70 bg-background-50 text-sm text-foreground-800 focus:outline-none focus:ring-2 focus:ring-primary-300 appearance-none cursor-pointer"
                    >
                      <option value=""><TranslatableText i18nKey="ui.select_state_area.dd34c85" /></option>
                      {malaysianStates.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <i className="ri-arrow-down-s-line absolute right-3.5 top-1/2 -translate-y-1/2 text-foreground-400 pointer-events-none text-sm"></i>
                  </div>
                </div>

                {/* Messages */}
                {saveMsg && (
                  <div className={`p-4 rounded-xl ${saveSuccess ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                    <p className={`text-sm ${saveSuccess ? 'text-emerald-700' : 'text-red-600'}`}>{saveMsg}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    onClick={handleSaveAndClaimPoints}
                    disabled={saving}
                    className={`flex-1 px-6 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap flex items-center justify-center gap-2 ${
                      canClaimCompletion
                        ? 'bg-gradient-to-r from-emerald-500 to-accent-500 hover:from-emerald-600 hover:to-accent-600 text-white'
                        : 'bg-accent-500 hover:bg-accent-600 text-white'
                    }`}
                  >
                    {saving ? (
                      <><i className="ri-loader-4-line animate-spin"></i> <TranslatableText i18nKey="ui.saving.ae7e887" /></>
                    ) : canClaimCompletion ? (
                      <><i className="ri-gift-line"></i> <TranslatableText i18nKey="ui.save_earn_3_pts.ebb2e62" /></>
                    ) : (
                      <><i className="ri-save-line"></i> <TranslatableText i18nKey="ui.save_profile.909bf3e" /></>
                    )}
                  </button>
                  <button
                    onClick={() => { setViewMode('summary'); setSaveMsg(''); }}
                    className="px-6 py-3 rounded-xl border border-background-200/70 text-foreground-600 text-sm font-medium hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <TranslatableText i18nKey="ui.extra_cancel.77dfd21" /></button>
                </div>

              </div>
            </div>

            <section className="mt-6 rounded-2xl border border-background-200/70 bg-background-50 p-6 md:p-8">
              <div className="mb-5 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                  <i className="ri-lock-password-line text-lg" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground-800">{t('account_password.change_password', { keySeparator: false })}</h2>
                  <p className="mt-1 text-sm text-foreground-500">{t('account_password.verification_required', { keySeparator: false })}</p>
                </div>
              </div>

              {passwordStep === 'closed' ? (
                <button
                  type="button"
                  onClick={() => void handleStartPasswordChange()}
                  disabled={passwordBusy}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-600 disabled:opacity-50"
                >
                  {passwordBusy && <i className="ri-loader-4-line animate-spin" />}
                  {t('account_password.verify_and_continue', { keySeparator: false })}
                </button>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-foreground-600">{t('account_password.code_instructions', { keySeparator: false })}</p>
                  <div>
                    <label htmlFor="password-reauth-code" className="mb-1.5 block text-sm font-medium text-foreground-700">{t('account_password.verification_code', { keySeparator: false })}</label>
                    <input
                      id="password-reauth-code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={passwordOtp}
                      onChange={(e) => setPasswordOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 8))}
                      className="h-11 w-full rounded-xl border border-background-200/70 bg-background-50 px-4 text-sm text-foreground-800 focus:outline-none focus:ring-2 focus:ring-primary-300"
                    />
                  </div>
                  <div>
                    <label htmlFor="new-password" className="mb-1.5 block text-sm font-medium text-foreground-700">{t('account_password.new_password', { keySeparator: false })}</label>
                    <input
                      id="new-password"
                      type="password"
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="h-11 w-full rounded-xl border border-background-200/70 bg-background-50 px-4 text-sm text-foreground-800 focus:outline-none focus:ring-2 focus:ring-primary-300"
                    />
                  </div>
                  <div>
                    <label htmlFor="confirm-new-password" className="mb-1.5 block text-sm font-medium text-foreground-700">{t('account_password.confirm_new_password', { keySeparator: false })}</label>
                    <input
                      id="confirm-new-password"
                      type="password"
                      autoComplete="new-password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="h-11 w-full rounded-xl border border-background-200/70 bg-background-50 px-4 text-sm text-foreground-800 focus:outline-none focus:ring-2 focus:ring-primary-300"
                    />
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button type="button" onClick={() => void handleConfirmPasswordChange()} disabled={passwordBusy} className="inline-flex items-center gap-2 rounded-xl bg-accent-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-600 disabled:opacity-50">
                      {passwordBusy && <i className="ri-loader-4-line animate-spin" />}{t('account_password.update_password', { keySeparator: false })}
                    </button>
                    <button type="button" onClick={() => void handleResendPasswordCode()} disabled={passwordBusy} className="rounded-xl border border-background-200/70 px-5 py-2.5 text-sm font-medium text-foreground-700 hover:bg-background-100 disabled:opacity-50">
                      {t('account_password.resend_code', { keySeparator: false })}
                    </button>
                    <button type="button" onClick={() => { setPasswordStep('closed'); setPasswordMessage(''); setPasswordOtp(''); setNewPassword(''); setConfirmNewPassword(''); }} className="rounded-xl px-4 py-2.5 text-sm font-medium text-foreground-500 hover:bg-background-100">
                      {t('ui.extra_cancel.77dfd21', { keySeparator: false })}
                    </button>
                  </div>
                </div>
              )}

              {passwordMessage && (
                <p role="status" className={`mt-4 rounded-xl border p-3 text-sm ${passwordMessageSuccess ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
                  {passwordMessage}
                </p>
              )}
            </section>
          </div>
        </div>

        <Footer />
      </main>
    );
  }

  // ======================
  // SUMMARY VIEW
  // ======================
  return (
    <main className="min-h-screen bg-background-50">
      <Navbar />

      <div className="pt-24 md:pt-32 pb-16 md:pb-24">
        <div className="mx-auto px-4 md:px-6 max-w-[1440px]">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-[230px_minmax(0,1fr)] gap-6 md:gap-8">
            <aside className="h-fit rounded-2xl border border-background-200/70 bg-background-50 p-3 md:sticky md:top-28">
              <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-foreground-400"><TranslatableText i18nKey="ui.extra_account.85dfa32" /></p>
              <button
                type="button"
                onClick={() => setActiveSection('profile')}
                className={`w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition-colors ${activeSection === 'profile' ? 'bg-accent-50 text-accent-700' : 'text-foreground-600 hover:bg-background-100'}`}
              >
                <i className="ri-user-line text-lg" /> {t('ui.my_profile.9ba8d39', { keySeparator: false })}
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('info')}
                className={`w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition-colors ${activeSection === 'info' ? 'bg-accent-50 text-accent-700' : 'text-foreground-600 hover:bg-background-100'}`}
              >
                <i className="ri-contacts-line text-lg" /> {t('ui.my_info.5ba9ae5', { keySeparator: false })}
              </button>
              <button
                type="button"
                onClick={() => { setActiveSection('address'); setSaveMsg(''); }}
                className={`w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition-colors ${activeSection === 'address' ? 'bg-accent-50 text-accent-700' : 'text-foreground-600 hover:bg-background-100'}`}
              >
                <i className="ri-map-pin-line text-lg" /> <span>{t('ui.shipping_address.dbd7c38', { keySeparator: false })}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('favorites')}
                className={`w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition-colors ${activeSection === 'favorites' ? 'bg-accent-50 text-accent-700' : 'text-foreground-600 hover:bg-background-100'}`}
              >
                <i className="ri-heart-line text-lg" /> {t('ui.my_favorite.b8e8230', { keySeparator: false })}
              </button>
            </aside>
            <div className="min-w-0">
            {activeSection === 'profile' ? <>

            {/* Page Header */}
            <div className="mb-8">
              <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground-800">{t('ui.my_profile.9ba8d39', { keySeparator: false })}</h1>
              <p className="text-foreground-500 text-sm mt-1"><TranslatableText i18nKey="ui.your_h2h_member_hub.21200dd" /></p>
            </div>

            {/* Phone Verification Banner */}
            {member && !member.phone_verified && (
              <div className="mb-6 p-5 md:p-6 rounded-2xl bg-gradient-to-r from-red-50 via-orange-50 to-red-50 border border-red-200/60 cursor-pointer hover:shadow-md transition-all group"
                onClick={() => setPhoneBindOpen(true)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-red-500 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <i className="ri-smartphone-line text-white text-xl"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground-800 text-sm md:text-base">
                      <TranslatableText i18nKey="ui.verify_your_phone_number.f78b1f6" /><span className="text-red-500 font-bold"><TranslatableText i18nKey="ui.extra_required.eed6bfb" /></span>
                    </h3>
                    <p className="text-foreground-600 text-xs md:text-sm mt-1">
                      <TranslatableText i18nKey="ui.bind_your_malaysian_mobile_number_to_activ.1c1c791" />
                    </p>
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold group-hover:bg-red-600 transition-colors whitespace-nowrap">
                    <span><TranslatableText i18nKey="ui.verify_now.b8b46df" /></span>
                    <i className="ri-arrow-right-line group-hover:translate-x-0.5 transition-transform"></i>
                  </div>
                </div>
              </div>
            )}

            {/* Profile Completion Golden Banner */}
            {canClaimCompletion && (
              <div className="mb-6 p-5 md:p-6 rounded-2xl bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 border border-amber-200/60 cursor-pointer hover:shadow-md transition-all group"
                onClick={() => setViewMode('detail')}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <i className="ri-gift-line text-white text-xl"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground-800 text-sm md:text-base">
                      <TranslatableText i18nKey="ui.complete_your_profile_earn.3355f0f" /><span className="text-amber-600 font-bold">{t('ui.3_bonus_points.046e3ee', { keySeparator: false })}</span>
                    </h3>
                    <p className="text-foreground-600 text-xs md:text-sm mt-1">
                      <TranslatableText i18nKey="ui.fill_in_your_phone_gender_birthday_and_add.eed2d14" />
                    </p>
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold group-hover:bg-amber-600 transition-colors whitespace-nowrap">
                    <span><TranslatableText i18nKey="ui.complete_now.f32bb93" /></span>
                    <i className="ri-arrow-right-line group-hover:translate-x-0.5 transition-transform"></i>
                  </div>
                </div>
              </div>
            )}

            {/* Points Claimed Success */}
            {profileCompletionClaimed && saveSuccess && (
              <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                  <i className="ri-check-line text-white text-sm"></i>
                </div>
                <div>
                  <p className="text-emerald-800 text-sm font-medium">{t('ui.3_bonus_points_earned.78e7e00', { keySeparator: false })}</p>
                  <p className="text-emerald-600 text-xs"><TranslatableText i18nKey="ui.profile_completed_your_points_are_ready_to.678a637" /></p>
                </div>
              </div>
            )}

            {/* Main Info Card */}
            <div className="bg-background-50 rounded-2xl border border-background-200/70 p-6 md:p-8 mb-6">
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                {/* Avatar */}
                <div className="w-20 h-20 rounded-full bg-accent-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-2xl font-bold">
                    {member.name.charAt(0).toUpperCase()}
                  </span>
                </div>

                {/* Name + Email + Tier */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div>
                      <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-800">
                        <TranslatableText i18nKey="ui.extra_welcome.240b822" />{member.name}
                      </h2>
                      <p className="text-foreground-500 text-sm mt-0.5">{member.email}</p>
                    </div>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border bg-orange-50 border-orange-200 w-fit">
                      <div className="w-2 h-2 rounded-full bg-gradient-to-br from-orange-400 to-amber-500" />
                      <span className="font-bold text-xs text-orange-700">{member.tier}</span>
                    </div>
                  </div>

                  {/* Quick info snippets */}
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 mt-3">
                    <span className="text-xs text-foreground-500">
                      <span className="text-foreground-400"><TranslatableText i18nKey="ui.member_id.7a88b23" /></span> <span className="font-mono font-medium text-foreground-700">#{member.id}</span>
                    </span>
                    <span className="text-xs text-foreground-500">
                      <span className="text-foreground-400"><TranslatableText i18nKey="ui.extra_joined.43a1c62" /></span> <span className="font-medium text-foreground-700">{new Date(member.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </span>
                    {member.referral_code && (
                      <span className="text-xs text-foreground-500">
                        <span className="text-foreground-400"><TranslatableText i18nKey="ui.extra_code.adac693" /></span> <span className="font-mono font-medium text-accent-600">{member.referral_code}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Edit Button */}
                <button
                  onClick={() => setViewMode('detail')}
                  className="flex-shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-500 hover:bg-accent-600 text-white text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-edit-line"></i>
                  {t('ui.edit_profile.cd280a4', { keySeparator: false })}
                </button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {/* Points */}
              <div className="bg-background-50 rounded-2xl border border-background-200/70 p-5 md:p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-accent-100 flex items-center justify-center">
                    <i className="ri-coin-line text-accent-600 text-lg"></i>
                  </div>
                  <span className="text-foreground-500 text-xs font-medium uppercase tracking-wider"><TranslatableText i18nKey="ui.points_balance.de5082b" /></span>
                </div>
                <div className="font-heading text-2xl md:text-3xl font-bold text-foreground-800">
                  {wallet?.points_balance?.toLocaleString() || '0'}
                </div>
                <p className="text-foreground-500 text-xs mt-1"><TranslatableText i18nKey="ui.rm.bf448c8" />{wallet?.points_balance || 0} <TranslatableText i18nKey="ui.extra_off.da7a687" /></p>
              </div>

              {/* Muslim Fund */}
              <div className="bg-background-50 rounded-2xl border border-background-200/70 p-5 md:p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <i className="ri-heart-3-line text-emerald-600 text-lg"></i>
                  </div>
                  <span className="text-foreground-500 text-xs font-medium uppercase tracking-wider"><TranslatableText i18nKey="ui.muslim_fund.e9f8232" /></span>
                </div>
                <div className="font-heading text-2xl md:text-3xl font-bold text-emerald-700">
                  RM {(wallet?.muslim_donation_total || 0).toLocaleString()}
                </div>
                <p className="text-emerald-600 text-xs mt-1"><TranslatableText i18nKey="ui.donated_to_community.b2e5931" /></p>
              </div>

              {/* Yearly Spend */}
              <div className="bg-background-50 rounded-2xl border border-background-200/70 p-5 md:p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
                    <i className="ri-shopping-bag-3-line text-primary-600 text-lg"></i>
                  </div>
                  <span className="text-foreground-500 text-xs font-medium uppercase tracking-wider"><TranslatableText i18nKey="ui.this_year_spent.41a693b" /></span>
                </div>
                <div className="font-heading text-2xl md:text-3xl font-bold text-foreground-800">
                  RM {(wallet?.total_spent_this_year || 0).toLocaleString()}
                </div>
                {tierIdx < tierOrder.length - 1 && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs text-foreground-500 mb-1">
                      <span><TranslatableText i18nKey="ui.extra_progress_to.bc5e6d5" />{tierOrder[tierIdx + 1]}</span>
                      <span>
                        RM {(wallet?.total_spent_this_year || 0).toLocaleString()} / RM {tierIdx === 0 ? '1,000' : tierIdx === 1 ? '5,000' : '10,000'}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-background-200 rounded-full overflow-hidden">
                      {(() => {
                        const thresholds = [0, 1000, 5000, 10000];
                        const current = wallet?.total_spent_this_year || 0;
                        const ct = thresholds[tierIdx];
                        const nt = thresholds[tierIdx + 1];
                        const pct = Math.min(100, ((current - ct) / (nt - ct)) * 100);
                        return (
                          <div className="h-full bg-gradient-to-r from-accent-400 to-accent-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ─── Credit-card Tier Card ─── */}
            <div className="mb-6">
              {/* Credit Card Visual */}
              <div className={`relative rounded-2xl overflow-hidden shadow-lg ${cfg.shadowColor} border ${cfg.borderColor} aspect-[1.586/1] max-w-lg mx-auto mb-5`}>
                {/* Background Gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${cfg.bgGradient}`} />
                {/* Metallic sheen */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-transparent to-white/10 pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/5 pointer-events-none" />
                {/* Decorative corner ornaments */}
                <div className={`absolute top-3 left-3 w-6 h-6 border-l-2 border-t-2 ${cfg.cornerColor} rounded-tl-lg`} />
                <div className={`absolute top-3 right-3 w-6 h-6 border-r-2 border-t-2 ${cfg.cornerColor} rounded-tr-lg`} />
                <div className={`absolute bottom-3 left-3 w-6 h-6 border-l-2 border-b-2 ${cfg.cornerColor} rounded-bl-lg`} />
                <div className={`absolute bottom-3 right-3 w-6 h-6 border-r-2 border-b-2 ${cfg.cornerColor} rounded-br-lg`} />
                {/* Dot pattern */}
                <div className={`${cfg.textColor}`}>
                  <CardPattern />
                </div>
                {/* Content */}
                <div className="relative z-10 h-full flex flex-col justify-between p-4 md:p-5">
                  {/* Top row: Chip + Contactless + Brand */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <CreditCardChip colorClass={cfg.chipColor} />
                      <ContactlessIcon className={cfg.contactlessOpacity} />
                    </div>
                    <div className={`font-heading font-bold text-[10px] md:text-xs tracking-[0.2em] uppercase ${cfg.mutedTextColor}`}>
                      <TranslatableText i18nKey="ui.h2h_rewards.520f7eb" />
                    </div>
                  </div>
                  {/* Middle: Card number style */}
                  <div className={`font-mono text-sm md:text-base tracking-[0.15em] ${cfg.mutedTextColor} flex items-center gap-2`}>
                    <span>****</span>
                    <span>****</span>
                    <span>****</span>
                    <span className={`text-xs font-bold ${cfg.accentTextColor}`}>{String(tierIdx + 1).padStart(4, '0')}</span>
                  </div>
                  {/* Bottom: Tier name + info */}
                  <div>
                    <div className={`font-heading text-lg md:text-xl font-bold ${cfg.textColor} tracking-wide`}>
                      {member.tier}
                    </div>
                    <div className={`text-[10px] md:text-xs mt-0.5 ${cfg.mutedTextColor}`}>
                      {tierIdx === 0 ? 'No minimum — Join free' : `Annual Spend ≥ RM${tierIdx === 1 ? '1,000' : tierIdx === 2 ? '5,000' : '10,000'}`}
                    </div>
                  </div>
                </div>
              </div>

              {/* Benefits */}
              <div className="bg-background-50 rounded-2xl border border-background-200/70 p-5 md:p-6">
                <h3 className="font-semibold text-foreground-800 text-sm md:text-base mb-4">
                  <TranslatableText i18nKey="ui.your.ba596fd" />{member.tier} {t('ui.benefits.927f406', { keySeparator: false })}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {allBenefits.map((tierBenefitGroup) => {
                    const bidx = tierOrder.indexOf(tierBenefitGroup.tier);
                    const unlocked = bidx <= tierIdx;
                    return tierBenefitGroup.benefits.map((benefit) => (
                      <div
                        key={`${tierBenefitGroup.tier}-${benefit}`}
                        className={`flex items-center gap-2 text-xs ${unlocked ? 'text-foreground-700' : 'text-foreground-400 line-through'}`}
                      >
                        <i className={`${unlocked ? 'ri-check-line text-emerald-500' : 'ri-lock-line text-foreground-400'} text-[10px]`}></i>
                        {t(benefit, { keySeparator: false })}
                      </div>
                    ));
                  })}
                </div>
              </div>
            </div>

            {/* Referral Card */}
            <Link
              to="/members/invite"
              className="block bg-gradient-to-r from-accent-50 to-primary-50 rounded-2xl border border-accent-200/40 p-5 md:p-6 mb-6 hover:border-accent-300 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground-800 text-sm group-hover:text-accent-700 transition-colors">
                    <TranslatableText i18nKey="ui.invite_friends_earn_together.dff1cb4" />
                  </h3>
                  <p className="text-foreground-600 text-xs mt-1">
                    <TranslatableText i18nKey="ui.share_your_unique_referral_link_when_a_fri.f929515" />
                  </p>
                  {referralPoints > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      <div className="px-2.5 py-1 rounded-lg bg-accent-500/10 border border-accent-200/50">
                        <span className="text-accent-700 text-xs font-bold">
                          {referralPoints} <TranslatableText i18nKey="ui.referral_points_earned.d5817e9" />
                        </span>
                      </div>
                      <span className="text-foreground-500 text-xs"><TranslatableText i18nKey="ui.rm.bf448c8" />{referralPoints} <TranslatableText i18nKey="ui.extra_off.da7a687" /></span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-background-50 border border-background-200/70 rounded-xl px-4 py-2.5 font-mono text-sm text-foreground-700">
                    {member.referral_code || 'N/A'}
                  </div>
                  <div
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const link = `${window.location.origin}/members/register?ref=${member.referral_code}`;
                      navigator.clipboard.writeText(link);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-accent-500 hover:bg-accent-600 text-white text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {t('ui.copy_link.672d82d', { keySeparator: false })}
                  </div>
                  <div className="w-8 h-8 rounded-full bg-accent-100 flex items-center justify-center group-hover:bg-accent-200 transition-colors flex-shrink-0">
                    <i className="ri-arrow-right-line text-accent-600 text-sm group-hover:translate-x-0.5 transition-transform"></i>
                  </div>
                </div>
              </div>
            </Link>

            {/* Quick Link */}
            <div className="mb-4">
              <Link
                to="/shop"
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-accent-500 hover:bg-accent-600 text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                <i className="ri-shopping-bag-3-line"></i>
                {t('ui.shop_earn_points.b4d7c02', { keySeparator: false })}
              </Link>
            </div>

            {/* Member Hub quick links */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <Link
                to="/members/courses"
                className="flex items-center gap-3 px-5 py-4 rounded-xl border border-background-200/70 bg-background-50 hover:border-primary-200 hover:bg-primary-50 transition-colors cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <i className="ri-book-open-line text-primary-600 text-lg"></i>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground-800">{t('ui.my_courses.ef8eb7e', { keySeparator: false })}</p>
                  <p className="text-xs text-foreground-500"><TranslatableText i18nKey="ui.access_enrolled_lessons.a13e5e7" /></p>
                </div>
                <i className="ri-arrow-right-s-line text-foreground-400 ml-auto group-hover:text-primary-600 transition-colors"></i>
              </Link>
              <Link
                to="/members/orders"
                className="flex items-center gap-3 px-5 py-4 rounded-xl border border-background-200/70 bg-background-50 hover:border-accent-200 hover:bg-accent-50 transition-colors cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-accent-100 flex items-center justify-center flex-shrink-0">
                  <i className="ri-receipt-line text-accent-600 text-lg"></i>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground-800">{t('ui.my_orders.db2821a', { keySeparator: false })}</p>
                  <p className="text-xs text-foreground-500"><TranslatableText i18nKey="ui.view_purchase_history.85cf147" /></p>
                </div>
                <i className="ri-arrow-right-s-line text-foreground-400 ml-auto group-hover:text-accent-600 transition-colors"></i>
              </Link>
            </div>

            {/* Sign Out */}
            <button
              onClick={handleSignOut}
              disabled={singingOut}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {singingOut ? (
                <><i className="ri-loader-4-line animate-spin"></i> <TranslatableText i18nKey="ui.signing_out.b9412f7" /></>
              ) : (
                <><i className="ri-logout-box-line"></i> {t('ui.sign_out.61fd08f', { keySeparator: false })}</>
              )}
            </button>

            </> : activeSection === 'info' ? (
              <section>
                <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground-800">{t('ui.my_info.5ba9ae5', { keySeparator: false })}</h1>
                    <p className="text-foreground-500 text-sm mt-1"><TranslatableText i18nKey="ui.your_contact_and_personal_details.524f375" /></p>
                  </div>
                  <button type="button" onClick={() => setViewMode('detail')} className="inline-flex items-center gap-2 rounded-xl bg-accent-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-600">
                    <i className="ri-edit-line" /> {t('ui.edit_my_info.e5f5e7c', { keySeparator: false })}
                  </button>
                </div>
                <div className="overflow-hidden rounded-2xl border border-background-200/70 bg-background-50">
                  {[
                    { label: t('ui.phone_number.ab25d61', { keySeparator: false }), value: [member.phone_country_code, member.phone].filter(Boolean).join(' ') || 'Not provided', icon: 'ri-phone-line' },
                    { label: 'Gender', value: genderOptions.find((option) => option.value === member.gender)?.label ?? 'Not provided', icon: 'ri-user-line' },
                    { label: 'Birthday', value: member.birth_date ? new Date(`${member.birth_date}T00:00:00`).toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Not provided', icon: 'ri-cake-2-line' },
                  ].map((item, index) => (
                    <div key={item.label} className={`flex items-center gap-4 p-5 md:px-6 ${index > 0 ? 'border-t border-background-200/70' : ''}`}>
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-600"><i className={`${item.icon} text-lg`} /></div>
                      <div>
                        <p className="text-xs font-medium text-foreground-400">{item.label}</p>
                        <p className="mt-1 text-sm font-semibold text-foreground-800">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : activeSection === 'address' ? (
              <section>
                <div className="mb-8">
                  <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground-800">{t('ui.shipping_address.dbd7c38', { keySeparator: false })}</h1>
                  <p className="text-foreground-500 text-sm mt-1"><TranslatableText i18nKey="ui.add_or_update_the_address_used_for_your_pu.c55ccbd" /></p>
                </div>
                <div className="rounded-2xl border border-background-200/70 bg-background-50 p-6 md:p-8">
                  <div className="space-y-5">
                    <div>
                      <label htmlFor="member-address-unit" className="block text-sm font-semibold text-foreground-800 mb-2">{t('ui.unit.2f33781', { keySeparator: false })}</label>
                      <input id="member-address-unit" type="text" required value={addressUnit} onChange={(e) => { setAddressUnit(e.target.value); markFormEdited(); }} placeholder="e.g. A-12-3" className="w-full h-11 px-4 rounded-xl border border-background-200/70 bg-background-50 text-sm text-foreground-800 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-300" />
                    </div>
                    <div>
                      <label htmlFor="member-postal-code" className="block text-sm font-semibold text-foreground-800 mb-2"><TranslatableText i18nKey="ui.postal_code.3d6f039" /></label>
                      <input id="member-postal-code" type="text" required inputMode="numeric" value={postalCode} onChange={(e) => { setPostalCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 5)); markFormEdited(); }} placeholder="50450" maxLength={5} className="w-full h-11 px-4 rounded-xl border border-background-200/70 bg-background-50 text-sm text-foreground-800 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-300" />
                    </div>
                    <div>
                      <label htmlFor="member-address" className="block text-sm font-semibold text-foreground-800 mb-2">{t('ui.address.d89c935', { keySeparator: false })}</label>
                      <input id="member-address" type="text" required value={addressLine} onChange={(e) => { setAddressLine(e.target.value); markFormEdited(); }} placeholder="House number, building, street name" className="w-full h-11 px-4 rounded-xl border border-background-200/70 bg-background-50 text-sm text-foreground-800 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-300" />
                    </div>
                    <div>
                      <label htmlFor="member-area" className="block text-sm font-semibold text-foreground-800 mb-2">{t('ui.area_state.3a2f3ca', { keySeparator: false })}</label>
                      <select id="member-area" required value={area} onChange={(e) => { setArea(e.target.value); markFormEdited(); }} className="w-full h-11 px-4 rounded-xl border border-background-200/70 bg-background-50 text-sm text-foreground-800 focus:outline-none focus:ring-2 focus:ring-primary-300">
                        <option value=""><TranslatableText i18nKey="ui.select_area_state.6600563" /></option>
                        {malaysianStates.map((state) => <option key={state} value={state}>{state}</option>)}
                      </select>
                    </div>
                    {saveMsg && <div className={`p-4 rounded-xl ${saveSuccess ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-600'}`} role="status">{saveMsg}</div>}
                    <button type="button" onClick={handleSaveAddress} disabled={saving} className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-accent-500 hover:bg-accent-600 text-white text-sm font-semibold transition-colors disabled:opacity-50">
                      {saving ? <><i className="ri-loader-4-line animate-spin" /> <TranslatableText i18nKey="ui.saving.56a2285" /></> : <><i className="ri-save-line" /> {t('ui.save_address.4aa8d2a', { keySeparator: false })}</>}
                    </button>
                  </div>
                </div>
              </section>
            ) : (
              <section>
                <div className="mb-8">
                  <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground-800">{t('ui.my_favorite.b8e8230', { keySeparator: false })}</h1>
                  <p className="text-foreground-500 text-sm mt-1"><TranslatableText i18nKey="ui.products_and_courses_you_have_saved_for_la.a980169" /></p>
                </div>
                {favoritesLoading || favoriteCoursesLoading ? (
                  <p className="py-12 text-center text-sm text-foreground-500"><TranslatableText i18nKey="ui.loading_favorites.acb044c" /></p>
                ) : favoritesError || favoriteCoursesError ? (
                  <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><TranslatableText i18nKey="ui.could_not_load_favorites.d70ac87" />{favoritesError || favoriteCoursesError}</p>
                ) : favoriteProducts.length || favoriteCourses.length ? (
                  <div className="space-y-10">
                    {favoriteProducts.length > 0 && (
                      <div>
                        <h2 className="mb-4 text-lg font-semibold text-foreground-800"><TranslatableText i18nKey="ui.extra_products.fe0a091" /></h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                          {favoriteProducts.map((product) => (
                            <article key={product.id} className="overflow-hidden rounded-2xl border border-background-200/70 bg-background-50">
                              <Link to={`/shop/${product.id}`} className="block aspect-[4/3] bg-background-100">
                                <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                              </Link>
                              <div className="p-4">
                                <Link to={`/shop/${product.id}`} className="font-semibold text-foreground-800 hover:text-accent-600">{product.name}</Link>
                                <p className="mt-2 text-sm font-semibold text-foreground-700">RM {product.memberPrice.toFixed(2)}</p>
                                <button type="button" onClick={() => void toggleFavorite(product.id)} className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700">
                                  <i className="ri-heart-fill" /> <TranslatableText i18nKey="ui.remove_from_favorites.b6ddf62" />
                                </button>
                              </div>
                            </article>
                          ))}
                        </div>
                      </div>
                    )}
                    {favoriteCourses.length > 0 && (
                      <div>
                        <h2 className="mb-4 text-lg font-semibold text-foreground-800"><TranslatableText i18nKey="ui.extra_courses.a16536d" /></h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                          {favoriteCourses.map((course) => (
                            <article key={course.id} className="overflow-hidden rounded-2xl border border-background-200/70 bg-background-50">
                              <Link to={`/courses/${course.id}`} className="block aspect-[4/3] bg-background-100">
                                <img src={course.cover} alt={course.title} className="h-full w-full object-cover" />
                              </Link>
                              <div className="p-4">
                                <Link to={`/courses/${course.id}`} className="font-semibold text-foreground-800 hover:text-accent-600">{course.title}</Link>
                                <p className="mt-2 text-sm text-foreground-500">{course.instructor}</p>
                                <p className="mt-2 text-sm font-semibold text-foreground-700">RM {course.memberPrice.toFixed(2)}</p>
                                <button type="button" onClick={() => void toggleCourseFavorite(course.id)} className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700">
                                  <i className="ri-heart-fill" /> <TranslatableText i18nKey="ui.remove_from_favorites.b6ddf62" />
                                </button>
                              </div>
                            </article>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-background-300 px-6 py-14 text-center">
                    <i className="ri-heart-line text-3xl text-foreground-400" />
                    <p className="mt-3 font-medium text-foreground-700"><TranslatableText i18nKey="ui.no_favorites_yet.95bc680" /></p>
                    <p className="mt-1 text-sm text-foreground-500"><TranslatableText i18nKey="ui.save_products_or_courses_with_the_heart_bu.e14b832" /></p>
                    <div className="mt-5 flex justify-center gap-3">
                      <Link to="/shop" className="inline-flex rounded-full bg-accent-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-600"><TranslatableText i18nKey="ui.browse_products.f55f139" /></Link>
                      <Link to="/courses" className="inline-flex rounded-full bg-secondary-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-secondary-600"><TranslatableText i18nKey="ui.browse_courses.4e5f78b" /></Link>
                    </div>
                  </div>
                )}
              </section>
            )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
      <PhoneBindModal
        isOpen={phoneBindOpen}
        onClose={() => setPhoneBindOpen(false)}
        onSuccess={() => {
          refreshMember();
          setPhoneBindOpen(false);
        }}
      />
    </main>
  );
}
