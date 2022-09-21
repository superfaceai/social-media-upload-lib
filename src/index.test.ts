import * as dotenv from 'dotenv';
import { publishVideo } from '.';

dotenv.config();
jest.setTimeout(60 * 1000);

describe('mock', () => {
  test('URL upload works', async () => {
    const publishResult = publishVideo(
      { video: new URL('https://superface.ai') },
      'mock'
    );
    await expect(publishResult).resolves.not.toThrowError();
  });

  test('URL as string upload works', async () => {
    const publishResult = publishVideo(
      { video: 'https://superface.ai' },
      'mock'
    );
    await expect(publishResult).resolves.not.toThrowError();
  });
});


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
