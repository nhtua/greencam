var indicator = null
var VIDEOSIZE = {
  width: 0,
  height: 0
}

window.onload = (event) => {
  indicator = videoIndicator(getCanvas('outputVideo'))
  indicator.loading()
  start()
}

function saveVideoSize(mediaStream) {
  var s = mediaStream.getVideoTracks()[0].getSettings()
  VIDEOSIZE.width = s.width;
  VIDEOSIZE.height = s.height;
}

function resizeVideo(size) {
  getVideo('inputVideo').width = VIDEOSIZE.width;
  getVideo('inputVideo').height = VIDEOSIZE.height;

  getCanvas('outputVideo', false).width = VIDEOSIZE.width;
  getCanvas('outputVideo', false).height = VIDEOSIZE.height;

  getCanvas('bufferVideo', false).width = VIDEOSIZE.width;
  getCanvas('bufferVideo', false).height = VIDEOSIZE.height;
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
    var videoConstraint = {
      audio: true,
      video: {
        width: { min: 640, ideal: 1280, max: 1920 },
        height: { min: 480, ideal: 720, max: 1080 }
      }
    }
    navigator.mediaDevices.getUserMedia(videoConstraint)
      .then(function (stream) {
        saveVideoSize(stream);
        resizeVideo(VIDEOSIZE);
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

/**
 * Show indicator while waiting for video loaded
 * Kudos to Phan Van Linh at https://stackoverflow.com/a/59028935/1235074
 * @method videoIndicator
 * @param  {HTMLCanvasElement}    canvas you want to show the indicator
 * @return {void}
 */
function videoIndicator(canvas) {
  var ctx = canvas.getContext('2d');
  var center = {
      x: canvas.width/2,
      y: canvas.height/2
  }
  var bigCircle = {
    center: center,
    radius: 50,
    speed: 3
  }
  var smallCirlce = {
    center: center,
    radius: 30,
    speed: 2
  }

  var isLoading = true;
  var progress = 0;

  function loading() {
      if (isLoading == false)
        return 0

      progress += 0.01;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (progress > 1) {
        progress = 0;
      }

      drawText(center.x, center.y);
      drawCircle(bigCircle, progress);
      drawCircle(smallCirlce, progress);

      return window.requestAnimationFrame(loading);
  }
  function drawText(x, y) {
    ctx.font = "12px Arial";
    ctx.fillStyle = "grey";
    ctx.textAlign = 'center';
    ctx.fillText("loading...", x, y);
  }

  function drawCircle(circle, progress) {
      ctx.beginPath();
      var start = accelerateInterpolator(progress) * circle.speed;
      var end = decelerateInterpolator(progress) * circle.speed;
      ctx.arc(circle.center.x, circle.center.y, circle.radius, (start - 0.5) * Math.PI, (end - 0.5) * Math.PI);
      ctx.lineWidth = 3;
      ctx.strokeStyle = "grey";
      ctx.stroke();
  }

  function accelerateInterpolator(x) {
      return x * x;
  }

  function decelerateInterpolator(x) {
      return 1 - ((1 - x) * (1 - x));
  }

  function stop() {
    isLoading = false
  }

  return {loading, stop}
}
