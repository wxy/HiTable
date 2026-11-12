import React from 'react';
import {Composition,registerRoot} from 'remotion';
import {Main} from './Main';
import {ArticleCover} from './ArticleCover';
import {StoreFilm,STORE_CONFIG} from './StoreFilm';

const Root:React.FC=()=>React.createElement(React.Fragment,null,...(['zh_CN','en'] as const).flatMap(locale=>[
  ...[false,true].map(short=>React.createElement(Composition,{key:locale+short,id:`HiTable-${locale.replace('_','-')}-${short?'15s':'45s'}`,component:Main,width:1920,height:1080,fps:30,durationInFrames:short?450:1350,defaultProps:{locale,short}})),
  ...[816,1080].map(height=>React.createElement(Composition,{key:locale+height,id:`HiTable-${locale.replace('_','-')}-cover-${height}`,component:ArticleCover,width:1920,height,fps:30,durationInFrames:1,defaultProps:{locale}})),
  React.createElement(Composition,{key:locale+'store',id:`HiTable-${locale.replace('_','-')}-store`,component:StoreFilm,width:1920,height:1080,fps:STORE_CONFIG.fps,durationInFrames:STORE_CONFIG.totalFrames,defaultProps:{locale,bgm:true}})
]));
registerRoot(Root);
