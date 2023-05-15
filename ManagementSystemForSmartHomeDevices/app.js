const mqtt = require('mqtt');
const sqlite3 = require('sqlite3');

const broker = mqtt.connect('mqtt://192.168.1.164');
const zigbeeClient = mqtt.connect('mqtt://192.168.1.164:1883')
const db = new sqlite3.Database('data.db');

var deviceList = [];

zigbeeClient.subscribe('tele/tasmota/#')

zigbeeClient.on('message', (topic, message) => {
  console.log(`Zigbee Received message from ${topic.toString()}: `)

  if(topic.toString().includes("SENSOR") || topic.toString().includes("STATE")){
    const data = message.toString();
    const parsedData = JSON.parse(data);

    ConvertToDevice(parsedData);
    console.log('parsed data:');
    console.log(parsedData);
  }
  else {
    console.log(`${message.toString()}`);
  }
})


broker.subscribe('tasmota/#');
let data;
broker.on('message', (topic, message) => {
  const data = message.toString();
  console.log(`Received message from ${topic}}`)

  const parsedData = JSON.parse(data);

  console.log(parsedData);
  });


function ConvertToDevice(deviceData){
  console.log("DEVICE DATAAAA:  ");
  let dev = Object.values(deviceData);
  console.log(dev);
  let firstKey = Object.keys(dev)[0];
  let zbReceivedObj = dev[firstKey];
  let obj = Object.values(zbReceivedObj);
  let device = {
    Device: obj.Device,
    Power: obj.Power
  }

  console.log("DEVICE  :  ");
  console.log(device);

  deviceList.push(device);
  console.log("DEVICE LIST:  ");
  console.log(deviceList);
  }
  

 
