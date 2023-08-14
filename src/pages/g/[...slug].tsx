import { Img } from "@/client/components/system/Img";
import { ThreeObjectPreview } from "@/client/components/ThreeObjectPreview";
import { sanitizeServerSideProps } from "@/client/util/next_helpers";
import StaticPage from "@/pages/static-page";
import type {
  InferWebServerSidePropsType,
  WebServerServerSidePropsContext,
} from "@/server/web/context";
import { fetchGroupDetailBundle } from "@/server/web/db/environment_groups";
import {
  absoluteWebServerURL,
  environmentGroupPublicPermalink,
  userPublicPermalink,
} from "@/server/web/util/urls";
import { legacyIdOrBiomesId, parseBiomesId } from "@/shared/ids";
import type { GroupDetailBundle } from "@/shared/types";
import {
  imageUrlForSize,
  ogMetadataForImage,
  profilePicThumbnailUrl,
} from "@/shared/util/urls";
import { epochMsToDuration } from "@/shared/util/view_helpers";
import { ok } from "assert";
import { isArray, last } from "lodash";
import type { GetServerSidePropsResult } from "next";
import type { ReactChild } from "react";
import React, { useEffect, useState } from "react";
import type { Object3D } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

type EnvironmentGroupPageProps = {
  environmentGroup: GroupDetailBundle;
};

export const getServerSideProps = async (
  context: WebServerServerSidePropsContext
): Promise<GetServerSidePropsResult<EnvironmentGroupPageProps>> => {
  const groupSlug = context.params?.["slug"];

  ok(groupSlug && isArray(groupSlug) && groupSlug.length > 0);
  const groupId = legacyIdOrBiomesId(last(groupSlug));
  if (!groupId) {
    return { notFound: true };
  }

  const { db, worldApi } = context.req.context;

  const environmentGroup = await fetchGroupDetailBundle(
    db,
    worldApi,
    parseBiomesId(groupId),
    {}
  );
  if (!environmentGroup) {
    return { notFound: true };
  }

  return {
    props: sanitizeServerSideProps({
      environmentGroup,
    }),
  };
};

export const EnvironmentGroupPage: React.FunctionComponent<
  InferWebServerSidePropsType<typeof getServerSideProps>
> = ({ environmentGroup }) => {
  let ownerLink: ReactChild | undefined;
  if (environmentGroup?.ownerBiomesUser) {
    ownerLink = (
      <div className="post-author">
        <a
          href={userPublicPermalink(
            environmentGroup.ownerBiomesUser.id,
            environmentGroup.ownerBiomesUser?.username
          )}
        >
          <img
            src={profilePicThumbnailUrl(environmentGroup.ownerBiomesUser.id)}
          />
        </a>
        <p>
          {environmentGroup.name} by{" "}
          <a
            href={userPublicPermalink(
              environmentGroup.ownerBiomesUser.id,
              environmentGroup.ownerBiomesUser?.username
            )}
          >
            {environmentGroup.ownerBiomesUser?.username}
          </a>
        </p>
      </div>
    );
  }

  const [scene, setScene] = useState<Object3D>();
  useEffect(() => {
    if (environmentGroup.gltfURL) {
      const loader = new GLTFLoader();
      loader.load(environmentGroup.gltfURL, (gltf) => {
        setScene(gltf.scene);
      });
    }
  }, [environmentGroup.gltfURL]);

  return (
    <StaticPage
      title={`Biomes | ${environmentGroup.name}`}
      openGraphMetadata={{
        ...ogMetadataForImage(environmentGroup.imageUrls ?? {}),
        description:
          "Biomes is an open source sandbox MMORPG built for the web using web technologies",
        title: `Biomes | ${environmentGroup.name}`,
        url: absoluteWebServerURL(
          environmentGroupPublicPermalink(environmentGroup.id)
        ),
      }}
    >
      <section className="permalink">
        <div className="post-attribution">
          {ownerLink}
          <div className="post-date">
            {epochMsToDuration(environmentGroup.createMs)}
          </div>
        </div>
        <div className="content">
          {!environmentGroup.gltfURL && (
            <Img
              src={imageUrlForSize("big", environmentGroup.imageUrls ?? {})}
              onClick={() => {}}
              className="preview"
            />
          )}
          {scene && (
            <ThreeObjectPreview
              object={scene}
              autoRotate={true}
              allowZoom={true}
              allowPan={true}
            />
          )}
        </div>
      </section>
    </StaticPage>
  );
};

export default EnvironmentGroupPage;
