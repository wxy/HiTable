import React from 'react';
import {AbsoluteFill,Audio,Freeze,Sequence,interpolate,staticFile,useCurrentFrame} from 'remotion';
import {Main,INK} from './Main';
import type {Locale} from './Main';
import {ArticleCover} from './ArticleCover';
import config from '../store-film.json';

export const STORE_CONFIG=config;

export const StoreCover:React.FC<{locale?:Locale}>=({locale='zh_CN'})=>{
  const frame=useCurrentFrame();
  const opacity=interpolate(frame,[config.coverFrames-config.transitionFrames,config.coverFrames],[1,0],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
  return <AbsoluteFill>
    {frame>=config.coverFrames-config.transitionFrames?<Freeze frame={0}><Main locale={locale}/></Freeze>:null}
    <AbsoluteFill style={{opacity}}><ArticleCover locale={locale}/></AbsoluteFill>
  </AbsoluteFill>;
};

export const StoreCredits:React.FC=()=> <div style={{position:'absolute',left:0,right:0,bottom:0,height:220,background:INK,color:'#B6C7BC',fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'flex-end',gap:8,paddingBottom:28,boxSizing:'border-box'}}>
  <div style={{fontSize:40,lineHeight:1.15,marginBottom:10}}>xingyu.wang/extensions/hitable</div>
  <div style={{fontSize:44,lineHeight:1.15}}>Music: Carefree — Kevin MacLeod (incompetech.com)</div>
  <div style={{fontSize:44,lineHeight:1.15}}>CC BY 4.0 · creativecommons.org/licenses/by/4.0/ · Edited</div>
</div>;

export const StoreMusic:React.FC=()=> <Sequence durationInFrames={config.totalFrames}>
  <Audio src={staticFile(config.music)} volume={frame=>{
    const fadeIn=Math.min(1,frame/config.fadeInFrames);
    const fadeOut=Math.min(1,(config.totalFrames-frame)/config.fadeOutFrames);
    return Math.pow(10,config.gainDb/20)*Math.max(0,Math.min(fadeIn,fadeOut));
  }}/>
</Sequence>;

export const StoreFilm:React.FC<{locale?:Locale;bgm?:boolean}>=({locale='zh_CN',bgm=true})=> <AbsoluteFill style={{background:INK}}>
  <Sequence durationInFrames={config.coverFrames}><StoreCover locale={locale}/></Sequence>
  <Sequence from={config.coverFrames} durationInFrames={config.bodyFrames}><Main locale={locale}/></Sequence>
  <Sequence from={config.coverFrames+1200} durationInFrames={150}><StoreCredits/></Sequence>
  {bgm?<StoreMusic/>:null}
</AbsoluteFill>;
