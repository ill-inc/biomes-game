import { useClientContext } from "@/client/components/contexts/ClientContextReactContext";
import type { Item, ReadonlyAclAction } from "@/shared/ecs/gen/types";
import type { BiomesId } from "@/shared/ids";
import type {
  FeedPostBundle,
  GroupDetailBundle,
  SocialDocumentType,
} from "@/shared/types";

export function useUserCanAction(
  entityId: BiomesId,
  action: ReadonlyAclAction
) {
  const { reactResources, permissionsManager } = useClientContext();
  const [position, _acl] = reactResources.useAll(
    ["/ecs/c/position", entityId],
    ["/ecs/c/acl_component", entityId]
  );

  return (
    position?.v &&
    permissionsManager.getPermissionForAction(position.v, action, entityId)
  );
}

export function useCanWarpToDocument(
  _documentType: SocialDocumentType,
  _document: FeedPostBundle | GroupDetailBundle
) {
  const hasPermission = usePlayerHasPermissionForAcl("warp_from");
  return hasPermission;
}

export function usePlayerHasPermissionForAcl(action: ReadonlyAclAction) {
  const { reactResources, permissionsManager } = useClientContext();
  const acls = reactResources.use("/player/effective_acl").acls;
  return permissionsManager.clientActionAllowed(action, ...acls);
}

export function usePlayerHasPermissionFoItemAction(item: Item | undefined) {
  const { reactResources, permissionsManager } = useClientContext();
  const acls = reactResources.use("/player/effective_acl").acls;
  return permissionsManager.itemActionAllowed(item, ...acls);
}
