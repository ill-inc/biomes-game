import { biomesGetServerSideProps } from "@/server/web/util/ssp_middleware";
import { z } from "zod";

export const getServerSideProps = biomesGetServerSideProps(
  {
    auth: "admin",
    query: z.object({
      slug: z.string().array().optional(),
    }),
  },
  async ({ query: {} }) => {
    return {
      redirect: {
        permanent: false,
        destination: `/admin/bikkie`,
      },
    };
  }
);

const Nada: React.FunctionComponent<{}> = ({}) => {
  return <>Nothing</>;
};
export default Nada;
