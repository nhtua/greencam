'use strict';

var indicator = null
window.onload = (event) => {
  indicator = videoIndicator(getCanvas('outputVideo'))
  indicator.loading()
  start()
}

function getVideo() {
  return document.getElementById("inputVideo");
}
function getCanvas(id, getCtx) {
  var canvas = document.getElementById(id);
  if ( getCtx === true ){
    return canvas.getContext('2d');
  }
  return canvas;
}

function start() {
  var video = getVideo();
  if (navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(function (stream) {
        video.srcObject = stream;
        video.play();
        video.onloadeddata = (e) => {
          initMLModel()
        }
      })
      .catch(function (err) {
        console.log("Something went wrong!");
        console.error(err);
      });
  }
}

function initMLModel() {
  var video = getVideo();
  var context = getCanvas("outputVideo", true);
  bodyPix.load({
    architechture: 'MobileNetV1',
    outputStride: 16,
    multiplier: 0.75,
    quantBytes: 2
  }).then(model => {
    console.log('BodyPix model loaded.');
    indicator.stop();
    transformFrame(model, video, context);
  }).catch(err => {
    console.error(err);
  })
}

function transformFrame(model, sourceVideo, targetCanvasCtx) {
  var w = sourceVideo.videoWidth || sourceVideo.width;
  var h = sourceVideo.videoHeight || sourceVideo.height;
  var tempCtx = getCanvas('bufferVideo', true);
      tempCtx.drawImage(sourceVideo, 0, 0, w, h);
  var frame = tempCtx.getImageData(0, 0, w, h);
  model.segmentPerson(frame, {
    flipHorizontal: true,
    internalResolution: 'high',
    segmentationThreshold: 0.3,
    scoreThreshold: 0.3,
    maxDetections: 1,
    nmsRadius: 20
  }).then(segment => {
    for (var x = 0; x < w; x++) {
      for (var y = 0; y < h; y++) {
        var n = x + y * w;
        if(segment.data[n] == 0) {
          frame.data[n * 4 + 0] = 0;
          frame.data[n * 4 + 1] = 255;
          frame.data[n * 4 + 2] = 0;
          frame.data[n * 4 + 3] = 255;
        }
      }
    }
    targetCanvasCtx.putImageData(frame, 0, 0);
    window.requestAnimationFrame(()=>{
      transformFrame(model, sourceVideo, targetCanvasCtx)
    });
  }).catch(err => {
    console.error(err);
  });
}
