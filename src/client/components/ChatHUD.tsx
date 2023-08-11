import {
  ADMIN_CREATE_NPC_REGEX,
  ADMIN_GIVE_REGEX,
  ADMIN_PLACE_NPC_REGEX,
  ADMIN_SPAWN_REGEX,
  ChatManager,
  USER_DIRECT_TARGET_COMMAND_PREFIX_REGEX,
  USER_DIRECT_TARGET_REPLACE_REGEX,
} from "@/client/components/chat/manager";
import { MessageList } from "@/client/components/chat/MessageList";
import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { usePointerLockManager } from "@/client/components/contexts/PointerLockContext";
import { inInputElement } from "@/client/components/ShortcutsHUD";
import { ShortcutText } from "@/client/components/system/ShortcutText";
import type { KeyCode } from "@/client/game/util/keyboard";
import { cleanListener } from "@/client/util/helpers";
import type { AdminAskRequest, NamedEntity } from "@/pages/api/admin/ecs/ask";
import type { SpecialRoles } from "@/shared/acl_types";
import { BikkieRuntime } from "@/shared/bikkie/active";
import type { SchemaPath } from "@/shared/bikkie/schema/biomes";
import type { ChatMessage } from "@/shared/chat/messages";
import type { BiomesId } from "@/shared/ids";
import { log } from "@/shared/logging";
import type { UserInfoBundle } from "@/shared/util/fetch_bundles";
import { jsonPost } from "@/shared/util/fetch_helpers";
import type { BaseEmoji, EmojiData } from "emoji-mart";
import { emojiIndex } from "emoji-mart";
import "emoji-mart/css/emoji-mart.css";
import { compact, last } from "lodash";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

interface ChatAutocompleteCommand {
  command: string;
  description?: string;
  submitOnEnter?: boolean;
  roleRequired?: SpecialRoles;
}

const SKIP_SELF_SCROLL_MESSAGE_KINDS: Array<ChatMessage["kind"]> = [
  "like",
  "warp",
  "comment",
];

const CHAT_AUTOCOMPLETE_COMMANDS: ChatAutocompleteCommand[] = [
  { command: "/report", description: "message" },
  { command: "/dance", submitOnEnter: true },
  { command: "/point", submitOnEnter: true },
  { command: "/laugh", submitOnEnter: true },
  { command: "/flex", submitOnEnter: true },
  { command: "/clap", submitOnEnter: true },
  { command: "/rock", submitOnEnter: true },
  { command: "/sit", submitOnEnter: true },
  { command: "/who", submitOnEnter: true },
  { command: "/team" },
  { command: "/message", description: "[username] message" },
  { command: "/reply", description: "message" },
  { command: "/profile", description: "[username]" },
  { command: "/trade", description: "[username]" },
  { command: "/wave", submitOnEnter: true },
  { command: "/yell", description: "message" },
  {
    command: "/teleport",
    description: "[x] [y] [z] | [username]",
    roleRequired: "admin",
  },
  { command: "/pull", description: "[username]", roleRequired: "admin" },
  { command: "/fly", submitOnEnter: true, roleRequired: "flying" },
  { command: "/land", submitOnEnter: true, roleRequired: "flying" },
  { command: "/help", submitOnEnter: true },
];

const SuggestionRow: React.FunctionComponent<{
  active: boolean;
  autocompleteType: AutocompleteTypes;
  data: AutoCompleteListItem;
}> = ({ data, active, autocompleteType }) => {
  const { userId } = useClientContext();

  let className = "dropdown-menu-item dropdown-autocomplete";

  if (active) {
    className += " active";
  }

  switch (autocompleteType) {
    case "emoji":
      const emojiRow = data as BaseEmoji;
      return (
        <li className={className}>
          {emojiRow.native} {emojiRow.name}
        </li>
      );
    case "redo":
      const redoRow = data as PreviousCommand;
      return <li className={className}>{redoRow}</li>;

    case "commands":
      const commandRow = data as ChatAutocompleteCommand;
      return (
        <li className={className}>
          {commandRow.command}{" "}
          <span className="secondary-gray">{commandRow.description}</span>
        </li>
      );

    case "users":
      const bundle = data as UserInfoBundle;
      return (
        <li className={className}>
          {bundle.user.username!}{" "}
          <span className="secondary-gray">
            {userId === bundle.user.id && "you!"}
          </span>
        </li>
      );

    case "adminGive":
    case "adminSpawn":
    case "adminCreateNpc":
    case "adminPlaceNpc":
      const [id, name] = data as BikkieItem;
      return (
        <li className={className}>
          {name} <span className="secondary-gray">{id}</span>
        </li>
      );

    default:
      return <></>;
  }
};

const SuggestionsListComponent: React.FunctionComponent<{
  autocompleteList: AutoCompleteList;
  activeSuggestionIndex: number;
  autocompleteType: AutocompleteTypes;
}> = React.memo(
  ({ autocompleteList, activeSuggestionIndex, autocompleteType }) => {
    return autocompleteList ? (
      <ul className="dropdown-menu biomes-box hide-scrollbar">
        {autocompleteList.map((suggestion, index) => {
          return (
            <SuggestionRow
              key={index}
              active={index === activeSuggestionIndex}
              autocompleteType={autocompleteType}
              data={suggestion}
            />
          );
        })}
      </ul>
    ) : (
      <ul>no suggestions</ul>
    );
  }
);

type BikkieItem = [BiomesId, string];
type PreviousCommand = string;

type AutoCompleteList =
  | EmojiData[]
  | ChatAutocompleteCommand[]
  | UserInfoBundle[]
  | BikkieItem[]
  | [BiomesId, string][]
  | PreviousCommand[];
type AutoCompleteListItem = AutoCompleteList[number];
type AutocompleteTypes =
  | "emoji"
  | "commands"
  | "users"
  | "adminGive"
  | "adminSpawn"
  | "adminCreateNpc"
  | "adminPlaceNpc"
  | "redo"
  | undefined;

const PREVIOUS_COMMANDS_TO_SHOW = 7;

function isCommand(input: string): boolean {
  return input.length !== 0 && input[0] === "/";
}

function matchingItems(schemaPaths: SchemaPath[], search: string) {
  const matches = compact(
    schemaPaths.flatMap((schemaPath) =>
      Array.from(BikkieRuntime.get().getBiscuits(schemaPath), (biscuit) => {
        return biscuit.name.toLowerCase().includes(search.toLowerCase())
          ? [biscuit.id, biscuit.name]
          : undefined;
      })
    )
  ) as BikkieItem[];
  matches.sort(([, a], [, b]) => {
    const aPrefix = a.toLowerCase().startsWith(search.toLowerCase());
    const bPrefix = b.toLowerCase().startsWith(search.toLowerCase());
    if (aPrefix && bPrefix) {
      return a.length - b.length;
    } else if (aPrefix && !bPrefix) {
      return -1;
    } else if (bPrefix && !aPrefix) {
      return 1;
    }
    return a.localeCompare(b);
  });
  return matches;
}

const ChatInput: React.FunctionComponent<{
  chatManager: ChatManager;
}> = React.memo(({ chatManager }) => {
  const context = useClientContext();
  const { authManager, socialManager, reactResources } = context;
  const [consoleInput, setConsoleInput] = useState("");
  const [autocompleteType, setAutocompleteType] = useState<
    AutocompleteTypes | undefined
  >();

  const [autocompleteList, setAutocompleteList] = useState(
    [] as AutoCompleteList
  );
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const pointerLockManager = usePointerLockManager();
  const chatElement = useRef<HTMLInputElement>(null);
  const [previousCommands, setPreviousCommands] = useState<PreviousCommand[]>(
    []
  );

  const onSubmit = async (value: string) => {
    // Do not focus if modal is up
    const modal = reactResources.get("/game_modal");
    if (modal.kind === "empty") {
      pointerLockManager.focusAndLock();
    }
    const input = value;

    if (input.length === 0) {
      return;
    }

    if (isCommand(input)) {
      let commands = previousCommands.filter((command) => command !== input);
      commands = [...commands, input].slice(-PREVIOUS_COMMANDS_TO_SHOW);
      setPreviousCommands(commands);
    }

    // Sometimes keyboard events will come after the lock is released, ignore for some small duration
    pointerLockManager.setDeadZone(100);

    void chatManager.handleChatSubmission(input);
    setConsoleInput("");
  };

  useEffect(() => {
    const mouseclick = (e: MouseEvent) => {
      if (
        chatElement.current == document.activeElement &&
        e.target != chatElement.current
      ) {
        chatElement.current?.blur();
        pointerLockManager.focusAndLock();
      }
    };
    const kbcb = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (inInputElement(event)) return;
      switch (event.key) {
        case "Enter":
        case "/":
          event.stopPropagation();
          chatElement.current?.focus();
          break;
      }
    };

    window.addEventListener("keydown", kbcb);
    window.addEventListener("click", mouseclick);

    return () => {
      window.removeEventListener("keydown", kbcb);
      window.removeEventListener("click", mouseclick);
    };
  }, []);

  const handleAutocomplete = () => {
    if (autocompleteType === "emoji") {
      const consoleInputUpdated = consoleInput.replace(
        /(:[a-z_-]{2,})$/i,
        (autocompleteList[activeSuggestionIndex] as BaseEmoji).native
      );
      setConsoleInput(consoleInputUpdated);
    } else if (autocompleteType === "commands") {
      const commandRow = autocompleteList[
        activeSuggestionIndex
      ] as ChatAutocompleteCommand;
      setConsoleInput(`${commandRow.command} `);
      if (commandRow.submitOnEnter) {
        void onSubmit(commandRow.command);
      }
    } else if (autocompleteType === "users") {
      const userDirectTargetMatch = consoleInput.match(
        USER_DIRECT_TARGET_REPLACE_REGEX
      );
      const atMentionMatch = consoleInput.match(/(.*)@([a-zA-Z0-8_-]*)/);
      if (userDirectTargetMatch) {
        const bundle = autocompleteList[activeSuggestionIndex] as
          | UserInfoBundle
          | undefined;
        if (bundle) {
          setConsoleInput(
            `${userDirectTargetMatch[1]}${bundle.user.username!}${
              userDirectTargetMatch[2]
            } `
          );
        }
      } else if (atMentionMatch) {
        const bundle = autocompleteList[activeSuggestionIndex] as
          | UserInfoBundle
          | undefined;
        if (bundle) {
          setConsoleInput(`${atMentionMatch[1]}@${bundle.user.username!} `);
        }
      }
    } else if (autocompleteType === "adminGive") {
      const adminGiveMatch = consoleInput.match(ADMIN_GIVE_REGEX);
      if (adminGiveMatch) {
        const item = autocompleteList[activeSuggestionIndex] as
          | BikkieItem
          | undefined;
        if (item) {
          setConsoleInput(`${adminGiveMatch[1]}${item[1]}`);
        }
      }
    } else if (autocompleteType === "adminSpawn") {
      const adminSpawnMatch = consoleInput.match(ADMIN_SPAWN_REGEX);
      if (adminSpawnMatch) {
        const item = autocompleteList[activeSuggestionIndex] as
          | BikkieItem
          | undefined;
        if (item) {
          setConsoleInput(`${adminSpawnMatch[1]}${item[1]}`);
        }
      }
    } else if (autocompleteType === "adminCreateNpc") {
      const adminCreateNpcMatch = consoleInput.match(ADMIN_CREATE_NPC_REGEX);
      if (adminCreateNpcMatch) {
        const item = autocompleteList[activeSuggestionIndex] as
          | BikkieItem
          | undefined;
        if (item) {
          setConsoleInput(`${adminCreateNpcMatch[1]}${item[1]}`);
        }
      }
    } else if (autocompleteType === "adminPlaceNpc") {
      const adminPlaceNpcMatch = consoleInput.match(ADMIN_PLACE_NPC_REGEX);
      if (adminPlaceNpcMatch) {
        const entity = autocompleteList[activeSuggestionIndex] as
          | [BiomesId, string]
          | undefined;
        if (entity) {
          setConsoleInput(`${adminPlaceNpcMatch[1]}${entity[0]}`);
        }
      }
    } else if (autocompleteType === "redo") {
      const command = autocompleteList[
        activeSuggestionIndex
      ] as PreviousCommand;
      if (command) {
        setConsoleInput(command);
      }
    }
    setShowAutocomplete(false);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.repeat) return;
    const lk = event.code as KeyCode;
    if (lk === "Enter" || lk === "Tab") {
      event.preventDefault();
      if (showAutocomplete) {
        handleAutocomplete();
      } else if (!consoleInput) {
        chatElement?.current?.blur();
        event.preventDefault();
        pointerLockManager.focusAndLock();
      } else {
        void onSubmit(consoleInput);
      }
    } else if (lk === "ArrowUp") {
      event.preventDefault();

      if (!showAutocomplete && previousCommands.length > 0) {
        setShowAutocomplete(true);
        setAutocompleteType("redo");
        setAutocompleteList(previousCommands);
        setActiveSuggestionIndex(previousCommands.length - 1);
      } else {
        if (activeSuggestionIndex === 0) {
          return;
        }
        setActiveSuggestionIndex(activeSuggestionIndex - 1);
      }
    } else if (lk === "ArrowDown") {
      event.preventDefault();
      if (activeSuggestionIndex === autocompleteList.length - 1) {
        return;
      }
      setActiveSuggestionIndex(activeSuggestionIndex + 1);
    }
  };

  useEffect(() => {
    //Look for emoji, /command or DM autocompletion
    const emojiMatch = consoleInput.match(/:([a-z_-]{2,})$/i);
    const commandMatch = consoleInput.match(/^\/([^ ]*)$/);
    const userTargetMatch = consoleInput.match(
      USER_DIRECT_TARGET_COMMAND_PREFIX_REGEX
    );
    const atMentionMatch = consoleInput.match(/.*@([a-zA-Z0-8_-]*)$/);
    const adminGiveMatch = consoleInput.match(ADMIN_GIVE_REGEX);
    const adminSpawnMatch = consoleInput.match(ADMIN_SPAWN_REGEX);
    const adminCreateNpcMatch = consoleInput.match(ADMIN_CREATE_NPC_REGEX);
    const adminPlaceNpcMatch = consoleInput.match(ADMIN_PLACE_NPC_REGEX);
    if (emojiMatch) {
      const emojis = emojiIndex.search(emojiMatch[1]);
      if (emojis) {
        setAutocompleteType("emoji");
        setShowAutocomplete(true);
        setActiveSuggestionIndex(0);
        setAutocompleteList(emojis.slice(0, 5));
      }
    } else if (commandMatch) {
      const autocompleteResults = CHAT_AUTOCOMPLETE_COMMANDS.filter((item) => {
        if (
          item.roleRequired &&
          !authManager.currentUser.hasSpecialRole(item.roleRequired)
        ) {
          return false;
        }
        return item.command.includes(consoleInput);
      });
      setShowAutocomplete(autocompleteResults.length > 0);
      setAutocompleteType("commands");
      setActiveSuggestionIndex(0);
      setAutocompleteList(autocompleteResults);
    } else if (userTargetMatch) {
      setAutocompleteType("users");
      setActiveSuggestionIndex(0);
      setAutocompleteList([]);
      setShowAutocomplete(false);
      void socialManager
        .autocompleteUserName(userTargetMatch[1])
        .then((autocompleteResults) => {
          if (autocompleteType === "users") {
            setShowAutocomplete(autocompleteResults.length > 0);
            setAutocompleteList(autocompleteResults);
          }
        });
    } else if (atMentionMatch) {
      setAutocompleteType("users");
      setActiveSuggestionIndex(0);
      setAutocompleteList([]);
      setShowAutocomplete(false);
      void socialManager
        .autocompleteUserName(atMentionMatch[1])
        .then((autocompleteResults) => {
          if (autocompleteType === "users") {
            setShowAutocomplete(autocompleteResults.length > 0);
            setAutocompleteList(autocompleteResults);
          }
        });
    } else if (adminGiveMatch) {
      const items = matchingItems(["/items", "/recipes"], adminGiveMatch[2]);
      if (items) {
        setAutocompleteType("adminGive");
        setShowAutocomplete(true);
        setActiveSuggestionIndex(0);
        setAutocompleteList(items.slice(0, 5));
      }
    } else if (adminSpawnMatch) {
      const items = matchingItems(["/npcs/types"], adminSpawnMatch[2]);
      if (items) {
        setAutocompleteType("adminSpawn");
        setShowAutocomplete(true);
        setActiveSuggestionIndex(0);
        setAutocompleteList(items.slice(0, 5));
      }
    } else if (adminCreateNpcMatch) {
      const items = matchingItems(["/npcs/types"], adminCreateNpcMatch[2]);
      if (items) {
        setAutocompleteType("adminCreateNpc");
        setShowAutocomplete(true);
        setActiveSuggestionIndex(0);
        setAutocompleteList(items.slice(0, 5));
      }
    } else if (adminPlaceNpcMatch) {
      setAutocompleteType("adminPlaceNpc");
      setShowAutocomplete(true);
      setActiveSuggestionIndex(0);
      setAutocompleteList([]);
      jsonPost<NamedEntity[], AdminAskRequest>("/api/admin/ecs/ask", {
        filter: "named_npcs",
      })
        .then((results) => {
          const options = results
            .filter((e) =>
              e.name.toLowerCase().includes(adminPlaceNpcMatch[2].toLowerCase())
            )
            .slice(0, 5)
            .map((e) => [e.id, e.name] as [BiomesId, string]);
          setShowAutocomplete(options.length > 0);
          setAutocompleteList(options);
        })
        .catch((error) => {
          log.error("Failed to autocomplete NPCs", { error });
          setShowAutocomplete(false);
        });
    } else {
      setShowAutocomplete(false);
    }
  }, [consoleInput]);

  return (
    <>
      {showAutocomplete && (
        <SuggestionsListComponent
          autocompleteList={autocompleteList}
          activeSuggestionIndex={activeSuggestionIndex}
          autocompleteType={autocompleteType}
        />
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <ShortcutText
          shortcut="↩"
          extraClassName="chat-key-hint"
          keyCode="Enter"
        ></ShortcutText>
        <input
          type="text"
          placeholder="Press Enter or / to chat..."
          value={consoleInput}
          ref={chatElement}
          onKeyDown={onKeyDown}
          onChange={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setConsoleInput(e.target.value);
            chatManager.onType(e.target.value);
          }}
        />
      </form>
    </>
  );
});

export const ChatHUD: React.FunctionComponent<{}> = ({}) => {
  const context = useClientContext();
  const { reactResources, userId } = context;
  const { messages } = reactResources.use("/chat");
  const messageVersion = reactResources.version("/chat");

  const messagesElement = useRef<HTMLDivElement>(null);
  const pointerLockManager = usePointerLockManager();
  const chatManager = useRef(
    new ChatManager({ pointerLockManager, ...context })
  );
  /*
  Scroll garbage

  Logic:
  - Always scroll to the bottom on new message / bootstrap if you haven't scrolled up in the last 25s
  - If you have scrolled up:
  -- Scroll down 25s after last scroll
  -- Scroll down if you receive a message from yourself (e.g. async photo post, sent a chat)

  */
  const UP_SCROLL_SNAP_TIMEOUT_MS = 25 * 1000;
  const scrolledUpAt = useRef<number | undefined>();
  const scrollSnapTimeout = useRef<ReturnType<typeof setTimeout> | undefined>();
  const lastScrollTop = useRef<number>(0);

  const scrollToBottom = useCallback((forceScroll: boolean = false) => {
    if (
      messagesElement.current &&
      (forceScroll ||
        scrolledUpAt.current === undefined ||
        performance.now() - scrolledUpAt.current >= UP_SCROLL_SNAP_TIMEOUT_MS)
    ) {
      if (scrollSnapTimeout) {
        clearTimeout(scrollSnapTimeout.current);
        scrollSnapTimeout.current = undefined;
      }
      messagesElement.current.scroll({
        top: messagesElement.current.scrollHeight,
      });
    }
  }, []);

  const hideChrome = reactResources.use("/canvas_effects/hide_chrome");

  const resizerRef = useRef<ReturnType<typeof setTimeout> | undefined>();

  useEffect(() =>
    cleanListener(window, {
      resize: () => {
        // On resize this element gets scrolled strangely, so re-scroll it
        // Cool off the re-scroll since people maybe be continuously resizing
        if (resizerRef.current) {
          clearTimeout(resizerRef.current);
          resizerRef.current = undefined;
        }

        resizerRef.current = setTimeout(() => {
          scrollToBottom(true);
          resizerRef.current = undefined;
        }, 50);
      },
    })
  );

  useLayoutEffect(() => {
    // Scroll to the bottom when we hide / show the chrome and on first load
    scrollToBottom(true);
  }, [hideChrome.value]);

  useLayoutEffect(() => {
    // Try scroll to bottom when we get new messages, but force if we were the sender (async photo)
    const lastMessage = last(reactResources.get("/chat").messages);
    const forceScroll =
      lastMessage?.from === userId &&
      !SKIP_SELF_SCROLL_MESSAGE_KINDS.includes(lastMessage?.message.kind);
    scrollToBottom(forceScroll);
  }, [last(reactResources.get("/chat").messages)?.id]);

  const onDivScroll = useCallback((_e: React.UIEvent<HTMLDivElement>) => {
    const element = messagesElement.current;
    if (!element) {
      return;
    }

    const isScrollUpEvent =
      lastScrollTop.current && element.scrollTop < lastScrollTop.current;
    const scrolledToBottom =
      Math.abs(
        element.scrollHeight - element.clientHeight - element.scrollTop
      ) < 10;

    lastScrollTop.current = element.scrollTop;

    if (isScrollUpEvent && !scrolledToBottom) {
      // User scrolled up -- update the scroll up timer
      scrolledUpAt.current = performance.now();
      if (scrollSnapTimeout) {
        clearTimeout(scrollSnapTimeout.current);
        scrollSnapTimeout.current = undefined;
      }
      scrollSnapTimeout.current = setTimeout(() => {
        scrollToBottom();
      }, UP_SCROLL_SNAP_TIMEOUT_MS);
    } else if (scrolledToBottom) {
      // If scrolled to bottom ever, clear all logic
      scrolledUpAt.current = undefined;
      if (scrollSnapTimeout) {
        clearTimeout(scrollSnapTimeout.current);
        scrollSnapTimeout.current = undefined;
      }
    }
  }, []);

  const gameModal = context.reactResources.use("/game_modal");
  const hideChat =
    gameModal.kind !== "empty" && gameModal.kind !== "tabbed_pause";

  if (!messages) {
    return <div>Loading chat...</div>;
  }

  return (
    <div className={`chat-container ${hideChat ? "invisible" : ""}`}>
      <div
        className={`chat-box hide-scrollbar ${
          pointerLockManager.isLocked()
            ? "pointer-events-none overflow-hidden"
            : ""
        }`}
        ref={messagesElement}
        onScroll={onDivScroll}
      >
        <div className="chat-spacer"></div>
        <MessageList
          messageVersion={messageVersion}
          mail={messages}
          onLoadImage={() => scrollToBottom()}
        />
      </div>

      <ChatInput chatManager={chatManager.current} />
    </div>
  );
};
