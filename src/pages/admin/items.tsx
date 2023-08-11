import { SchemaSpecificPage } from "@/client/components/admin/bikkie/BikkieEditorWrapper";
import { biomesGetServerSideProps } from "@/server/web/util/ssp_middleware";

export const getServerSideProps = biomesGetServerSideProps(
  {
    auth: "admin",
  },
  async () => {
    return {
      props: {},
    };
  }
);

export default () => <SchemaSpecificPage schemas={["/items"]} />;
