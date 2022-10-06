import { SuperfaceClient } from '@superfaceai/one-sdk';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { youtubePublishFile } from './youtube';
import { tiktokPublishFile } from './tiktok';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream';
import { promisify } from 'node:util';
import debug from 'debug';
import fetch from 'node-fetch';

const debugLog = debug('superface:social-media-upload');
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
  shortFormVideo?: boolean;
  uploadType?: 'video';
}

enum UploadState {
  EXPIRED = 'expired',
  ERROR = 'error',
  FINISHED = 'finished',
  IN_PROGRESS = 'inProgress',
  PUBLISHED = 'published',
}

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
    } catch {}

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
      debugLog(
        `Provider ${provider} doesn't support URL uploads but supports resumable uploads, will download file...`
      );
      const tmpDirectory = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), 'sfsmul-')
      );
      try {
        const filepath = await downloadFile(tmpDirectory, url);
        return await publishFile(
          { ...input, video: filepath },
          provider,
          providerOptions || {}
        );
      } finally {
        debugLog(`Deleting ${tmpDirectory}...`);
        await fs.promises.rm(tmpDirectory, { recursive: true });
      }
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
      `Provider "${provider}" does not support uploading local files and a public URL wasn't provided.`
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

  const registerResult = (
    await uploadProfile.getUseCase('RegisterUpload').perform(
      {
        profileId: input.profileId,
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
        profileId: input.profileId,
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
    case 'youtube':
      return youtubePublishFile(input, providerOptions);
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
      return [UploadStrategy.REMOTE_URL];
    case 'youtube':
      return [UploadStrategy.RESUMABLE_UPLOAD];
    case 'tiktok':
      return [UploadStrategy.RESUMABLE_UPLOAD];
    case 'mock':
      return [UploadStrategy.REMOTE_URL, UploadStrategy.RESUMABLE_UPLOAD];
    default:
      return [];
  }
}

async function downloadFile(directory: string, url: URL): Promise<string> {
  const tmpFile = path.join(directory, `${new Date().getTime()}.file`);
  debugLog(`Downloading ${url} to ${directory}...`);

  const streamPipeline = promisify(pipeline);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Error during downloading of ${url}: Unexpected response ${response.status}: ${response.statusText}`
    );
  }
  await streamPipeline(response.body, createWriteStream(tmpFile));
  debugLog('Successfully downloaded.');

  return tmpFile;
}
