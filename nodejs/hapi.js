'use strict';

const Hapi = require('hapi');
const Joi = require('joi');
const Boom = require('boom');

const launchServer = async function(mongoUrl){
  // MongoDB connection string
  const dbOpts = {
    url: mongoUrl, //'mongodb://localhost:27017/test',
    settings: {
        poolSize: 10
    },
    decorate: true,
  };

const server = new Hapi.Server({ port: process.env.PORT || 4004 });
//server.connection({ port: process.env.PORT || 4004 });

await server.register({
  plugin: require('hapi-mongodb'),
  options: dbOpts
});

var getDownlinkData = function(incoming){
  /*
   *
   * Insert here your own code, to send back the relevant 8-byte frame
   *
   */

  //In this example, we're just sending back a 'random' string
  return require('child_process').execSync('head /dev/urandom | LC_CTYPE=C tr -dc a-f0-9 | head -c 16', {encoding:'utf-8'});
};

var downlinkHandler = async (request, reply) => {
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
  console.log(`Sending message to device with deviceID: ${request.payload.deviceId}\n`)
  console.log(`Payload: ${JSON.stringify(request.payload)}`)

  const db = request.mongo.db;

  try {
    console.log('Sending data to mongodb')
    const result = await db.collection('sigfox').insert(request.payload);
    console.log(`MongodDB result: ${JSON.stringify(result)}`)
    //return result;
  }
  catch (err) {
    console.log(`Error: ${err}`)
    throw Boom.internal('Internal MongoDB error', err);
  }

  /*
   * Reply with the proper JSON format.
   * The _downlinkData_ will be sent to the device
   **/
  return {
    [request.payload.deviceId]: {
      "downlinkData":payload//getDownlinkData(request.payload)
    }
  }
  /*reply({
    [request.payload.deviceId]: {
      "downlinkData":payload//getDownlinkData(request.payload)
    }
  });*/
};
var downlinkConfig = {
  handler: downlinkHandler,
  validate: {
      payload: {
        deviceId: Joi.string().hex().required(),
        data: Joi.string().hex().max(24),
        rssi_bs: Joi.string(),
        duplicate: Joi.string(),
        snr_bs: Joi.string(),
        avgSnr_bs: Joi.string(),
        station: Joi.string(),
        lat_bs: Joi.string(),
        lng_bs: Joi.string(),
        seqNumber: Joi.string()
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

await server.start((err) => {
  if (err) {
        throw err;
    }
    console.log('info', 'Server running at: ' + server.info.uri);
});
}

var program = require('commander');

program
  .version('0.0.1')
  .option('-u, --mongo-url <n>', 'Specifies the connection url for MongoDB')
  .parse(process.argv);

if(program.mongoUrl){
  console.log("MongoURL: " + program.mongoUrl)
  launchServer(program.mongoUrl).catch((err) => {
    console.error(err);
    process.exit(1);
  });
} else {
  console.log("Cannot start server because MonogURL is missing!")
  process.exit(1);
}