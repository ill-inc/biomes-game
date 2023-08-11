import type { Tool } from "@/client/components/art/ArtTool";
import { biomesGetServerSideProps } from "@/server/web/util/ssp_middleware";
import { ok } from "assert";
import type { InferGetServerSidePropsType } from "next";
import dynamic from "next/dynamic";
import { z } from "zod";

const ArtTool = dynamic(() => import("@/client/components/art/ArtTool"), {
  ssr: false,
});

export const getServerSideProps = biomesGetServerSideProps(
  {
    auth: "developer_api",
    query: z.object({
      slug: z.string().array().optional(),
    }),
  },
  async ({ query: { slug } }) => {
    if (slug) {
      ok(slug.length === 1);
      return {
        props: { tool: slug[0] },
      };
    } else {
      return {
        props: { tool: "" },
      };
    }
  }
);

export const Art: React.FunctionComponent<
  InferGetServerSidePropsType<typeof getServerSideProps>
> = ({ tool }) => {
  if (!tool) {
    return <ArtTool></ArtTool>;
  } else {
    return <ArtTool initialTool={tool as Tool}></ArtTool>;
  }
};

export default Art;
