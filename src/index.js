const express = require('express');
const fetch = require('node-fetch');
const request = require('request');

const {
  IPTV_DOMAIN,
  IPTV_PORT,
  IPTV_USERNAME,
  IPTV_PASSWORD,
  IPTV_PROTOCOL = 'http',
  PORT = '1234',
} = process.env;

const baseUri = `${IPTV_PROTOCOL}://${IPTV_DOMAIN}:${IPTV_PORT}`;

function channels(_, res) {
  const panelUri = `${baseUri}/panel_api.php?username=${IPTV_USERNAME}&password=${IPTV_PASSWORD}`;
  fetch(panelUri)
    .then(result => result.json())
    .then(({ available_channels }) => {
      res.write(`#EXTM3U\n`);
      for (const channel_id in available_channels) {
        const { name, stream_icon, category_name, stream_type, stream_id, epg_channel_id, num } = available_channels[channel_id];
    
        res.write(`#EXTINF:0 channel-id="${num}" tvg-id="${epg_channel_id}" tvg-name="${name}" tvg-logo="${stream_icon}" channel-id="${name}" group-title="${category_name}|${stream_type}",${name}\n`);
        res.write(`${baseUri}/${IPTV_USERNAME}/${IPTV_PASSWORD}/${stream_id}\n`);
      }
    
      res.end();
    });
}

function xmltv(req, res) {
  const xmltvUri = `${baseUri}/xmltv.php?username=${IPTV_USERNAME}&password=${IPTV_PASSWORD}`;
  req.pipe(request(xmltvUri)).pipe(res);
}

function main() {
  const app = new express();

  app.use('/channels.m3u8', channels);
  app.use('/xmltv.xml', xmltv);

  app.listen(PORT, () => {
    console.log(`Running on port ${PORT}`);
  })
}

main();