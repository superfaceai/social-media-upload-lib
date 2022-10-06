# Superface Social Media Upload Lib

This library presents a unified API for uploading media (particularly video) to social media sites, such as Facebook, YouTube or TikTok.

It uses [OneSDK](https://github.com/superfaceai/one-sdk-js) by [Superface](https://superface.ai) under the hood.

Ideally, OneSDK should support all these use cases by itself; however, due to certain features being unsupported in the current version of OneSDK and Comlink, this library works around these limitations by implementing them in JavaScript. **There are no plans to keep supporting this library once these limitations are addressed.**

## Installation

The `@superfaceai/social-media-upload` library needs to be installed _along with_ OneSDK.

```shell
npm install @superfaceai/one-sdk
npm install @superfaceai/social-media-upload
```

or

```shell
yarn add @superfaceai/one-sdk
yarn add @superfaceai/social-media-upload
```

## Usage

### Publishing a video

The `publishVideo()` function takes three arguments:

- `input` - An object specifying the following:

  - `video` - An URL or a path to a video file. (required)
  - `profileId` - Identifier of a profile to upload to. May be optional with some providers.
  - `caption` - Caption of the upload.
  - `shortFormVideo` - Indicates a video should be uploaded as a short-form video (e.g. Instagram Reels). Ignored if unsupported or not applicable.

- `provider` - A `String` identifying the provider. Currently: `tiktok`, `youtube` or any supported by the [social-media/upload-from-url](https://superface.ai/social-media/upload-from-url) use case.

- `providerOptions`: An object specifying the provider options, such as authentication (either in `parameters` or `security`). See [Provider Options](#provider-options) below.

The function returns an object containing a `postId` identifying the published video, and _optionally_ an `url`.

**Example:**

```javascript
import { publishVideo } from '@superfaceai/social-media-upload';

const publishResult = await publishVideo(
  {
    video: 'path/to/video.mp4',
    caption: 'Single video from Superface Upload Lib.',
    shortFormVideo: true,
  },
  'instagram',
  { parameters: { accessToken: '<your accessToken value>' } }
);

console.log(publishResult); // { postId: "CiyBxYNqcXn", url: "https://www.instagram.com/p/CiyBxYNqcXn/" }
```

### Provider Options

For providers not specified below, the format is identical to the one specified on the [social-media/upload-from-url](https://superface.ai/social-media/upload-from-url) use case page. For example, for [Facebook](https://superface.ai/social-media/upload-from-url?provider=facebook), the `providerOptions` object should look like:

```javascript
{
  parameters: {
    accessToken: '<your accessToken value>';
  }
}
```

#### YouTube

For YouTube, the access token is passed as follows:

```javascript
{
  security: {
    accessToken: '<your accessToken value>';
  }
}
```

More info about YouTube authorization can be found in the [YouTube Data API](https://developers.google.com/youtube/registering_an_application).

#### TikTok

For TikTok, the access token is passed as follows:

```javascript
{
  security: {
    accessToken: '<your accessToken value>';
  }
}
```
