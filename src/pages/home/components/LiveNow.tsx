import TranslatableText from '@/i18n/TranslatableText';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import supabase from '@/lib/supabase';
import { liveStreams } from '@/mocks/homeData';
import { useTranslation } from 'react-i18next';


interface YouTubeLive {
  videoId: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
}

export default function LiveNow() {
  const { t } = useTranslation();
  const [youtubeLive, setYoutubeLive] = useState<YouTubeLive | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const featured = liveStreams[0];

  useEffect(() => {
    checkLiveStatus();
  }, []);

  const checkLiveStatus = async () => {
    try {
      setIsChecking(true);
      const { data, error: fnError } = await supabase.functions.invoke('youtube-check-live', {
        method: 'GET',
      });

      if (!fnError && data?.isLive && data?.stream) {
        setYoutubeLive(data.stream);
      }
    } catch {
      // Silently fall back to mock data
    } finally {
      setIsChecking(false);
    }
  };

  // If YouTube is live, show the live embed
  if (youtubeLive) {
    return (
      <section id="live" className="py-10 md:py-14 relative overflow-hidden" style={{ perspective: '1200px' }}>
        {/* 3D Embossed Background Layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-rose-100/90 via-pink-50/80 to-rose-200/70" />
        <div className="absolute inset-0 opacity-25" style={{
          backgroundImage: `radial-gradient(circle at 60% 30%, rgba(244,63,94,0.25) 0%, transparent 50%),
                            radial-gradient(circle at 40% 80%, rgba(225,29,72,0.15) 0%, transparent 50%)`,
        }} />
        <div className="absolute inset-0 opacity-[0.05]" style={{
          backgroundImage: `repeating-linear-gradient(30deg, transparent, transparent 5px, rgba(190,18,60,0.5) 5px, rgba(190,18,60,0.5) 5.5px),
                            repeating-linear-gradient(-30deg, transparent, transparent 5px, rgba(190,18,60,0.5) 5px, rgba(190,18,60,0.5) 5.5px)`,
        }} />
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-b from-white/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-t from-rose-900/10 to-transparent" />
        
        <div className="relative mx-auto px-4 md:px-6 max-w-[1440px]">
          <div className="text-center mb-6 md:mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-200/70 border border-accent-300/50 mb-4">
              <span className="w-2 h-2 rounded-full bg-accent-500 animate-pulse"></span>
              <span className="text-accent-800 text-sm font-semibold whitespace-nowrap"><TranslatableText i18nKey="ui.live_now.26a5561" /></span>
            </div>
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground-800" style={{ textShadow: '2px 2px 0 rgba(0,0,0,0.06), -1px -1px 0 rgba(255,255,255,0.6)' }}>
              <TranslatableText i18nKey="ui.live.65c821a" /><span className="text-accent-500" style={{ textShadow: '2px 2px 0 rgba(244,63,94,0.2), -1px -1px 0 rgba(255,255,255,0.6)' }}><TranslatableText i18nKey="ui.now.e3b8204" /></span>
            </h2>
            <p className="text-foreground-600 text-sm md:text-base mt-2 max-w-lg mx-auto">
              <TranslatableText i18nKey="ui.we_re_live_on_youtube_join_us_now.90f7a05" /></p>
          </div>

          <div className="max-w-[900px] mx-auto">
            <div className="relative aspect-video rounded-2xl overflow-hidden border border-accent-200/60 shadow-lg">
              <iframe
                src={`https://www.youtube.com/embed/${youtubeLive.videoId}?autoplay=1&mute=0&rel=0`}
                title={youtubeLive.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              ></iframe>
            </div>
            <div className="mt-3 text-center">
              <h3 className="text-sm font-semibold text-foreground-800">{youtubeLive.title}</h3>
              <p className="text-xs text-foreground-500 mt-1">{youtubeLive.channelTitle}</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="live" className="py-10 md:py-14 relative overflow-hidden" style={{ perspective: '1200px' }}>
      {/* 3D Embossed Background Layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-rose-100/90 via-pink-50/80 to-rose-200/70" />
      <div className="absolute inset-0 opacity-25" style={{
        backgroundImage: `radial-gradient(circle at 60% 30%, rgba(244,63,94,0.25) 0%, transparent 50%),
                          radial-gradient(circle at 40% 80%, rgba(225,29,72,0.15) 0%, transparent 50%)`,
      }} />
      <div className="absolute inset-0 opacity-[0.05]" style={{
        backgroundImage: `repeating-linear-gradient(30deg, transparent, transparent 5px, rgba(190,18,60,0.5) 5px, rgba(190,18,60,0.5) 5.5px),
                          repeating-linear-gradient(-30deg, transparent, transparent 5px, rgba(190,18,60,0.5) 5px, rgba(190,18,60,0.5) 5.5px)`,
      }} />
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-b from-white/60 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-t from-rose-900/10 to-transparent" />
      
      <div className="relative mx-auto px-4 md:px-6 max-w-[1440px]">
        {/* Header */}
        <div className="text-center mb-6 md:mb-8">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground-800" style={{ textShadow: '2px 2px 0 rgba(0,0,0,0.06), -1px -1px 0 rgba(255,255,255,0.6)' }}>
            <TranslatableText i18nKey="ui.live.65c821a" /><span className="text-accent-500" style={{ textShadow: '2px 2px 0 rgba(244,63,94,0.2), -1px -1px 0 rgba(255,255,255,0.6)' }}><TranslatableText i18nKey="ui.now.e3b8204" /></span>
          </h2>
          <p className="text-foreground-600 text-sm md:text-base mt-2 max-w-lg mx-auto">
            {t('ui.join_real_hosts_discover_products_and_enjo.0c7556f', { keySeparator: false })}
          </p>
        </div>

        {/* Single Featured Card */}
        <div className="max-w-lg mx-auto">
          <div className="bg-background-50 rounded-2xl overflow-hidden border border-background-200/70 hover:border-primary-200 transition-all group cursor-pointer">
            {/* Thumbnail */}
            <div className="relative aspect-video overflow-hidden">
              <img
                src={featured.thumbnail}
                alt={featured.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400"
              />
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-500 text-white text-[11px] font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                <TranslatableText i18nKey="ui.live.65c821a" />
              </div>
              <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-foreground-900/60 backdrop-blur-sm text-white text-[11px] font-medium">
                <i className="ri-eye-line mr-1"></i>
                {featured.viewers >= 1000 ? `${(featured.viewers / 1000).toFixed(1)}K` : featured.viewers}
              </div>
              <div className="absolute bottom-3 left-3 px-2 py-1 rounded-md bg-background-50/90 text-foreground-700 text-[11px] font-medium">
                {featured.category}
              </div>
            </div>

            {/* Info */}
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary-700 text-[10px] font-bold">
                    {featured.host.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <span className="text-sm font-semibold text-foreground-800 truncate">{featured.host}</span>
              </div>
              <h3 className="text-sm font-medium text-foreground-700 line-clamp-2 mb-3 leading-snug">{featured.title}</h3>

              {/* Product Preview */}
              <div className="flex items-center gap-3 bg-background-100 rounded-xl p-3">
                <div>
                  <div className="text-[11px] text-foreground-500 mb-0.5">{featured.productName}</div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-accent-600">RM {featured.memberPrice}</span>
                    <span className="text-[11px] text-foreground-400 line-through">RM {featured.productPrice}</span>
                  </div>
                </div>
                <div className="ml-auto flex flex-col gap-1.5">
                  {featured.tags.map((tag) => (
                    <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 font-semibold whitespace-nowrap text-center">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <Link
                to="/live"
                className="mt-3 w-full py-2.5 rounded-full bg-accent-500 hover:bg-accent-600 text-white text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer flex items-center justify-center gap-1.5"
              >
                <i className="ri-play-circle-line text-base"></i>
                {t('ui.watch_live.e4b48c8', { keySeparator: false })}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}