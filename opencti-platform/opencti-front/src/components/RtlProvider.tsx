import React, { useMemo } from 'react';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import rtlPlugin from '@mui/stylis-plugin-rtl';
import { UserContext } from '../utils/hooks/useAuth';
import { isRtlLanguage } from '../utils/rtl';

const ltrCache = createCache({
  key: 'mui-ltr',
});

const rtlCache = createCache({
  key: 'mui-rtl',
  stylisPlugins: [rtlPlugin],
});

interface RtlProviderProps {
  children: React.ReactNode;
}

const RtlProvider: React.FC<RtlProviderProps> = ({ children }) => {
  const { locale } = React.useContext(UserContext);
  const isRtl = isRtlLanguage(locale.split('-')[0]);
  const cache = useMemo(() => (isRtl ? rtlCache : ltrCache), [isRtl]);

  return <CacheProvider value={cache}>{children}</CacheProvider>;
};

export default RtlProvider;
