import { useCallback } from "react";
import Particles from "react-tsparticles";
import { loadFull } from "tsparticles";
import type { Engine } from "tsparticles-engine";

export const TreasureParticles: React.FunctionComponent<{}> = ({}) => {
  const particlesInit = useCallback(async (engine: Engine) => {
    await loadFull(engine);
  }, []);

  return (
    <Particles
      className="treasure-particles"
      init={particlesInit}
      options={{
        fullScreen: {
          zIndex: 1,
        },
        particles: {
          number: {
            value: 0,
          },
          color: {
            value: ["#67ab2b", "#e35ff5", "#7354f0"],
          },
          shape: {
            type: "square",
            options: {},
          },
          opacity: {
            value: 1,
            animation: {
              enable: true,
              minimumValue: 0,
              speed: 2,
              startValue: "max",
              destroy: "min",
            },
          },
          size: {
            value: 4,
            random: {
              enable: true,
              minimumValue: 2,
            },
          },
          links: {
            enable: false,
          },
          life: {
            duration: {
              sync: true,
              value: 5,
            },
            count: 1,
          },
          move: {
            enable: true,
            gravity: {
              enable: true,
              acceleration: 10,
            },
            speed: {
              min: 10,
              max: 20,
            },
            decay: 0.1,
            direction: "none",
            straight: false,
            outModes: {
              default: "destroy",
              top: "none",
            },
          },
          rotate: {
            value: {
              min: 0,
              max: 360,
            },
            direction: "random",
            move: true,
            animation: {
              enable: true,
              speed: 60,
            },
          },
          tilt: {
            direction: "random",
            enable: true,
            move: true,
            value: {
              min: 0,
              max: 360,
            },
            animation: {
              enable: true,
              speed: 60,
            },
          },
          roll: {
            darken: {
              enable: true,
              value: 25,
            },
            enable: true,
            speed: {
              min: 15,
              max: 25,
            },
          },
          wobble: {
            distance: 30,
            enable: true,
            move: true,
            speed: {
              min: -15,
              max: 15,
            },
          },
        },
        emitters: {
          life: {
            count: 0,
            duration: 0.1,
            delay: 0.4,
          },
          rate: {
            delay: 0.1,
            quantity: 150,
          },
          size: {
            width: 0,
            height: 0,
          },
        },
      }}
    />
  );
};

export const WakeupMuckParticles: React.FunctionComponent<{}> = ({}) => {
  const particlesInit = useCallback(async (engine: Engine) => {
    await loadFull(engine);
  }, []);

  return (
    <Particles
      init={particlesInit}
      options={{
        fullScreen: {
          zIndex: 0,
        },

        particles: {
          number: {
            value: 40,
            density: {
              enable: true,
              value_area: 800,
            },
          },
          color: {
            value: "#fff",
          },
          shape: {
            type: "square",
            polygon: {
              nb_sides: 5,
            },
          },
          opacity: {
            value: 0.1,
            random: true,
            anim: {
              enable: false,
              speed: 1,
              opacity_min: 0.1,
              sync: false,
            },
          },
          size: {
            value: 10,
            random: true,
            anim: {
              enable: false,
              speed: 40,
              size_min: 0.1,
              sync: false,
            },
          },

          move: {
            enable: true,
            angle: {
              offset: 0,
              value: 90,
            },
            speed: 1,

            direction: "none",
            random: true,
            straight: false,
            out_mode: "out",
            bounce: false,
            attract: {
              enable: false,
              rotateX: 600,
              rotateY: 1200,
            },
          },

          rotate: {
            value: {
              min: 0,
              max: 360,
            },
            animation: {
              enable: true,
            },
          },

          roll: {
            enable: true,
            speed: {
              min: 1,
              max: 2,
            },
            horizontal: true,
          },
          wobble: {
            distance: 3,
            enable: true,
            move: true,
            speed: {
              min: -5,
              max: 5,
            },
          },
        },
        retina_detect: true,
      }}
    />
  );
};

export const BubbleParticles: React.FunctionComponent<{}> = ({}) => {
  const particlesInit = useCallback(async (engine: Engine) => {
    await loadFull(engine);
  }, []);

  return (
    <Particles
      className="bubbles"
      init={particlesInit}
      options={{
        fpsLimit: 60,
        particles: {
          stroke: {
            width: 2,
            color: "#ffffff",
            opacity: 1,
          },
          collisions: {
            enable: false,
          },
          move: {
            enable: true,
            direction: "top",
            random: false,
            speed: 0.4,
            straight: true,
            attract: {
              enable: true,
            },
          },
          number: {
            value: 12,
          },
          opacity: {
            value: {
              min: 0.1,
              max: 0.3,
            },
          },
          shape: {
            type: "circle",
          },
          size: {
            value: { min: 1, max: 3 },
          },
        },
        autoPlay: true,
        fullScreen: false,
        detectRetina: true,
      }}
    />
  );
};
