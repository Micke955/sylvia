"use client";

type AvatarImageProps = {
  src: string;
  alt: string;
  className?: string;
};

export default function AvatarImage({ src, alt, className }: AvatarImageProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      onError={(event) => {
        event.currentTarget.src = "/logo.png";
        event.currentTarget.classList.add("object-contain");
      }}
    />
  );
}
