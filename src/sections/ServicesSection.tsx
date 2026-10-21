import { bookCovers } from "../data/book-covers";
import { lazy } from "react";
import DeferredContent from "../components/ui/deferred-content";
const ScrollMorphHero = lazy(() => import("../components/ui/scroll-morph-hero"));
export default function ServicesSection() {
  return <section id="servicos" className="services-editorial" aria-label="O que fazemos">
    <DeferredContent fallback={<div className="morph-placeholder" />}><ScrollMorphHero images={bookCovers} /></DeferredContent>
  </section>;
}
