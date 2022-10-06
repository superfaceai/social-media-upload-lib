import fetch from 'node-fetch';
import debug from 'debug';
import fs from 'fs';
import { PublishResult, UploadVideoInput } from '.';

const YOUTUBE_API = 'https://www.googleapis.com/upload/youtube/v3';

const debugLog = debug('superface:social-media-upload:youtube');

export interface YouTubeProviderOptions {
  security: {
    accessToken: string;
  };
}

// https://developers.google.com/youtube/v3/guides/using_resumable_upload_protocol
export async function youtubePublishFile(
  input: UploadVideoInput & { video: string },
  providerOptions: { [key: string]: unknown }
): Promise<PublishResult> {
  const _providerOptions = providerOptions as any as YouTubeProviderOptions;
  const authorizationHeader = `Bearer ${_providerOptions.security.accessToken}`;
  const stats = await fs.promises.stat(input.video);

  let title = input.caption || '';
  // https://www.ayrshare.com/post-youtube-shorts-with-an-api/
  if (input.shortFormVideo) {
    title += '#Shorts';
  }

  debugLog('Initiating upload...');
  const initResponse = await fetch(
    `${YOUTUBE_API}/videos?uploadType=resumable&part=snippet`,
    {
      method: 'post',
      body: JSON.stringify({
        snippet: {
          title,
        },
      }),
      headers: {
        Authorization: authorizationHeader,
        'X-Upload-Content-Length': String(stats.size),
        'X-Upload-Content-Type': 'video/*',
      },
    }
  );
  debugLog({ initResponse });

  if (!initResponse.ok) {
    throw new Error(
      `Error during initializing upload of "${input.video}" to YouTube:
        ${initResponse.status}: ${initResponse.statusText}
        ${await initResponse.text()}`
    );
  }

  const uploadLocation = initResponse.headers.get('Location');
  debugLog(`Got upload location: ${uploadLocation}`);

  if (!uploadLocation) {
    throw new Error("Didn't receive a valid upload location.");
  }

  const uploadResponse = await fetch(uploadLocation, {
    method: 'put',
    body: await fs.promises.readFile(input.video),
    headers: {
      Authorization: authorizationHeader,
      'Content-Length': String(stats.size),
      'Content-Type': 'video/*',
    },
  });
  debugLog({ uploadResponse });

  if (!uploadResponse.ok) {
    throw new Error(
      `Error during uploading "${input.video}" to YouTube:
      ${uploadResponse.status}: ${uploadResponse.statusText}
      ${await uploadResponse.text()}`
    );
  }

  const result = await uploadResponse.json();
  return {
    postId: result.id,
    url: undefined,
  };
}
