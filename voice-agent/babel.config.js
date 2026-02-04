module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        alias: {
          '@': './src',
          '@/components': './src/components',
          '@/services': './src/services',
          '@/types': './src/types',
          '@/utils': './src/utils',
          '@/constants': './src/constants',
        },
      },
    ],
  ],
};