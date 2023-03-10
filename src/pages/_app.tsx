import Head from 'next/head'
import 'styles/globals.css'
import type { AppProps } from 'next/app'
import Header from 'components/Header'
import Footer from 'components/Footer'
import { SessionProvider, useSession } from 'next-auth/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Loader } from '@mantine/core'
import { Center_Div } from 'components/styledComponent'
import { scheduleJob } from 'node-schedule'

export default function App({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { staleTime: Infinity },
    },
  })
  const checkExpiredRoom = scheduleJob('0 0 * * *', function () {
    fetch(`http://localhost:3000/api/room/update-ExpiredRooms`)
      .then((res) => res.json())
      .then((data) => data.items)
    console.log('expired room checking...')
  })
  return (
    <SessionProvider session={session}>
      <QueryClientProvider client={queryClient}>
        <Head>
          <title>Myspot</title>
          <meta name="description" content="My Spot direct transaction" />
        </Head>
        <Auth>
          <Header />
          <div className="flex justify-center">
            <div style={{ maxWidth: '1000px', width: '100%' }}>
              <Component {...pageProps} />
              <Footer />
            </div>
          </div>
        </Auth>
      </QueryClientProvider>
    </SessionProvider>
  )
}

function Auth({ children }: { children: any }) {
  const { status } = useSession()
  if (status === 'loading') {
    return (
      <Center_Div className="m-72">
        <Loader />
      </Center_Div>
    )
  }
  return children
}