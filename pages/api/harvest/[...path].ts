import { NextApiRequest, NextApiResponse } from "next";
import nookies from "nookies";
import * as Sentry from "@sentry/nextjs";
import { HARVEST_API_BASE_URL } from "../../../lib/harvestConfig";
import { cacheApiResponse } from "../../../lib/caching";
import { FAKE_HARVEST_TOKEN } from "../../../lib/testUtils";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  return new Promise(async () => {
    const cookies = nookies.get({ req });
    const oldUrl = req.url;
    req.url = oldUrl?.replace(/^\/api\/harvest/, "");
    console.log(`Proxy rewrite ${oldUrl} -> ${req.url}`);

    if (cookies.HARVEST_ACCESS_TOKEN === FAKE_HARVEST_TOKEN) {
      return handleMockRequest(req, res);
    }

    if (cookies.HARVEST_ACCESS_TOKEN && cookies.HARVEST_ACCOUNT_ID) {
      const resp = await fetch(`${HARVEST_API_BASE_URL}/${req.url}`, {
        method: req.method,
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${cookies.HARVEST_ACCESS_TOKEN}`,
          "user-agent": "0x tool (jakub@0x.se)",
          "harvest-account-id": cookies.HARVEST_ACCOUNT_ID,
        },
        body: ["GET", "HEAD"].includes(req.method || "GET")
          ? undefined
          : JSON.stringify(req.body),
      });

      if (resp.headers.get("content-type")?.startsWith("application/json")) {
        const data = await resp.json();

        if (req.url === "/users/me" && data) {
          Sentry.captureMessage(`Loaded page`, { user: { email: data.email } });
        } else if (req.url === "/users/me/project_assignments") {
          cacheApiResponse(res);
        }
        res.status(resp.status).json(data);
      } else {
        const respText = await resp.text();
        res.status(resp.status).json(respText);
      }
    } else {
      res.status(401).end();
    }
  });
}

export default Sentry.withSentry(handler);

const handleMockRequest = (req: NextApiRequest, res: NextApiResponse) => {
  let data = {};

  if (req.url?.startsWith("/time_entries")) {
    data = {
      time_entries: [
        {
          id: 1843341555,
          spent_date: "2022-07-29",
          hours: 8,
          hours_without_timer: 8,
          rounded_hours: 8,
          notes: null,
          is_locked: false,
          locked_reason: null,
          is_closed: false,
          is_billed: false,
          timer_started_at: null,
          started_time: null,
          ended_time: null,
          is_running: false,
          billable: true,
          budgeted: false,
          billable_rate: null,
          cost_rate: null,
          created_at: "2022-07-27T14:10:15Z",
          updated_at: "2022-07-27T14:10:15Z",
          user: {
            id: 2947353,
            name: "John Foobar",
          },
          client: {
            id: 5701731,
            name: "Spotify",
            currency: "SEK",
          },
          project: {
            id: 22792018,
            name: "John - Spotify",
            code: "",
          },
          task: {
            id: 5268825,
            name: "Software Development",
          },
          user_assignment: {
            id: 219456726,
            is_project_manager: false,
            is_active: true,
            use_default_rates: true,
            budget: null,
            created_at: "2019-10-23T08:33:00Z",
            updated_at: "2019-10-23T08:33:00Z",
            hourly_rate: null,
          },
          task_assignment: {
            id: 245606330,
            billable: true,
            is_active: true,
            created_at: "2019-10-23T08:33:00Z",
            updated_at: "2019-10-23T08:33:00Z",
            hourly_rate: null,
            budget: null,
          },
          invoice: null,
          external_reference: null,
        },
      ],
    };
  } else if (req.url === "/users/me") {
    data = {
      id: 111,
      first_name: "John",
      last_name: "Foobar",
      email: "johnny@0x.se",
      telephone: "",
      timezone: "Stockholm",
      weekly_capacity: 144000,
      has_access_to_all_future_projects: false,
      is_contractor: false,
      is_admin: false,
      is_project_manager: false,
      can_see_rates: false,
      can_create_projects: false,
      can_create_invoices: false,
      can_close_account: false,
      is_active: true,
      calendar_integration_enabled: false,
      calendar_integration_source: null,
      created_at: "2019-08-29T08:29:27Z",
      updated_at: "2022-04-20T23:49:07Z",
      roles: [],
      permissions_claims: [
        "expenses:read:own",
        "expenses:write:own",
        "timers:read:own",
        "timers:write:own",
      ],
      avatar_url: "",
    };
  } else if (req.url === "/users/me/project_assignments") {
    data = {
      project_assignments: [
        {
          id: 219456726,
          is_project_manager: false,
          is_active: true,
          use_default_rates: true,
          budget: null,
          created_at: "2019-10-23T08:33:00Z",
          updated_at: "2019-10-23T08:33:00Z",
          hourly_rate: null,
          project: {
            id: 22792018,
            name: "John - Spotify",
            code: "",
            is_billable: true,
          },
          client: {
            id: 5701731,
            name: "Spotify",
            currency: "SEK",
          },
          task_assignments: [
            {
              id: 245606330,
              billable: true,
              is_active: true,
              created_at: "2019-10-23T08:33:00Z",
              updated_at: "2019-10-23T08:33:00Z",
              hourly_rate: null,
              budget: null,
              task: {
                id: 5268825,
                name: "Software Development",
              },
            },
          ],
        },
        {
          id: 212086603,
          is_project_manager: false,
          is_active: true,
          use_default_rates: true,
          budget: null,
          created_at: "2019-08-29T08:29:42Z",
          updated_at: "2019-08-29T08:29:42Z",
          hourly_rate: null,
          project: {
            id: 11820549,
            name: "Absence 0+X",
            code: "",
            is_billable: false,
          },
          client: {
            id: 2101617,
            name: "HYPER ONE",
            currency: "SEK",
          },
          task_assignments: [
            {
              id: 129094104,
              billable: false,
              is_active: true,
              created_at: "2016-09-27T09:03:14Z",
              updated_at: "2016-09-27T09:03:14Z",
              hourly_rate: null,
              budget: null,
              task: {
                id: 6646906,
                name: "Other non-billable time",
              },
            },
          ],
        },
      ],
    };
  }
  return res.status(200).json(data);
};
