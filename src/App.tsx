import { gsap } from "./lib/gsap";
import { BlurReveal } from "./components/ui/blur-reveal";
import { lazy, useLayoutEffect, useRef } from "react";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import GlyphPortal from "./components/hero/GlyphPortal";
import AboutSection from "./sections/AboutSection";
import ServicesSection from "./sections/ServicesSection";
import FeaturesSection from "./sections/FeaturesSection";
import MetricsSection from "./sections/MetricsSection";
import IndustriesSection from "./sections/IndustriesSection";
import ProjectsSection from "./sections/ProjectsSection";

import DeferredContent from "./components/ui/deferred-content";
const ContactSection = lazy(() => import("./sections/ContactSection"));
import { siteContent } from "./data/siteContent";
import { usePublishedContent } from './components/PublishedContent';
export default function App() {
  const hero = usePublishedContent('hero');
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.utils.toArray<HTMLElement>(".reveal").forEach(el => {
        gsap.from(el, {
          y: 20,
          opacity: 0,
          duration: 0.65,
          ease: "power2.out",
          scrollTrigger: {
            trigger: el,
            start: "top 96%",
            once: true
          }
        });
      });
    });
    return () => mm.revert();
  }, []);
  return <div ref={root}>
      {/* Acessibilidade */}
      <a className="skip-link" href="#sobre"><BlurReveal as="span">{"Pular para o conteúdo"}</BlurReveal></a>

      {/* Cabeçalho */}
      <Header />

      <main>
        {/* HERO — GLYPH PORTAL */}
        <div id="inicio">
          <GlyphPortal word={siteContent.word} fontFamily="NewJune" fontWeight={700} scrollLength={1.65} interactive={false} enterLabel="Explore a Literare" style={{
          "--gp-paper": "#F9B308",
          "--gp-ink": "#000000",
          "--gp-field": "#000000",
          "--gp-foreground": "#FFFFFF"
        } as React.CSSProperties} background={<div className="portal-ink" />} front={<div className="hero-front">
                <span className="hero-kicker"><BlurReveal as="span">{"LIVROS. HISTÓRIAS. CONHECIMENTO."}</BlurReveal></span>

                <div className="hero-bottom">
                  <h1><BlurReveal as="span">{hero.title}</BlurReveal></h1>

                  <a className="button dark" href="#contato"><BlurReveal as="span">{"Quero ser Autor(a)"}</BlurReveal><ArrowUpRight size={18} />
                  </a>
                </div>

                <div className="hero-footnote">
                  <span><BlurReveal as="span">{"HISTÓRIAS QUE INSPIRAM."}</BlurReveal><br /><BlurReveal as="span">{"LIVROS QUE TRANSFORMAM."}</BlurReveal></span>

                  <span><BlurReveal as="span">{"ROLE PARA DESCOBRIR"}</BlurReveal><ArrowDown size={14} />
                  </span>

                  <span><BlurReveal as="span">{"LITERARE BOOKS ®"}</BlurReveal></span>
                </div>
              </div>}>
            {/* Conteúdo apresentado após o portal */}
            <div className="portal-intro">
              <span className="eyebrow">
                <i /><BlurReveal as="span">{"BEM-VINDO À LITERARE BOOKS"}</BlurReveal></span>

              <h2><BlurReveal as="span">{"Ideias que "}</BlurReveal><br /><BlurReveal as="span">{"viram livros."}</BlurReveal><br />
                <span><BlurReveal as="span">{"Livros que"}</BlurReveal><br /><BlurReveal as="span">{"transformam vidas."}</BlurReveal></span>
              </h2>

              <div>
                <p><BlurReveal as="span">{"Cada autor tem uma história. Cada livro, um propósito. Na Literare Books, transformamos conhecimento e experiências em obras que ultrapassam páginas."}</BlurReveal></p>

                <a href="#sobre"><BlurReveal as="span">{"Conheça nossa editora"}</BlurReveal><ArrowUpRight size={18} />
                </a>
              </div>
            </div>
          </GlyphPortal>
        </div>

        {/* SOBRE A EDITORA */}
        <AboutSection />

        {/* SERVIÇOS EDITORIAIS */}
        <ServicesSection />

        {/* DIFERENCIAIS */}
        <FeaturesSection />

        {/* NÚMEROS DA EDITORA */}
        <MetricsSection />

        {/* ÁREAS DE ATUAÇÃO */}
        <IndustriesSection />

        {/* PROJETOS E PUBLICAÇÕES */}
        <ProjectsSection />

        {/* CONTATO */}
        <DeferredContent fallback={<section id="contato" className="contact-placeholder" />}><ContactSection /></DeferredContent>
      </main>

      {/* RODAPÉ */}
      <Footer />
    </div>;
}
