import Image from "next/image";

interface EntryPanoramaProps {
  className?: string;
}

export default function EntryPanorama({ className }: EntryPanoramaProps) {
  return (
    <Image
      alt=""
      aria-hidden="true"
      className={className}
      draggable={false}
      height={941}
      priority
      src="/homepage-reference-sketch.svg?v=supplied-svg-1"
      unoptimized
      width={1672}
    />
  );
}
