import { APP_LOGO_URL, APP_NAME } from '../../lib/branding';

type BrandLogoProps = {
  className?: string;
  alt?: string;
  src?: string | null;
};

export function BrandLogo({ className = 'h-8 w-auto object-contain', alt = APP_NAME, src }: BrandLogoProps) {
  return <img src={src?.trim() || APP_LOGO_URL} alt={alt} className={className} />;
}
