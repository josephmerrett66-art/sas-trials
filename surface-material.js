import * as THREE from './vendor/three.module.js';
import {detailAtlas} from './detail-atlas.js?v=performance-15';

// Instancing-aware procedural detail, preserving flat faces, shadows and fog.
export function createSurfaceMaterial(kind,color,extra={}){
  const material=new THREE.MeshLambertMaterial({color,flatShading:true,...extra});
  material.userData.surface=kind;
  material.customProgramCacheKey=()=>`forest-surface-v4-${kind}`;
  material.onBeforeCompile=shader=>{
    shader.uniforms.detailNoise={value:detailAtlas(kind==='wood'?'foliage':kind)};
    shader.uniforms.surfaceMoss={value:new THREE.Color(0x647a39)};
    shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
      varying vec3 vSurfaceWorld;
      varying vec3 vSurfaceLocal;
    `).replace('#include <begin_vertex>',`#include <begin_vertex>
      vSurfaceLocal=transformed;
      vec4 surfacePosition=vec4(transformed,1.0);
      #ifdef USE_INSTANCING
        surfacePosition=instanceMatrix*surfacePosition;
      #endif
      vSurfaceWorld=(modelMatrix*surfacePosition).xyz;
    `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
      varying vec3 vSurfaceWorld;
      varying vec3 vSurfaceLocal;
      uniform vec3 surfaceMoss;
      uniform sampler2D detailNoise;
      float surfaceDetailFade(vec2 p){return 1.0-smoothstep(.3,1.2,length(fwidth(p)));}
    `);
    const common=`
      vec3 surfaceP=vSurfaceWorld;
      vec2 surfaceUV=vec2(surfaceP.x+surfaceP.z*.37,surfaceP.y+surfaceP.z*.71);
      vec2 atlasUV=surfaceUV;
      ${kind==='bark'?'atlasUV=vec2(atan(vSurfaceLocal.z,vSurfaceLocal.x)*4.8,surfaceP.y*.45);':''}
      vec3 surfaceDetail=texture2D(detailNoise,atlasUV/32.0).rgb;
      float surfacePatch=surfaceDetail.r;
    `;
    const effects={
      bark:`
        float barkAngle=atan(vSurfaceLocal.z,vSurfaceLocal.x);
        vec2 barkUV=vec2(barkAngle*4.8,surfaceP.y*.45);
        float barkGroove=surfaceDetail.g;
        float barkFine=surfaceDetail.b;
        float barkFade=surfaceDetailFade(barkUV*12.0);
        float barkShade=mix(.7,1.2,barkGroove)*mix(1.0,.82+barkFine*.3,barkFade);
        diffuseColor.rgb*=barkShade;
        float barkMoss=(1.0-smoothstep(.2,1.8,surfaceP.y))*smoothstep(.45,.72,surfacePatch);
        diffuseColor.rgb=mix(diffuseColor.rgb,surfaceMoss*.55,barkMoss*.4);
      `,
      foliage:`
        float leafClusters=surfaceDetail.g;
        float leafFade=surfaceDetailFade(surfaceUV*17.0);
        float leafFine=surfaceDetail.b;
        diffuseColor.rgb*=mix(.77,1.15,leafClusters)*mix(1.0,.9+leafFine*.18,leafFade);
        diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.08,1.05,.84),surfacePatch*.3);
      `,
      rock:`
        float rockLayers=surfaceDetail.g;
        float rockGrain=surfaceDetail.b;
        float rockFade=surfaceDetailFade(surfaceUV*22.0);
        diffuseColor.rgb*=mix(.78,1.14,rockLayers)*mix(1.0,.78+rockGrain*.43,rockFade);
        vec3 rockNormal=normalize(cross(dFdx(surfaceP),dFdy(surfaceP)));
        float mossTop=smoothstep(.1,.7,rockNormal.y);
        float mossPatch=smoothstep(.47,.72,surfaceDetail.r);
        diffuseColor.rgb=mix(diffuseColor.rgb,surfaceMoss,mossTop*mossPatch*.65);
      `,
      wood:`
        float woodRadius=length(vSurfaceLocal.xy)*36.0;
        float rings=.5+.5*sin(woodRadius+surfacePatch*2.0);
        float ringsFade=1.0-smoothstep(.4,1.5,fwidth(woodRadius));
        diffuseColor.rgb*=mix(1.0,.76+rings*.28,ringsFade);
      `
    };
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>\n${common}\n${effects[kind]??effects.foliage}`);
  };
  return material;
}
