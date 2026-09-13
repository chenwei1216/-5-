import { clsx } from 'clsx';

interface AvatarProps {
  src?: string;
  alt: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const colors = [
  'bg-red-500',
  'bg-orange-500',
  'bg-amber-500',
  'bg-yellow-500',
  'bg-lime-500',
  'bg-green-500',
  'bg-emerald-500',
  'bg-teal-500',
  'bg-cyan-500',
  'bg-sky-500',
  'bg-blue-500',
  'bg-indigo-500',
  'bg-violet-500',
  'bg-purple-500',
  'bg-fuchsia-500',
  'bg-pink-500',
  'bg-rose-500',
];

const sizeClasses = {
  sm: 'w-6 h-6 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-32 h-32 text-3xl',
};

function getColorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function getInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

export default function Avatar({ src, alt, className, size = 'md' }: AvatarProps) {
  const hasImage = src && !src.includes('dicebear');
  
  if (hasImage) {
    return (
      <img
        src={src}
        alt={alt}
        className={clsx(
          'rounded-full object-cover',
          sizeClasses[size],
          className
        )}
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          target.nextElementSibling?.classList.remove('hidden');
        }}
      />
    );
  }

  return (
    <div
      className={clsx(
        'rounded-full flex items-center justify-center font-bold text-white',
        sizeClasses[size],
        getColorFromName(alt),
        className
      )}
    >
      {getInitial(alt)}
    </div>
  );
}
