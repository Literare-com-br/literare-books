import type { ImgHTMLAttributes } from 'react';
import { imageAssets } from '../../data/image-assets';
import { managedAsset } from '../../lib/storage-assets';
import StorageImage from './storage-image';

export default function ResponsiveImage({src,alt='',sizes,publicFallback=false,...props}:ImgHTMLAttributes<HTMLImageElement>&{publicFallback?:boolean}) {
  const managed=managedAsset(src);
  if(managed)return <StorageImage {...props} {...managed} alt={alt} sizes={sizes} publicFallback={publicFallback} />;
  const asset=src?imageAssets[src]:undefined;
  const critical=src?.includes('logoliterare');
  return <img {...props} src={asset?.src??src} alt={alt} srcSet={asset?.srcSet} loading={props.loading??(critical?'eager':'lazy')} fetchPriority={critical?'high':props.fetchPriority}
    sizes={sizes??(src?.includes('logo')?'230px':src?.includes('/books/')?'(max-width:767px) 100px, 140px':'(max-width:520px) 100vw, (max-width:1024px) 50vw, 33vw')}
    width={props.width??asset?.width} height={props.height??asset?.height} decoding="async"/>;
}
