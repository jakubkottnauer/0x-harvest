import axios from "axios";
import {NextApiRequest, NextApiResponse} from "next";
import {setCookie} from "nookies";
import * as Sentry from "@sentry/nextjs";
import {
    HARVEST_API_BASE_URL,
    HARVEST_ID_API_BASE_URL,
    HYPERONE_HARVEST_DOMAIN,
} from "../../lib/harvestConfig";
import {Account, Company} from "../../types";

const isProd = process.env.NODE_ENV === "production";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const query = req.query;
    if (query.access_token) {
        const baseHeaders = {
            Authorization: `Bearer ${query.access_token}`,
            "User-Agent": "0x tool (jakub@0x.se)",
        };
        const accounts = await axios.get<{ accounts: Account[] }>(
            `${HARVEST_ID_API_BASE_URL}/accounts`,
            {
                headers: baseHeaders,
            }
        );
        // we verify whether this account belongs to 0+x later
        // TODO: Do some people have more than one account?
        const account = accounts.data.accounts[0];

        if (account && typeof query.access_token === "string") {
            const company = await axios.get<Company>(
                `${HARVEST_API_BASE_URL}/company`,
                {
                    headers: {
                        ...baseHeaders,
                        "Harvest-Account-Id": account.id + "",
                    },
                }
            );
            // there is no ID to match by but the full domain is unique
            if (company.data.full_domain === HYPERONE_HARVEST_DOMAIN) {
                const config = {
                    maxAge: query.expires_in,
                    path: "/",
                    httpOnly: true,
                    secure: isProd,
                };
                setCookie({res}, "HARVEST_ACCESS_TOKEN", query.access_token, config);
                setCookie({res}, "HARVEST_ACCOUNT_ID", account.id + "", config);

                res.redirect("/");
                return
            } else {
                Sentry.captureMessage(
                    `Somebody from ${company.data.full_domain} tried to log in.`
                );
            }
        }
    }

    res.redirect("/not-us");
}
