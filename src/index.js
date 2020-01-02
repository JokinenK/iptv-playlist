const express = require('express');
const fetch = require('node-fetch');

const {
  IPTV_DOMAIN,
  IPTV_PORT,
  IPTV_USERNAME,
  IPTV_PASSWORD,
  IPTV_PROTOCOL = 'http',
  PORT = '1234',
} = process.env;

const nameReplacements = [
  { src: /^VIP/g, dst: '' },
  { src: /SD/g, dst: '' },
  { src: /FHD/g, dst: 'HD' },
  { src: /\[[^\]]+\]/g, dst: ''},
  { src: /YLE/g, dst: 'Yle' },
];

const baseUri = `${IPTV_PROTOCOL}://${IPTV_DOMAIN}:${IPTV_PORT}`;
const logoRepo = 'https://github.com/zag2me/TheLogoDB/raw/master/Images';

function channels(_, res) {
  const panelUri = `${baseUri}/panel_api.php?username=${IPTV_USERNAME}&password=${IPTV_PASSWORD}`;
  fetch(panelUri)
    .then(result => result.json())
    .then(({ available_channels }) => {
      res.write(`#EXTM3U\n`);
      for (const channel_id in available_channels) {
        const { name: rawName, category_name, stream_type, stream_id, epg_channel_id, num } = available_channels[channel_id];

        let channelName = rawName;
        nameReplacements.forEach((replacement) => {
          channelName = channelName.replace(replacement.src, replacement.dst).trim();
        })

        const logoName = (channelName.split(": ")[1] || channelName).replace(/ /g, '_');
        const logoUri = `${logoRepo}/${logoName}.png`;
        const streamUri = `${baseUri}/${IPTV_USERNAME}/${IPTV_PASSWORD}/${stream_id}`
   
        res.write(`#EXTINF:0 channel-id="${num}" tvg-id="${epg_channel_id}" tvg-name="${channelName}" tvg-logo="${logoUri}" channel-id="${channelName}" group-title="${category_name}|${stream_type}",${channelName}\n`);
        res.write(`${streamUri}\n`);
      }
    
      res.end();
    })
    .catch(err => console.log(err));
}

function xmltv(_, res) {
  const xmltvUri = `${baseUri}/xmltv.php?username=${IPTV_USERNAME}&password=${IPTV_PASSWORD}`;
  fetch(xmltvUri)
    .then(result => result.text())
    .then(xml => res.send(xml.replace(/\<icon[^\/]+\/>/g, '')))
    .catch(err => console.log(err));
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