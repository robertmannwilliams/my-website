interface EntryPanoramaProps {
  className?: string;
}

export default function EntryPanorama({ className }: EntryPanoramaProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      focusable="false"
      viewBox="0 0 1200 720"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g fill="none" stroke="currentColor" strokeLinecap="square" strokeLinejoin="miter">
        <path d="M80 590H1120" strokeWidth="10" opacity="0.9" />
        <path d="M126 590V392L198 328L270 392V590" strokeWidth="8" />
        <path d="M156 428H240M156 468H240M156 508H240" strokeWidth="4" opacity="0.44" />
        <path d="M318 590V252H408V590" strokeWidth="11" />
        <path d="M334 310H392M334 370H392M334 430H392M334 490H392" strokeWidth="4" opacity="0.44" />
        <path d="M468 590V372L618 284L768 372V590" strokeWidth="10" />
        <path d="M506 410H730M506 470H730M506 530H730" strokeWidth="4" opacity="0.42" />
        <path d="M820 590V184H914V590" strokeWidth="12" />
        <path d="M840 250H894M840 318H894M840 386H894M840 454H894" strokeWidth="4" opacity="0.44" />
        <path d="M958 590V354H1064V590" strokeWidth="9" />
        <path d="M990 354V284H1034V354" strokeWidth="7" />
        <path d="M142 476C248 340 388 386 492 462C608 548 740 528 826 374C900 240 1024 248 1110 352" strokeWidth="6" opacity="0.38" />
        <path d="M224 634H440M506 634H768M820 634H1064" strokeWidth="4" opacity="0.35" />
        <path d="M602 284L602 590" strokeWidth="4" opacity="0.36" />
        <path d="M558 310L646 310M532 344L672 344" strokeWidth="4" opacity="0.36" />
        <path d="M867 184L900 138L933 184" strokeWidth="6" opacity="0.55" />
        <path d="M900 138V252" strokeWidth="4" opacity="0.45" />
      </g>
      <g fill="currentColor" opacity="0.32">
        <circle cx="198" cy="328" r="8" />
        <circle cx="618" cy="284" r="8" />
        <circle cx="900" cy="138" r="7" />
        <circle cx="1034" cy="284" r="6" />
      </g>
    </svg>
  );
}
