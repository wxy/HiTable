import {SHOTS,Shot,PAPER} from './Main';
import {STORE_CONFIG,StoreCover,StoreCredits,StoreFilm,StoreMusic} from './StoreFilm';
import React from 'react';
const Original:React.FC=()=>React.createElement(StoreFilm,{locale:'zh_CN',bgm:true});
export const WORKBENCH={
  name:'HiTable · 封面与伴奏正式版',fps:30,width:1920,height:1080,total:STORE_CONFIG.totalFrames,background:PAPER,
  revision:'0.2.2-store-cover-music-v1',
  shots:[{id:'cover',from:0,duration:STORE_CONFIG.coverFrames,label:'题图开场',component:StoreCover,props:{locale:'zh_CN'}},...SHOTS.map(s=>({...s,from:s.from+STORE_CONFIG.coverFrames,label:s.id,component:Shot,props:{id:s.id,locale:'zh_CN'},cardId:s.id,cardName:s.id,schema:[{type:'text',key:'title',label:'标题',default:''},{type:'text',key:'subtitle',label:'副标题',default:''}]}))],
  transitions:[],captions:[],overlays:[{id:'credits',from:STORE_CONFIG.coverFrames+1200,duration:150,label:'音乐署名',component:StoreCredits},{id:'music',from:0,duration:STORE_CONFIG.totalFrames,label:'伴奏淡入淡出',component:StoreMusic}],sfx:[],bgm:[],original:Original,
};
