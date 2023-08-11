import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import { SegmentedControl } from "@/client/components/system/SegmentedControl";
import { useTypedStorageItem } from "@/client/util/typed_local_storage";
import React, { useCallback } from "react";

export const useSelectedLanguage = () =>
  useTypedStorageItem(
    "settings.language",
    navigator.language.split("-")[0] === "pt" ? "pt-BR" : "en-US"
  );

export const LanguageSelector: React.FunctionComponent<{}> = ({}) => {
  const { reactResources } = useClientContext();
  const tweaks = reactResources.use("/tweaks");
  const languages = new Set(["en-US"]);
  languages.add(tweaks.additionalLanguage);
  languages.add(navigator.language);
  const languagesArray = [...languages.values()];

  const [selectedLanguage, setSelectedLanguage] = useSelectedLanguage();

  const changeLanguage = useCallback((lang: string) => {
    setSelectedLanguage(lang);
  }, []);

  return (
    <SegmentedControl
      index={languagesArray.indexOf(selectedLanguage)}
      items={[...languages.values()]}
      onClick={(index) => {
        changeLanguage(languagesArray[index]);
      }}
    />
  );
};
