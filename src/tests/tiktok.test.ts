import * as dotenv from 'dotenv';
import { publishVideo } from '..';

dotenv.config();
jest.setTimeout(180 * 1000);

describe('youtube', () => {
  test('local file upload works', async () => {
    const publishResult = publishVideo(
      {
        video: './example-media/vertical.mp4',
        caption: 'Single video from Superface Upload Lib.',
      },
      'tiktok',
      {
        security: {
          accessToken: process.env['TIKTOK_ACCESS_TOKEN'],
        },
      }
    );
    await expect(publishResult).resolves.not.toThrowError();
  });
});
