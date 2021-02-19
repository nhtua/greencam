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

function errorMessage(message) {
	var error = document.getElementById('error');
	error.textContent = message;
}

function getLoadParams() {
	const urlParams = new URLSearchParams(window.location.search);
	var loadParams = {		
		architecture: urlParams.get('net') || 'MobileNetV1',
		outputStride: parseInt(urlParams.get('stride')) || 16,
		multiplier: parseFloat(urlParams.get('mult')) || 0.75,
		quantBytes: parseInt(urlParams.get('quant')) || 2,
	};
	return loadParams;
}

function getModelParams() {
	const urlParams = new URLSearchParams(window.location.search);
	var modelParams = {
		flipHorizontal: urlParams.get('flip') == null ? true : urlParams.get('flip') == "true",
		internalResolution: urlParams.get('res') || "medium",
		segmentationThreshold: parseFloat(urlParams.get('thresh')) || 0.7,
		maxDetections: parseInt(urlParams.get('maxDetections')) || 10,
		scoreThreshold: parseFloat(urlParams.get('scoreThres')) || 0.3,
		nmsRadius: parseInt(urlParams.get('rad')) || 20,
		maskBlurAmount : parseInt(urlParams.get('blur')) || 3,
	};
	return modelParams;
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

async function initMLModel() {
  var video = getVideo();
  var canvas = getCanvas("outputVideo");
  var params = getLoadParams();
  console.log('Loading model with params:');
  console.log(params);
  await bodyPix.load(params).then(model => {
    console.log('BodyPix model loaded.');
    indicator.stop();
	
	var params2 = getModelParams();
	console.log('Model parameters:');
	console.log(params2);
    transformFrame(model, video, canvas, params2);
  }).catch(err => {
    indicator.stop();
    errorMessage(err.message);
    console.error(err);
  })
}

async function transformFrame(model, sourceVideo, targetCanvas, params) {
  var w = VIDEO_SIZE.width;
  var h = VIDEO_SIZE.height;
  var tempCtx = getCanvas('bufferVideo', true);
      tempCtx.drawImage(sourceVideo, 0, 0, w, h);
  var frame = getCanvas('bufferVideo');

  await model.segmentPerson(frame, params).then(segments => {
      const foregroundColor = {r: 0, g: 0,   b: 0, a: 0};
      const backgroundColor = {r: 0, g: 255, b: 0, a: 255};
      var maskSegmentation = bodyPix.toMask( segments, foregroundColor, backgroundColor);
      bodyPix.drawMask(
        targetCanvas,
        frame,
        maskSegmentation,
        1, // opacity
        params.maskBlurAmount, // mask blur amount,
        params.flipHorizontal // flip horizontal
      );
    window.requestAnimationFrame(()=>{
      transformFrame(model, sourceVideo, targetCanvas, params)
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
