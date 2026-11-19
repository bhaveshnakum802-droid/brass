import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { settingsApi } from '@/services/api';
import type { SiteSettings } from '@/types';

// Background image assets are loaded from public/images/hero/

export default function HeroSection() {
  const [activeSlide, setActiveSlide] = useState(0);

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.getAll().then((r) => r.data.data as SiteSettings),
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev === 0 ? 1 : 0));
    }, 7000); // 7 seconds auto-play for premium feel
    return () => clearInterval(timer);
  }, []);

  const siteName = settings?.site_name || 'Chetan Brass Industries';
  const heading = settings?.hero_heading || 'Engineering Excellence for Industrial India';
  const subheading = settings?.hero_subheading || 'Manufacturer and exporter of high precision brass components, custom turned parts, and industrial fittings in Jamnagar, Gujarat.';
  const cta1 = settings?.hero_cta_primary || 'Explore Products';
  const cta2 = settings?.hero_cta_secondary || 'Contact Us';

  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.15 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] } },
  };

  const handlePrev = () => setActiveSlide((prev) => (prev === 0 ? 1 : 0));
  const handleNext = () => setActiveSlide((prev) => (prev === 0 ? 1 : 0));

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-dark-900">
      {/* Background orbs shared across slides */}
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary-DEFAULT/10 rounded-full blur-3xl animate-float pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-72 h-72 bg-accent-DEFAULT/5 rounded-full blur-3xl animate-float pointer-events-none" style={{ animationDelay: '1.5s' }} />

      <AnimatePresence mode="wait">
        {activeSlide === 0 ? (
          <motion.div
            key="slide1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 flex flex-col justify-center pt-24 md:pt-28 pb-10"
          >
            {/* Composition background for slide 1 */}
            <div className="absolute inset-0 z-0 bg-white">
              <div 
                className="absolute inset-0 bg-contain bg-center bg-no-repeat opacity-80"
                style={{ backgroundImage: `url('/images/hero/hero_bg_1.jpg')` }}
              />
              <div className="absolute inset-0 hero-pattern opacity-10" />
              <div 
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(to bottom, rgba(10, 10, 10, 0.90) 0%, rgba(10, 10, 10, 0.65) 50%, rgba(10, 10, 10, 0.95) 100%)'
                }}
              />
            </div>

            <div className="container-xl relative z-20 py-4 text-center mx-auto">
              <div className="max-w-4xl mx-auto">
                <motion.div variants={containerVariants} initial="hidden" animate="visible">
                  {/* Badge */}
                  <motion.div variants={itemVariants} className="mb-4 justify-center flex">
                    <span className="inline-flex items-center gap-2 bg-primary-DEFAULT/20 border border-primary-DEFAULT/30 text-primary-300 text-sm font-semibold px-4 py-2 rounded-full backdrop-blur-sm">
                      <span className="w-2 h-2 rounded-full bg-primary-DEFAULT animate-pulse" />
                      JAMNAGAR, INDIA EXPORTER
                    </span>
                  </motion.div>

                  {/* Heading */}
                  <motion.h1 variants={itemVariants} className="font-heading font-bold text-3xl sm:text-4xl lg:text-5xl text-white leading-tight mb-4">
                    {siteName.toUpperCase()}
                  </motion.h1>

                  {/* Subheading */}
                  <motion.p variants={itemVariants} className="text-sm sm:text-base lg:text-lg text-gray-300 leading-relaxed mb-6 max-w-2xl mx-auto">
                    Manufacturer & Exporter of High Precision Brass Components
                  </motion.p>

                  {/* CTAs */}
                  <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <Link to="/products" className="btn-primary btn-md rounded-xl font-bold text-white shadow-glow-red w-full sm:w-auto">
                      {cta1} <ArrowRight size={18} />
                    </Link>
                    <Link to="/contact" className="btn-outline btn-md rounded-xl text-white border-white/30 hover:bg-white hover:text-dark-900 w-full sm:w-auto">
                      {cta2}
                    </Link>
                  </motion.div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="slide2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 flex flex-col justify-center pt-24 md:pt-28 pb-10"
          >
            {/* Composition background for slide 2 */}
            <div className="absolute inset-0 z-0 bg-white">
              <div 
                className="absolute inset-0 bg-contain bg-center bg-no-repeat opacity-75"
                style={{ backgroundImage: `url('/images/hero/hero_bg_2.jpg')` }}
              />
              <div className="absolute inset-0 hero-pattern opacity-10" />
              <div 
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(to bottom, rgba(10, 10, 10, 0.90) 0%, rgba(10, 10, 10, 0.65) 50%, rgba(10, 10, 10, 0.95) 100%)'
                }}
              />
            </div>

            <div className="container-xl relative z-20 py-4 text-center mx-auto">
              <div className="max-w-4xl mx-auto">
                <motion.div variants={containerVariants} initial="hidden" animate="visible">
                  {/* Badge */}
                  <motion.div variants={itemVariants} className="mb-4 justify-center flex">
                    <span className="inline-flex items-center gap-2 bg-primary-DEFAULT/20 border border-primary-DEFAULT/30 text-primary-300 text-sm font-semibold px-4 py-2 rounded-full backdrop-blur-sm">
                      <span className="w-2 h-2 rounded-full bg-primary-DEFAULT animate-pulse" />
                      Trusted by 1,000+ Industrial Clients Across India
                    </span>
                  </motion.div>

                  {/* Heading */}
                  <motion.h1 variants={itemVariants} className="font-heading font-bold text-3xl sm:text-4xl lg:text-5xl text-white leading-tight mb-4">
                    {heading.split(' ').map((word, i) =>
                      i >= heading.split(' ').length - 2 ? (
                        <span key={i} className="text-primary-DEFAULT">{word} </span>
                      ) : (
                        <span key={i}>{word} </span>
                      )
                    )}
                  </motion.h1>

                  {/* Subheading */}
                  <motion.p variants={itemVariants} className="text-sm sm:text-base lg:text-lg text-gray-300 leading-relaxed mb-6 max-w-2xl mx-auto">
                    {subheading}
                  </motion.p>

                  {/* CTAs */}
                  <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <Link to="/products" className="btn-primary btn-md rounded-xl font-bold text-white shadow-glow-red w-full sm:w-auto">
                      {cta1} <ArrowRight size={18} />
                    </Link>
                    <Link to="/contact" className="btn-outline btn-md rounded-xl text-white border-white/30 hover:bg-white hover:text-dark-900 w-full sm:w-auto">
                      {cta2}
                    </Link>
                  </motion.div>

                  {/* Stats */}
                  <motion.div variants={itemVariants} className="mt-6 md:mt-8 grid grid-cols-3 gap-6 pt-5 border-t border-white/10 max-w-md mx-auto">
                    {[
                      { value: '20+', label: 'Years Experience' },
                      { value: '500+', label: 'Products' },
                      { value: '1,000+', label: 'Happy Clients' },
                    ].map((stat) => (
                      <div key={stat.label} className="text-center">
                        <div className="font-heading font-bold text-xl sm:text-2xl text-primary-DEFAULT">{stat.value}</div>
                        <div className="text-gray-400 text-xs sm:text-sm mt-0.5">{stat.label}</div>
                      </div>
                    ))}
                  </motion.div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Arrows */}
      <button
        onClick={handlePrev}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full border border-white/10 bg-dark-900/50 text-white/70 hover:text-white hover:bg-dark-900/80 hover:scale-105 active:scale-95 transition-all duration-200 hidden md:flex items-center justify-center"
        aria-label="Previous Slide"
      >
        <ChevronLeft size={20} />
      </button>
      <button
        onClick={handleNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full border border-white/10 bg-dark-900/50 text-white/70 hover:text-white hover:bg-dark-900/80 hover:scale-105 active:scale-95 transition-all duration-200 hidden md:flex items-center justify-center"
        aria-label="Next Slide"
      >
        <ChevronRight size={20} />
      </button>

      {/* Slide Indicators */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2">
        {[0, 1].map((index) => (
          <button
            key={index}
            onClick={() => setActiveSlide(index)}
            className={`h-2 rounded-full transition-all duration-300 ${
              activeSlide === index ? 'bg-accent-DEFAULT w-8' : 'bg-white/30 hover:bg-white/50 w-2'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Scroll indicator */}
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-gray-500 text-xs pointer-events-none"
      >
        <span>Scroll</span>
        <ChevronDown size={16} />
      </motion.div>
    </section>
  );
}
