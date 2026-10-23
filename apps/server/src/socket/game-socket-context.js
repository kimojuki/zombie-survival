'use strict';

function buildGameSocketContext(d) {
  const { getWorldTime, serverRcon, ...rest } = d;
  return {
    ...rest,
    _worldTime: getWorldTime,
    get rcon() { return serverRcon.getRcon(); },
  };
}

module.exports = { buildGameSocketContext };
