import { GrainGradient } from '@paper-design/shaders-react';
export default function LoginGradient() {
  return <GrainGradient speed={0.35} maxPixelCount={1_000_000} scale={1} rotation={0} offsetX={0} offsetY={0}
    softness={0.5} intensity={0.5} noise={0.25} shape="corners" frame={2854.5}
    colors={['#FFFFFF', '#F9B308', '#F9B308', '#FFFFFF']} colorBack="#00000000"
    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', background: '#000' }} />;
}
