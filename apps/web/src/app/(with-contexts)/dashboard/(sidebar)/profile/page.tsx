"use client";

import DashboardContent from "@/components/admin/dashboard-content";
import { useProfile } from "@/components/contexts/profile-context";
import { AuthClientService } from "@/lib/auth/client-service";
import {
  BUTTON_SAVE,
  PROFILE_EMAIL_PREFERENCES,
  PROFILE_EMAIL_PREFERENCES_NEWSLETTER_OPTION_TEXT,
  PROFILE_PAGE_HEADER,
  PROFILE_SECTION_DETAILS,
  PROFILE_SECTION_DETAILS_BIO,
  PROFILE_SECTION_DETAILS_EMAIL,
  PROFILE_SECTION_DETAILS_NAME,
  PROFILE_SECTION_DISPLAY_PICTURE,
  TOAST_TITLE_ERROR,
} from "@/lib/ui/config/strings";
import { trpc } from "@/utils/trpc";
import { Media } from "@workspace/common-models";
import { useToast } from "@workspace/components-library";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { generateUniqueId } from "@workspace/utils";
import { useSession } from "next-auth/react";
import { MediaAccessType } from "node_modules/@workspace/common-models/src/constants";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const breadcrumbs = [{ label: PROFILE_PAGE_HEADER, href: "#" }];

export default function Page() {
  const { t } = useTranslation(["dashboard", "common"]);
  const [bio, setBio] = useState("");
  const [name, setName] = useState("");
  const [subscribedToUpdates, setSubscribedToUpdates] = useState(false);
  const { toast } = useToast();

  const { profile, setProfile } = useProfile();

  // TRPC mutations
  const updateProfileMutation = trpc.userModule.user.updateProfile.useMutation({
    onSuccess: (data) => {
      toast({
        title: t("common:dashboard.success"),
        description: data.message,
      });

      // Update profile context with new data
      if (data.user && profile) {
        setProfile({
          ...profile,
          name: data.user.name || "",
          bio: data.user.bio || "",
          avatar: data.user.avatar || null,
          subscribedToUpdates: data.user.subscribedToUpdates,
        });
      }
    },
    onError: (error) => {
      toast({
        title: TOAST_TITLE_ERROR,
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Initialize form data when profile loads
  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setBio(profile.bio || "");
      setSubscribedToUpdates(profile.subscribedToUpdates || false);
    }
  }, [profile]);

  const updateProfilePic = async (media?: Media) => {
    if (!profile) return;

    const avatarData: Media | null = media
      ? {
          storageProvider: "custom",
          mediaId: media.mediaId,
          originalFileName: media.originalFileName,
          mimeType: media.mimeType,
          size: media.size,
          access: media.access,
          thumbnail: media.thumbnail,
          caption: media.caption,
          file: media.file,
          url: media.url,
        }
      : null;

    updateProfileMutation.mutate({
      avatar: avatarData,
    });
  };

  const saveDetails = async (e: FormEvent) => {
    e.preventDefault();

    if (!profile) return;

    updateProfileMutation.mutate({
      name,
      bio,
    });
  };

  const saveEmailPreference = async (state: boolean) => {
    setSubscribedToUpdates(state);

    if (!profile) return;

    updateProfileMutation.mutate({
      subscribedToUpdates: state,
    });
  };

  const resetPictureFromFirebase = async () => {
    if (!profile) return;

    try {
      const firebaseProfile = AuthClientService.getCurrentUserProfile();

      if (!firebaseProfile?.photoURL) {
        toast({
          title: t("profile.no_firebase_avatar"),
          description: t("profile.no_firebase_avatar_desc"),
          variant: "destructive",
        });
        return;
      }

      // Create avatar data from Firebase photo
      const avatarData: Media = {
        storageProvider: "custom",
        url: firebaseProfile.photoURL,
        caption: "Firebase profile picture",
        mediaId: generateUniqueId(),
        originalFileName: "Firebase profile picture",
        mimeType: "image/jpeg",
        size: 0,
        access: MediaAccessType.PUBLIC,
        thumbnail: firebaseProfile.photoURL,
      };

      updateProfileMutation.mutate({
        avatar: avatarData,
      });

      toast({
        title: t("profile.avatar_reset"),
        description: t("profile.avatar_reset_desc"),
      });
    } catch (error) {
      toast({
        title: TOAST_TITLE_ERROR,
        description: t("profile.reset_picture_error"),
        variant: "destructive",
      });
    }
  };

  // Check if form has changes
  const hasChanges = profile
    ? bio !== (profile.bio || "") || name !== (profile.name || "")
    : false;

  const { update: updateCurrentSession } = useSession();

  if (!profile) {
    return (
      <DashboardContent breadcrumbs={breadcrumbs}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>{t("profile.loading")}</p>
          </div>
        </div>
      </DashboardContent>
    );
  }

  return (
    <DashboardContent breadcrumbs={breadcrumbs}>
      <h1 className="text-4xl font-semibold mb-6">{PROFILE_PAGE_HEADER}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Picture Section */}
        <Card>
          <CardHeader>
            <CardTitle>{PROFILE_SECTION_DISPLAY_PICTURE}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4">
            <Avatar className="w-32 h-32">
              <AvatarImage
                src={profile.avatar?.url}
                alt={profile.name || t("profile.profile")}
              />
              <AvatarFallback className="text-2xl">
                {profile.name?.charAt(0)?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>

            {/* Avatar source indicator */}
            {profile.avatar && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  {profile.avatar.storageProvider === "custom"
                    ? t("profile.firebase_avatar")
                    : t("profile.uploaded_image")}
                </p>
              </div>
            )}

            {/* Avatar management buttons */}
            <div className="flex flex-col space-y-2 w-full">
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" className="flex-1">
                  {t("profile.upload_new")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => updateProfilePic()}
                  disabled={updateProfileMutation.isPending}
                  className="flex-1"
                >
                  {t("profile.remove")}
                </Button>
              </div>

              <div className="flex space-x-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={resetPictureFromFirebase}
                  disabled={updateProfileMutation.isPending}
                  className="flex-1"
                >
                  {updateProfileMutation.isPending
                    ? t("profile.resetting")
                    : t("profile.reset_from_google")}
                </Button>
                {/* <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    updateCurrentSession();
                  }}
                  disabled={updateProfileMutation.isPending}
                  className="flex-1"
                >
                  Reset current sesssion
                </Button> */}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Details Section */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{PROFILE_SECTION_DETAILS}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveDetails} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{PROFILE_SECTION_DETAILS_EMAIL}</Label>
                <Input
                  id="email"
                  value={profile.email}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">{PROFILE_SECTION_DETAILS_NAME}</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setName(e.target.value)
                  }
                  disabled={updateProfileMutation.isPending}
                  placeholder={t("profile.enter_name_placeholder")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">{PROFILE_SECTION_DETAILS_BIO}</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                    setBio(e.target.value)
                  }
                  disabled={updateProfileMutation.isPending}
                  placeholder={t("profile.bio_placeholder")}
                  rows={4}
                />
              </div>

              <Button
                type="submit"
                disabled={!hasChanges || updateProfileMutation.isPending}
                className="w-full sm:w-auto"
              >
                {updateProfileMutation.isPending ? t("profile.saving") : BUTTON_SAVE}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Email Preferences Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{PROFILE_EMAIL_PREFERENCES}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium leading-none">
                {PROFILE_EMAIL_PREFERENCES_NEWSLETTER_OPTION_TEXT}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("profile.receive_updates_desc")}
              </p>
            </div>
            <Checkbox
              checked={subscribedToUpdates}
              onCheckedChange={(checked: boolean) =>
                saveEmailPreference(checked)
              }
              disabled={updateProfileMutation.isPending}
            />
          </div>
        </CardContent>
      </Card>
    </DashboardContent>
  );
}
