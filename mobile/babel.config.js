module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // El plugin de worklets (Reanimated 4) debe ir SIEMPRE el último.
    plugins: ['react-native-worklets/plugin'],
  };
};
