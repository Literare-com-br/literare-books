// Minimal Office Open XML workbook, ZIP STORE (no compression dependency).
// Every cell is an inline string, never a formula. Loaded only on XLSX export.
const encoder=new TextEncoder();
const xml=(value:string)=>[...value].filter(c=>{const n=c.codePointAt(0)!;return n===9||n===10||n===13||(n>=32&&n<=0xd7ff)||(n>=0xe000&&n<=0xfffd)||(n>=0x10000&&n<=0x10ffff);}).join('').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
function column(index:number){let result='';do{result=String.fromCharCode(65+index%26)+result;index=Math.floor(index/26)-1;}while(index>=0);return result;}
function crc32(bytes:Uint8Array){let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
function record(size:number){const bytes=new Uint8Array(size),view=new DataView(bytes.buffer);return {bytes,u16:(at:number,n:number)=>view.setUint16(at,n,true),u32:(at:number,n:number)=>view.setUint32(at,n,true)};}
export function contactsWorkbook(rows:string[][]):Uint8Array<ArrayBuffer> {
  if(rows.length>1048576)throw new Error('Limite de linhas do Excel excedido.');
  const sheet=rows.map((row,i)=>`<row r="${i+1}">${row.map((text,j)=>`<c r="${column(j)}${i+1}" t="inlineStr"><is><t xml:space="preserve">${xml(text)}</t></is></c>`).join('')}</row>`).join('');
  const files:Record<string,string>={
    '[Content_Types].xml':'<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
    '_rels/.rels':'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    'xl/workbook.xml':'<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Contatos" sheetId="1" r:id="rId1"/></sheets></workbook>',
    'xl/_rels/workbook.xml.rels':'<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
    'xl/worksheets/sheet1.xml':`<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" state="frozen"/></sheetView></sheetViews><sheetData>${sheet}</sheetData><autoFilter ref="A1:G${Math.max(rows.length,1)}"/></worksheet>`,
  };
  const local:Uint8Array[]=[],central:Uint8Array[]=[];let offset=0,centralSize=0;
  for(const [name,value]of Object.entries(files)){
    const path=encoder.encode(name),data=encoder.encode(value),crc=crc32(data);
    const h=record(30+path.length);h.u32(0,0x04034b50);h.u16(4,20);h.u32(14,crc);h.u32(18,data.length);h.u32(22,data.length);h.u16(26,path.length);h.bytes.set(path,30);local.push(h.bytes,data);
    const c=record(46+path.length);c.u32(0,0x02014b50);c.u16(4,20);c.u16(6,20);c.u32(16,crc);c.u32(20,data.length);c.u32(24,data.length);c.u16(28,path.length);c.u32(42,offset);c.bytes.set(path,46);central.push(c.bytes);centralSize+=c.bytes.length;offset+=h.bytes.length+data.length;
  }
  const end=record(22);end.u32(0,0x06054b50);end.u16(8,central.length);end.u16(10,central.length);end.u32(12,centralSize);end.u32(16,offset);
  const result=new Uint8Array(offset+centralSize+22);let at=0;for(const part of [...local,...central,end.bytes]){result.set(part,at);at+=part.length;}return result;
}
