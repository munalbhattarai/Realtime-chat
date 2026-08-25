const SpideyLogo = ({ size = 28, className = "" }) => {
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-[0_0_8px_rgba(225,29,72,0.6)]"
      >
        {/* Spider Mask / Emblem */}
        <path
          d="M12 2C8 2 4.5 4.5 4 9.5C3.5 14.5 7 19.5 12 22C17 19.5 20.5 14.5 20 9.5C19.5 4.5 16 2 12 2Z"
          fill="url(#spidey-grad)"
          stroke="#EF4444"
          strokeWidth="1.2"
        />
        {/* Spider Eyes */}
        <path
          d="M6.5 8.5C8 10 10.5 12 11 15C9.5 14.5 7.5 12.5 6 10.5C5.5 9.8 5.8 8.8 6.5 8.5Z"
          fill="#FFFFFF"
          stroke="#050714"
          strokeWidth="0.8"
        />
        <path
          d="M17.5 8.5C16 10 13.5 12 13 15C14.5 14.5 16.5 12.5 18 10.5C18.5 9.8 18.2 8.8 17.5 8.5Z"
          fill="#FFFFFF"
          stroke="#050714"
          strokeWidth="0.8"
        />
        {/* Web Line accent */}
        <line x1="12" y1="2" x2="12" y2="22" stroke="rgba(255,255,255,0.25)" strokeWidth="0.8" />
        <line x1="4" y1="9.5" x2="20" y2="9.5" stroke="rgba(255,255,255,0.2)" strokeWidth="0.8" />
        <defs>
          <linearGradient id="spidey-grad" x1="4" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
            <stop stopColor="#DC2626" />
            <stop offset="0.6" stopColor="#B91C1C" />
            <stop offset="1" stopColor="#1E3A8A" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

export default SpideyLogo;
