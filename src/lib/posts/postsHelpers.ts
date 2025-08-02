import { getSiteUrl } from "../routeHelpers";

export const postGetPageUrl = ({ post, sequenceId, isAbsolute }: {
  post: {
    _id: string,
    slug: string,
    isEvent?: boolean
    groupId?: string | null
  },
  isAbsolute?: boolean,
  sequenceId?: string,
}) => {
  const prefix = isAbsolute ? getSiteUrl().slice(0,-1) : '';
  if (sequenceId) {
    return `${prefix}/s/${sequenceId}/p/${post._id}`;
  } else if (post.isEvent) {
    return `${prefix}/events/${post._id}/${post.slug}`;
  } else if (post.groupId) {
    return `${prefix}/g/${post.groupId}/p/${post._id}/`;
  }
  return `${prefix}/posts/${post._id}/${post.slug}`;
}
