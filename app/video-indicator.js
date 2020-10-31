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
