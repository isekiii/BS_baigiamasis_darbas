const express = require('express');
const sqlite3 = require('sqlite3');
const bodyParser = require('body-parser');
const mqtt = require('mqtt');
const http = require('http');

const zigbeeClient = mqtt.connect('mqtt://192.168.1.164:1883')

const app = express();
const db = new sqlite3.Database('data.db');

var deviceList = [];
var keysList;
var devData;
var dv;

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {

  const sql = 'SELECT * FROM devices';
  db.all(sql, [], (err, rows) => {
    if (err) throw err;

    const data = rows.map(entry => {

      return {
        id: entry.id,
        data: entry.deviceVal
      };
    });
    // get all keys from the data objects

    const jsonObj = JSON.parse(data[0].data);
    const keys = Object.keys(JSON.parse(data[0].data));
    data.map(en => {
      let ob = JSON.parse(en.data);
      ConvertToDevice(JSON.parse(JSON.stringify(ob)));
    });

    const header = `
        <thead>
            <tr>
                <th>ID</th>
                ${keys.map(key => `<th>${key}</th>`).join('')}
                <th>View Data</th>
                <th>Delete</th>
            </tr>
        </thead>
        `;

    const body = `
        <tbody>
        ${data.map(entry => `
            <tr>
                <td>${entry.id}</td>
                ${keys.map(key => `<td>${JSON.parse(entry.data)[key]}</td>`).join('')}
                <td><a href="/view?id=${entry.id}">View Data</a></td>
                <td><a href="/delete?id=${entry.id}"  onclick="return confirm('Are you sure you want to delete this device?');">Delete</a></td>
            </tr>
        `).join('')}
        </tbody>
        `;

    const table = `
        <table>
            ${header}
            ${body}
        </table>
        `;

    res.send(`
      <html>
        <head>
          <title>Management System</title>
          <link rel="stylesheet" href="/styles/styles.css">
          <script>
          setInterval(() => {
            window.location.reload();
          }, 5000);
          </script>
        </head>
        <body>
          <h1>My Devices</h1>
          ${table}
          <p><a href="/add">Add Entry</a></p>
        </body>
      </html>
    `);
  });
});


// View all device data
app.get('/view', (req, res) => {
  const id = req.query.id;
  
  //=================================================================

  db.get(`SELECT * FROM devices WHERE id = ?`, [id], (err, row) => {
    if (err) {
      console.log(err.message);
    } else {
      if (row) {

        devData = row.deviceVal;
       
        dv = JSON.parse(JSON.stringify(JSON.parse(devData.toString())));

        keysList = Object.keys(dv);
    
      const query = 'SELECT * FROM devicedata WHERE deviceVal LIKE ?';
      db.all(query, ['%' + dv.Device + '%'], (err, rows) => {
        if (err) throw err;
    
        const data = rows.map(entry => {
    
          return {
            id: entry.id,
            data: entry.deviceVal,
            timestamp: entry.timestamp
          };
        });
    
        const header = `
            <thead>
                <tr>
                    <th>ID</th>
                    ${keysList.map(key => `<th>${key}</th>`).join('')}
                    <th>TIMESTAMP</th>
                    <th>Delete</th>
                </tr>
            </thead>
            `;
    
        const body = `
            <tbody>
            ${data.map(entry => `
                <tr>
                    <td>${entry.id}</td>
                    ${keysList.map(key => `<td>${JSON.parse(entry.data)[key]}</td>`).join('')}
                    <td>${entry.timestamp}</td>
                    <td><a href="/deletedata?id=${entry.id}" onclick="return confirm('Are you sure you want to delete this entry?');">Delete entry</a></td>
                </tr>
            `).join('')}
            </tbody>
            `;
    
        const table = `
            <table>
                ${header}
                ${body}
            </table>
            `;
    
        res.send(`
          <html>
            <head>
              <title>Device Data</title>
              <link rel="stylesheet" href="/styles/styles.css">
            </head>
            <body>
              <h1>${dv.Device} Device data</h1>
              <p><a href="/">Back</a></p>
              ${table}
              <p><a href="/">Back</a></p>
            </body>
          </html>
        `);
      });

      }
    }
  });

  //=================================================================
  
  

});

// Update an entry
app.post('/update', (req, res) => {
  const id = req.body.id;
  const deviceVal = req.body.deviceVal;
  const sql = 'UPDATE devices SET deviceVal = ? WHERE id = ?';
  db.run(sql, [deviceVal, id], (err) => {
    if (err) throw err;
    res.redirect('/');
  });
});


app.get('/add', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Add Entry</title>
        <link rel="stylesheet" href="/styles/styles.css">
      </head>
      <body>
        <h1>Add Entry</h1>
        <form method="POST" action="/create">
          <label>Values:</label>
          <input type="text" name="deviceVal">
          <button type="submit">Add</button>
        </form>
        <p><a href="/">Back</a></p>
      </body>
    </html>
  `);
});

app.post('/create', (req, res) => {
  const deviceVal = req.body.deviceVal;
  const sql = 'INSERT INTO devices (deviceVal) VALUES (?)';
  db.run(sql, [deviceVal], (err) => {
    if (err) throw err;
    res.redirect('/');
  });
});

app.get('/deletedata', (req, res) => {
  const id = req.query.id;
  const sql = 'DELETE FROM devicedata WHERE id = ?';
  db.run(sql, [id], (err) => {
    if (err) throw err;
    res.redirect('/');
  });
});

app.get('/delete', (req, res) => {
  const id = req.query.id;
  const sql = 'DELETE FROM devices WHERE id = ?';
  db.run(sql, [id], (err) => {
    if (err) throw err;
    res.redirect('/');
  });
});

app.listen(3000, () => {
  console.log('Server started on port 3000.');
});


zigbeeClient.subscribe('tele/tasmota/#')

zigbeeClient.on('message', (topic, message) => {
  console.log(`Zigbee Received message from ${topic.toString()}: `)

  if (topic.toString().includes("SENSOR") || topic.toString().includes("STATE")) {
    const data = message.toString();
    const parsedData = JSON.parse(data);

    console.log('Received from ZB Bridge data:');
    console.log(parsedData);
    //============================================

    console.log("DEVICE DATAAAA:  ");
    let dev = Object.values(parsedData);
    console.log(dev);
    let device = Object.values(dev[0]);
    device = device[0];

    //===============================================
    ConvertToDevice(device);
  }
  else {
    console.log(`${message.toString()}`);
  }
})

function ConvertToDevice(device) {

  console.log("Converting  :  ");
  console.log(device);

  console.log("Has 'Device' key  :  ");
  console.log(device.hasOwnProperty("Device"));

  if (device.hasOwnProperty("Device")) {
    let listContainsThis = false;

    //check if device exists in array
    deviceList.forEach(element => {
      if (element.Device == device.Device) {
        listContainsThis = true;
      }
    });

    //Insert device data to db for safekeeping
    const currentDate = new Date();
    const formattedDate = currentDate.getFullYear() + '-' + (currentDate.getMonth() + 1).toString().padStart(2, '0') + '-' + currentDate.getDate().toString().padStart(2, '0');
    const formattedTime = currentDate.getHours().toString().padStart(2, '0') + ':' + currentDate.getMinutes().toString().padStart(2, '0') + ':' + currentDate.getSeconds().toString().padStart(2, '0');
    let timestamp = formattedDate + ' ' + formattedTime;

    const sql = 'INSERT INTO devicedata (deviceVal, timestamp) VALUES (?,?)';
    db.run(sql, [JSON.stringify(device), timestamp], (err) => {
      if (err) throw err;
    });

    if (!listContainsThis) {
      deviceList.push(device);
      //check if device exists in database, if it doesnt - insert to database
      db.get(`SELECT COUNT(*) AS count FROM devices WHERE deviceVal = ?`, [JSON.stringify(device)], (err, row) => {
        if (err) {
          console.error(err.message);
        } else {
          if (row.count > 0) {
            console.log(`Device already exists in database`);
          } else {
            console.log("Inserting value in database");
            const sql = 'INSERT INTO devices (deviceVal) VALUES (?)';
            db.run(sql, [JSON.stringify(device)], (err) => {
              if (err) throw err;
            });
          }
        }
      });
    }
    else {
      console.log("Device already exists in array, Updating value.. ");
      objIndex = deviceList.findIndex((obj => obj.Device == device.Device));
      deviceList[objIndex] = device;

      db.get(`SELECT * FROM devices WHERE deviceVal LIKE ?`, ['%' + device.Device + '%'], (err, row) => {
        if (err) {
          console.log(err.message);
        } else {
          if (row) {
            // Entry already exists, update it
            db.run(`UPDATE devices SET deviceVal = ? WHERE id = ?`, [JSON.stringify(device), row.id], function (err) {
              if (err) {
                console.log(err.message);
              } else {
                console.log("Updating value in database.. ");
                console.log(`Device updated with ID ${this.lastID}`);
              }
            });
          }
        }
      });

    }
    console.log("DEVICE LIST:  ");
    console.log(deviceList);
  }
}
