import styles from "@/client/styles/new_site.module.css";
import React, { useEffect, useRef, useState } from "react";
import playButton from "/public/hud/icon-16-play.png";
import trailerPoster from "/public/splash/trailer-poster.png";

import { WakeupMuckParticles } from "@/client/components/Particles";
import { LoginRelatedController } from "@/client/components/static_site/LoginRelatedController";
import { LoginRelatedControllerContext } from "@/client/components/static_site/LoginRelatedControllerContext";
import { SplashHeader } from "@/client/components/static_site/SplashHeader";
import { cleanListener } from "@/client/util/helpers";
import { useFeaturedPosts } from "@/client/util/social_manager_hooks";
import { safeDetermineEmployeeUserId } from "@/server/shared/bootstrap/sync";
import type { BiomesId } from "@/shared/ids";
import { INVALID_BIOMES_ID } from "@/shared/ids";
import type { FeedPostBundle } from "@/shared/types";
import type { Variants } from "framer-motion";
import { motion } from "framer-motion";
import { inRange } from "lodash";
import dynamic from "next/dynamic";
import Head from "next/head";
import Masonry from "react-masonry-css";
import Tilt from "react-parallax-tilt";

const youtubeVideoId = "vPHEtewFm3M";

const ReactPlayer = dynamic(() => import("react-player"), {
  ssr: false,
});

export const getServerSideProps = async () => {
  return {
    props: {
      defaultUsernameOrId: (await safeDetermineEmployeeUserId()) ?? "",
      primaryCTA: CONFIG.primaryCTA,
    },
  };
};

const MAX_TILT_SMALL = 5;
const MAX_TILT_BIG = 20;

const FeaturedImage: React.FC<{
  post: FeedPostBundle;
  margin: string;
  selectedPostId: BiomesId;
  onClick: () => void;
}> = ({ post, margin, selectedPostId, onClick }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isSelected, setIsSelected] = useState(post.id === selectedPostId);
  const [wasSelected, setWasSelected] = useState(false);

  useEffect(() => {
    const selected = post.id === selectedPostId;
    setWasSelected(isSelected);
    setIsSelected(selected);
  }, [selectedPostId]);

  function getDivPositionRelativeToViewport(div: HTMLDivElement) {
    const rect = div.getBoundingClientRect();

    const centerX = rect.left + div.offsetWidth / 2;
    const relativePosition = centerX / window.innerWidth;

    if (inRange(relativePosition, 0.48, 0.52)) {
      return "center center";
    } else if (relativePosition < 0.4) {
      return "center left";
    } else {
      return "center right";
    }
  }

  useEffect(() => {
    cleanListener(window, {
      resize: () => {
        if (ref.current) {
          ref.current.style.transformOrigin = getDivPositionRelativeToViewport(
            ref.current
          );
        }
      },
    });
    if (ref.current) {
      ref.current.style.transformOrigin = getDivPositionRelativeToViewport(
        ref.current
      );
    }
  }, []);

  const variants: Variants = {
    rest: {
      scale: 1,
    },
    big: {
      scale: 1.75,
    },
    tap: {
      scale: 0.98,
    },
  };

  return (
    <motion.div
      ref={ref}
      onClick={onClick}
      onMouseLeave={() => {
        if (isSelected) {
          onClick();
        }
      }}
      className="relative"
      variants={variants}
      whileTap={isSelected ? "big" : "tap"}
      animate={isSelected ? "big" : "rest"}
      transition={{ type: "spring", bounce: 0.2 }}
      style={{
        zIndex: isSelected ? 40 : wasSelected ? 10 : 0,
        marginBottom: margin,
        transformOrigin: "center right",
      }}
    >
      <Tilt
        tiltReverse={true}
        glareEnable={true}
        glarePosition="all"
        glareColor="rgba(255,255,255,0.5)"
        transitionSpeed={800}
        tiltMaxAngleX={isSelected ? MAX_TILT_BIG : MAX_TILT_SMALL}
        tiltMaxAngleY={isSelected ? MAX_TILT_BIG : MAX_TILT_SMALL}
        className="relative overflow-hidden"
        style={{
          marginBottom: margin,
          boxShadow: isSelected ? "0 10px 40px rgba(0,0,0,0.75)" : "none",
        }}
      >
        <motion.div
          style={{
            border: "4px solid white",
          }}
          initial={{ rotate: 0, opacity: 0 }}
          whileInView={{
            opacity: 1,
          }}
          viewport={{ once: true }}
          className={`slideshow-image relative flex cursor-pointer flex-col bg-white font-vt text-shadow-[none]`}
        >
          <div className="group pointer-events-none relative select-none bg-dark-grey">
            <motion.img
              className="pointer-events-none relative w-full select-none"
              src={post.imageUrls.webp_1280w}
            />
            <div className="absolute bottom-[8px] left-[12px] select-none text-[18px] text-white text-shadow-bordered">
              {post.author.username}
            </div>
          </div>
        </motion.div>
      </Tilt>
    </motion.div>
  );
};

const FeaturedImageSpread: React.FC<{
  images: FeedPostBundle[];
}> = ({ images }) => {
  const margin = "2vmin";
  const gridMargin = `ml-[-2vmin]`;
  const columnPadding = `pl-[2vmin]`;
  const [selectedImage, setSelectedImage] =
    useState<BiomesId>(INVALID_BIOMES_ID);
  return (
    <Masonry
      className={`${gridMargin} flex`}
      breakpointCols={{ default: 3, 700: 2 }}
      columnClassName={`${columnPadding}`}
    >
      {images.map((image) => {
        return (
          <FeaturedImage
            margin={margin}
            key={image.id}
            post={image}
            onClick={() => {
              if (image.id === selectedImage) {
                setSelectedImage(INVALID_BIOMES_ID);
              } else {
                setSelectedImage(image.id);
              }
            }}
            selectedPostId={selectedImage}
          />
        );
      })}
    </Masonry>
  );
};

export const MAX_IMAGES = 100;

export const SplashPage: React.FunctionComponent<{
  defaultUsernameOrId?: string;
  onLogin?: () => unknown;
}> = ({ defaultUsernameOrId, onLogin }) => {
  const { posts } = useFeaturedPosts({
    count: 24,
  });
  const year = new Date().getFullYear();

  const [playYoutubeTrailer, setPlayYoutubeTrailer] = useState(false);
  return (
    <>
      <Head>
        <meta name="theme-color" content="#1C0D28" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Biomes — Join the community shaping a new world</title>
      </Head>
      <LoginRelatedController
        defaultUsernameOrId={defaultUsernameOrId}
        onLogin={onLogin}
      >
        <LoginRelatedControllerContext.Consumer>
          {(loginRelatedControllerContext) => (
            <div className={`${styles.globalContainer} bg-[#1C0D28]`}>
              <WakeupMuckParticles />
              <SplashHeader
                onLoginClick={() => {
                  loginRelatedControllerContext.showLogin();
                }}
              />
              {!loginRelatedControllerContext.showingModal && (
                <div className="mx-auto flex max-w-[min(calc(100%-48px),1200px)] flex-col gap-2 pt-[24vh] text-shadow-drop">
                  <div
                    className="white mx-auto max-w-[640px] pb-[6vmin] text-center text-[18px] md:text-[24px]"
                    style={{ lineHeight: "150%" }}
                  >
                    Biomes is an{" "}
                    <a
                      className="font-normal underline"
                      href="https://github.com/ill-inc/biomes-game"
                    >
                      open source
                    </a>{" "}
                    sandbox MMORPG built for the web. Build, forage, play
                    minigames and more, all right from your browser.
                  </div>
                  <div
                    className="relative flex aspect-video overflow-hidden"
                    style={{ border: "4px solid white" }}
                  >
                    <ReactPlayer
                      style={{ background: "black" }}
                      width={"100%"}
                      height={"100%"}
                      playing={playYoutubeTrailer}
                      onPlay={() => setPlayYoutubeTrailer(true)}
                      url={`https://www.youtube.com/embed/${youtubeVideoId}`}
                      config={{
                        youtube: {
                          playerVars: {
                            controls: 1,
                            rel: 0,
                            modestbranding: 1,
                          },
                        },
                      }}
                    />
                    {!playYoutubeTrailer && (
                      <>
                        <img
                          src={trailerPoster.src}
                          onClick={() => {
                            setPlayYoutubeTrailer(true);
                          }}
                          className="absolute left-0 top-0 aspect-video w-full cursor-pointer"
                        />

                        <div className="absolute bottom-[8px] left-[12px] select-none font-vt text-[18px] text-white text-shadow-bordered">
                          Biomes Trailer 2:10
                        </div>

                        <div
                          className="absolute-center flex aspect-square cursor-pointer items-center rounded-full p-[8px] text-[16px] font-semibold"
                          style={{
                            border: "3px solid white",
                            boxShadow:
                              "inset 0 0 0 3px rgba(0,0,0,0.5), 0 0 0 3px rgba(0,0,0,.5)",
                          }}
                          onClick={() => {
                            setPlayYoutubeTrailer(true);
                          }}
                        >
                          <img
                            src={playButton.src}
                            className="w-[24px] filter-image-stroke"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  <div className="relative">
                    <FeaturedImageSpread
                      // Mod to make sure the count is divisible by 2 and 3.
                      images={posts
                        .slice(0, posts.length - (posts.length % 6))
                        .map(({ post }) => post)}
                    />
                  </div>

                  <div className="mt-[12vh] w-full text-center text-[18px] text-white/70">
                    Biomes was created by
                    <br />
                    Thomas Dimson
                    <br />
                    Joey Flynn
                    <br />
                    Taylor Gordon
                    <br />
                    Alexei Karpenko
                    <br />
                    Andrew Top
                    <br />
                    Nick Cooper
                    <br />
                    Ian Silber
                    <br />
                    Brandon Wang
                    <br />
                    <br />
                    Art by
                    <br />
                    Luis Gustavo Barbosa Tavares
                    <br />
                    Thais Torres
                    <br />
                    Lotto
                    <br />
                    <br />
                    Music by
                    <br />
                    Kyle Flynn
                    <br />
                    Morgan Herrell
                    <br />
                    <br />
                    Additional contributions by Matthew Haines, Tanson Lee,
                    Devin Leamy and Enid Hwang
                    <br />
                    <br />
                    Thank you to the amazing Biomes community.
                    <br />
                    <br />♥ The Biomes Team
                    <div className="mx-auto mt-[12vh] flex flex-wrap items-center justify-center gap-[24px] pb-8 text-[18px] text-white/70">
                      <a
                        className="font-normal text-[inherit]"
                        href="http://ill.inc"
                      >
                        &copy; {year} Global Illumination, Inc.
                      </a>
                      <a
                        className="font-normal text-[inherit]"
                        target="_blank"
                        href="https://discord.gg/biomes"
                        rel="noreferrer"
                      >
                        Discord
                      </a>
                      <a
                        className="font-normal text-[inherit]"
                        target="_blank"
                        href="https://www.x.com/illdotinc"
                        rel="noreferrer"
                      >
                        X
                      </a>
                      <a
                        className="font-normal text-[inherit]"
                        target="_blank"
                        href="https://github.com/ill-inc/biomes-game"
                        rel="noreferrer"
                      >
                        GitHub
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </LoginRelatedControllerContext.Consumer>
      </LoginRelatedController>
    </>
  );
};

export default SplashPage;
