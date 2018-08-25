var camera, scene, renderer;

var sceneUpdated = true;

var rotatedLabels = [];

var animation = document.getElementById('anim');

var hasScreenOrientationAPI = function() {
  return window.hasOwnProperty('screen') &&
    typeof window.screen.orientation !== 'undefined' &&
    typeof window.screen.orientation.angle !== 'undefined';
}();

var supportsPassive = false;

(function() {
  try {
    var opts = Object.defineProperty({}, 'passive', {
      get: function() {
        supportsPassive = true;
      }
    });

    window.addEventListener('testPassive', null, opts);
    window.removeEventListener('testPassive', null, opts);
  } catch (e) {}
}());

var screenOrientationAngle;

var alpha, beta, gamma;

var _Math = THREE.Math;

var degToRad = _Math.degToRad;

var quaternionRotationThreshold = degToRad(0.1);

function altAzToVec3(altitude, azimuth, dist, vec3) {
  altitude = degToRad(90 - altitude);
  azimuth = degToRad(azimuth);

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

var generateTexture = (function() {
  var _rgb = new THREE.Color();

  return function(canvas, text, textColor) {
    var context = canvas.getContext('2d');
    context.font = '96px Helvetica';

    var textWidth = context.measureText(text).width,
      textHeight = calculateFontHeight(context.font);

    canvas.width = Math.max(canvas.width, _Math.ceilPowerOfTwo(textWidth));
    canvas.height = Math.max(canvas.height, _Math.ceilPowerOfTwo(textHeight));

    _rgb.set(textColor);
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
  };
}());

function createLabelCanvasTexture(text, textColor) {
  var canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;

  return new THREE.CanvasTexture(generateTexture(canvas, text, textColor));
}

function createLabelSprite(text, textColor) {
  var texture = createLabelCanvasTexture(text, textColor);
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

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 2000);
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
  })).rotateX(-Math.PI / 2);
  scene.add(ground);

  // Label sprites to be rotated by -camera.rotation.z
  var label1 = createLabelSprite('10º label (rotated)', 'red');
  altAzToVec3(10, 90, 1500, label1.position);
  scene.add(label1);

  var label2 = createLabelSprite('90º label (rotated)', 'red');
  altAzToVec3(90, 90, 1500, label2.position);
  scene.add(label2);

  var label3 = createLabelSprite('45º label (rotated)', 'red');
  altAzToVec3(45, 90, 1500, label3.position);
  scene.add(label3);

  rotatedLabels.push(label1, label2, label3);

  // Label sprites not to be rotated
  var label4 = createLabelSprite('10º label (non-rotated)', 'green');
  altAzToVec3(10, 90, 1500, label4.position);
  scene.add(label4);

  var label5 = createLabelSprite('90º label (non-rotated)', 'green');
  altAzToVec3(90, 90, 1500, label5.position);
  scene.add(label5);

  var label6 = createLabelSprite('45º label (non-rotated)', 'green');
  altAzToVec3(45, 90, 1500, label6.position);
  scene.add(label6);

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
    window.addEventListener('deviceorientation', onDeviceOrientation);
  }

  onScreenOrientationChanged(false);

  if (hasScreenOrientationAPI) {
    window.screen.orientation.addEventListener('change', function() {
      onScreenOrientationChanged(true);
    });
  } else {
    window.addEventListener('orientationchange', function() {
      onScreenOrientationChanged(true);
    });
  }

  document.addEventListener('touchmove', function(event) {
    event.preventDefault();
  }, supportsPassive ? {
    passive: false
  } : false);
}

function onDeviceOrientation(event) {
  if (event.alpha === null || event.beta === null || event.gamma === null) {
    window.removeEventListener('deviceorientation', onDeviceOrientation);
    return;
  }

  alpha = degToRad(event.alpha);
  beta = degToRad(event.beta);
  gamma = degToRad(event.gamma);

  updateCameraQuaternion();
}

function onScreenOrientationChanged(updateQuaternion) {
  screenOrientationAngle = _calculateScreenOrientationAngle();
  if (updateQuaternion) {
    updateCameraQuaternion();
  }
}

function _calculateScreenOrientationAngle() {
  return degToRad(hasScreenOrientationAPI ? (window.screen.orientation.angle || 0) : (window.orientation || 0));
}

var updateCameraQuaternion = (function() {
  var resultQuaternion = new THREE.Quaternion(),
    previousQuaternion = new THREE.Quaternion();

  var setQuaternionFromEulerOrientation = (function() {
    var xAxis = new THREE.Vector3(1, 0, 0),
      zAxis = new THREE.Vector3(0, 0, 1),
      euler = new THREE.Euler(),
      qOrientation = new THREE.Quaternion(),
      qX = new THREE.Quaternion().setFromAxisAngle(xAxis, -Math.PI / 2);

    return function(q, a, b, g, o) {
      euler.set(b, a, -g, 'YXZ');
      return q
        .setFromEuler(euler)
        .multiply(qX)
        .multiply(qOrientation.setFromAxisAngle(zAxis, -o));
    };
  }());
  
  var vec = new THREE.Vector3();

  return function() {
    setQuaternionFromEulerOrientation(resultQuaternion, alpha, beta, gamma, screenOrientationAngle);

    if (resultQuaternion.angleTo(previousQuaternion) < quaternionRotationThreshold) {
      return;
    }

    previousQuaternion.copy(resultQuaternion);
    camera.quaternion.copy(resultQuaternion);
    
    console.log(camera.getWorldDirection(vec));

    sceneUpdated = true;
  };
}());

function animate() {
  requestAnimationFrame(animate);

  if (sceneUpdated) {
    rotatedLabels.forEach(function(label) {
      label.material.rotation = -camera.rotation.z;
    });

    renderer.render(scene, camera);

    sceneUpdated = false;
  }
}

init();
animate();

