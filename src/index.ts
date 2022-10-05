import { SuperfaceClient } from '@superfaceai/one-sdk';
import fs from 'fs';
import debug from 'debug';
import { tiktokPublishFile } from './tiktok';

const debugLog = debug('superface:social-media-upload-lib');
const sdk = new SuperfaceClient();

export interface PublishResult {
  postId: string | undefined;
  url: string | undefined;
}

export enum UploadStrategy {
  REMOTE_URL = 'remoteUrl',
  RESUMABLE_UPLOAD = 'resumableUpload',
}

export interface UploadVideoInput {
  video: string | URL;
  profileId?: string;
  caption?: string;
}

enum UploadState {
  EXPIRED = 'expired',
  ERROR = 'error',
  FINISHED = 'finished',
  IN_PROGRESS = 'inProgress',
  PUBLISHED = 'published',
}

type ProfilesResult = Array<{ id: string; name: string }>;

export async function publishVideo(
  input: UploadVideoInput,
  provider: string,
  providerOptions?: { [key: string]: unknown }
): Promise<PublishResult> {
  const strategies = getSupportedUploadStrategies(provider);
  debugLog(`Supported strategies for "${provider}": ${strategies}`);

  let url: URL | undefined;
  let filePath: string | undefined;

  if (input.video instanceof URL) {
    url = input.video;
  } else {
    try {
      url = new URL(input.video);
    } catch (err) {
      if (!(err instanceof TypeError)) {
        throw err;
      }
    }

    if (url === undefined) {
      if (fs.existsSync(input.video)) {
        filePath = input.video;
      } else {
        throw new Error(`File "${input.video}" does not exist.`);
      }
    }
  }

  if (url !== undefined) {
    if (strategies.includes(UploadStrategy.REMOTE_URL)) {
      return await publishUrl(
        { ...input, video: url },
        provider,
        providerOptions || {}
      );
    }
    if (strategies.includes(UploadStrategy.RESUMABLE_UPLOAD)) {
      // TODO: download the URL, upload it as a file
      throw new Error(`Uploading remote URLs not yet implemented.`);
    }
    throw new Error(`Provider "${provider}" not supported.`);
  }

  if (filePath !== undefined) {
    if (strategies.includes(UploadStrategy.RESUMABLE_UPLOAD)) {
      return await publishFile(
        { ...input, video: filePath },
        provider,
        providerOptions || {}
      );
    }

    throw new Error(
      `Provider "${provider}" does not support uploading local files.`
    );
  }

  throw new Error('unreachable'); // to satisfy compiler
}

const PROCESSING_TIMEOUT = 5 * 60 * 1000; // completely arbitrary
async function publishUrl(
  input: UploadVideoInput & { video: URL },
  provider: string,
  providerOptions: { [key: string]: unknown }
): Promise<PublishResult> {
  debugLog('Uploading as URL.');
  const uploadProfile = await sdk.getProfile(
    'social-media/upload-from-url@1.0.0'
  );
  const publishProfile = await sdk.getProfile(
    'social-media/publish-post@1.3.0'
  );

  let profileId = input.profileId;
  if (!profileId) {
    debugLog('No profileId supplied, fetching publishing profiles.');
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
      throw new Error(
        'Found no available publishing profiles and no profile ID supplied.'
      );
    }
    profileId = publishingProfiles[0].id;
    debugLog(`Got profileId: "${profileId}".`);
  }

  const registerResult = (
    await uploadProfile.getUseCase('RegisterUpload').perform(
      {
        profileId,
        caption: input.caption,
        url: input.video.toString(),
        uploadType: 'video',
      },
      {
        provider,
        ...providerOptions,
      }
    )
  ).unwrap() as { uploadId: string };

  debugLog({ registerResult });

  const uploadId = registerResult.uploadId;

  const now = new Date().getTime();
  let successful = false;
  while (new Date().getTime() - now < PROCESSING_TIMEOUT) {
    const stateResult = (
      await uploadProfile.getUseCase('GetUploadState').perform(
        {
          uploadId,
        },
        {
          provider,
          ...providerOptions,
        }
      )
    ).unwrap() as {
      state: UploadState;
    };

    debugLog({ stateResult });

    if (stateResult.state === UploadState.ERROR) {
      throw new Error(
        `Error during processing of upload ID ${registerResult.uploadId} at ${provider}.`
      );
    }

    if (stateResult.state === UploadState.FINISHED) {
      debugLog('Finished waiting for processing.');
      successful = true;
      break;
    }

    debugLog('Waiting 10s...');
    await new Promise(r => setTimeout(r, 10_000));
  }

  if (!successful) {
    throw new Error(
      `Timed out waiting for processing of upload ID ${registerResult.uploadId} at ${provider}.`
    );
  }

  const result = (
    await publishProfile.getUseCase('PublishPost').perform(
      {
        profileId,
        text: input.caption,
        attachments: [{ id: uploadId }],
      },
      {
        provider,
        ...providerOptions,
      }
    )
  ).unwrap() as PublishResult;

  debugLog({ result });
  return result;
}

async function publishFile(
  input: UploadVideoInput & { video: string },
  provider: string,
  providerOptions: { [key: string]: unknown }
): Promise<PublishResult> {
  switch (provider) {
    case 'tiktok':
      return tiktokPublishFile(input, providerOptions);
  }
  throw new Error('Not yet implemented.');
}

function getSupportedUploadStrategies(provider: string): UploadStrategy[] {
  // TODO - use a Superface use case instead
  switch (provider) {
    case 'instagram':
      return [UploadStrategy.REMOTE_URL];
    case 'facebook':
    case 'tiktok':
      return [UploadStrategy.RESUMABLE_UPLOAD];
    case 'mock':
      return [UploadStrategy.REMOTE_URL, UploadStrategy.RESUMABLE_UPLOAD];
    default:
      return [];
  }
}
