window.onload = (event) => {
  start()
}

function getVideo() {
  return document.getElementById("inputVideo");
}
function getCanvasContext(id) {
  const canvas = document.getElementById(id);
  return canvas.getContext('2d');
}

function start() {
  const video = getVideo();
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
  const video = getVideo();
  const context = getCanvasContext("outputVideo");
  bodyPix.load({
    architechture: 'MobileNetV1',
    outputStride: 16,
    multiplier: 0.75,
    quantBytes: 2
  }).then(model => {
    console.log('BodyPix model loaded.');
    transformFrame(model, video, context)
  }).catch(err => {
    console.error(err);
  })
}

function transformFrame(model, sourceVideo, targetCanvasCtx) {
  const w = sourceVideo.videoWidth || sourceVideo.width;
  const h = sourceVideo.videoHeight || sourceVideo.height;
  const tempCanvas = document.getElementById('bufferVideo');
  const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(sourceVideo, 0, 0, w, h);
  const frame = tempCtx.getImageData(0, 0, w, h);
  console.log(frame);
  model.segmentPerson(tempCanvas, {
    flipHorizontal: true,
    internalResolution: 'high',
    segmentationThreshold: 0.3,
    scoreThreshold: 0.3,
    maxDetections: 1,
    nmsRadius: 20
  }).then(segment => {
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        let n = x + y * w;
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
