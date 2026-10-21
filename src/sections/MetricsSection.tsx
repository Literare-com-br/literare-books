import { BlurReveal } from "../components/ui/blur-reveal";
import { siteContent } from "../data/siteContent";
import AnimatedCounter from "../components/animations/AnimatedCounter";
export default function MetricsSection() {
  return <section className="section metrics" aria-label="Números da Literare Books"><div className="metrics-grid">{siteContent.metrics.map(m => <div key={m.label}><strong><AnimatedCounter value={m.value} suffix={m.suffix} divisor={m.divisor} /></strong><p><BlurReveal as="span">{m.label}</BlurReveal></p></div>)}</div></section>;
}
