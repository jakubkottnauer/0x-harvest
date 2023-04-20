import {useProjectAssignments, useTimeEntries} from "./lib/api";
import {useUserSettingState} from "./stores/UserSettingsStore";
import {TaskWithProject, TimeEntry} from "./types";
import dayjs from "dayjs";

export const VACATION_ALLOWANCE_KEY = "vacationAllowance";
export const DEFAULT_VACATION_ALLOWANCE = 25;

export const weekdaysInMonth = (year: number, month: number) => {
    return getDaysInMonthRange(year, month).reduce(
        (acc, day) => acc + (day.isBusinessDay ? 1 : 0),
        0
    );
};

export type Day = { date: dayjs.Dayjs; isBusinessDay: boolean };

export const getDaysInMonthRange = (year: number, month: number): Day[] => {
    const currentDay = dayjs(new Date(year, month, 1)).startOf("month");
    const lastDay = dayjs(new Date(year, month, 1)).endOf("month");

    const days: { date: dayjs.Dayjs; isBusinessDay: boolean }[] = [];

    while (currentDay.isSameOrBefore(lastDay, "day")) {
        const weekday = currentDay.isoWeekday();
        days.push({date: currentDay.clone(), isBusinessDay: weekday < 6});
        currentDay.add(1, "day");
    }
    return days;
};

/**
 * Returns the most-used task during the last 30 days. Defaults to the first task returned for the user if there is no history.
 */
export const usePrimaryTask = (): TaskWithProject | undefined => {
    const start = dayjs().subtract(30, "day");
    const end = dayjs();

    const {data: projectAssignments} = useProjectAssignments();
    const {data: entries} = useTimeEntries(start, end);
    const userSettingsState = useUserSettingState();
    const primaryTaskIdUserSetting = userSettingsState.primaryTaskId;
    if (primaryTaskIdUserSetting) {
        const projectAssignment = projectAssignments?.find((p) =>
            p.task_assignments.find((p) => p.task.id === primaryTaskIdUserSetting)
        );
        if (projectAssignment) {
            const task = projectAssignment.task_assignments.find(
                (t) => t.task.id === primaryTaskIdUserSetting
            )!.task;
            const project = projectAssignment.project;
            return {
                projectId: project.id,
                projectName: project.name,
                taskId: task.id,
                taskName: task.name,
            };
        }
    }
    if (!entries?.length) {
        const project = projectAssignments?.[0].project;
        const task = projectAssignments?.[0].task_assignments[0]?.task;
        if (project && task) {
            return {
                projectId: project.id,
                projectName: project.name,
                taskId: task.id,
                taskName: task.name,
            };
        }
        return undefined;
    }
    const occurences: Record<number, number> = {};

    entries?.forEach((e) => {
        if (!occurences[e.task.id]) {
            occurences[e.task.id] = 0;
        }
        occurences[e.task.id] = occurences[e.task.id] + 1;
    });

    const mostCommonTaskId = parseInt(
        Object.entries(occurences).sort((a, b) => b[1] - a[1])[0]?.[0] || ""
    );
    const mostCommonTask = entries?.find((e) => e.task.id === mostCommonTaskId);
    return mostCommonTask
        ? {
            projectId: mostCommonTask.project.id,
            projectName: mostCommonTask.project.name,
            taskId: mostCommonTask.task.id,
            taskName: mostCommonTask.task.name,
        }
        : undefined;
};

export const getVacationAllowance = (): Record<number, number> => {
    if (typeof window === "undefined") {
        return {};
    }

    const persistedAllowance = localStorage.getItem(VACATION_ALLOWANCE_KEY);
    if (persistedAllowance) {
        try {
            return JSON.parse(persistedAllowance);
        } catch (e) {
            return {};
        }
    }
    return {};
};

/**
 * Most of users' work tasks are called the same, but have different IDs. Have to match by name.
 */
export const isSoftwareDevTask = (taskName?: string) =>
    taskName === "Software Development";

export const taskInfoFromTimEntry = (entry: TimeEntry): TaskWithProject => {
    return {
        taskId: entry.task.id,
        taskName: entry.task.name,
        projectId: entry.project.id,
        projectName: entry.project.name,
    };
};
