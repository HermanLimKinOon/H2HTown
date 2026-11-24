export function validFriendsOrigin(value){
 try{const url=new URL(value);return url.origin===value&&url.protocol==='https:'&&!url.port&&/^(?:[a-z0-9-]+\.)+[a-z][a-z0-9-]*$/i.test(url.hostname);}catch{return false;}
}
export function parseNamedTunnel(value){
 if(!value||!validFriendsOrigin(value.origin)||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.tunnelId)||typeof value.tokenFile!=='string'||!/^\.local\/[a-zA-Z0-9_-]+$/.test(value.tokenFile))throw new Error('Invalid permanent friends tunnel configuration');
 return{origin:value.origin,tunnelId:value.tunnelId,tokenFile:value.tokenFile};
}
