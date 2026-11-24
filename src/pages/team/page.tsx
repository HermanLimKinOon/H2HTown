import TranslatableText from '@/i18n/TranslatableText';
import { Link } from 'react-router-dom';
import Navbar from '@/components/feature/Navbar';
import Footer from '@/components/feature/Footer';
import { useTranslation } from 'react-i18next';


const teamMembers = [
  {
    name: 'Ruby Lin',
    titleKey: 'team.ruby.title',
    image: 'https://yiiptvateqtjcoqtsmot.supabase.co/storage/v1/object/public/product-images/website%20photo/Ruby.JPG',
    bioKey: 'team.ruby.bio',
  },
  {
    name: 'Jerry Ngow',
    titleKey: 'team.jerry.title',
    image: 'https://yiiptvateqtjcoqtsmot.supabase.co/storage/v1/object/public/product-images/website%20photo/Jerry.JPG',
    bioKey: 'team.jerry.bio',
  },
  {
    name: 'Thomas Chin',
    titleKey: 'team.thomas.title',
    image: 'https://yiiptvateqtjcoqtsmot.supabase.co/storage/v1/object/public/product-images/website%20photo/Thomas.jpg',
    bioKey: 'team.thomas.bio',
  },
  {
    name: 'Aerith Wu',
    titleKey: 'team.aerith.title',
    image: 'https://yiiptvateqtjcoqtsmot.supabase.co/storage/v1/object/public/product-images/website%20photo/Aerith.JPG',
    bioKey: 'team.aerith.bio',
  },
];

export default function Team() {
  const { t } = useTranslation();
  return (
    <main className="min-h-screen bg-primary-50">
      <Navbar />

      <section className="relative overflow-hidden bg-foreground-900 pt-28 pb-16 md:pt-36 md:pb-24">
        <div className="absolute -right-24 -top-28 h-96 w-96 rounded-full bg-primary-500/15 blur-3xl" />
        <div className="relative mx-auto max-w-[1440px] px-4 text-center md:px-6">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/70">
            <i className="ri-team-line" /> <TranslatableText i18nKey="ui.extra_company.fa82902" /></div>
          <h1 className="mb-5 font-heading text-4xl font-bold text-white md:text-5xl lg:text-6xl">
            {t('ui.meet_our_team.c4111df', { keySeparator: false })}
          </h1>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-white/65 md:text-lg">
            <TranslatableText i18nKey="ui.human_to_human_ai_brings_together_people_a.3984eef" />
          </p>
        </div>
      </section>

      <section className="py-14 md:py-20">
        <div className="mx-auto max-w-[1200px] px-4 md:px-6">
          <div className="mx-auto mb-10 max-w-2xl text-center md:mb-14">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-primary-600"><TranslatableText i18nKey="ui.the_people_behind_h2h.406b31e" /></span>
            <h2 className="mt-3 font-heading text-2xl font-bold text-foreground-900 md:text-3xl">
              {t('ui.meet_the_people_behind_the_work.9fee507', { keySeparator: false })}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-foreground-600 md:text-base">
              {t('ui.we_bring_people_together_through_media_lea.7dcdf8b', { keySeparator: false })}
            </p>
          </div>

          <div className="space-y-7 md:ml-24 md:space-y-9">
            {teamMembers.map((member, index) => (
              <article
                key={member.name}
                className="group grid overflow-hidden rounded-2xl border border-background-200/70 bg-background-50 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg sm:grid-cols-[240px_1fr] md:grid-cols-[280px_1fr]"
              >
                <div className="relative h-64 overflow-hidden bg-background-100 sm:h-full sm:min-h-72">
                  <img
                    src={member.image}
                    alt={member.name}
                    loading="lazy"
                    className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                </div>
                <div className="flex flex-col justify-center p-6 md:p-9">
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                      <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-primary-600"><TranslatableText i18nKey={member.titleKey} /></p>
                      <h3 className="font-heading text-2xl font-bold text-foreground-900 md:text-3xl">{member.name}</h3>
                    </div>
                    <span className="font-heading text-2xl font-semibold text-background-300 md:text-3xl">0{index + 1}</span>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground-600 md:text-base"><TranslatableText i18nKey={member.bioKey} /></p>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-5 rounded-2xl bg-foreground-900 px-6 py-8 md:mt-14 md:flex-row md:px-10">
            <div>
              <h2 className="font-heading text-xl font-bold text-white md:text-2xl">{t('ui.want_to_work_with_us.7268763', { keySeparator: false })}</h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/60">
                <TranslatableText i18nKey="ui.we_re_always_glad_to_hear_from_creators_in.2030f8b" />
              </p>
            </div>
            <Link
              to="/contact"
              className="inline-flex flex-shrink-0 items-center gap-2 rounded-full bg-primary-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-600"
            >
              {t('ui.get_in_touch.c49bb4c', { keySeparator: false })} <i className="ri-arrow-right-line" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
