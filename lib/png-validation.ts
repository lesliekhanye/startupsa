/** Validate the complete PNG container and bounded decoded scanlines; strip metadata. */
export async function validateLogo(content: Uint8Array): Promise<Uint8Array> {
 const invalid = () => { throw new Error('Invalid logo.'); };
 if (content.length < 57 || content.length > 1048576 || ![137,80,78,71,13,10,26,10].every((v,i)=>content[i]===v)) return invalid();
 const view = new DataView(content.buffer, content.byteOffset, content.byteLength);
 let offset=8,width=0,height=0,channels=0,ended=false,dataEnded=false;
 const parts: Uint8Array[]=[content.slice(0,8)], compressed: Uint8Array[]=[];
 while(offset<content.length){
  if(offset+12>content.length)return invalid();
  const length=view.getUint32(offset), end=offset+12+length;
  if(end>content.length)return invalid();
  const type=String.fromCharCode(...content.slice(offset+4,offset+8));
  let crc=0xffffffff;
  for(const byte of content.subarray(offset+4,end-4)){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}
  if(((crc^0xffffffff)>>>0)!==view.getUint32(end-4))return invalid();
  if(offset===8&&type!=='IHDR')return invalid();
  if(type==='IHDR'){
   if(offset!==8||length!==13)return invalid();
   width=view.getUint32(offset+8);height=view.getUint32(offset+12);const depth=content[offset+16],color=content[offset+17];
   if(!width||!height||width>1024||height>1024||depth!==8||![2,6].includes(color)||content[offset+18]||content[offset+19]||content[offset+20])return invalid();
   channels=color===6?4:3;parts.push(content.slice(offset,end));
  }else if(type==='IDAT'){
   if(dataEnded||!length)return invalid();compressed.push(content.slice(offset+8,end-4));parts.push(content.slice(offset,end));
  }else if(type==='IEND'){
   if(length||!compressed.length||end!==content.length)return invalid();parts.push(content.slice(offset,end));ended=true;
  }else{
   if(compressed.length)dataEnded=true;
   // Strip ancillary metadata (including browser color profiles); reject animation and unknown critical chunks.
   if(!/^[A-Za-z]{4}$/.test(type)||type[0]===type[0].toUpperCase()||['acTL','fcTL','fdAT'].includes(type))return invalid();
  }
  offset=end;
 }
 if(!ended)return invalid();
 const stream=new Blob(compressed as BlobPart[]).stream().pipeThrough(new DecompressionStream('deflate')).getReader();
 const stride=width*channels+1,expected=stride*height;let size=0;
 try{while(true){const {value,done}=await stream.read();if(done)break;if(size+value.length>expected){await stream.cancel();return invalid()}for(let i=0;i<value.length;i++)if((size+i)%stride===0&&value[i]>4)return invalid();size+=value.length}}finally{stream.releaseLock()}
 if(size!==expected)return invalid();
 const clean=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let position=0;for(const part of parts){clean.set(part,position);position+=part.length}return clean;
}
