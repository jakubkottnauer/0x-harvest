import "../styles/globals.css";
import Head from "next/head";
import type {AppProps} from "next/app";
import "antd/dist/reset.css";
import React from "react";
import * as dayjs from 'dayjs'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import isoWeek from 'dayjs/plugin/isoWeek'
import CommonLayout from "../components/layout/CommonLayout";
import {
    UserSettingsStore,
    UserSettingsStoreContext,
} from "../stores/UserSettingsStore";
import {useUser} from "../lib/api";
import {useRouter} from "next/router";


dayjs.extend(isSameOrBefore)
dayjs.extend(isoWeek)




const publicPaths = ["/login", "/not-us"];

function App({Component, pageProps}: AppProps) {
    const {isError} = useUser();
    const router = useRouter();

    React.useEffect(() => {
        if (isError) {
            const path = router.asPath.split("?")[0];
            if (!publicPaths.includes(path)) {
                router.push({
                    pathname: "/login",
                });
            }
        }
    }, [isError, router]);

    return (
        <>
            <Head>
                <title>0+x Harvest</title>
                <meta
                    name="viewport"
                    content="initial-scale=1, maximum-scale=1, shrink-to-fit=no"
                />
                <meta name="theme-color" content="#001529"/>
            </Head>
            <UserSettingsStoreContext.Provider value={new UserSettingsStore()}>
                <CommonLayout>
                    <Component {...pageProps} />
                </CommonLayout>
            </UserSettingsStoreContext.Provider>
        </>
    );
}

export default App;
