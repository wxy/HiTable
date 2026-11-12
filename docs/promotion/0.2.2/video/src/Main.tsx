import React from 'react';
import {AbsoluteFill, Easing, Img, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {loadFont} from '@remotion/fonts';

loadFont({family:'Instrument Sans',url:staticFile('fonts/InstrumentSans-Bold.ttf'),weight:'700'});
export const FPS=30;
export const SHOTS=[
  {id:'select',from:0,duration:150},
  {id:'menu',from:150,duration:300},
  {id:'resize',from:450,duration:300},
  {id:'copy',from:750,duration:270},
  {id:'themes',from:1020,duration:180},
  {id:'brand',from:1200,duration:150},
] as const;
export type Locale='zh_CN'|'en';
export const INK='#17251D', GREEN='#167344', PAPER='#F5F7F5';
const FONT='-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const TEXT={
  zh_CN:{
    select:['这几行，加起来是多少？','留在网页，拖选就能看统计'],
    menu:['平均值，也能直接看','打开外围菜单，按名称选择统计方式'],
    resize:['计算范围，随手调整','抓住四角手柄，调整要计算的范围'],
    copy:['需要带走时，再复制','把选中的数据，带到别处继续用'],
    themes:['顺着页面，看得清楚','浅色、深色页面，都有合适的配色'],
    menuAside:['每一边的统计','都可以自己选'],
    sample:'真实扩展演示 · 示例数据',
    tagline:'网页表格，随选随算',cta:'在 Chrome 应用商店安装',
  },
  en:{
    select:['Need a quick total?','Select cells. See statistics on all four sides.'],
    menu:['Choose a calculation by name','Sum, average, minimum or maximum.'],
    resize:['Adjust the range, right here.','Grab a corner. Include exactly the cells you need.'],
    copy:['Copy when you need it.','Take the selected cells with you.'],
    themes:['Clear on light and dark pages.','Designed palettes that fit the page background.'],
    menuAside:['Each edge.','Your calculation.'],
    sample:'Actual extension · Sample data',
    tagline:'Quick statistics. Right on the page.',cta:'Get HiTable for Chrome',
  }
};

export type ShotProps={id:typeof SHOTS[number]['id'];locale?:Locale;title?:string;subtitle?:string;stepLabel?:string;};
export const Shot:React.FC<ShotProps>=({id,locale='zh_CN',title,subtitle,stepLabel})=>{
  const frame=useCurrentFrame();
  const t=TEXT[locale];
  const show=interpolate(frame,[0,20],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp',easing:Easing.bezier(.16,1,.3,1)});
  if(id==='brand') return <AbsoluteFill style={{background:INK,color:'#fff',fontFamily:FONT,alignItems:'center',justifyContent:'center'}}>
    <div style={{display:'flex',alignItems:'center',gap:32,opacity:show,transform:`translateY(${(1-show)*16}px)`}}>
      <Img src={staticFile('logo.png')} style={{width:118,height:118,objectFit:'contain'}}/>
      <span style={{fontFamily:'Instrument Sans',fontWeight:700,fontSize:150,letterSpacing:-5}}>HiTable</span>
    </div>
    <div style={{fontSize:locale==='en'?64:76,marginTop:50,fontWeight:500,letterSpacing:locale==='en'?-1:3}}>{title||t.tagline}</div>
    <div style={{fontSize:locale==='en'?48:42,color:'#CBE5D4',marginTop:46}}>{subtitle||t.cta}</div>
    <div style={{position:'absolute',bottom:95,fontSize:40,color:'#B6C7BC',letterSpacing:.3}}>xingyu.wang/extensions/hitable</div>
  </AbsoluteFill>;
  const copy=t[id];
  const index=SHOTS.findIndex(s=>s.id===id)+1;
  const caption=title||copy[0];
  const sub=subtitle||copy[1];
  return <AbsoluteFill style={{background:PAPER,color:INK,fontFamily:FONT}}>
    <div style={{position:'absolute',top:49,left:80,right:80,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
      <div style={{display:'flex',alignItems:'center',gap:16}}><Img src={staticFile('logo.png')} style={{width:42,height:42}}/><span style={{fontFamily:'Instrument Sans',fontSize:44,fontWeight:700,letterSpacing:-1}}>HiTable</span></div>
      <span style={{fontSize:44,color:'#52645A',fontVariantNumeric:'tabular-nums'}}>{stepLabel||`0${index} / 05`}</span>
    </div>
    <div style={{position:'absolute',top:131,left:80,right:80,fontSize:locale==='en'?68:76,fontWeight:650,letterSpacing:locale==='en'?-1.4:1,lineHeight:1.15,opacity:show,transform:`translateY(${(1-show)*12}px)`}}>{caption}</div>
    <div style={{position:'absolute',top:235,left:83,right:80,fontSize:locale==='en'?46:38,lineHeight:1.2,color:'#52645A',opacity:show}}>{sub}</div>
    <div style={{position:'absolute',left:80,top:300,width:1760,height:700,border:'1px solid #CCD7CE',borderRadius:18,overflow:'hidden',background:id==='themes'?'#E4F0FF':'#E8F8E8'}}>
      {id==='menu'?<>
        <div style={{position:'absolute',left:94,top:220,fontSize:locale==='en'?64:58,lineHeight:1.5,fontWeight:550,color:GREEN}}>{t.menuAside[0]}<br/>{t.menuAside[1]}</div>
        <OffthreadVideo muted src={staticFile(`captures/${locale}-${id}${locale==='en'?'-compact':''}.mp4`)} style={{position:'absolute',right:30,top:0,width:950,height:700,objectFit:'contain'}}/>
      </>:id==='themes'?<>
        <Img src={staticFile(`captures/${locale}-light.png`)} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'contain'}}/>
        <Img src={staticFile(`captures/${locale}-dark.png`)} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'contain',opacity:interpolate(frame,[78,102],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'})}}/>
      </>:<OffthreadVideo muted src={staticFile(`captures/${locale}-${id}.mp4`)} style={{width:'100%',height:'100%',objectFit:'contain'}}/>}
    </div>
    <div style={{position:'absolute',left:83,bottom:28,color:'#52645A',fontSize:locale==='en'?46:34}}>{t.sample}</div>
    <div style={{position:'absolute',right:83,bottom:28,color:GREEN,fontSize:locale==='en'?46:34}}>hitable</div>
  </AbsoluteFill>;
};

export const Main:React.FC<{locale?:Locale;short?:boolean}>=({locale='zh_CN',short=false})=>{
  const shots=short?[
    {id:'select' as const,from:0,duration:150},
    {id:'resize' as const,from:150,duration:150},
    {id:'brand' as const,from:300,duration:150}
  ]:SHOTS;
  return <AbsoluteFill>{shots.map((s,i)=><Sequence key={s.id} from={s.from} durationInFrames={s.duration}><Shot id={s.id} locale={locale} stepLabel={short&&s.id!=='brand'?`0${i+1} / 02`:undefined}/></Sequence>)}</AbsoluteFill>;
};
export const MainZh:React.FC=()=> <Main/>;
