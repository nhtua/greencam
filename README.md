# GreenCam
[![Netlify Status](https://api.netlify.com/api/v1/badges/4ccf5f3b-b414-4da1-bf50-97955adbd300/deploy-status)](https://app.netlify.com/sites/greencam/deploys)

## What is GreenCam?

GreenCam is **a virtual green backdrop** for OBS Studio. Yep! You are not crazy. It basically replaces every thing around you by green color. So that you can use the Chroma Key filter in OBS Studio to put yourself in any other video. GreenCam is powered by a machine learning technology called [Tensorflow](https://github.com/tensorflow/tfjs) and its public model [BodyPix](https://github.com/tensorflow/tfjs-models/tree/master/body-pix).

I do a lot of live streaming at home. There is a small living room, a lot of messy stuffs that needs to hide, not much spaces (and *budget) to setup a standard professional studio. I found there are some applications, like XSplit VCam or Chroma Cam, which removes/changes the background of your video, but I don't want to pay them since I can do exactly the same thing for FREE!!

![Demo GreenCam](docs/images/demo-GreenCam01.gif)

## How to use GreenCam with OBS Studio

### Prerequisite
I tested GreenCam with my OBS Studio 26. But you should able to run GreenCam in any version support Browser plugin.

- OBS Studio with Browser plugin enabled
- NodeJS Erbium (12 LTS) or later
- A webcam

### Follow steps below to setup:

1. Go to https://greencam.netlify.app to test your PC can run this. Copy the URL.

2. Edit your application shortcut. I'm using Linux, but Windows should be similar. The idea is to add some options to the starting command, which enables OBS loading a webpage with a WebCam.
  ```
  $ cd /usr/share/applications/
  $ ls | grep obs
  # pick the name that you see here. For me, it's `com.obsproject.Studio.desktop`

  $ sudo vi com.obsproject.Studio.desktop
  # find the line `Exec=`, modify it into the line below
  Exec=obs --enable-gpu --enable-media-stream

  # press : and "x", then press Enter to escape Vi editor
  ```
3. Open OBS studio, in a scene
 - click `+` button on the `source` panel
 - choose `Browser`.
 - Name it `GreenCam` then click `OK`
4. In the next dialog
  - tick the box `Local file`
  - Pick the file `index.html` from GreenCam source code
  - input width=640, height=480
  - leave everything else default
  - click `OK` at the end.
5. Right click on your new `source` - `GreenCam`
  - Choose Filter
  - On the `Effect Filters` panel, click `+`
  - Choose `Chroma Key`
  - Key color type = `green`
6. Close the dialog of filters. **Congrats!** You have your new webcam with background removed.

## Development
It is a hack I did at the midnight, then some errors or incompatible problems will happens in your machine. Also, there are a lot of features that may be included in next version of GreenCam, like:
- Custom parameters/algorithm to have smoother, better shapes
- Custom background color, video
- Add an editor that can run in browser to test customized parameters and generate a link to run in OBS

All Pull Requests are welcome!!
