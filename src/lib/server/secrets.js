const encoder=new TextEncoder();
function decode(value){return Uint8Array.from(atob(value),c=>c.charCodeAt(0));}
function encode(value){return btoa(String.fromCharCode(...new Uint8Array(value)));}
async function key(value){try{const bytes=decode(value);if(bytes.length!==32)throw new Error();return await crypto.subtle.importKey('raw',bytes,'AES-GCM',false,['encrypt','decrypt']);}catch{throw new Error('credential_key_unavailable');}}
export async function sealSecret(value,nodeId,masterKey){const iv=crypto.getRandomValues(new Uint8Array(12));const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode(nodeId)},await key(masterKey),encoder.encode(value));return ['v1',encode(iv),encode(encrypted)].join('.');}
export async function openSecret(ciphertext,nodeId,masterKey){try{const [version,iv,data]=ciphertext.split('.');if(version!=='v1')throw new Error();const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(iv),additionalData:encoder.encode(nodeId)},await key(masterKey),decode(data));return new TextDecoder().decode(plain);}catch{throw new Error('credential_unavailable');}}
