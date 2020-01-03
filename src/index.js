const express = require('express');
const fetch = require('node-fetch');
const xml2js = require('xml2js');
const moment = require('moment');
const _ = require('lodash');

const {
  IPTV_DOMAIN,
  IPTV_PORT,
  IPTV_USERNAME,
  IPTV_PASSWORD,
  IPTV_PROTOCOL = 'http',
  PORT = '1234',
} = process.env;

const stringsToReplace = [
  { src: /^VIP/g, dst: '' },
  { src: /SD/g, dst: '' },
  { src: /FHD/g, dst: 'HD' },
  { src: /\[[^\]]+\]/g, dst: ''},
  { src: /YLE/g, dst: 'Yle' },
];

const iconsToDelete = [
  '[',
  '[]',
  '["',
  '[""]',
]

const dateFormat = 'YYYYMMDDHHmmss ZZ';
const credentials = `username=${IPTV_USERNAME}&password=${IPTV_PASSWORD}`;
const baseUri = `${IPTV_PROTOCOL}://${IPTV_DOMAIN}:${IPTV_PORT}`;
const panelUri = `${baseUri}/panel_api.php?${credentials}`;
const xmltvUri = `${baseUri}/xmltv.php?${credentials}`;
const logoRepo = 'https://github.com/zag2me/TheLogoDB/raw/master/Images';

function stringOrUndefined(str) {
  if (!str || !str.length) {
    return undefined;
  }

  return str;
}

function parseStreamIcon(iconUrl) {
  if (iconsToDelete.indexOf(iconUrl) !== -1) {
    return undefined;
  }

  return stringOrUndefined(iconUrl);
}

function mapNullString(str, mapped) {
  return new RegExp(/^null$/gi).test(str) ? mapped : str;
}

function createStreamIcon(channelName) {
  const logoName = (channelName.split(": ")[1] || channelName).trim().replace(/ /g, '_');
  return `${logoRepo}/${logoName}.png`
}

function parseChannelName(rawName) {
  let channelName = rawName;
  stringsToReplace.forEach((replacement) => {
    channelName = channelName.replace(replacement.src, replacement.dst).trim();
  })

  return channelName;
}

function sortChannels(lhs, rhs) {
  const lhsName = parseChannelName(lhs.name);
  const rhsName = parseChannelName(rhs.name);

  if (lhsName < rhsName) {
    return -1;
  }
  else if (lhsName > rhsName) {
    return 1;
  }

  return 0;
}

async function createPlaylist({ available_channels }) {
  const playlistLines = ['#EXTM3U'];

  const sortedChannels = _.sortBy(available_channels, [it => parseChannelName(it.name)]);
  _.forEach(sortedChannels, (channel) => {
    const { name: rawName, category_name, stream_id, epg_channel_id, num, stream_icon } = channel;

    const channelName = parseChannelName(rawName);
    const streamIcon = parseStreamIcon(stream_icon) || createStreamIcon(channelName);
    const streamUri = `${baseUri}/${IPTV_USERNAME}/${IPTV_PASSWORD}/${stream_id}`

    const args = {
      'channel-id': num,
      'tvg-id': stringOrUndefined(mapNullString(epg_channel_id, undefined)),
      'tvg-name': channelName,
      'tvg-logo': streamIcon,
      'channel-id': channelName,
      'group-title': stringOrUndefined(mapNullString(category_name, undefined)),
    }

    const argsString = _.reduce(args, (str, key, val) => `${str} ${val}="${key}"`, '').trim();
    playlistLines.push(`#EXTINF:0 ${argsString},${channelName}`);
    playlistLines.push(streamUri);
  });

  return playlistLines.join('\n');
}

async function createEPG(inputXmlString) {
  const json = await xml2js.parseStringPromise(inputXmlString);
  json.tv.channel.forEach((channel) => {
    if (channel.icon) {
      const icon = channel['icon'][0];
      const attrs = icon['$'];

      if (!parseStreamIcon(attrs.src)) {
        const rawName = channel['display-name'][0];
        const channelName = parseChannelName(rawName);
        attrs.src = createStreamIcon(channelName);
      }
    }
  });

  json.tv.programme.forEach((programme) => {
    const attrs = programme['$'];
    attrs.start = moment(attrs.start, dateFormat).format(dateFormat);
    attrs.stop = moment(attrs.stop, dateFormat).format(dateFormat);
  });
  
  const builder = new xml2js.Builder();
  return builder.buildObject(json);
}

function channels(req, res) {
  fetch(panelUri)
    .then(result => result.json())
    .then(data => createPlaylist(data))
    .then((playlist) => {
      res.setHeader('Content-Type', 'audio/x-mpegurl');
      res.send(playlist);
    })
    .catch(err => console.log(err));
}

function xmltv(req, res) {
  fetch(xmltvUri)
    .then(result => result.text())
    .then(data => createEPG(data))
    .then((epg) => {
      res.setHeader('Content-Type', 'application/xml');
      res.send(epg);
    })
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
