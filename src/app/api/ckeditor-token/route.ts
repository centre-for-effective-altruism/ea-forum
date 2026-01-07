import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { randomId } from "@/lib/utils/random";
import {
  CollaborativeEditingAccessLevel,
  permissionsLevelToCkEditorRole,
  getCollaborativeEditorAccess,
  isCollaborativeEditingFormType,
} from "@/lib/ckeditor/collabEditingPermissions";
import { getCKEditorDocumentId } from "@/lib/ckeditor/editorHelpers";
import { getCurrentUser } from "@/lib/users/currentUser";
import { userGetDisplayName } from "@/lib/users/userHelpers";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const environmentId = process.env.CK_ENVIRONMENT_ID;
  const secretKey = process.env.CK_SECRET_KEY;

  const collectionName = req.headers.get("collection-name");
  const documentId = req.headers.get("document-id");
  const userId = req.headers.get("user-id");
  const formType = req.headers.get("form-type");
  const linkSharingKey = req.headers.get("link-sharing-key");

  const currentUser = await getCurrentUser();

  if (collectionName === "Posts") {
    if (!formType || !isCollaborativeEditingFormType(formType)) {
      throw new Error("Invalid form type");
    }

    const post = documentId
      ? await db.query.posts.findFirst({
          where: {
            _id: documentId,
          },
          with: {
            group: true,
          },
        })
      : null;

    const access: CollaborativeEditingAccessLevel = documentId
      ? await getCollaborativeEditorAccess({
          formType,
          post: post ?? null,
          user: currentUser,
          linkSharingKey,
          useAdminPowers: true,
        })
      : "edit";

    if (access === "none") {
      return new NextResponse("Access denied", { status: 403 });
    }

    const ckEditorId = getCKEditorDocumentId(documentId, userId, formType);
    const payload = {
      aud: environmentId,
      iat: Math.floor(Date.now() / 1000),
      user: {
        id: currentUser?._id ?? randomId(),
        name: currentUser ? userGetDisplayName(currentUser) : "Anonymous",
      },
      auth: {
        collaboration: {
          [ckEditorId]: {
            role: permissionsLevelToCkEditorRole(access),
          },
        },
      },
    };
    const token = jwt.sign(payload, secretKey, { algorithm: "HS256" });
    return new NextResponse(token, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
      },
    });
  }

  const payload = {
    aud: environmentId,
    iat: Math.floor(Date.now() / 1000),
    user: currentUser
      ? {
          id: currentUser._id,
          name: userGetDisplayName(currentUser),
        }
      : null,
  };
  const token = jwt.sign(payload, secretKey, { algorithm: "HS256" });
  return new NextResponse(token, {
    status: 200,
    headers: {
      "Content-Type": "application/octet-stream",
    },
  });
}
