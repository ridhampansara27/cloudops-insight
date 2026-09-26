import {
  useQuery,
} from "@tanstack/react-query";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";

import {
  getCurrentUserAvatar,
} from "@/features/auth/api/auth-api";


interface ProfileAvatarProps {
  userId:
    | string
    | undefined;

  avatarUpdatedAt:
    | string
    | null
    | undefined;

  initials: string;

  className?: string;

  fallbackClassName?: string;

  imageClassName?: string;

  // Used by Settings while a newly selected local image is being previewed.
  srcOverride?: string;
}


// Render a protected profile avatar without exposing the bearer token in a
// public image URL.
//
// TanStack Query shares the authenticated image request between every mounted
// consumer using the same user/version key. The small sanitized backend Blob
// is converted once into a browser data URL and cached for that immutable
// avatar version.
export function ProfileAvatar({
  userId,
  avatarUpdatedAt,
  initials,
  className,
  fallbackClassName,
  imageClassName,
  srcOverride,
}: ProfileAvatarProps) {
  const avatarQuery =
    useQuery({
      queryKey: [
        "auth",
        "profile-avatar",
        userId,
        avatarUpdatedAt,
      ],

      queryFn:
        getCurrentUserAvatar,

      enabled:
        Boolean(
          userId &&
          avatarUpdatedAt &&
          !srcOverride,
        ),

      // avatar_updated_at changes whenever the persisted bytes change, so one
      // successful Blob can remain fresh for this immutable version.
      staleTime:
        Infinity,

      retry:
        false,
    });

  // The authenticated query already converts the bounded sanitized Blob
  // into a data URL, so rendering requires no effect-driven local state.
  const source =
    srcOverride ??
    avatarQuery.data;


  return (
    <Avatar
      className={
        className
      }
    >
      {source && (
        <AvatarImage
          alt=""
          className={
            imageClassName
          }
          src={
            source
          }
        />
      )}

      <AvatarFallback
        className={
          fallbackClassName
        }
      >
        {
          initials
        }
      </AvatarFallback>
    </Avatar>
  );
}
