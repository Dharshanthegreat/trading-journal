import React from 'react';
import './OrbisNft.css';

const Mail = ({ size = 20, className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="20" height="16" x="2" y="4" rx="2"/>
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);

const Twitter = ({ size = 20, className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/>
  </svg>
);

const Github = ({ size = 20, className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/>
    <path d="M9 18c-4.51 2-5-2-7-2"/>
  </svg>
);

const ChevronRight = ({ size = 20, className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m9 18 6-6-6-6"/>
  </svg>
);


export default function OrbisNft() {
  const nftItems = [
    {
      id: 1,
      video: "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260331_053923_22c0a6a5-313c-474c-85ff-3b50d25e944a.mp4",
      score: "87.5%"
    },
    {
      id: 2,
      video: "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260331_054411_511c1b7a-fb2f-42ef-bf6c-32c0b1a06e79.mp4",
      score: "92.0%"
    },
    {
      id: 3,
      video: "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260331_055427_ac7035b5-9f3b-4289-86fc-941b2432317d.mp4",
      score: "82.4%"
    }
  ];

  return (
    <div className="bg-[#010828] text-cream min-h-screen relative selection:bg-neon selection:text-background overflow-x-hidden font-mono">
      {/* Texture Overlay */}
      <div 
        className="fixed inset-0 z-50 pointer-events-none mix-blend-lighten opacity-60 bg-cover bg-center"
        style={{ backgroundImage: `url(${import.meta.env.BASE_URL}texture.png)` }}
      />

      {/* SECTION 1: HERO */}
      <section className="relative w-full min-h-screen lg:h-screen overflow-hidden rounded-b-[32px] flex flex-col justify-between">
        {/* Video Background */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0"
        >
          <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260331_045634_e1c98c76-1265-4f5c-882a-4276f2080894.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-[#010828]/30 z-0 pointer-events-none" />

        {/* Header Navigation */}
        <header className="relative z-10 w-full max-w-[1831px] mx-auto px-6 lg:px-12 py-6 flex items-center justify-between">
          {/* Logo */}
          <div className="font-grotesk text-[16px] tracking-widest text-cream uppercase">
            Orbis.Trade
          </div>

          {/* Navigation Bar */}
          <nav className="hidden lg:block liquid-glass rounded-[28px] px-[52px] py-[24px]">
            <ul className="flex items-center gap-12 m-0 p-0 list-none">
              {['Homepage', 'Gallery', 'Log Trade', 'FAQ', 'Contact'].map((link) => (
                <li key={link}>
                  <a 
                    href={link === 'Log Trade' ? '#/dashboard' : `#${link.toLowerCase().replace(' ', '-')}`} 
                    className="font-grotesk text-[13px] tracking-widest text-cream uppercase no-underline hover:text-neon transition-colors duration-200"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Balance layout spacer on desktop */}
          <div className="hidden lg:block w-[80px]" />
        </header>

        {/* Hero Content */}
        <div className="relative z-10 w-full max-w-[1831px] mx-auto px-6 lg:px-12 flex-grow flex flex-col justify-center py-12 lg:py-0">
          <div className="flex flex-col items-start lg:ml-32 max-w-[820px] w-full">
            {/* Overlaid Cursive Accent (Moved above the heading to prevent overlap) */}
            <span 
              className="font-condiment text-neon normal-case mix-blend-exclusion opacity-90 text-[26px] sm:text-[38px] lg:text-[50px] rotate-[-1deg] mb-3 sm:mb-4 lg:mb-5 select-none"
            >
              Trading journal
            </span>
            <h1 className="font-grotesk text-[40px] sm:text-[60px] md:text-[75px] lg:text-[90px] leading-[1.05] lg:leading-[1.1] uppercase text-cream m-0">
              Beyond charts<br />
              and ( its ) trading boundaries
            </h1>
          </div>

          {/* Social Icons (Mobile) */}
          <div className="flex lg:hidden flex-row gap-4 justify-center mt-16">
            <a 
              href="mailto:contact@orbis.nft" 
              className="liquid-glass rounded-[1rem] w-[56px] h-[56px] flex items-center justify-center text-cream hover:bg-white/10 transition-colors duration-200"
            >
              <Mail size={20} />
            </a>
            <a 
              href="https://twitter.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="liquid-glass rounded-[1rem] w-[56px] h-[56px] flex items-center justify-center text-cream hover:bg-white/10 transition-colors duration-200"
            >
              <Twitter size={20} />
            </a>
            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="liquid-glass rounded-[1rem] w-[56px] h-[56px] flex items-center justify-center text-cream hover:bg-white/10 transition-colors duration-200"
            >
              <Github size={20} />
            </a>
          </div>
        </div>

        {/* Social Icons (Desktop) */}
        <div className="hidden lg:flex flex-col gap-4 absolute right-12 top-1/2 -translate-y-1/2 z-10">
          <a 
            href="mailto:contact@orbis.nft" 
            className="liquid-glass rounded-[1rem] w-[56px] h-[56px] flex items-center justify-center text-cream hover:bg-white/10 transition-colors duration-200"
          >
            <Mail size={20} />
          </a>
          <a 
            href="https://twitter.com" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="liquid-glass rounded-[1rem] w-[56px] h-[56px] flex items-center justify-center text-cream hover:bg-white/10 transition-colors duration-200"
          >
            <Twitter size={20} />
          </a>
          <a 
            href="https://github.com" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="liquid-glass rounded-[1rem] w-[56px] h-[56px] flex items-center justify-center text-cream hover:bg-white/10 transition-colors duration-200"
          >
            <Github size={20} />
          </a>
        </div>

        {/* Footer/bottom padding of hero */}
        <div className="h-16 lg:h-24 relative z-10" />
      </section>

      {/* SECTION 2: ABOUT / INTRO */}
      <section className="relative w-full min-h-screen overflow-hidden flex flex-col justify-center">
        {/* Video Background */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0"
        >
          <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260331_151551_992053d1-3d3e-4b8c-abac-45f22158f411.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-[#010828]/50 z-0 pointer-events-none" />

        {/* Content Container */}
        <div className="relative z-10 w-full max-w-[1831px] mx-auto px-6 lg:px-12 py-16 md:py-24 flex flex-col justify-between min-h-[80vh]">
          {/* Top Row */}
          <div className="flex flex-col lg:flex-row justify-between items-start gap-8 lg:gap-16">
            <div className="flex flex-col items-start pb-6 lg:pb-0">
              {/* Overlaid Cursive Accent (Moved above the heading to prevent overlap) */}
              <span 
                className="font-condiment text-neon normal-case mix-blend-exclusion text-[26px] sm:text-[38px] lg:text-[50px] rotate-[-1deg] opacity-90 mb-2 sm:mb-3 select-none"
              >
                Trader
              </span>
              <h2 className="font-grotesk text-[32px] sm:text-[45px] lg:text-[60px] uppercase leading-[1.05] text-cream m-0">
                Hello!<br />
                I'm trader
              </h2>
            </div>

            <div className="max-w-[266px] w-full">
              <p className="font-mono text-[14px] lg:text-[16px] leading-[1.6] text-cream uppercase m-0">
                A digital journal fixed beyond guess and emotion. An exploration of discipline, performance, and strategy in markets
              </p>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="flex flex-col lg:flex-row justify-between items-start mt-16 lg:mt-32 gap-8 lg:gap-16">
            {/* Left Column */}
            <div className="flex flex-col gap-6 max-w-sm w-full">
              <p className="font-mono text-[14px] lg:text-[16px] text-[#010828] lg:text-cream lg:opacity-10 uppercase select-none leading-[1.6] m-0">
                A digital journal fixed beyond guess and emotion. An exploration of discipline, performance, and strategy in markets
              </p>
              <p className="font-mono text-[14px] lg:text-[16px] text-[#010828] lg:text-cream lg:opacity-10 uppercase select-none leading-[1.6] m-0">
                A digital journal fixed beyond guess and emotion. An exploration of discipline, performance, and strategy in markets
              </p>
            </div>

            {/* Right Column (hidden below lg) */}
            <div className="hidden lg:flex flex-col gap-6 max-w-sm w-full">
              <p className="font-mono text-[14px] lg:text-[16px] text-cream/10 uppercase select-none leading-[1.6] m-0">
                A digital journal fixed beyond guess and emotion. An exploration of discipline, performance, and strategy in markets
              </p>
              <p className="font-mono text-[14px] lg:text-[16px] text-cream/10 uppercase select-none leading-[1.6] m-0">
                A digital journal fixed beyond guess and emotion. An exploration of discipline, performance, and strategy in markets
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: NFT COLLECTION GRID */}
      <section className="bg-[#010828] relative w-full">
        {/* Content Container */}
        <div className="w-full max-w-[1831px] mx-auto px-6 lg:px-12 py-16 md:py-24 flex flex-col gap-12 md:gap-16">
          {/* Header Row */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <h2 className="font-grotesk text-[32px] sm:text-[45px] lg:text-[60px] leading-[1.1] text-cream uppercase m-0">
              Collection of<br />
              <div className="pl-6 sm:pl-16 lg:pl-24 flex items-center gap-x-3 sm:gap-x-4 flex-wrap mt-2 sm:mt-3">
                <span className="font-condiment text-neon normal-case mix-blend-exclusion text-[36px] sm:text-[50px] lg:text-[64px] rotate-[-1deg] opacity-90 leading-none">Trading</span>
                <span className="leading-none">setups</span>
              </div>
            </h2>

            <button className="flex flex-col items-stretch group text-cream bg-transparent border-none p-0 cursor-pointer">
              <div className="flex items-end gap-2 font-grotesk uppercase">
                <span className="text-[32px] sm:text-[45px] lg:text-[60px] leading-none">SEE</span>
                <span className="flex flex-col text-left text-[20px] sm:text-[28px] lg:text-[36px] leading-[0.9] pb-0.5">
                  <span>ALL</span>
                  <span>TRADES</span>
                </span>
              </div>
              <div className="bg-neon h-[6px] sm:h-[8px] lg:h-[10px] w-full mt-2 transition-transform duration-300 group-hover:scale-x-[1.03]" />
            </button>
          </div>

          {/* NFT Card Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {nftItems.map((item) => (
              <div 
                key={item.id} 
                className="liquid-glass rounded-[32px] p-[18px] hover:bg-white/10 transition-colors duration-300"
              >
                {/* Square Video Container */}
                <div className="relative w-full pt-[100%] rounded-[24px] overflow-hidden">
                  <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                  >
                    <source src={item.video} type="video/mp4" />
                  </video>
                </div>

                {/* Score overlay bar */}
                <div className="liquid-glass rounded-[20px] px-5 py-4 flex items-center justify-between mt-4">
                  <div className="flex flex-col text-left">
                    <span className="text-[11px] text-cream/70 tracking-wider font-mono">WIN RATE:</span>
                    <span className="text-[16px] font-grotesk text-cream mt-0.5">{item.score}</span>
                  </div>
                  <button className="w-12 h-12 rounded-full bg-gradient-to-br from-[#b724ff] to-[#7c3aed] flex items-center justify-center text-cream shadow-lg shadow-purple-500/50 hover:scale-110 transition-transform duration-200 border-none cursor-pointer">
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 4: CTA / FINAL SECTION */}
      <section className="relative w-full overflow-hidden bg-[#010828]">
        {/* Background Video (Native aspect ratio) */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-auto block z-0 relative"
        >
          <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260331_055729_72d66327-b59e-4ae9-bb70-de6ccb5ecdb0.mp4" type="video/mp4" />
        </video>

        {/* Text Content Overlay */}
        <div className="absolute inset-0 flex items-center justify-end z-10 pointer-events-none">
          <div className="flex flex-col items-end text-right max-w-[800px] w-full px-6 sm:px-12 md:px-16 lg:pr-[20%] lg:pl-[15%] text-cream pointer-events-auto">
            {/* Cursive Accent (Moved above the heading to prevent overlap and using flex) */}
            <span 
              className="font-condiment text-neon normal-case mix-blend-exclusion text-[20px] sm:text-[36px] lg:text-[48px] -rotate-1 opacity-90 mb-3 sm:mb-4 lg:mb-5 select-none"
            >
              Trade smart
            </span>

            {/* Heading in Anton */}
            <h2 className="font-grotesk text-[15px] sm:text-[30px] md:text-[45px] lg:text-[60px] uppercase leading-[1.1] m-0">
              <div className="mb-3 sm:mb-6 lg:mb-8">JOIN US.</div>
              <div>REVEAL WHAT'S WORKING.</div>
              <div className="my-1">DEFINE YOUR SYSTEM.</div>
              <div>FOLLOW THE SIGNAL.</div>
            </h2>
          </div>
        </div>

        {/* Social Icons (Bottom-left, absolute positioned) */}
        <div 
          className="absolute left-[8%] bottom-[12%] sm:bottom-[15%] lg:bottom-[20%] z-20 flex flex-col items-center liquid-glass rounded-[0.5rem] sm:rounded-[0.8rem] md:rounded-[1rem] lg:rounded-[1.25rem] overflow-hidden"
        >
          <a 
            href="mailto:contact@orbis.nft" 
            className="w-[14vw] sm:w-[14.375rem] md:w-[10.78125rem] lg:w-[16.77rem] h-[14vw] sm:h-[14.375rem] md:h-[10.78125rem] lg:h-[16.77rem] flex items-center justify-center text-cream hover:bg-white/10 transition-colors duration-200 border-b border-white/10"
          >
            <Mail className="w-[4vw] h-[4vw] sm:w-8 sm:h-8 md:w-6 md:h-6 lg:w-8 lg:h-8" />
          </a>
          <a 
            href="https://twitter.com" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="w-[14vw] sm:w-[14.375rem] md:w-[10.78125rem] lg:w-[16.77rem] h-[14vw] sm:h-[14.375rem] md:h-[10.78125rem] lg:h-[16.77rem] flex items-center justify-center text-cream hover:bg-white/10 transition-colors duration-200 border-b border-white/10"
          >
            <Twitter className="w-[4vw] h-[4vw] sm:w-8 sm:h-8 md:w-6 md:h-6 lg:w-8 lg:h-8" />
          </a>
          <a 
            href="https://github.com" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="w-[14vw] sm:w-[14.375rem] md:w-[10.78125rem] lg:w-[16.77rem] h-[14vw] sm:h-[14.375rem] md:h-[10.78125rem] lg:h-[16.77rem] flex items-center justify-center text-cream hover:bg-white/10 transition-colors duration-200"
          >
            <Github className="w-[4vw] h-[4vw] sm:w-8 sm:h-8 md:w-6 md:h-6 lg:w-8 lg:h-8" />
          </a>
        </div>
      </section>
    </div>
  );
}
