import type { ChallengeStingerBundle } from "@/client/components/challenges/helpers";
import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { compact, concat, map, uniqBy } from "lodash";
import type { PropsWithChildren } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export const ChallengeStingersContext = createContext({
  stingers: [] as Array<ChallengeStingerBundle>,
  markStingerRead: (_bundle: ChallengeStingerBundle) => true as unknown,
});

export const useChallengeStingerContext = () =>
  useContext(ChallengeStingersContext);

export const ChallengeStingersContextProvider: React.FunctionComponent<
  PropsWithChildren<{}>
> = ({ children }) => {
  const { reactResources, notificationsManager } = useClientContext();
  reactResources.use("/activity/unread"); // For side effect
  const unreadMessagesVersion = reactResources.version("/activity/unread");
  const [activeStingers, setActiveStingers] = useState<
    Array<ChallengeStingerBundle>
  >([]);
  const activeStingersRef = useRef<Array<ChallengeStingerBundle>>([]);
  const readStingers = useRef<Set<string>>(new Set());

  // this rigamarole is necessary because we want to invalidate 1 by 1 but infra works with HWM
  const markStingerRead = useCallback((bundle: ChallengeStingerBundle) => {
    void notificationsManager.markAs("read");
    readStingers.current.add(bundle.message.id);
    addAndInvalidateActiveStingers([]);
  }, []);

  const addAndInvalidateActiveStingers = useCallback(
    (newBundles: ChallengeStingerBundle[]) => {
      const newList = uniqBy(
        concat(activeStingersRef.current, newBundles),
        (e) => e.message.id
      ).filter((e) => !readStingers.current.has(e.message.id));
      activeStingersRef.current = newList;
      setActiveStingers(newList);
    },
    []
  );

  useEffect(() => {
    const unreadMessages = reactResources.get("/activity/unread");
    const ret = compact(
      map(
        unreadMessages.messages,
        (message): ChallengeStingerBundle | undefined => {
          if (message.message.kind === "challenge_unlock") {
            const challenge = reactResources.get(
              "/quest",
              message.message.challengeId
            );
            if (challenge) {
              return {
                kind: "challenge_unlock",
                challenge,
                message,
              };
            }
          } else if (message.message.kind === "challenge_complete") {
            const challenge = reactResources.get(
              "/quest",
              message.message.challengeId
            );
            if (challenge) {
              return {
                kind: "challenge_complete",
                challenge,
                message,
              };
            }
          }
        }
      )
    );
    addAndInvalidateActiveStingers(ret);
  }, [unreadMessagesVersion]);

  return (
    <ChallengeStingersContext.Provider
      value={{ stingers: activeStingers, markStingerRead }}
    >
      {children}
    </ChallengeStingersContext.Provider>
  );
};
