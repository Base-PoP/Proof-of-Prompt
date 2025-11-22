/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Ignore React Native async-storage in browser builds
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        '@react-native-async-storage/async-storage': false,
        'react-native': false,
      };
    }
    
    // Suppress warnings for optional dependencies
    config.ignoreWarnings = [
      { module: /@metamask\/sdk/ },
      { module: /@walletconnect/ },
    ];
    
    return config;
  },
};

export default nextConfig;
