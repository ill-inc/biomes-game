import React from "react";
import bLogoImage from "/public/splash/b-logo.png";
import biomesLogoImage from "/public/splash/biomes.svg";

export const SplashHeader: React.FunctionComponent<{
  onLoginClick: () => any;
}> = ({ onLoginClick }) => {
  return (
    <div className="fixed top-0 z-30 flex w-full items-center justify-between p-[24px] text-[16px]">
      <div>
        <img
          onClick={() => {
            window.location.href = "/";
          }}
          src={biomesLogoImage.src}
          alt="Biomes Logo"
          title="Biomes"
          className="hidden cursor-pointer filter-image-drop-shadow md:block"
        />

        <img
          src={bLogoImage.src}
          alt="Biomes Logo"
          title="Biomes"
          className="h-[32px] w-[32px] filter-image-drop-shadow md:hidden"
        />
      </div>
      <div className="flex gap-[16px]">
        <a
          target="_blank"
          href="https://github.com/ill-inc/biomes-game"
          rel="noreferrer"
        >
          GitHub
        </a>
        <a target="_blank" href="https://www.x.com/illdotinc" rel="noreferrer">
          X
        </a>
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onLoginClick();
          }}
        >
          Login
        </a>
      </div>
    </div>
  );
};
