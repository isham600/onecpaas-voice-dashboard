// Display-name overrides for channel names coming from the DB (channels table,
// fund service names). Lets us rename channels without touching stored data.
const CHANNEL_NAME_MAP = {
  "GSM SIM": "GSM SMS",
};

export const displayChannelName = (name) => CHANNEL_NAME_MAP[name] ?? name;

export default displayChannelName;
