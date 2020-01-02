const express = require('express');
const fetch = require('node-fetch');

const {
  IPTV_DOMAIN,
  IPTV_PORT,
  IPTV_USERNAME,
  IPTV_PASSWORD,
  IPTV_PROTOCOL = 'http',
  IPTV_EXTENSION = 'ts',
  PORT = '1234',
  FILENAME = 'channels.m3u8',
} = process.env || {};

async function process(_, res) {
  const baseUri = `${IPTV_PROTOCOL}://${IPTV_DOMAIN}:${IPTV_PORT}`
  const panelUri = `${baseUri}/panel_api.php?username=${IPTV_USERNAME}&password=${IPTV_PASSWORD}`
  const { available_channels } = await fetch(panelUri).then(result => result.json());

  res.write(`#EXTM3U\n`);
  for (const channel_id in available_channels) {
    const { name, stream_icon, category_name, stream_type, stream_id } = available_channels[channel_id];

    res.write(`#EXTINF:0 channel-id="${channel_id}" tvg-id="${name}" tvg-logo="${stream_icon}" channel-id="${name}" group-title="${category_name}|${stream_type}",${name}\n`);
    res.write(`${baseUri}/${stream_type}/${IPTV_USERNAME}/${IPTV_PASSWORD}/${stream_id}.${IPTV_EXTENSION}\n`);
  }

  res.end();
}

function main() {
  const app = new express();

  app.use(`/${FILENAME}`, process);
  app.listen(PORT, () => {
    console.log(`Running on port ${PORT}`);
  })
}

main();