# GreenCam
[![Netlify Status](https://api.netlify.com/api/v1/badges/4ccf5f3b-b414-4da1-bf50-97955adbd300/deploy-status)](https://greencam.netlify.app)

## What is GreenCam?

GreenCam is **a virtual green backdrop** for OBS Studio. Yep! You are not crazy. It basically replaces every thing around you by green color. So that you can use the Chroma Key filter in OBS Studio to put yourself in any other video. GreenCam is powered by a machine learning technology called [Tensorflow](https://github.com/tensorflow/tfjs) and its public model [BodyPix](https://github.com/tensorflow/tfjs-models/tree/master/body-pix).

I do a lot of live streaming at home. There is a small living room, a lot of messy stuffs that needs to hide, not much spaces (and *budget) to setup a standard professional studio. I found there are some applications, like XSplit VCam or Chroma Cam, which removes/changes the background of your video, but I don't want to pay them since I can do exactly the same thing for FREE!!

![Demo GreenCam](docs/images/demo-GreenCam01.gif)

## How to use GreenCam with OBS Studio


### Follow steps below to setup:
You have 2 ways to use GreenCam, with some trading-offs

1. 🚲[The easiest way - trade off with a bit flickering](docs/the-easiest-way-to-use-greencam.md)
2. 🏍️[The hard-way but you have a good performance](docs/how-to-use-browser-in-obs.md)

**Congrats!** You have your new webcam with background removed.

## Development

**Prerequisite**

I tested GreenCam with my OBS Studio 26. But you should able to run GreenCam in any version support Browser plugin.

- OBS Studio with Browser plugin enabled
- NodeJS Erbium (12 LTS) or later
- A webcam

**Contribute your idea**

You need install GreenCam's dependencies first
```
$ npm install
```
GreenCam is written in vanilla Javascript, you don't need to build/transpile any thing.
Open `index.html` in your favorite browser and make some change as you wish.

✌️ All Pull Requests are welcome!!

**Road-map**

It is a hack I did at the midnight, then some errors or incompatible problems will happens in your machine. Also, there are a lot of features that may be included in next version of GreenCam, like:
- Custom parameters/algorithm to have smoother, better shapes
- Custom background color, video
- Add an editor that can run in browser to test customized parameters and generate a link to run in OBS
