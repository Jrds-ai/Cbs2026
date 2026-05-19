'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export function LandingPage() {
  return (
    <div className="text-stitch-on-surface overflow-x-hidden font-body bg-stitch-background min-h-screen relative z-[60] -mt-20">
      {/* TopAppBar */}
      <nav className="fixed top-0 w-full z-50 bg-white/5 backdrop-blur-xl shadow-xl shadow-pink-900/20">
        <div className="flex justify-between items-center px-8 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-pink-600 dark:text-pink-400 text-3xl">auto_fix_high</span>
            <span className="text-2xl font-black text-white bg-gradient-to-r from-[#96005a] to-[#d61f69] bg-clip-text text-transparent font-headline tracking-tight">Coloring Book Studio</span>
          </div>
          <div className="hidden md:flex items-center gap-8 font-label text-sm tracking-wide">
            <a className="text-white/80 hover:text-pink-300 transition-colors duration-300" href="#process">Process</a>
            <a className="text-white/80 hover:text-pink-300 transition-colors duration-300" href="#pricing">Pricing</a>
            <a className="text-white/80 hover:text-pink-300 transition-colors duration-300" href="#events">Events</a>
            <Link href="/login" className="bg-gradient-to-r from-stitch-secondary to-stitch-primary-container px-6 py-2.5 rounded-full font-bold text-white shadow-lg shadow-pink-900/40 hover:scale-105 active:scale-95 transition-all">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-24 px-6 hero-glow min-h-screen flex items-center">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center w-full">
          <div className="z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-stitch-surface-container-high text-stitch-primary font-bold text-xs uppercase tracking-widest mb-6">
              <span className="material-symbols-outlined text-sm">magic_button</span>
              AI-Powered Creative Studio
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-white leading-[1.1] tracking-tight mb-8">
              Turn Your <span className="bg-gradient-to-r from-pink-400 to-amber-400 bg-clip-text text-transparent">Photos</span> Into Magic.
            </h1>
            <p className="text-lg md:text-xl text-stitch-on-surface-variant mb-10 leading-relaxed max-w-xl">
              Create personalized coloring books from your favorite memories. Our AI transforms photos into professional line art in seconds.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/login" className="bg-white text-stitch-on-primary-fixed font-black text-lg px-8 py-4 rounded-xl shadow-2xl hover:bg-pink-50 transition-all transform hover:-translate-y-1 text-center">
                Start Your Masterpiece
              </Link>
              <button className="flex items-center justify-center gap-2 bg-stitch-surface-container-highest border border-white/10 px-8 py-4 rounded-xl font-bold hover:bg-stitch-surface-variant transition-all text-white">
                <span className="material-symbols-outlined">play_circle</span>
                See the Magic
              </button>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-tr from-stitch-primary to-stitch-secondary opacity-20 blur-3xl rounded-full"></div>
            <div className="relative grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <Image width={520} height={640} className="rounded-2xl shadow-2xl border border-white/5 grayscale-0" alt="Child coloring family portrait" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBhat1hW-2ikCdGam9AEsWunsjqgxlFKODPDmXj5MNsmj4oLWjg1vPTbFwI6O9JXjhr2bmJJnOx5SwJwP9DYdUJ5LP4xmh4VzMWRfmUNVGSdar8QO65Tq0Gpk7SJjTD1HJu0wZqiOyjjb6FYSG_188otJjZGljKwPGMdX3pBEoVWvf9kTtlZqZ3Skgxv39Tz3Jure6zpzvGv3PljSUMjbE0w0rCQF3NvToWA0ZxeZAxZuNvCbO6h0EUQDBA4TZ_0zQFI2Ytf0gYUq78"/>
                <Image width={520} height={640} className="rounded-2xl shadow-2xl border border-white/5 brightness-110" alt="Wedding couple line-art" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBGUjIUBG8Y9hisgnfOJT0vd9_1l-g2buuFtPasZdpPTj7KkXtwda0p01bhYGi1MgCVw3DllbIFHuPDnnT3Tj903QMugdknZ6gWi7m70CnkFPhX6VJxfVeHznuOF-FCH24wt_uk93jihn16UTIeL0hz9GwTRPG5h4SPrgyfMZq4AxqbebpIdiW0dnxH3GO8kPDxD2qAH4AU4NxorTDbJcwwQ3kGAWnMOpanX-sUedggOx_crOl0lrdY9PkDzLjSa2ZkfssL7YDdNhSC"/>
              </div>
              <div className="space-y-4 pt-12">
                <Image width={520} height={640} className="rounded-2xl shadow-2xl border border-white/5" alt="Premium hardcover books" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBCwM-9fedtV_600dzNgs0Zwnd04Fk-9EXCDc4VTS1B5RnGtyALDCUSvufwfYLOuKDKbvEmHB0iRFrm_A45UhC7OZsx-zibLiDpQBCfZX-BCKeJl6hE_L2sBQ2Zm3Xu26Ziin8gSrYRrNBj3p534obc7_WvxDdhHKOLD62HJi7QTArctsr82dVomkbIgCUVoh72FFETwfxovf7KvvTbpYRQu4z_-NzPiOAMHYHtFPjDTMcQb8Pz_ZSSklAvekpDSGReKMoaQtjcTIQT"/>
                <Image width={520} height={640} className="rounded-2xl shadow-2xl border border-white/5" alt="Digital tablet showing coloring page" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD-f9sA4iGauzM65I87acIvKRQc-hUsN_YYBZadVeU6Mc7HGPlDfSOsrtHHY4c-i8zOnaYVjqJBZgGyWOjaJ3atHFwZCrhdCXcwQbuLSRneBT3lHFJFiF4A6a1zmgisjpAACQ7aChoJZxzh4M9dpT8oaatGb6kIxRrAzgDJidLUvD6U5QD6cxblbJpMuAoyVHIbPCcvippnIrJccVZN0ufcP9F7hgoK0WOPjHAStFY3FsbbvBHKMIW1LaXVQHopfKfmBm9740io59DR"/>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bento Benefits Section */}
      <section className="py-24 px-6 bg-stitch-surface-dim" id="process">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Crafted for Your Creativity</h2>
            <p className="text-stitch-on-surface-variant max-w-2xl mx-auto">We combine cutting-edge AI with professional print quality to deliver a premium experience.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* AI Magic */}
            <div className="glass-card p-8 rounded-xl md:col-span-2 relative overflow-hidden group">
              <div className="relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-stitch-primary/20 flex items-center justify-center mb-6 group-hover:bg-stitch-primary/30 transition-all">
                  <span className="material-symbols-outlined text-stitch-primary text-4xl">auto_awesome</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">AI Magic</h3>
                <p className="text-stitch-on-surface-variant max-w-md leading-relaxed">Our advanced neural networks don&apos;t just &quot;filter&quot; photos. They reconstruct them into clean, high-quality line art optimized for coloring.</p>
              </div>
              <div className="absolute right-0 bottom-0 w-1/2 opacity-20 pointer-events-none transform translate-y-1/4 translate-x-1/4 group-hover:scale-110 transition-transform">
                <Image width={420} height={420} className="w-full" alt="AI Neural Network" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCRTtPQPW_xP33dzEVzvieVmJdvpDlLLpSoFHC7ZLhzP4zHcTDxyBYxXzf6S3RWNFO4peDU1YMWb3qqnvqOAA9LGmDg0wifbudSa44Xo8MTODRE9REXXeYZdFHiEaua3RVlYaRF-EsxFRHfjg-pSLY5T0yFaUfV2ZAzEZhCZ6NxT5by4b9tWIqKaunM4U-MxygarZdEhkE9NgPMHFyVQl8wERvA_VckUEAU7o2Ovva4wu7tZgDBjoABiXDPDJVkRylYMXFN16sxBnXI"/>
              </div>
            </div>
            {/* You're the Editor */}
            <div className="glass-card p-8 rounded-xl flex flex-col justify-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-stitch-tertiary/20 flex items-center justify-center mb-6 mx-auto">
                <span className="material-symbols-outlined text-stitch-tertiary text-4xl">edit_note</span>
              </div>
                <h3 className="text-2xl font-bold text-white mb-3">You&apos;re the Editor</h3>
              <p className="text-stitch-on-surface-variant text-sm">Review every single page before we print. Adjust line weight, remove backgrounds, or swap photos instantly.</p>
            </div>
            {/* Physical or Digital */}
            <div className="glass-card p-8 rounded-xl">
              <div className="w-16 h-16 rounded-2xl bg-stitch-secondary/20 flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-stitch-secondary text-4xl">menu_book</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Format of Choice</h3>
              <p className="text-stitch-on-surface-variant text-sm mb-6">From instant PDF downloads for home printing to luxury boutique hardcover shipping.</p>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-bold tracking-widest uppercase text-white/60">Digital</span>
                <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-bold tracking-widest uppercase text-white/60">Print</span>
              </div>
            </div>
            {/* Events */}
            <div className="glass-card p-8 rounded-xl md:col-span-2 flex items-center gap-8 relative overflow-hidden" id="events">
              <div className="hidden lg:block w-1/3">
                <Image width={420} height={520} className="rounded-xl shadow-lg" alt="Wedding guest favors" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCgC9IIiNDIsXwPVBCkyHIG8k0hIizsKuLsFP2xxxv-Do3kgQ7aUZrU9Y_j5J9YiO_YV7i-riyINveJYNoCdgcaT1qcc9NfP9RAOw2czvODyZFZ-komY674Gf9owRXH3jeA8NuFdSm5V0r-qF-cYjbIwXE_u-52P9oTzJ4_dwwY_urtj_kssqNl_kRTJlq0qflpsqXm7r6UewP5Re1F7HeXQHa3WUfeJ3B_bWplGXhiVdQF0Gq7jnUuk8hGLQ18Sn8qucibXsHR7CDd"/>
              </div>
              <div className="flex-1">
                <div className="w-16 h-16 rounded-2xl bg-stitch-on-secondary-fixed-variant/20 flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-stitch-on-secondary-fixed-variant text-4xl">celebration</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Perfect for Events</h3>
                <p className="text-stitch-on-surface-variant leading-relaxed">The ultimate personalized party favor. Create bespoke coloring books for <span className="text-white font-semibold">weddings</span>, <span className="text-white font-semibold">birthdays</span>, and high-impact <span className="text-white font-semibold">trade shows</span>.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 px-6 relative" id="pricing">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Choose Your Canvas</h2>
            <p className="text-stitch-on-surface-variant">Simple, transparent pricing for any creative project.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Digital */}
            <div className="glass-card p-8 rounded-[2rem] border-white/5 hover:border-white/10 transition-all flex flex-col h-full">
              <div className="mb-8">
                <h4 className="text-pink-400 font-bold tracking-widest text-xs uppercase mb-2">Instant Access</h4>
                <h3 className="text-2xl font-bold text-white">Digital Edition</h3>
                <div className="mt-4 flex items-baseline">
                  <span className="text-4xl font-black text-white">$8.99</span>
                </div>
              </div>
              <ul className="space-y-4 mb-10 flex-grow text-stitch-on-surface-variant">
                <li className="flex items-center gap-3 text-sm">
                  <span className="material-symbols-outlined text-stitch-primary text-lg">check_circle</span>
                  Up to 20 custom pages
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <span className="material-symbols-outlined text-stitch-primary text-lg">check_circle</span>
                  High-res PDF download
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <span className="material-symbols-outlined text-stitch-primary text-lg">check_circle</span>
                  Print-at-home ready
                </li>
              </ul>
              <button className="w-full py-4 rounded-xl border border-white/10 hover:bg-white/5 font-bold transition-all text-white">Select Digital</button>
            </div>
            {/* Standard Print */}
            <div className="bg-gradient-to-b from-stitch-surface-container-high to-stitch-surface-container p-8 rounded-[2rem] border-2 border-stitch-primary/30 relative transform md:scale-105 shadow-2xl flex flex-col h-full">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-stitch-primary text-stitch-on-primary-container px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Most Popular</div>
              <div className="mb-8">
                <h4 className="text-stitch-primary font-bold tracking-widest text-xs uppercase mb-2">Softcover Bloom</h4>
                <h3 className="text-2xl font-bold text-white">Standard Print</h3>
                <div className="mt-4 flex items-baseline">
                  <span className="text-4xl font-black text-white">$19.99</span>
                </div>
              </div>
              <ul className="space-y-4 mb-10 flex-grow">
                <li className="flex items-center gap-3 text-sm text-white">
                  <span className="material-symbols-outlined text-stitch-primary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  Up to 40 custom pages
                </li>
                <li className="flex items-center gap-3 text-sm text-white">
                  <span className="material-symbols-outlined text-stitch-primary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  Premium 120gsm paper
                </li>
                <li className="flex items-center gap-3 text-sm text-white">
                  <span className="material-symbols-outlined text-stitch-primary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  Glossy softcover finish
                </li>
              </ul>
              <button className="w-full py-4 rounded-xl bg-stitch-primary text-stitch-on-primary-container font-black shadow-lg shadow-stitch-primary/20 hover:scale-105 transition-all">Craft My Book</button>
            </div>
            {/* Hardcover */}
            <div className="glass-card p-8 rounded-[2rem] border-white/5 hover:border-white/10 transition-all flex flex-col h-full">
              <div className="mb-8">
                <h4 className="text-amber-400 font-bold tracking-widest text-xs uppercase mb-2">Luxe Heirloom</h4>
                <h3 className="text-2xl font-bold text-white">Premium Hardcover</h3>
                <div className="mt-4 flex items-baseline">
                  <span className="text-4xl font-black text-white">$29.99</span>
                </div>
              </div>
              <ul className="space-y-4 mb-10 flex-grow text-stitch-on-surface-variant">
                <li className="flex items-center gap-3 text-sm">
                  <span className="material-symbols-outlined text-stitch-tertiary text-lg">check_circle</span>
                  Up to 60 custom pages
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <span className="material-symbols-outlined text-stitch-tertiary text-lg">check_circle</span>
                  Ultra-thick art paper
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <span className="material-symbols-outlined text-stitch-tertiary text-lg">check_circle</span>
                  Matte linen hardcover
                </li>
              </ul>
              <button className="w-full py-4 rounded-xl border border-white/10 hover:bg-white/5 font-bold transition-all text-white">Select Premium</button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full rounded-t-[3rem] mt-20 bg-[#1a0010] border-t border-white/5 shadow-[0_-10px_40px_rgba(150,0,90,0.1)]">
        <div className="flex flex-col md:flex-row justify-between items-center px-12 py-16 w-full gap-8 max-w-7xl mx-auto">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#96005a] text-2xl">auto_fix_high</span>
              <span className="text-xl font-bold text-[#96005a] font-headline">Coloring Book Studio</span>
            </div>
            <p className="text-white/40 text-xs font-label tracking-wide">© 2024 Coloring Book Studio. Created with Luminescent AI.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-8 text-sm font-label tracking-wide text-white/40">
            <a className="hover:text-white transition-all opacity-80 hover:opacity-100" href="#">Process</a>
            <a className="hover:text-white transition-all opacity-80 hover:opacity-100" href="#">Events</a>
            <a className="hover:text-white transition-all opacity-80 hover:opacity-100" href="#">Pricing</a>
            <a className="hover:text-white transition-all opacity-80 hover:opacity-100" href="#">Support</a>
            <a className="hover:text-white transition-all opacity-80 hover:opacity-100" href="#">Privacy</a>
          </div>
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/60 hover:text-white cursor-pointer hover:bg-white/10 transition-all">
              <span className="material-symbols-outlined text-lg">share</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/60 hover:text-white cursor-pointer hover:bg-white/10 transition-all">
              <span className="material-symbols-outlined text-lg">mail</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
