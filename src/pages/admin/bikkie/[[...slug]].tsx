import { SchemaSpecificPage } from "@/client/components/admin/bikkie/BikkieEditorWrapper";
import styles from "@/client/styles/admin.bikkie.module.css";
import { biomesGetServerSideProps } from "@/server/web/util/ssp_middleware";
import type { AnyBikkieSchema } from "@/shared/bikkie/core";
import type { SchemaPath } from "@/shared/bikkie/schema/biomes";
import { bikkie } from "@/shared/bikkie/schema/biomes";
import { INVALID_BIOMES_ID, safeParseBiomesId } from "@/shared/ids";
import type { InferGetServerSidePropsType } from "next";
import { useMemo } from "react";
import { z } from "zod";

export const getServerSideProps = biomesGetServerSideProps(
  {
    auth: "admin",
    query: z.object({
      slug: z.string().array().optional(),
    }),
  },
  async ({ query: { slug } }) => {
    const [schema, id] = (() => {
      if (!slug) {
        return ["/" as SchemaPath, INVALID_BIOMES_ID];
      }
      let path = slug.slice(0, -1).join("/");
      if (!path) {
        path = "/";
      } else if (!path.startsWith("/")) {
        path = `/${path}`;
      }
      const last = slug[slug.length - 1];
      const id = safeParseBiomesId(last) ?? INVALID_BIOMES_ID;
      const schema = bikkie.getSchema(path);
      if (!schema) {
        return ["/" as SchemaPath, id];
      }
      return [path as SchemaPath, id];
    })();
    return {
      props: { schema, id },
    };
  }
);

export const SchemaSelector: React.FunctionComponent<{
  schema?: AnyBikkieSchema;
  onChange(schema: undefined | AnyBikkieSchema): void;
}> = ({ schema: currentSchema, onChange }) => {
  const currentPath = useMemo(
    () => bikkie.getPathForSchema(currentSchema),
    [currentSchema]
  );
  return (
    <select
      className={styles["schema-path"]}
      value={currentPath}
      onChange={(e) => onChange(bikkie.getSchema(e.target.value))}
    >
      {bikkie.allSchemas().map(([path]) => (
        <option key={path} value={path}>
          {path}
        </option>
      ))}
    </select>
  );
};

export const Bikkie: React.FunctionComponent<
  InferGetServerSidePropsType<typeof getServerSideProps>
> = ({ schema, id }) => {
  return (
    <SchemaSpecificPage
      selected={[schema, id]}
      onChange={(schema, id) => {
        const pathname = `/admin/bikkie${schema}${id ? String(id) : ""}`;
        // Don't use the router as the path change will trigger a reload.
        history.pushState({}, "", pathname);
      }}
    />
  );
};
export default Bikkie;
