import type { PostCaptureItem } from "@/client/components/social/MiniPhonePostCaptureFlow";
import type { BiomesId } from "@/shared/ids";
import type {
  BatchCommentBundle,
  FeedPostBundle,
  SocialDocumentType,
} from "@/shared/types";

export type SocialMiniPhonePayload =
  | {
      type: "social_detail";
      documentType: "post" | "environment_group";
      documentId: BiomesId;
    }
  | {
      type: "posts";
      userId: BiomesId;
    }
  | {
      type: "profile";
      userId: BiomesId;
    }
  | {
      type: "post_photo";
      item: PostCaptureItem;
    }
  | {
      type: "comment_list";
      documentId: BiomesId;
      documentType: SocialDocumentType;
      to?: BiomesId;
      commentBundle?: BatchCommentBundle;
    }
  | { type: "tagged_list"; post: FeedPostBundle }
  | { type: "inbox"; userId?: BiomesId }
  | { type: "trade"; tradeId: BiomesId };
