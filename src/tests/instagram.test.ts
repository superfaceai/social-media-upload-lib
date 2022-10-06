import * as dotenv from 'dotenv';
import { publishVideo } from '..';
import { getFirstProfileId } from './common';

dotenv.config();
jest.setTimeout(60 * 1000);

describe('instagram', () => {
  test('URL upload works', async () => {
    const parameters = {
      accessToken: process.env['INSTAGRAM_ACCESS_TOKEN'],
    };

    const publishResult = publishVideo(
      {
        video: 'https://download.samplelib.com/mp4/sample-5s.mp4',
        caption: 'Single video from Superface Upload Lib.',
        profileId: await getFirstProfileId('instagram', parameters),
      },
      'instagram',
      {
        parameters,
      }
    );
    await expect(publishResult).resolves.not.toThrowError();
  });
});
