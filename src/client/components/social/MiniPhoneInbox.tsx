import {
  NotificationsScreen,
  PushPermissionsNudge,
} from "@/client/components/activity/ActivityScreen";
import { AvatarView, LinkableUsername } from "@/client/components/chat/Links";
import { ProfanityFiltered } from "@/client/components/chat/ProfanityFiltered";
import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import {
  EntityProfilePic,
  ProfilePicJSX,
} from "@/client/components/social/EntityProfilePic";
import { DialogButton } from "@/client/components/system/DialogButton";
import {
  LeftPaneDrilldown,
  LeftPaneDrilldownItem,
} from "@/client/components/system/LeftPaneDrilldown";
import { MiniPhoneToolbarItem } from "@/client/components/system/mini_phone/MiniPhoneMoreItem";
import { LeftPane } from "@/client/components/system/mini_phone/split_pane/LeftPane";
import { PaneBottomDock } from "@/client/components/system/mini_phone/split_pane/PaneBottomDock";
import { PaneLayout } from "@/client/components/system/mini_phone/split_pane/PaneLayout";
import { RightBarItem } from "@/client/components/system/mini_phone/split_pane/RightBarItem";
import { RawRightPane } from "@/client/components/system/mini_phone/split_pane/RightPane";
import { ScreenTitleBar } from "@/client/components/system/mini_phone/split_pane/ScreenTitleBar";
import { SplitPaneScreen } from "@/client/components/system/mini_phone/split_pane/SplitPaneScreen";
import type { KeyCode } from "@/client/game/util/keyboard";
import { useEffectWithDebounce } from "@/client/util/hooks";
import { useCachedUsername } from "@/client/util/social_manager_hooks";
import type { TextMessage } from "@/shared/chat/messages";
import type { Envelope } from "@/shared/chat/types";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import { fireAndForget } from "@/shared/util/async";
import { MultiMap } from "@/shared/util/collections";
import type { UserInfoBundle } from "@/shared/util/fetch_bundles";
import { epochMsToDuration } from "@/shared/util/view_helpers";
import { last, sortBy, uniq } from "lodash";
import React, { useCallback, useEffect, useRef, useState } from "react";
import newMessageIcon from "/public/hud/icon-16-pencil.png";
import activityIcon from "/public/hud/nav/notifications.png";

function useThreadedMessages() {
  const { reactResources, userId } = useClientContext();
  const { messages } = reactResources.use("/dms");

  const ret = new MultiMap<BiomesId, Envelope>();
  for (const m of messages) {
    if (!m.to || !m.from) {
      continue;
    }
    if (m.to === userId) {
      ret.add(m.from, m);
    } else {
      ret.add(m.to, m);
    }
  }

  return ret;
}

const MiniPhoneInboxLeftAuthorDrilldown: React.FunctionComponent<{
  authorId: BiomesId;
  selected: boolean;
  onClick: (authorId: BiomesId) => unknown;
  lastMessage?: Envelope;
}> = ({ authorId, selected, onClick, lastMessage }) => {
  const userName = useCachedUsername(authorId);

  const pic = <EntityProfilePic extraClassName="w-4 h-4" entityId={authorId} />;

  return (
    <LeftPaneDrilldownItem
      title={userName || "Unknown"}
      icon={pic}
      onClick={() => {
        onClick(authorId);
      }}
      selected={selected}
      rightTitle={
        lastMessage ? epochMsToDuration(lastMessage.createdAt) : undefined
      }
    />
  );
};

const MiniPhoneInboxLeftNewDrilldown: React.FunctionComponent<{
  onStartDM: (userId: BiomesId) => void;
}> = ({ onStartDM }) => {
  const { socialManager } = useClientContext();
  const [username, setUsername] = useState("");
  const [resolvedUser, setResolvedUser] = useState<
    UserInfoBundle | undefined
  >();

  useEffectWithDebounce(
    {
      debounceMs: 20,
      shouldTrigger: () => {
        setResolvedUser(undefined);
        return username.length > 0;
      },
      effect: async (signal) => {
        try {
          const result = await socialManager.resolveUserName(username);
          if (result?.user && !signal.aborted) {
            setResolvedUser(result);
          }
        } catch (error) {
          log.error("Error resolving username", { error });
        }
      },
    },
    [username]
  );

  return (
    <li className="new-drilldown">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          // void submitForm();
          if (resolvedUser) {
            onStartDM(resolvedUser.user.id);
          }
        }}
      >
        <input
          type="text"
          className="username-input"
          placeholder="Enter Username..."
          value={username}
          onChange={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setUsername(e.target.value);
          }}
        />
        <DialogButton
          disabled={!resolvedUser}
          onClick={() => {
            if (resolvedUser) {
              onStartDM(resolvedUser.user.id);
            }
          }}
        >
          Chat
        </DialogButton>
      </form>
    </li>
  );
};

const DMMessage: React.FunctionComponent<{
  envelope: Envelope;
  message: TextMessage;
}> = ({ envelope, message }) => {
  const { userId } = useClientContext();
  if (!envelope.from) {
    return <></>;
  }
  let className = "message";
  className += envelope.to ? " dm" : "";
  className += envelope.spatial?.volume == "yell" ? " yell" : "";
  className += envelope.from == userId ? " sent-message" : " received-message";
  return (
    <div className={className}>
      <div className="dm-message-container">
        <AvatarView userId={envelope.from} />
        <div>
          <div className="actor">
            {envelope.to && (
              <span>
                <LinkableUsername who={envelope.from} />
              </span>
            )}{" "}
            <span className="timestamp">
              {epochMsToDuration(envelope.createdAt)}
            </span>
            {envelope.spatial?.volume == "yell" && <> yelled</>}
          </div>
          <ProfanityFiltered>{message.content}</ProfanityFiltered>
        </div>
      </div>
    </div>
  );
};

const PureDMMessage = React.memo(DMMessage);
export const DMMessageList: React.FunctionComponent<{
  mail: Envelope[];
}> = ({ mail }) => {
  const noConflict = sortBy(mail, (e, i) => [
    i,
    e.message.kind === "typing" && (e.from || 0),
  ]);
  return (
    <>
      {noConflict.map((envelope, index) => (
        <PureDMMessage
          envelope={envelope}
          message={envelope.message as TextMessage}
          key={index}
        />
      ))}
    </>
  );
};

const MiniPhoneInboxRightMessagesRightPane: React.FunctionComponent<{
  authorId: BiomesId;
  messages: Array<Envelope>;
}> = ({ authorId, messages }) => {
  const { chatIo } = useClientContext();
  const ref = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLInputElement>(null);

  const [dmText, setDmText] = useState("");

  const scrollToBottom = useCallback(() => {
    if (!ref.current) {
      return;
    }
    ref.current.scroll({
      top: ref.current.scrollHeight,
    });
  }, [authorId]);

  useEffect(() => {
    scrollToBottom();
  }, [last(messages)?.id]);

  useEffect(() => {
    chatRef.current?.focus();
  }, [authorId]);

  return (
    <PaneLayout type="scroll">
      <div className="dms padded-view chat-bar select-text" ref={ref}>
        <DMMessageList mail={messages} />
      </div>
      <PaneBottomDock>
        <input
          type="text"
          value={dmText}
          ref={chatRef}
          onChange={(e) => {
            setDmText(e.target.value);
          }}
          placeholder="Message"
          onKeyDown={(e) => {
            const lk = e.code as KeyCode;
            if (lk === "Enter" || lk === "NumpadEnter") {
              fireAndForget(
                chatIo.sendMessage(
                  "chat",
                  {
                    kind: "text",
                    content: dmText,
                  },
                  authorId
                )
              );
              setDmText("");
            }
          }}
        />
      </PaneBottomDock>
    </PaneLayout>
  );
};

export const MiniPhoneInbox: React.FunctionComponent<{
  selectedId?: BiomesId;
}> = ({ selectedId: startSelectedId }) => {
  const messages = useThreadedMessages();
  const linearMessages = sortBy(
    messages.map((e) => e),
    (d) => -(last(d[1])?.createdAt ?? 0)
  );

  const [extraAuthors, setExtraAuthors] = useState<Array<BiomesId>>([]);

  const [selectedId, setSelectedId] = useState(startSelectedId ?? undefined);

  const onClickThread = (id: BiomesId) => {
    setShowActivity(false);
    setSelectedId(id);
  };

  const [showCreateDMButton, setShowCreateDMButton] = useState(false);
  const [showActivity, setShowActivity] = useState(!selectedId);

  return (
    <SplitPaneScreen>
      <ScreenTitleBar title="Inbox">
        <RightBarItem>
          <MiniPhoneToolbarItem
            src={newMessageIcon.src}
            onClick={() => {
              setShowCreateDMButton(!showCreateDMButton);
            }}
          />
        </RightBarItem>
      </ScreenTitleBar>
      <LeftPane>
        <PaneBottomDock>
          <PushPermissionsNudge />
        </PaneBottomDock>
        <LeftPaneDrilldown>
          <>
            {showCreateDMButton && (
              <MiniPhoneInboxLeftNewDrilldown
                onStartDM={(userId) => {
                  if (messages.get(userId).length === 0) {
                    setExtraAuthors(uniq([userId, ...extraAuthors]));
                  }
                  onClickThread(userId);
                  setShowCreateDMButton(false);
                }}
              />
            )}

            <LeftPaneDrilldownItem
              title="Activity"
              icon={
                <ProfilePicJSX
                  src={activityIcon.src}
                  extraClassName="w-4 h-4"
                  imgExtraClassName="w-[75%] h-[75%]"
                />
              }
              onClick={() => setShowActivity(true)}
              selected={showActivity}
            />
            {extraAuthors
              .filter((e) => messages.get(e).length === 0)
              .map((e) => (
                <MiniPhoneInboxLeftAuthorDrilldown
                  key={e}
                  authorId={e}
                  selected={selectedId === e}
                  onClick={onClickThread}
                  lastMessage={undefined}
                />
              ))}
            {linearMessages.map((e) => (
              <MiniPhoneInboxLeftAuthorDrilldown
                key={e[0]}
                authorId={e[0]}
                selected={selectedId === e[0] && !showActivity}
                onClick={onClickThread}
                lastMessage={last(messages.get(e[0]))}
              />
            ))}
          </>
        </LeftPaneDrilldown>
      </LeftPane>
      <RawRightPane>
        {showActivity ? (
          <NotificationsScreen />
        ) : selectedId ? (
          <MiniPhoneInboxRightMessagesRightPane
            authorId={selectedId}
            messages={messages.get(selectedId)!}
          />
        ) : (
          <></>
        )}
      </RawRightPane>
    </SplitPaneScreen>
  );
};
