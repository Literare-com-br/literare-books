import {Suspense,type ReactNode} from 'react';
import {useNearViewport} from '../../hooks/use-near-viewport';
export default function DeferredContent({children,fallback}:{children:ReactNode;fallback:ReactNode}){
 const {ref,near}=useNearViewport();return <div ref={ref}>{near?<Suspense fallback={fallback}>{children}</Suspense>:fallback}</div>;
}
