const {execFileSync}=require('node:child_process');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const config=require('./store-film.json');
const cli=path.join(path.dirname(require.resolve('@remotion/cli/package.json')),'remotion-cli.js');
const out=path.resolve(__dirname,'../media');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'hitable-store-render-'));
const seconds=config.totalFrames/config.fps;
try{
  const track=path.join(tmp,'music.m4a');
  execFileSync('ffmpeg',['-y','-v','error','-i',path.join(__dirname,'public',config.music),'-af',`atrim=duration=${seconds},asetpts=PTS-STARTPTS,volume=${config.gainDb}dB,afade=t=in:st=0:d=${config.fadeInFrames/config.fps},afade=t=out:st=${seconds-config.fadeOutFrames/config.fps}:d=${config.fadeOutFrames/config.fps}`,'-ar','48000','-ac','2','-c:a','aac','-b:a','192k',track],{stdio:'inherit'});
  for(const locale of ['zh-CN','en']){
    const silent=path.join(out,`hitable-${locale}-store-no-music.mp4`);
    execFileSync(process.execPath,[cli,'render','src/index.ts',`HiTable-${locale}-store`,silent,'--props='+JSON.stringify({locale:locale==='zh-CN'?'zh_CN':'en',bgm:false}),'--codec=h264','--crf=17','--pixel-format=yuv420p','--gl=angle','--log=error'],{cwd:__dirname,stdio:'inherit'});
    execFileSync('ffmpeg',['-y','-v','error','-i',silent,'-i',track,'-map','0:v:0','-map','1:a:0','-c','copy','-t',String(seconds),'-movflags','+faststart','-metadata','comment=Music: Carefree by Kevin MacLeod (incompetech.com), CC BY 4.0 https://creativecommons.org/licenses/by/4.0/ . Excerpted, level adjusted and faded.',path.join(out,`hitable-${locale}-store.mp4`)],{stdio:'inherit'});
    console.log(`Rendered ${locale}: ${seconds}s cover + demo, with music and identical no-music backup.`);
  }
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
