import * as dotenv from 'dotenv';
import { publishVideo } from '..';

dotenv.config();
jest.setTimeout(60 * 1000);

describe('youtube', () => {
  test('local file upload works', async () => {
    const publishResult = publishVideo(
      {
        video: './example-media/vertical.mp4',
        caption: 'Single short from Superface Upload Lib.',
        shortFormVideo: true,
      },
      'youtube',
      {
        security: {
          accessToken: process.env['YOUTUBE_ACCESS_TOKEN'],
        },
      }
    );
    await expect(publishResult).resolves.not.toThrowError();
  });

  test('url upload works', async () => {
    const publishResult = publishVideo(
      {
        video: 'https://download.samplelib.com/mp4/sample-5s.mp4',
        caption: 'Single downloaded video from Superface Upload Lib.',
      },
      'youtube',
      {
        security: {
          accessToken: process.env['YOUTUBE_ACCESS_TOKEN'],
        },
      }
    );
    await expect(publishResult).resolves.not.toThrowError();
  });
});
