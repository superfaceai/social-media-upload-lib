import { SuperfaceClient } from '@superfaceai/one-sdk';

type ProfilesResult = Array<{ id: string; name: string }>;

const sdk = new SuperfaceClient();

export async function getFirstProfileId(
  provider: string,
  providerOptions?: { [key: string]: unknown }
) {
  const getPublishingProfilesProfile = await sdk.getProfile(
    'social-media/publishing-profiles@1.0.1'
  );

  const publishingProfilesResult = (
    await getPublishingProfilesProfile
      .getUseCase('GetProfilesForPublishing')
      .perform(
        {},
        {
          provider,
          ...providerOptions,
        }
      )
  ).unwrap() as { profiles: ProfilesResult };

  const publishingProfiles = publishingProfilesResult.profiles;
  if (publishingProfiles.length === 0) {
    throw new Error('Found no available publishing profiles.');
  }
  return publishingProfiles[0].id;
}
