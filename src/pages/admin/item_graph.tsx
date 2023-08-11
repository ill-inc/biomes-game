import { AdminPage } from "@/client/components/admin/AdminPage";
import { BikkieEditorWrapper } from "@/client/components/admin/bikkie/BikkieEditorWrapper";
import { BiscuitEditor } from "@/client/components/admin/bikkie/BiscuitEditor";
import { AsyncButton } from "@/client/components/system/AsyncButton";

import { useBikkieLoaded } from "@/client/components/hooks/client_hooks";
import { biomesGetServerSideProps } from "@/server/web/util/ssp_middleware";
import type { BiomesId } from "@/shared/ids";
import { INVALID_BIOMES_ID, safeParseBiomesId } from "@/shared/ids";
import type { InferGetServerSidePropsType } from "next";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import React from "react";
import { z } from "zod";

export const getServerSideProps = biomesGetServerSideProps(
  {
    auth: "admin",
    query: z.object({
      slug: z.string().array().optional(),
    }),
  },
  async ({ query: { slug } }) => {
    const last = slug?.[slug.length - 1] ?? 0;
    const id = safeParseBiomesId(last) ?? INVALID_BIOMES_ID;
    return { props: { id } };
  }
);

const ItemGraph = dynamic<{}>(
  () =>
    import("@/client/components/admin/items/ItemGraph").then(
      (mod) => mod.ItemGraph
    ),
  { ssr: false, loading: () => <>Loading...</> }
);

export const NavOrEditor: React.FunctionComponent<{
  selectedId: BiomesId | undefined;
}> = ({ selectedId }) => {
  const router = useRouter();
  // Keep challenges nav in DOM so we preserve scroll state
  return (
    <>
      {selectedId ? (
        <>
          <AsyncButton
            className="challenges-nav-or-editor-button"
            onClick={async () => {
              router.back();
            }}
          >
            Back
          </AsyncButton>
          <BiscuitEditor narrowMode={true} />
        </>
      ) : (
        <div className="grid flex-grow">
          <ItemGraph />
        </div>
      )}
    </>
  );
};

export const ItemGraphExport: React.FunctionComponent<
  InferGetServerSidePropsType<typeof getServerSideProps>
> = ({ id: initialId }) => {
  // TODO: Don't depend on Bikkie
  const bikkieLoaded = useBikkieLoaded();
  const router = useRouter();

  return (
    <AdminPage>
      {bikkieLoaded && (
        <BikkieEditorWrapper
          schema={"/"}
          selectedId={initialId}
          setSelectedId={(id) => {
            void router.push(`/admin/item_graph/${id}`);
          }}
        >
          <NavOrEditor selectedId={initialId} />
        </BikkieEditorWrapper>
      )}
    </AdminPage>
  );
};
export default ItemGraphExport;
