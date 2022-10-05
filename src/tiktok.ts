import { FormData } from 'formdata-node';
import { fileFromPath } from 'formdata-node/file-from-path';
import { FormDataEncoder } from 'form-data-encoder';
import fetch from 'node-fetch';
import debug from 'debug';
import { PublishResult, UploadVideoInput } from '.';
import { Readable } from 'stream';

const TIKTOK_API_V1 = 'https://open-api.tiktok.com';
const TIKTOK_API_V2 = 'https://open.tiktokapis.com/v2';

const debugLog = debug('superface:social-media-upload:tiktok');

export interface TikTokProviderOptions {
  security: {
    accessToken: string;
  };
}

// https://developers.tiktok.com/doc/web-video-kit-with-web/
export async function tiktokPublishFile(
  input: UploadVideoInput & { video: string },
  providerOptions: { [key: string]: unknown }
): Promise<PublishResult> {
  const _providerOptions = providerOptions as any as TikTokProviderOptions;

  debugLog('Getting open_id...');
  const openidResponse = await fetch(
    `${TIKTOK_API_V2}/user/info/?fields=open_id`,
    {
      headers: {
        Authorization: `Bearer ${_providerOptions.security.accessToken}`,
      },
    }
  );

  const open_id = (await openidResponse.json()).data.user.open_id;
  debugLog(`Got open_id: ${open_id}`);

  const uploadBodyData = new FormData();
  uploadBodyData.set('video', await fileFromPath(input.video));
  const encoder = new FormDataEncoder(uploadBodyData);

  debugLog('Uploading video...');
  const uploadResponse = await fetch(
    `${TIKTOK_API_V1}/share/video/upload/?access_token=${_providerOptions.security.accessToken}&open_id=${open_id}`,
    { method: 'POST', headers: encoder.headers, body: Readable.from(encoder) }
  );
  debugLog('Uploading video done.');

  const uploadResult = await uploadResponse.json();
  debugLog({ uploadResult });

  if (uploadResult.data.error_code) {
    throw new Error(
      `Error during uploading "${input.video}" to TikTok: ${uploadResult.data.error_code}: ${uploadResult.data.error_msg} / ${uploadResult.extra.error_detail}`
    );
  }

  return {
    postId: uploadResult.data.share_id,
    url: undefined,
  };
}
