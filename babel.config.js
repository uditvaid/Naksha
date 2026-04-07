module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './src',
            '@components': './src/components',
            '@constants': './src/constants',
            '@services': './src/services',
            '@store': './src/store',
            '@utils': './src/utils',
            '@hooks': './src/hooks',
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
