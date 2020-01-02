const express = require('express');
const fetch = require('node-fetch');
const _ = require('lodash');

const {
  IPTV_DOMAIN,
  IPTV_PORT,
  IPTV_USERNAME,
  IPTV_PASSWORD,
  IPTV_PROTOCOL = 'http',
  IPTV_AUDIO_ORDER = 'en,eng,fi,fin,se,swe',
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

function nonNullString(val) {
  return val.toLowerCase() !== 'null' ? val : undefined;
}

function channels(req, res) {
  const panelUri = `${baseUri}/panel_api.php?username=${IPTV_USERNAME}&password=${IPTV_PASSWORD}`;
  fetch(panelUri)
    .then(result => result.json())
    .then(({ available_channels }) => {
      res.write(`#EXTM3U\n`);

      _.forEach(available_channels, (channel) => {
        const { name: rawName, category_name, stream_id, epg_channel_id, num } = channel;

        let channelName = rawName;
        nameReplacements.forEach((replacement) => {
          channelName = channelName.replace(replacement.src, replacement.dst).trim();
        })

        const logoName = (channelName.split(": ")[1] || channelName).replace(/ /g, '_');
        const logoUri = `${logoRepo}/${logoName}.png`;
        const streamUri = `${baseUri}/${IPTV_USERNAME}/${IPTV_PASSWORD}/${stream_id}`
        const channelId = (epg_channel_id || 'null');
        const categoryName = (category_name || 'null');

        const args = {
          'audio-track': IPTV_AUDIO_ORDER,
          'channel-id': num,
          'tvg-id': nonNullString(channelId),
          'tvg-name': channelName,
          'tvg-logo': logoUri,
          'channel-id': channelName,
          'group-title': nonNullString(categoryName),
        }

        const arguments = _.reduce(args, (str, key, val) => `${str} ${val}="${key}"`, '').trim();
        res.write(`#EXTINF:0 ${arguments},${channelName}\n${streamUri}\n`);
      });
    
      res.end();
    })
    .catch(err => console.log(err));
}

function xmltv(req, res) {
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