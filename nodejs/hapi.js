'use strict';

const Hapi = require('hapi');
const Joi = require('joi');
const server = new Hapi.Server();
server.connection({ port: process.env.PORT || 4004 });
var getDownlinkData = function(incoming){
  /*
   *
   * Insert here your own code, to send back the relevant 8-byte frame
   *
   */

  //In this example, we're just sending back a 'random' string
  return require('child_process').execSync('head /dev/urandom | LC_CTYPE=C tr -dc a-f0-9 | head -c 16', {encoding:'utf-8'});
};
var downlinkHandler = (request, reply) => {
  if (request.path.match(/empty/)){
    /*
    * Return Empty response
    * No message will be delivered to the deviceId
    **/
    return reply().code(204);
  }

  //Create an array with the size of 4 bytes initilized with 0
  //var payload = new ArrayBuffer(4)
  var payload ='0123456789abcdef'
  console.log(`Sending message to device with deviceID: ${request.payload.deviceId}`)

  /*
   * Reply with the proper JSON format.
   * The _downlinkData_ will be sent to the device
   **/
  reply({
    [request.payload.deviceId]: {
      "downlinkData":payload//getDownlinkData(request.payload)
    }
  });
};
var downlinkConfig = {
  handler: downlinkHandler,
  validate: {
      payload: {
        deviceId: Joi.string().hex().required(),
        data: Joi.string().hex().max(24)
      }
  }
};
server.route({
    method: 'POST',
    path: '/sigfox-downlink-data',
    config: downlinkConfig
});
server.route({
    method: 'POST',
    path: '/sigfox-downlink-empty',
    config: downlinkConfig
});

server.start((err) => {
  if (err) {
        throw err;
    }
    console.log('info', 'Server running at: ' + server.info.uri);
});
