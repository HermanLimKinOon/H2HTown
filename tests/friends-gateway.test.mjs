import assert from 'node:assert/strict';
import test from 'node:test';
import {routeFriendsRequest} from '../server/friends/gateway.mjs';

test('friends gateway forwards only required game APIs and realtime sockets',()=>{
 assert.deepEqual(routeFriendsRequest('POST','/supabase/rest/v1/rpc/mmo_connect'),{kind:'supabase',path:'/rest/v1/rpc/mmo_connect'});
 assert.equal(routeFriendsRequest('POST','/supabase/auth/v1/signup').kind,'supabase');
 assert.equal(routeFriendsRequest('GET','/supabase/realtime/v1/websocket?apikey=public',true).kind,'supabase');
 assert.deepEqual(routeFriendsRequest('POST','/multiplayer/matchmake/joinOrCreate/h2h_world'),{kind:'multiplayer',path:'/matchmake/joinOrCreate/h2h_world'});
 assert.equal(routeFriendsRequest('GET','/multiplayer/process/room?sessionId=abc',true).kind,'multiplayer');
});
test('friends gateway refuses administration, tables, source, maps, traversal and 2D routes',()=>{
 for(const path of ['/game','/game/','/src/main.tsx','/.env','/assets/a.js.map','/supabase/auth/v1/admin/users','/supabase/rest/v1/users','/supabase/rest/v1/rpc/other_function','/supabase/storage/v1/object/private/a','/supabase/realtime/v1/api/tenants','/multiplayer/admin','/assets/%2e%2e/.env'])assert.equal(routeFriendsRequest('GET',path).kind,'deny',path);
 assert.equal(routeFriendsRequest('DELETE','/supabase/rest/v1/rpc/mmo_connect').kind,'deny');
 assert.equal(routeFriendsRequest('GET','/game-3d').kind,'static');
 assert.equal(routeFriendsRequest('GET','/game3d/characters/a.glb').kind,'static');
 assert.equal(routeFriendsRequest('GET','/assets/main.js').kind,'static');
 assert.equal(routeFriendsRequest('GET','/game/items/hoe.svg').kind,'static','3D hotbar reuses shared item artwork');
 assert.equal(routeFriendsRequest('GET','/game/README.md').kind,'deny');
});
test('website login and member registration routes are available without exposing admin APIs',()=>{
 for(const path of ['/members/register','/members/profile'])assert.deepEqual(routeFriendsRequest('GET',path),{kind:'static',path:'/index.html'});
 for(const path of ['otp','verify','recover','resend'])assert.equal(routeFriendsRequest('POST',`/supabase/auth/v1/${path}`).kind,'supabase');
 assert.equal(routeFriendsRequest('GET','/supabase/auth/v1/authorize?provider=google').kind,'supabase');
 assert.equal(routeFriendsRequest('PUT','/supabase/auth/v1/user').kind,'supabase');
 for(const rpc of ['get_member_profile','register_member','register_guest_member','is_admin'])assert.equal(routeFriendsRequest('POST',`/supabase/rest/v1/rpc/${rpc}`).kind,'supabase');
 assert.equal(routeFriendsRequest('GET','/supabase/auth/v1/admin/users').kind,'deny');
});
test('game cart can load public products and reach existing H2H checkout without opening catalogue writes',()=>{
 for(const path of ['/cart','/payment/return','/shop'])assert.deepEqual(routeFriendsRequest('GET',path),{kind:'static',path:'/index.html'});
 assert.deepEqual(routeFriendsRequest('GET','/supabase/rest/v1/products?select=*&active=eq.true'),{kind:'supabase',path:'/rest/v1/products?select=*&active=eq.true'});
 assert.equal(routeFriendsRequest('POST','/supabase/rest/v1/rpc/get_best_selling_product_ids').kind,'supabase');
 assert.equal(routeFriendsRequest('POST','/supabase/functions/v1/rm-create-payment').kind,'supabase');
 for(const method of ['POST','PATCH','DELETE'])assert.equal(routeFriendsRequest(method,'/supabase/rest/v1/products').kind,'deny');
 assert.equal(routeFriendsRequest('POST','/supabase/functions/v1/other-function').kind,'deny');
});
