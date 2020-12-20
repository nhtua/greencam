var indicator = null
var VIDEO_SIZE = {
  width: 0,
  height: 0
}
var DEFAULT_SIZE = {
  width: 640,
  height: 360,
}

window.onload = (event) => {
  indicator = videoIndicator(getCanvas('outputVideo'))
  indicator.loading()
  start()
}

function saveVideoSize(mediaStream) {
  var s = mediaStream.getVideoTracks()[0].getSettings()
  VIDEO_SIZE.width = s.width;
  VIDEO_SIZE.height = s.height;
}

function resizeVideo(size, targets) {
  targets = targets === undefined ? ['input','output','buffer'] : targets;
  if (targets.indexOf('input') >= 0) {
    getVideo('inputVideo').width = size.width;
    getVideo('inputVideo').height = size.height;
  }

  if (targets.indexOf('output') >= 0) {
    getCanvas('outputVideo', false).width = size.width;
    getCanvas('outputVideo', false).height = size.height;
  }

  if (targets.indexOf('buffer') >= 0) {
    getCanvas('bufferVideo', false).width = size.width;
    getCanvas('bufferVideo', false).height = size.height;
  }
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
      audio: false,
      video: {
        width: { min: 640, ideal: 1280, max: 1920 },
        height: { min: 360, ideal: 720, max: 1080 }
      }
    }
    navigator.mediaDevices.getUserMedia(videoConstraint)
      .then(function (stream) {
        saveVideoSize(stream);
        resizeVideo(VIDEO_SIZE, ['input']);
        resizeVideo(VIDEO_SIZE, ['output','buffer']);
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
  var canvas = getCanvas("outputVideo");
  bodyPix.load({
    architechture: 'MobileNetV1',
    outputStride: 16,
    multiplier: 0.75,
    quantBytes: 2
  }).then(model => {
    console.log('BodyPix model loaded.');
    indicator.stop();
    transformFrame(model, video, canvas);
  }).catch(err => {
    console.error(err);
  })
}

function transformFrame(model, sourceVideo, targetCanvas) {
  var w = VIDEO_SIZE.width;
  var h = VIDEO_SIZE.height;
  var tempCtx = getCanvas('bufferVideo', true);
      tempCtx.drawImage(sourceVideo, 0, 0, w, h);
  var frame = getCanvas('bufferVideo');

  model.segmentMultiPerson(frame, {
    flipHorizontal: true,
    internalResolution: 'medium',
    segmentationThreshold: 0.6,
    scoreThreshold: 0.3,
    maxDetections: 3,
    nmsRadius: 20
  }).then(segments => {
    if (typeof segments !== 'undefined' && segments.length > 0) {
      const foregroundColor = {r: 0, g: 0,   b: 0, a: 0};
      const backgroundColor = {r: 0, g: 255, b: 0, a: 255};
      var maskSegmentation = bodyPix.toMask( segments, foregroundColor, backgroundColor);
      bodyPix.drawMask(
        targetCanvas,
        frame,
        maskSegmentation,
        1, // opacity
        3, // mask blur amount,
        true // flip horizontal
      );
    } else {
      // In case of nobody detected, make all green
      tempCtx.fillStyle = "#00FF00";
      tempCtx.fillRect(0,0, VIDEO_SIZE.width, VIDEO_SIZE.height);
      getCanvas('outputVideo', true).drawImage(frame, 0,0);
    }
    window.requestAnimationFrame(()=>{
      transformFrame(model, sourceVideo, targetCanvas)
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
