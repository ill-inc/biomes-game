import { AdminPage } from "@/client/components/admin/AdminPage";
import { ItemGraphIntegrity } from "@/client/components/admin/items/ItemGraphIntegrity";
import { useBikkieLoaded } from "@/client/components/hooks/client_hooks";
import { biomesGetServerSideProps } from "@/server/web/util/ssp_middleware";
import type { InferGetServerSidePropsType } from "next";

export const getServerSideProps = biomesGetServerSideProps(
  {
    auth: "admin",
  },
  async () => {
    return { props: {} };
  }
);

export const ItemAdminExport: React.FunctionComponent<
  InferGetServerSidePropsType<typeof getServerSideProps>
> = ({}) => {
  const bikkieLoaded = useBikkieLoaded();

  return <AdminPage>{bikkieLoaded && <ItemGraphIntegrity />}</AdminPage>;
};
export default ItemAdminExport;
