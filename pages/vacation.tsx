import type { GetServerSideProps, NextPage } from "next";
import dayjs from "dayjs";
import { useState } from "react";
import Link from "next/link";
import { Alert, Button, Col, List, Row, Statistic, Typography } from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import { TimeEntry } from "../types";
import {
  PAID_VACATION_TASK_ID,
  UNPAID_VACATION_TASK_ID,
  VACATION_TASK_ID,
  useTimeEntries,
} from "../lib/api";
import { useRouter } from "next/dist/client/router";
import { DEFAULT_VACATION_ALLOWANCE, getVacationAllowance } from "../utils";
import { cachePage } from "../lib/caching";

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  cachePage(res);
  return {
    props: {},
  };
};

const Vacation: NextPage = () => {
  const router = useRouter();
  let year = dayjs().year();

  if (typeof router.query.year === "string") {
    const parsed = parseInt(router.query.year);
    if (parsed > 2000 && parsed < 2100) {
      year = parsed;
    }
  }
  const { data: paidVacationEntries } = useTimeEntries(
    dayjs().set("year", year).startOf("year"),
    dayjs().set("year", year).endOf("year"),
    PAID_VACATION_TASK_ID
  );

  const { data: vacationEntries } = useTimeEntries(
    dayjs().set("year", year).startOf("year"),
    dayjs().set("year", year).endOf("year"),
    VACATION_TASK_ID
  );

  const { data: unpaidVacationEntries } = useTimeEntries(
    dayjs().set("year", year).startOf("year"),
    dayjs().set("year", year).endOf("year"),
    UNPAID_VACATION_TASK_ID
  );

  const groupedEntries = [
    ...(vacationEntries || []),
    ...(paidVacationEntries || []),
  ].sort((a, b) => b.spent_date.localeCompare(a.spent_date));

  return (
    <>
      <>
        <Button
          type="link"
          style={{ padding: 0 }}
          onClick={() => {
            router.push(`/vacation?year=${year - 1}`, undefined, {
              shallow: true,
            });
          }}
        >
          <LeftOutlined />
          previous
        </Button>
        <Button
          type="link"
          onClick={() => {
            router.push(`/vacation?year=${year + 1}`, undefined, {
              shallow: true,
            });
          }}
        >
          next
          <RightOutlined />
        </Button>
      </>
      <Typography.Title level={4}>
        Year {year}{" "}
        <>
          {dayjs().year() !== year && (
            <Button
              type="link"
              onClick={() => {
                router.push(`/vacation?year=${dayjs().year()}`, undefined, {
                  shallow: true,
                });
              }}
            >
              go to current year
            </Button>
          )}
        </>
      </Typography.Title>

      <VacationsDaysLeft vacationEntries={groupedEntries} year={year} />
      <VacationsDayList
        vacationEntries={groupedEntries}
        title="Used vacation days"
      />
      {(unpaidVacationEntries?.length || 0) > 0 && (
        <VacationsDayList
          vacationEntries={unpaidVacationEntries}
          title="Used unpaid vacation days"
        />
      )}
    </>
  );
};

export default Vacation;

const VacationsDaysLeft = ({
  vacationEntries,
  year,
}: {
  vacationEntries?: TimeEntry[];
  year: number;
}) => {
  const [vacationAllowance] = useState(() => getVacationAllowance());
  const vacationYearAllowance =
    vacationAllowance[year] || DEFAULT_VACATION_ALLOWANCE;

  return (
    <>
      {!Object.keys(vacationAllowance).length && typeof window !== "undefined" && (
        <Row>
          <Col>
            <Alert
              type="info"
              message={
                <>
                  You can set your vacation allowance per year in{" "}
                  <Link href="/settings">Settings</Link>
                </>
              }
            />
          </Col>
        </Row>
      )}
      <Row>
        <Col>
          <Statistic
            loading={!vacationEntries}
            title="Vacation days left this year"
            value={vacationYearAllowance - (vacationEntries?.length || 0)}
            suffix={` / ${vacationYearAllowance}`}
          />
        </Col>
      </Row>
    </>
  );
};

const VacationsDayList = ({
  vacationEntries,
  title,
}: {
  vacationEntries?: TimeEntry[];
  title: string;
}) => {
  return (
    <List
      header={title}
      loading={!vacationEntries}
      size="small"
      dataSource={vacationEntries?.map((entry) => ({
        date: entry.spent_date,
        notes: entry.notes,
      }))}
      renderItem={(item) => (
        <List.Item style={{ padding: "2px 10px" }}>
          {item.date} {item.notes ? ` - ${item.notes}` : ""}
        </List.Item>
      )}
    />
  );
};
