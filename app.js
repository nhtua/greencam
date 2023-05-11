var indicator = null
var VIDEO_SIZE = {
  width: 0,
  height: 0
}
var DEFAULT_SIZE = {
  width: 640,
  height: 360,
}
var stats = null;
var loadParams = getLoadParams();
var modelParams = getModelParams();

function loadapp() {
  indicator = videoIndicator(getCanvas('outputVideo'));
  indicator.loading();
  start();
}

function saveVideoSize(mediaStream) {
  const s = mediaStream.getVideoTracks()[0].getSettings();
  VIDEO_SIZE.width = s.width;
  VIDEO_SIZE.height = s.height;
  console.log(`Setting webcame size to: ${s.width}x${s.height}`);
  camSizeChange(s.width, s.height);
}

function resizeVideo(size, targets) {
  targets = targets || ['input', 'output', 'buffer'];
  if (targets.includes('input')) {
    getVideo().width = size.width;
    getVideo().height = size.height;
  }

  if (targets.includes('output')) {
    getCanvas('outputVideo').width = size.width;
    getCanvas('outputVideo').height = size.height;
  }

  if (targets.includes('buffer')) {
    getCanvas('bufferVideo').width = size.width;
    getCanvas('bufferVideo').height = size.height;
  }
}

function getVideo() {
  return document.getElementById('inputVideo');
}

function getCanvas(id, getCtx = false) {
  const canvas = document.getElementById(id);
  return getCtx ? canvas.getContext('2d') : canvas;
}

function errorMessage(message) {
  const error = document.getElementById('error');
  error.textContent = message;
}

function camSizeChange(width, height) {
  const elem = document.getElementById("cam_size");
  if (elem) {
    elem.textContent = `Webcam size: ${width}x${height}`;
  }
}

function setCameraDevices(devices) {
  const cameraSelect = document.getElementById('camera');
  if (cameraSelect) {
    while (cameraSelect.children.length > 1) {
      cameraSelect.removeChild(cameraSelect.lastElementChild);
    }
    for (const device of devices) {
      const selectOption = document.createElement("option");
      selectOption.innerText = device.label;
      selectOption.value = device.label;
      cameraSelect.appendChild(selectOption);
    }
  }

  const altCameraSelect = document.getElementById('altCamera');
  if (altCameraSelect) {
    while (altCameraSelect.children.length > 1) {
      altCameraSelect.removeChild(altCameraSelect.lastElementChild);
    }
    for (const device of devices) {
      const selectOption = document.createElement("option");
      selectOption.innerText = device.label;
      selectOption.value = device.label;
      altCameraSelect.appendChild(selectOption);
    }
  }
}

function setCamera(camera, altCamera) {
  const cameraSelect = document.getElementById('camera');
  if (cameraSelect) {
    cameraSelect.value = camera;
  }
  const altCameraSelect = document.getElementById('altCamera');
  if (altCameraSelect) {
    altCameraSelect.value = altCamera;
  }
  loadParams.camera = camera;
  loadParams.altCamera = altCamera;
}

function getLoadParams() {
  const urlParams = new URLSearchParams(window.location.search);
  return {
    camera: urlParams.get('camera') || '',
    altCamera: urlParams.get('altCamera') || '',
    architecture: urlParams.get('architecture') || 'MobileNetV1',
    outputStride: Number(urlParams.get('outputStride')) || 16,
    multiplier: Number(urlParams.get('multiplier')) || 0.75,
    quantBytes: Number(urlParams.get('quantBytes')) || 2,
  };
}

function getModelParams() {
  const urlParams = new URLSearchParams(window.location.search);
  return {
    flipHorizontal: urlParams.get('flipHorizontal') == "true",
    internalResolution: urlParams.get('internalResolution') || "medium",
    segmentationThreshold: Number(urlParams.get('segmentationThreshold')) || 0.7,
    maxDetections: Number(urlParams.get('maxDetections')) || 10,
    scoreThreshold: Number(urlParams.get('scoreThreshold')) || 0.3,
    nmsRadius: Number(urlParams.get('nmsRadius')) || 20,
    maskBlurAmount: Number(urlParams.get('maskBlurAmount')) || 3,
  };
}

async function start() {
  if (!navigator.mediaDevices.getUserMedia) return;

  const videoConstraint = {
    audio: false,
    video: {
      width: { min: 640, ideal: 1280, max: 1920 },
      height: { min: 360, ideal: 720, max: 1080 },
    },
  };
  const deviceId = await getDevices();
  if (deviceId) {
    videoConstraint.video.deviceId = deviceId;
  }

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia(videoConstraint);
  } catch (err) {
    errorMessage(`Couldn't get the webcam object! ${err.message}`);
    console.log("Something went wrong!");
    console.error(err);
    return;
  }

  errorMessage('');
  saveVideoSize(stream);
  resizeVideo(VIDEO_SIZE, ['input']);
  resizeVideo(VIDEO_SIZE, ['output', 'buffer']);
  const video = getVideo();
  video.srcObject = stream;
  video.play();
  video.onloadeddata = () => {
    if (deviceId === undefined) {
      start();
    } else {
      initMLModel();
    }
  };
}

async function getDevices() {
  if (!navigator.mediaDevices.enumerateDevices) {
    return null;
  }

  let devices;
  try {
    devices = await navigator.mediaDevices.enumerateDevices();
  } catch (ignored) {
    return null;
  }

  const videoDevices = devices.filter(device => device.kind === 'videoinput');
  if (!videoDevices.length || videoDevices[0].deviceId === '' || videoDevices[0].label === '') {
    return null;
  }

  setCameraDevices(videoDevices);

  const cameraLabel = loadParams.camera;
  const foundDevice = videoDevices.find(device => device.label === cameraLabel);
  const altCameraLabel = loadParams.altCamera;
  const foundAltDevice = videoDevices.find(device => device.label === altCameraLabel);

  setCamera(foundDevice?.label || '', foundAltDevice?.label || '');
  return foundDevice?.deviceId || foundAltDevice?.deviceId || null;
}

async function initMLModel() {
  const video = getVideo();
  const canvas = getCanvas("outputVideo");
  console.log('Loading model with params:', loadParams);
  await bodyPix.load(loadParams).then(model => {
    console.log('BodyPix model loaded.');
    indicator.stop();

    console.log('Model parameters:', modelParams);
    transformFrame(model, video, canvas);
  }).catch(err => {
    indicator.stop();
    errorMessage(err.message);
    console.error(err);
  })
}

async function transformFrame(model, sourceVideo, targetCanvas) {
  const w = VIDEO_SIZE.width;
  const h = VIDEO_SIZE.height;
  const tempCtx = getCanvas('bufferVideo', true);
  tempCtx.drawImage(sourceVideo, 0, 0, w, h);
  const frame = getCanvas('bufferVideo');

  let segments
  try {
    segments = await model.segmentPerson(frame, modelParams)
  } catch (err) {
    console.error(err);
    return;
  }

  const foregroundColor = { r: 0, g: 0, b: 0, a: 0 };
  const backgroundColor = { r: 0, g: 255, b: 0, a: 255 };
  const maskSegmentation = bodyPix.toMask(segments, foregroundColor, backgroundColor);
  bodyPix.drawMask(
    targetCanvas,
    frame,
    maskSegmentation,
    1, // opacity
    modelParams.maskBlurAmount, // mask blur amount,
    modelParams.flipHorizontal, // flip horizontal
  );
  window.requestAnimationFrame(() => {
    if (stats) stats.begin();
    transformFrame(model, sourceVideo, targetCanvas)
    if (stats) stats.end();
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
  const ctx = canvas.getContext('2d');
  const center = {
    x: canvas.width / 2,
    y: canvas.height / 2
  }
  const bigCircle = {
    center: center,
    radius: 50,
    speed: 3
  }
  const smallCirlce = {
    center: center,
    radius: 30,
    speed: 2
  }

  let isLoading = true;
  let progress = 0;

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
    const start = accelerateInterpolator(progress) * circle.speed;
    const end = decelerateInterpolator(progress) * circle.speed;
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
    isLoading = false;
  }

  return { loading, stop };
}
