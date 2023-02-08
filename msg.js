const routes = require('express').Router();
const Rabbit = require('./rabbit');
const fs = require('fs');

const queue = new Rabbit('data');

queue.listen(async (msg) => {
  let data = await fs.readFileSync('./data.json', 'utf8');
  data = JSON.parse(data);
  data.push(msg);

  await fs.writeFileSync('./data.json', JSON.stringify(data, null, 2), 'utf8');
});


routes.post('/publish', async (req, res) => {
  try {
    await queue.publish(req.attrs);
    res.send('Published');
  } catch (e) {
    console.log(e);
    res.send(e.message)
  }
});

module.exports = routes;
