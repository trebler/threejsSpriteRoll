var camera, scene, renderer;

var textColor = 'white';

var sceneUpdated = true;

var labels = [];

var animation = document.getElementById('anim');

init();
animate();

function AltAzToVec3(altitude, azimuth, dist, vec3) {
  altitude = THREE.Math.degToRad(90 - altitude);
  azimuth = THREE.Math.degToRad(azimuth);

  var sinZen = Math.sin(altitude),
    cosZen = Math.cos(altitude),
    sinAz = Math.sin(azimuth),
    cosAz = Math.cos(azimuth);

  return vec3.set(-sinZen * cosAz, cosZen, -sinZen * sinAz).multiplyScalar(dist);
}

function calculateFontHeight(fontStyle) {
  var body = document.body,
    dummy = document.createElement('div');

  var dummyText = document.createTextNode('MÉq');
  dummy.appendChild(dummyText);
  dummy.setAttribute('style', 'font:' + fontStyle + ';position:absolute;top:0;left:0');
  body.appendChild(dummy);
  var res = dummy.offsetHeight;

  body.removeChild(dummy);

  return res;
}

function generateTexture(canvas, text) {
  var context = canvas.getContext('2d');
  context.font = '96px Helvetica';

  var textWidth = context.measureText(text).width,
    textHeight = calculateFontHeight(context.font);

  canvas.width = Math.max(canvas.width, THREE.Math.ceilPowerOfTwo(textWidth));
  canvas.height = Math.max(canvas.height, THREE.Math.ceilPowerOfTwo(textHeight));

  var _rgb = new THREE.Color(textColor);
  context.fillStyle = 'rgba(' + _rgb.r * 255 + ',' + _rgb.g * 255 + ',' + _rgb.b * 255 + ', 0.01)';
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.font = '96px Helvetica';
  context.textAlign = 'left';
  context.textBaseline = 'top';
  context.fillStyle = textColor;

  context.fillText(
    text,
    (canvas.width - textWidth) / 2,
    (canvas.height - textHeight) / 2
  );

  return canvas;
}


function createLabelCanvasTexture(text) {
  canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;

  return new THREE.CanvasTexture(generateTexture(canvas, text));
}

function createLabelSprite(text) {
  var texture = createLabelCanvasTexture(text);
  var label = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.02
  }));

  label.scale.set(texture.image.width, texture.image.height, 1);
  return label;
}

function init() {

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 2000);
  camera.position.set(0, 1, 0);
  camera.rotation.order = 'YXZ';

  renderer = new THREE.WebGLRenderer({
    antialias: window.devicePixelRatio < 2
  });

  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  var container = renderer.domElement;

  animation.appendChild(container);

  var ground = new THREE.Mesh(new THREE.PlaneBufferGeometry(camera.far, camera.far), new THREE.MeshBasicMaterial({
    color: 'brown'
  }));
  ground.rotateX(-Math.PI / 2);
  scene.add(ground);

  var label1 = createLabelSprite('Low label');
  AltAzToVec3(10, 100, 1500, label1.position);
  scene.add(label1);

  var label2 = createLabelSprite('High label');
  AltAzToVec3(90, 100, 1500, label2.position);
  scene.add(label2);

  var label3 = createLabelSprite('Middle label');
  AltAzToVec3(45, 100, 1500, label3.position);
  scene.add(label3);

  labels.push(label1, label2, label3);

  var geometry = new THREE.SphereBufferGeometry(camera.far, 90, 90),
    wireframe = new THREE.WireframeGeometry(geometry),
    line = new THREE.LineSegments(wireframe, new THREE.LineBasicMaterial({
      color: 'green',
      transparent: true,
      opacity: 0.2
    }));

  scene.add(line);

  window.addEventListener('resize', function() {
    camera.aspect = window.innerWidth / window.innerHeight;
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.updateProjectionMatrix();
    sceneUpdated = true;
  });

  if (window.hasOwnProperty('ondeviceorientation')) {
    window.addEventListener('deviceorientation', function _typeChecker(event) {
      if (event.alpha !== null && event.beta !== null && event.gamma !== null) {
        window.addEventListener('deviceorientation', rotateCamera);
      } else {
        console.log('not supported');
      }

      window.removeEventListener('deviceorientation', _typeChecker);
    });
  } else if (window.hasOwnProperty('ondeviceorientationabsolute')) {
    window.addEventListener('deviceorientationabsolute', function _typeChecker(event) {
      if (event.alpha !== null && event.beta !== null && event.gamma !== null) {
        window.addEventListener('deviceorientationabsolute', rotateCamera);
      } else {
        console.log('not supported');
      }

      window.removeEventListener('deviceorientationabsolute', _typeChecker);
    });
  }
}

function rotateCamera(e) {
  console.log(e);
}

function animate() {
  requestAnimationFrame(animate);

  if (sceneUpdated) {
    labels.forEach(function(label) {
      label.material.rotation = -camera.rotation.z;
    });

    renderer.render(scene, camera);

    sceneUpdated = false;
  }
}

