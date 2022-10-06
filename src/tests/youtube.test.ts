import * as dotenv from 'dotenv';
import { publishVideo } from '..';

dotenv.config();
jest.setTimeout(60 * 1000);

describe('youtube', () => {
  test('local file upload works', async () => {
    const publishResult = publishVideo(
      {
        video: './example-media/sample-5s.mp4',
        caption: 'Single video from Superface Upload Lib.',
      },
      'youtube',
      {
        security: {
          accessToken: process.env['YOUTUBE_ACCESS_TOKEN'],
        },
      }
    );
    // try {
    //   await publishResult;
    // } catch (err) {
    //   console.error({ error: (err as any).response.data.error.errors });
    // }
    await expect(publishResult).resolves.not.toThrowError();
  });
});
