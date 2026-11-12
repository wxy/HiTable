import React from 'react';
import {Composition,registerRoot} from 'remotion';
import {Main} from './Main';

const Root:React.FC=()=>React.createElement(React.Fragment,null,...(['zh_CN','en'] as const).flatMap(locale=>[false,true].map(short=>React.createElement(Composition,{key:locale+short,id:`HiTable-${locale.replace('_','-')}-${short?'15s':'45s'}`,component:Main,width:1920,height:1080,fps:30,durationInFrames:short?450:1350,defaultProps:{locale,short}}))));
registerRoot(Root);
