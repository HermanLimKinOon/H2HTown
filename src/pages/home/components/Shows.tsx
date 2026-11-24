import TranslatableText from '@/i18n/TranslatableText';
import { useState, useEffect } from 'react';
import supabase from '@/lib/supabase';
import { useTranslation } from 'react-i18next';


interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
  channelTitle: string;
}

export default function Shows() {
  const { t } = useTranslation();
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeVideo, setActiveVideo] = useState<YouTubeVideo | null>(null);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fnError } = await supabase.functions.invoke('youtube-latest-videos', {
        method: 'GET',
      });

      if (fnError) throw fnError;

      if (data?.videos && Array.isArray(data.videos)) {
        setVideos(data.videos);
      } else if (data?.error) {
        setError(data.error);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load shows');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-MY', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const truncateTitle = (title: string, maxLen: number = 80) => {
    return title.length > maxLen ? title.slice(0, maxLen) + '...' : title;
  };

  return (
    <section id="shows" className="py-10 md:py-14 relative overflow-hidden" style={{ perspective: '1200px' }}>
      {/* 3D Embossed Background Layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-100/90 via-orange-50/80 to-amber-200/70" />
      <div className="absolute inset-0 opacity-30" style={{
        backgroundImage: `radial-gradient(circle at 20% 30%, rgba(251,191,36,0.35) 0%, transparent 50%),
                          radial-gradient(circle at 80% 70%, rgba(249,115,22,0.2) 0%, transparent 50%)`,
      }} />
      {/* Embossed geometric texture */}
      <div className="absolute inset-0 opacity-[0.06]" style={{
        backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(146,64,14,0.4) 4px, rgba(146,64,14,0.4) 4.5px),
                          repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(146,64,14,0.4) 4px, rgba(146,64,14,0.4) 4.5px)`,
      }} />
      {/* Top highlight bevel */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-b from-white/60 to-transparent" />
      {/* Bottom shadow bevel */}
      <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-t from-amber-900/10 to-transparent" />
      
      <div className="relative mx-auto px-4 md:px-6 max-w-[1440px]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6 md:mb-8">
          <div>
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground-800" style={{ textShadow: '2px 2px 0 rgba(0,0,0,0.06), -1px -1px 0 rgba(255,255,255,0.6)' }}>
              H2H <span className="text-primary-500" style={{ textShadow: '2px 2px 0 rgba(251,191,36,0.2), -1px -1px 0 rgba(255,255,255,0.6)' }}><TranslatableText i18nKey="ui.shows.e7f76b7" /></span>
            </h2>
            <p className="text-foreground-600 text-sm md:text-base mt-2 max-w-lg">
              {t('ui.latest_videos_from_our_youtube_channel_rea.fb133f2', { keySeparator: false })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary-100 text-secondary-700 text-xs font-medium whitespace-nowrap">
              <i className="ri-youtube-fill text-sm"></i> <TranslatableText i18nKey="ui.extra_youtube.558865a" /></span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary-100 text-secondary-700 text-xs font-medium whitespace-nowrap">
              <i className="ri-spotify-fill text-sm"></i> <TranslatableText i18nKey="ui.extra_podcast.bafb6ef" /></span>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-16">
            <div className="w-10 h-10 mx-auto mb-4 rounded-full border-2 border-primary-500 border-t-transparent animate-spin"></div>
            <p className="text-foreground-500 text-sm"><TranslatableText i18nKey="ui.loading_latest_shows.f79034f" /></p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-background-200 flex items-center justify-center">
              <i className="ri-error-warning-line text-2xl text-foreground-400"></i>
            </div>
            <p className="text-foreground-500 text-sm mb-3">{error}</p>
            <button
              onClick={fetchVideos}
              className="px-6 py-2.5 rounded-full bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
            >
              {t('ui.try_again.cef2fe0', { keySeparator: false })}
            </button>
          </div>
        )}

        {/* Shows Grid */}
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {videos.map((video) => (
              <div
                key={video.id}
                onClick={() => setActiveVideo(video)}
                className="group bg-background-50/90 backdrop-blur-sm rounded-2xl border border-background-200/60 overflow-hidden hover:border-accent-300 transition-all duration-300 cursor-pointer"
                style={{
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.6), 0 10px 20px -5px rgba(0,0,0,0.08)',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px) rotateX(2deg)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 20px 30px -10px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.8)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0) rotateX(0deg)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.6), 0 10px 20px -5px rgba(0,0,0,0.08)';
                }}
              >
                {/* Thumbnail */}
                <div className="relative aspect-video overflow-hidden">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground-900/40 via-transparent to-transparent"></div>
                  <div className="absolute inset-0 bg-foreground-900/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-accent-500 flex items-center justify-center shadow-lg shadow-accent-500/30">
                      <i className="ri-play-fill text-white text-2xl ml-0.5"></i>
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-accent-100 flex items-center justify-center flex-shrink-0">
                      <i className="ri-youtube-fill text-accent-600 text-xs"></i>
                    </div>
                    <span className="text-[11px] text-foreground-500 font-medium">
                      {video.channelTitle}
                    </span>
                    <span className="text-[11px] text-foreground-400">
                      · {formatDate(video.publishedAt)}
                    </span>
                  </div>
                  <h3 className="font-semibold text-foreground-800 text-sm md:text-base leading-snug line-clamp-2 group-hover:text-accent-600 transition-colors">
                    {truncateTitle(video.title)}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && videos.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-background-200 flex items-center justify-center">
              <i className="ri-video-line text-2xl text-foreground-400"></i>
            </div>
            <p className="text-foreground-500 text-sm"><TranslatableText i18nKey="ui.no_videos_found_on_the_channel_yet.8f1ffbb" /></p>
          </div>
        )}

        {/* Browse More */}
        <div className="text-center mt-8">
          <a
            href="https://www.youtube.com/channel/UCALZ1kovCXG8qiPSL-A2rmg"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 rounded-full border-2 border-primary-500 text-primary-600 hover:bg-primary-50 font-semibold text-sm transition-colors whitespace-nowrap cursor-pointer inline-flex items-center gap-2"
          >
            <i className="ri-youtube-line text-lg"></i>
            {t('ui.watch_more_on_youtube.1ca4b7e', { keySeparator: false })}
          </a>
        </div>
      </div>

      {/* Video Modal */}
      {activeVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground-900/80 backdrop-blur-sm p-4"
          onClick={() => setActiveVideo(null)}
        >
          <div
            className="relative w-full max-w-[900px] bg-foreground-950 rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setActiveVideo(null)}
              className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-foreground-900/70 hover:bg-foreground-800 flex items-center justify-center text-white transition-colors cursor-pointer"
            >
              <i className="ri-close-line text-lg"></i>
            </button>

            {/* YouTube Embed */}
            <div className="aspect-video">
              <iframe
                src={`https://www.youtube.com/embed/${activeVideo.id}?autoplay=1&rel=0`}
                title={activeVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              ></iframe>
            </div>

            {/* Info */}
            <div className="p-4">
              <h3 className="font-semibold text-white text-sm md:text-base mb-2">
                {activeVideo.title}
              </h3>
              <p className="text-white/50 text-xs md:text-sm line-clamp-3">
                {activeVideo.description || 'No description available.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}