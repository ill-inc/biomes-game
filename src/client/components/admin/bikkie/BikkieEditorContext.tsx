import type { BikkieSearchResult } from "@/client/components/admin/bikkie/requests";
import type {
  NamedBiscuitEdits,
  UnsavedBiscuit,
} from "@/client/components/admin/bikkie/unsaved";
import type { SchemaPath } from "@/shared/bikkie/schema/biomes";
import type { BiscuitAttributeAssignment } from "@/shared/bikkie/tray";
import type { BiomesId } from "@/shared/ids";
import { ok } from "assert";
import { createContext, useContext } from "react";

export type NewBiscuitConfig = {
  readonly proposedName?: string;
  readonly attributes?: Record<number, BiscuitAttributeAssignment>;
  readonly extendedFrom?: BiomesId;
};

export type BikkieEditorContextType = {
  readonly schemaPath?: SchemaPath;
  readonly selected?: UnsavedBiscuit;
  readonly unsaved: ReadonlyMap<BiomesId, UnsavedBiscuit>;
  readonly queryCache: Map<string, BikkieSearchResult[]>;
  newBiscuit: (config?: NewBiscuitConfig) => Promise<void>;
  editBiscuit: (edits: NamedBiscuitEdits) => void;
};

export const BikkieEditorContext = createContext<
  BikkieEditorContextType | undefined
>(undefined);

export function useBikkieEditorContext() {
  const context = useContext(BikkieEditorContext);
  ok(context);
  return context;
}
