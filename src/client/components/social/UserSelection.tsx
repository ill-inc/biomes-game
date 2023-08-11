import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { useEffectAsync } from "@/client/util/hooks";
import type { BiomesId } from "@/shared/ids";
import type { UserInfoBundle } from "@/shared/util/fetch_bundles";
import { Combobox } from "@headlessui/react";
import { compact, throttle } from "lodash";
import { useCallback, useEffect, useMemo, useState } from "react";

export const UserSelection: React.FunctionComponent<{
  value?: BiomesId;
  onSelect?: (userId: BiomesId | undefined) => void;
}> = ({ value, onSelect }) => {
  const { socialManager } = useClientContext();
  const [selectedUser, setSelectedUser] = useState<
    UserInfoBundle | undefined
  >();
  const [search, setSearch] = useState("");
  const [loadingValue, setLoadingValue] = useState(true);
  const [changed, setChanged] = useState(false);

  useEffectAsync(async () => {
    try {
      if (!value) {
        setSelectedUser(undefined);
        return;
      }
      const userBundle = await socialManager.userInfoBundle(value);
      if (userBundle) {
        setSelectedUser(userBundle);
      }
    } finally {
      setLoadingValue(false);
    }
  }, [value]);

  useEffect(() => {
    if (changed) {
      onSelect?.(selectedUser?.user.id);
    }
  }, [selectedUser]);

  // Autocomplete-matched user bundles
  const [foundUserBundles, setFoundUserBundles] = useState<UserInfoBundle[]>(
    []
  );
  // Perfect match user bundle
  const [perfectMatchBundle, setPerfectMatchBundle] = useState<
    UserInfoBundle | undefined
  >(undefined);
  // Combine all found bundles
  const userBundles = useMemo(
    () =>
      compact([
        ...foundUserBundles.filter(
          (bundle) =>
            !perfectMatchBundle || bundle.user.id !== perfectMatchBundle.user.id
        ),
        perfectMatchBundle,
      ]),
    [foundUserBundles, perfectMatchBundle]
  );

  // Autocomplete user bundles
  useEffect(() => {
    let needsUpdate = true;
    void (async () => {
      if (search.length === 0) {
        setFoundUserBundles([]);
        return;
      }
      const userBundles = await socialManager.autocompleteUserName(search);
      if (needsUpdate) {
        setFoundUserBundles(compact(userBundles));
      }
    })();
    return () => {
      needsUpdate = false;
    };
  }, [search, socialManager]);

  // Throttled search for perfect match
  const throttledPerfectMatch = useCallback(
    throttle(
      (name: string, fn: (match: UserInfoBundle | null) => void) =>
        void (async () => {
          const perfectMatch = await socialManager.resolveUserName(name);
          fn(perfectMatch);
        })(),
      1000
    ),
    [socialManager]
  );
  useEffect(() => {
    let needsUpdate = true;
    void (async () => {
      if (search.length === 0) {
        return;
      }
      throttledPerfectMatch(search, (match) => {
        if (needsUpdate) {
          setPerfectMatchBundle(match ?? undefined);
        }
      });
    })();
    return () => {
      needsUpdate = false;
    };
  }, [search, throttledPerfectMatch]);
  return (
    <Combobox
      value={selectedUser}
      onChange={(value) => {
        setChanged(true);
        setSelectedUser(value);
      }}
      disabled={loadingValue}
    >
      <Combobox.Input<UserInfoBundle | undefined>
        onChange={(event) => setSearch(event.target.value)}
        displayValue={(userBundle) => userBundle?.user.username ?? ""}
      />
      {userBundles.length > 0 && (
        <Combobox.Options className="absolute z-10 w-full overflow-auto rounded-md bg-tooltip-bg shadow-cell-inset-dark">
          {userBundles.map((userBundle) => (
            <Combobox.Option
              key={userBundle.user.id}
              value={userBundle}
              className={({ active }) =>
                `relative cursor-default select-none p-0.4 ${
                  active ? "bg-tertiary-gray" : ""
                }`
              }
            >
              {userBundle.user.username}
            </Combobox.Option>
          ))}
        </Combobox.Options>
      )}
    </Combobox>
  );
};
