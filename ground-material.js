import * as THREE from './vendor/three.module.js';
import {detailAtlas} from './detail-atlas.js?v=performance-15';

// World-space, distance-filtered surface detail. Keeps Three's lighting/shadows/fog.
export function createGroundMaterial(trail=false){
  const material=new THREE.MeshLambertMaterial({color:0xffffff,flatShading:true,vertexColors:trail,side:trail?THREE.DoubleSide:THREE.FrontSide,polygonOffset:trail,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
  material.customProgramCacheKey=()=>`forest-ground-no-river-v2-${trail}`;
  material.onBeforeCompile=shader=>{
    shader.uniforms.detailNoise={value:detailAtlas('ground')};
    shader.uniforms.groundSoil={value:new THREE.Color(trail?0x80613e:0x68563c)};
    shader.uniforms.groundMoss={value:new THREE.Color(trail?0xb08d5b:0x758747)};
    shader.uniforms.groundDry={value:new THREE.Color(trail?0xc9aa73:0x92915b)};
    shader.vertexShader=(trail?'attribute float trailEdge; varying float vTrailEdge;\n':'')+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 vGroundPosition;').replace('#include <begin_vertex>','#include <begin_vertex>\nvGroundPosition=(modelMatrix*vec4(transformed,1.0)).xz;'+(trail?'vTrailEdge=trailEdge;':''));
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
      varying vec2 vGroundPosition;
      ${trail?'varying float vTrailEdge;':''}
      uniform vec3 groundSoil;
      uniform vec3 groundMoss;
      uniform vec3 groundDry;
      uniform sampler2D detailNoise;
    `).replace('#include <color_fragment>',`#include <color_fragment>
      vec2 groundUV=vGroundPosition;
      ${trail?'if(vTrailEdge>-.03+.15*sin(groundUV.x*1.7)*sin(groundUV.y*1.3))discard;':''}
      vec3 detail=texture2D(detailNoise,groundUV/32.0).rgb;float patches=detail.r;
      float soil=smoothstep(.28,.7,patches);
      vec3 groundPalette=mix(groundSoil,groundMoss,soil);
      float dry=smoothstep(.63,.85,detail.g);
      groundPalette=mix(groundPalette,groundDry,dry*.55);
      float fineFade=1.0-smoothstep(.25,1.0,length(fwidth(groundUV*24.0)));
      float grain=mix(1.0,.8+detail.b*.4,fineFade);
      ${trail?'diffuseColor.rgb*=mix(.72,1.15,patches)*grain;':'diffuseColor.rgb=groundPalette*grain;'}
    `);
  };
  return material;
}
