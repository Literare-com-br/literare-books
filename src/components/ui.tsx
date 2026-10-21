import { ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { BlurReveal } from './ui/blur-reveal';
export function Button({
  children,
  href,
  className = ''
}: {
  children: ReactNode;
  href: string;
  className?: string;
}) {
  return <a className={`button ${className}`} href={href}>{typeof children==='string'?<BlurReveal as="span">{children}</BlurReveal>:children}<ArrowUpRight size={17} /></a>;
}
export function SectionHeading({
  label,
  title,
  description,
  center = false
}: {
  label: string;
  title: string;
  description?: string;
  center?: boolean;
}) {
  return <div className={`section-heading ${center ? 'center' : ''}`}><span className="eyebrow"><i /><BlurReveal as="span">{label}</BlurReveal></span><BlurReveal as="h2">{title}</BlurReveal>{description && <BlurReveal as="p" delay={0.12} speedReveal={2.5}>{description}</BlurReveal>}</div>;
}
export function CircleArrow() {
  return <span className="circle-arrow"><ArrowUpRight size={19} /></span>;
}
