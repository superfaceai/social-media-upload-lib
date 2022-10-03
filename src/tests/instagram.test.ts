import * as dotenv from 'dotenv';
import { publishVideo } from '..';

dotenv.config();
jest.setTimeout(60 * 1000);

describe('instagram', () => {
  test('URL upload works', async () => {
    const publishResult = publishVideo(
      {
        video: 'https://download.samplelib.com/mp4/sample-5s.mp4',
        caption: 'Single video from Superface Upload Lib.',
      },
      'instagram',
      {
        parameters: {
          accessToken: process.env['INSTAGRAM_ACCESS_TOKEN'],
        },
      }
    );
    await expect(publishResult).resolves.not.toThrowError();
  });
});
