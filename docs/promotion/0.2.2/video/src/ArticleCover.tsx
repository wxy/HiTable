import React from 'react';
import {AbsoluteFill,Img,staticFile,useVideoConfig} from 'remotion';
import type {Locale} from './Main';

export const ArticleCover:React.FC<{locale?:Locale}>=({locale='zh_CN'})=>{
  const {height}=useVideoConfig();
  const wide=height<900;
  const top=wide?116:238;
  const en=locale==='en';
  return <AbsoluteFill style={{background:'#153C29',color:'#F7FCF8',fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'}}>
    <div style={{position:'absolute',left:96,top,display:'flex',alignItems:'center',gap:22}}>
      <Img src={staticFile('logo.png')} style={{width:62,height:62}}/>
      <span style={{fontFamily:'Instrument Sans',fontSize:82,fontWeight:700,letterSpacing:-3}}>HiTable</span>
    </div>
    <div style={{position:'absolute',left:96,top:top+160,fontSize:en?72:88,fontWeight:650,lineHeight:1.3,letterSpacing:en?-1:2}}>
      {en?<>Stay on the page.<br/>Run table statistics.</>:<>不离开网页<br/>直接统计表格</>}
    </div>
    <div style={{position:'absolute',left:100,top:top+(en?388:424),fontSize:en?38:42,color:'#BDE2CA',letterSpacing:en?0:2}}>
      {en?'15 statistics. One selection.':'15 种统计 · 随选随算'}
    </div>
    <div style={{position:'absolute',left:100,top:top+(en?454:490),fontSize:32,color:'#BDE2CA'}}>{en?'Median · Std dev · Quartiles':'中位数 · 标准差 · 四分位数'}</div>
    <div style={{position:'absolute',left:860,top:top+110,width:964,height:420,display:'flex',alignItems:'center',justifyContent:'center',background:'#E9F6EC',border:'2px solid #89B49A',borderRadius:14,overflow:'hidden'}}>
      <Img src={staticFile(`captures/cover-table.${en?'en':'zh-CN'}.png`)} style={{width:944,height:396,objectFit:'contain'}}/>
    </div>
    <div style={{position:'absolute',left:864,top:top+558,fontSize:32,color:'#9FC7AE',letterSpacing:en?.3:1}}>{en?'Actual HiTable overlay · Sample data':'真实 HiTable 统计浮层 · 示例数据'}</div>
    <div style={{position:'absolute',left:96,right:96,bottom:64,height:1,background:'#456D55'}}/>
  </AbsoluteFill>;
};
