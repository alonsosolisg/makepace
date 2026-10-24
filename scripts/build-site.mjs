// Generate a static hosting bundle. Never include the local server or user data.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'dist/site');
await fs.mkdir(path.join(out,'landing'),{recursive:true});
await fs.mkdir(path.join(out,'__studio/fonts'),{recursive:true});
await fs.copyFile(path.join(root,'landing/index.html'),path.join(out,'index.html'));
for(const file of ['style.css','downloads.js','powerhouse-v1.webp','releases.json'])await fs.copyFile(path.join(root,'landing',file),path.join(out,'landing',file));
for(const file of ['mark.svg','phosphor.svg','fonts/manrope-variable.ttf','fonts/OFL.txt','PHOSPHOR-LICENSE.txt'])await fs.copyFile(path.join(root,'scripts/studio/public',file),path.join(out,'__studio',file));
if(process.argv[2]){
 const input=path.resolve(process.argv[2]),version=JSON.parse(await fs.readFile(path.join(root,'package.json'))).version;
 const files=await fs.readdir(input),downloads={},checksums=[];
 await fs.mkdir(path.join(out,'downloads'),{recursive:true});
 for(const [key,suffix] of [['windows-x64','win-x64.exe'],['macos-arm64','mac-arm64.dmg'],['macos-x64','mac-x64.dmg'],['linux-x64','linux-x86_64.AppImage']]){
  const name=`MakePace-${version}-${suffix}`;
  if(!files.includes(name))throw Error('Missing installer: '+name);
  const bytes=await fs.readFile(path.join(input,name));if(bytes.length<1000000)throw Error('Installer is unexpectedly small: '+name);
  await fs.copyFile(path.join(input,name),path.join(out,'downloads',name));
  downloads[key]='/downloads/'+name;checksums.push(createHash('sha256').update(bytes).digest('hex')+'  '+name);
 }
 await fs.writeFile(path.join(out,'landing/releases.json'),JSON.stringify({version,downloads},null,2));
 await fs.writeFile(path.join(out,'downloads/SHA256SUMS.txt'),checksums.join('\n')+'\n');
}
console.log('Static hosting bundle: '+out);
