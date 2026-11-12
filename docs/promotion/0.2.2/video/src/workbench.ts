import {MainZh,SHOTS,Shot,PAPER} from './Main';
export const WORKBENCH={
  name:'HiTable · 网页表格，随选随算',fps:30,width:1920,height:1080,total:1350,background:PAPER,
  revision:'0.2.2-launch-v1',
  shots:SHOTS.map(s=>({...s,label:s.id,component:Shot,props:{id:s.id,locale:'zh_CN'},cardId:s.id,cardName:s.id,schema:[{type:'text',key:'title',label:'标题',default:''},{type:'text',key:'subtitle',label:'副标题',default:''}]})),
  transitions:[],captions:[],overlays:[],sfx:[],bgm:[],original:MainZh,
};
