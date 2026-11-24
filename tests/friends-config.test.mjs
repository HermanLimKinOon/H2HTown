import assert from 'node:assert/strict';
import test from 'node:test';
import {validFriendsOrigin,parseNamedTunnel} from '../server/friends/config.mjs';
test('named tunnel origin must be an exact public HTTPS origin',()=>{
 for(const origin of ['https://play.h2haigroup.com','https://a.trycloudflare.com'])assert.equal(validFriendsOrigin(origin),true);
 for(const origin of ['http://play.h2haigroup.com','https://play.h2haigroup.com/path','https://user@play.h2haigroup.com','https://localhost','https://127.0.0.1','https://play.h2haigroup.com:3002','https://*.h2haigroup.com'])assert.equal(validFriendsOrigin(origin),false,origin);
});
test('persistent tunnel configuration reuses its hostname and requires a local credential file',()=>{
 const config={origin:'https://play.h2haigroup.com',tunnelId:'fa3cf074-6fd0-486a-959b-810e31aeaa3d',tokenFile:'.local/friends-tunnel-token'};
 assert.deepEqual(parseNamedTunnel(config),config);
 for(const change of [{origin:'http://insecure.example'},{tunnelId:'invalid'},{tokenFile:'../secret'},{tokenFile:'/etc/passwd'}])assert.throws(()=>parseNamedTunnel({...config,...change}));
});
