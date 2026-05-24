type AvatarImageProps = {
  displayName: string;
  avatarUrl?: string;
  seed: string;
  size?: number;
  className?: string;
};

const DICEBEAR_BASE = "https://api.dicebear.com/9.x/identicon/svg";

export function AvatarImage({
  displayName,
  avatarUrl,
  seed,
  size = 48,
  className = "",
}: AvatarImageProps) {
  const src = avatarUrl ?? `${DICEBEAR_BASE}?seed=${encodeURIComponent(seed)}`;

  return (
    // biome-ignore lint/performance/noImgElement: アバター画像はサードパーティ URL を含むため next/image は使用しない
    <img
      src={src}
      alt={`${displayName} のアバター`}
      width={size}
      height={size}
      className={`rounded-full object-cover bg-gray-100 ${className}`}
    />
  );
}
