'use strict';
const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '../apps/server/index.js');
const propsPath = path.join(__dirname, '../apps/server/src/socket/socket-context-props.txt');
const tailPath = path.join(__dirname, 'patch-index-runtime-tail.js');

let text = fs.readFileSync(indexPath, 'utf8');
const props = fs.readFileSync(propsPath, 'utf8');
const runtimeTail = fs.readFileSync(tailPath, 'utf8');

const socketStart = text.indexOf('registerSocketHandlers(createSocketDeps({');
if (socketStart < 0) throw new Error('socket block not found');

const socketBlock = `let _playerVisibleZombies;
let _rebuildPlayerSpatialGrid;
let _broadcastPlayerMove;

registerSocketHandlers(createGameSocketBindings(() => buildGameSocketContext({
${props}
  getWorldTime,
})));

`;

const bootLines = `_getScenarioBeach().catch((err) => log.error('boot', 'scenario beach init failed', { err: err.message }));
serverRcon.startRconBoot();

`;

const newTail = bootLines + runtimeTail;
text = text.slice(0, socketStart) + socketBlock + newTail;
fs.writeFileSync(indexPath, text);
console.log('patched index.js', text.split('\n').length, 'lines');
