import { Component } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three-orbitcontrols-ts';
import { GPUComputationRenderer, Variable } from 'three/examples/jsm/misc/GPUComputationRenderer';
import { Vector3, ShaderMaterial, FrontSide, BackSide, DoubleSide, CubeTextureLoader } from 'three';
import { Observable, fromEvent } from 'rxjs';
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent {
  scene = new THREE.Scene();
  renderer = new THREE.WebGLRenderer();
  h = 512; // frustum height
  aspect = window.innerWidth / window.innerHeight;
  camera = new THREE.PerspectiveCamera(90,1, 0.1,1000);
  //camera = new THREE.OrthographicCamera(10,-10,10,-10);
  controls = new OrbitControls(this.camera, this.renderer.domElement);
  data: THREE.TypedArray;

  path = "assets/pisa/";
  format = '.jpg';
  urls = [
    this.path + 'px' + this.format, this.path + 'nx' + this.format,
    
    this.path + 'pz' + this.format, this.path + 'pz' + this.format,
    this.path + 'py' + this.format, this.path + 'ny' + this.format,
  ];
  move?: Observable<Event>;
  raycaster = new THREE.Raycaster();
  mouseMoved = false;
  mouseCoords = new THREE.Vector2();
  textureCube = new CubeTextureLoader().load(this.urls, x => { console.log(x); });
  texture1 = THREE.ImageUtils.loadTexture("../assets/pisa/nz.jpg");
  texture: THREE.DataTexture3D;
  material = new THREE.ShaderMaterial();

  geometry = new THREE.BoxBufferGeometry(4.0, 4.0, 4.0);
  geometry1 = new THREE.BoxBufferGeometry(2.0, 2.0, 2.0);
  mesh = new THREE.Mesh();
  gpuCompute: GPUComputationRenderer;
  readWaterLevelShader: any;
  readWaterLevelRenderTarget1!: THREE.WebGLRenderTarget;
  readWaterLevelImage = new Uint8Array(4 * 1 * 4);

  constructor() {

    this.gpuCompute = new GPUComputationRenderer(128, 128, this.renderer);
  };


  ngOnInit(): void {

    this.scene.background=this.textureCube;
    console.log(this.scene.background);
    this.data = new Float32Array([0.0, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 1.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27,
      28, 29, 30, 31, 32, 33, 34, 335, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63]);
    this.texture = new THREE.DataTexture3D(this.data, 4.0, 4.0, 4.0,);
    this.texture.format = THREE.RedFormat;
    this.texture.type = THREE.FloatType;
    this.texture.minFilter = THREE.NearestFilter;
    this.texture.magFilter = THREE.NearestFilter;
    this.texture.unpackAlignment = 1;
    let blueMaterial = new THREE.MeshBasicMaterial({ map: this.texture1, side:THREE.BackSide });
    // this.geometry.translate(1.5, 1.5, 1.5);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);
    this.camera.position.set(0, 0, 15);
    // this.camera.up.set(0, 0, 1); //

    //	controls.addEventListener( 'change', render );
    this.controls.target.set(0, 0, 0);
    this.controls.minZoom = 0.5;
    this.controls.maxZoom = 4;
    this.controls.update();

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        u_data: { value: this.texture },
        u_point: { value: new Vector3(0.5, 0.5, 0.5) },
      },
      vertexShader: vertexSource,
      fragmentShader: fragmentSource,
      side: DoubleSide,
    });

    this.readWaterLevelRenderTarget1 = new THREE.WebGLRenderTarget(4, 1, {
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      depthBuffer: false
    });
    this.readWaterLevelShader = this.gpuCompute.createShaderMaterial(readWaterLevelFragmentShader, {
      point1: { value: new THREE.Vector3() },
      levelTexture: { value: null }
    });
    // you can change the material to use the shader,bluematerial is a sky box
    this.mesh = new THREE.Mesh(this.geometry, blueMaterial);
    // this.mesh.position.set(2,2,2);

    console.log(this.camera.matrixWorldInverse);
    this.scene.add(this.mesh);
    this.move =
      fromEvent(this.renderer.domElement, 'mousemove');
    this.move.subscribe(x => {
      // this.onDocumentMouseMove((x as MouseEvent).clientX, (x as MouseEvent).clientY);
      this.onDocumentMouseMove((x as MouseEvent).clientX!, (x as MouseEvent).clientY!);
    })
    this.render();
  };
  onDocumentMouseMove(x: number, y: number) {
    let a = x; let b = y;
    this.setMouseCoords(a, b);

  }
  setMouseCoords(x: number, y: number) {

    this.mouseCoords.set((x / this.renderer.domElement.clientWidth) * 2 - 1, - (y / this.renderer.domElement.clientHeight) * 2 + 1);
    this.mouseMoved = true;


  }
  render() {
    if (this.mouseMoved) {
      this.mouseMoved = false;
      // console.log(this.mouseMoved);
      this.raycaster.setFromCamera(this.mouseCoords, this.camera);

      var intersects = this.raycaster.intersectObject(this.mesh);

      if (intersects.length > 0) {
        let point = intersects[0].point;
        point.x += 2.0;
        point.y += 2.0;
        point.z += 2.0;
        let point1 = new Vector3(point.x / 4.0, point.y / 4.0, point.z / 4.0);
        // point = new Vector3(4.0/4,0.0/4,0.0/4);
        this.readWaterLevelShader.uniforms["point1"] = { value: point1 };
        this.readWaterLevelShader.uniforms["levelTexture"].value = (this.material as ShaderMaterial).uniforms['u_data'].value;
        console.log(point);
        this.gpuCompute.compute();
        this.gpuCompute.doRenderTarget(this.readWaterLevelShader, this.readWaterLevelRenderTarget1);
        this.renderer.readRenderTargetPixels(this.readWaterLevelRenderTarget1, 0, 0, 4, 1, this.readWaterLevelImage);
        var pixels = new Float32Array(this.readWaterLevelImage.buffer);
        // console.log(this.readWaterLevelImage);
        console.log(this.material.uniforms['u_data'].value);
        // console.log(this.readWaterLevelShader);
        let y = pixels;
        console.log(y);
      };
    }
  
    this.renderer.render(this.scene, this.camera);

    requestAnimationFrame(() => {
      this.render();
    })
  }
}


const vertexSource = `
attribute vec3 textureCoord;

varying highp vec3 vTextureCoord;
varying highp vec3 vT;

void main(void) {
  gl_PointSize = 20.0f;
  
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  
gl_Position = p;

  vTextureCoord = vec3(modelMatrix * vec4(position,1.0));

  if (position.x >=-2.0 && position.x<=1.0){
   vT = vec3(position.x,position.y,position.z);}
   else{ vT =vec3(1.0,0.0,0.0);};
 // vec3 vT = p.xyz;
}
`;

const fragmentSource = `
varying highp vec3 vTextureCoord;

varying highp vec3 vT;

uniform highp sampler3D u_data;
precision mediump float;


void main(void) {

 highp vec3 c = vec3((vTextureCoord.x +2.0)/4.0,(vTextureCoord.y+2.0)/4.0,(vTextureCoord.z+2.0)/4.0);
 vec4 m =texture(u_data, c);
 vec4 cm = vec4(m.r / 60.0 , m.g / 60.0,m.b / 60.0,m.a / 60.0);

 float x = vT.x / 4.0 + 0.5;
 float y = vT.y / 4.0 + 0.5;
 float z = vT.z / 4.0 + 0.5;
  // gl_FragColor = cm;
  gl_FragColor = vec4(x,y,z,1.0);
 //gl_FragColor = vec4(c,1.0);
}

`;
const readWaterLevelFragmentShader = `
    
uniform vec3 point1;
vec4 a;
uniform highp sampler3D levelTexture;

float shift_right( float v, float amt ) {
    
	v = floor( v ) + 0.5;
	return floor( v / exp2( amt ) );

}

float shift_left( float v, float amt ) {

	return floor( v * exp2( amt ) + 0.5 );

}

float mask_last( float v, float bits ) {

	return mod( v, shift_left( 1.0, bits ) );

}

float extract_bits( float num, float from, float to ) {

	from = floor( from + 0.5 ); to = floor( to + 0.5 );
	return mask_last( shift_right( num, from ), to - from );

}

vec4 encode_float( float val ) {
	if ( val == 0.0 ) return vec4( 0, 0, 0, 0 );
	float sign = val > 0.0 ? 0.0 : 1.0;
	val = abs( val );
	float exponent = floor( log2( val ) );
	float biased_exponent = exponent + 127.0;
	float fraction = ( ( val / exp2( exponent ) ) - 1.0 ) * 8388608.0;
	float t = biased_exponent / 2.0;
	float last_bit_of_biased_exponent = fract( t ) * 2.0;
	float remaining_bits_of_biased_exponent = floor( t );
	float byte4 = extract_bits( fraction, 0.0, 8.0 ) / 255.0;
	float byte3 = extract_bits( fraction, 8.0, 16.0 ) / 255.0;
	float byte2 = ( last_bit_of_biased_exponent * 128.0 + extract_bits( fraction, 16.0, 23.0 ) ) / 255.0;
	float byte1 = ( sign * 128.0 + remaining_bits_of_biased_exponent ) / 255.0;
	a= vec4( byte4, byte3, byte2, byte1 );
   
	return vec4( byte4, byte3, byte2, byte1 );
}

void main()	{

	vec3 b = vec3(0.8786708515367253, 0.9979166666666667, 0.840748996059114);
	vec3 c= vec3( 10/240 , 0.0 , 0.0);
	float waterLevel =  texture( levelTexture, point1).x;
	
    gl_FragColor = encode_float(waterLevel );

}`;