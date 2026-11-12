const {execFileSync}=require('node:child_process');
const path=require('node:path');
const fs=require('node:fs');
const cli=path.join(path.dirname(require.resolve('@remotion/cli/package.json')),'remotion-cli.js');
const out=path.resolve(__dirname,'../media');fs.mkdirSync(out,{recursive:true});
for(const locale of ['zh-CN','en']) for(const length of ['45s','15s']){
  const name=`hitable-${locale}-${length}.mp4`;
  execFileSync(process.execPath,[cli,'render','src/index.ts',`HiTable-${locale}-${length}`,path.join(out,name),'--codec=h264','--crf=17','--pixel-format=yuv420p','--gl=angle','--log=error'],{cwd:__dirname,stdio:'inherit'});
  console.log(name);
}
