/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export const supportedTasks = [
    "ACHIEVEMENT_IN_ACTIVITY",
    "PLAY_ACTIVITY",
    "WATCH_VIDEO",
    "WATCH_VIDEO_ON_MOBILE",
    "PLAY_ON_DESKTOP",
    "STREAM_ON_DESKTOP",
] as const;

export type SupportedTask = typeof supportedTasks[number];

type TaskConfigLike = TaskConfig | TaskConfigV2;
type TaskValue = NonNullable<Tasks[string]>;
type TaskCollection = Tasks | Map<string, TaskValue | undefined>;

function taskEntries(tasks: TaskCollection | null | undefined): Array<[string, TaskValue | undefined]> {
    if (!tasks) return [];
    if (tasks instanceof Map) return Array.from(tasks.entries());
    return Object.entries(tasks);
}

/** Prefer Discord's current taskConfigV2 whenever it contains tasks. */
export function selectQuestTaskConfig(config: Config): TaskConfigLike | null {
    const current = config.taskConfigV2;
    if (current && taskEntries(current.tasks).length > 0) return current;

    const legacy = config.taskConfig;
    if (legacy && taskEntries(legacy.tasks).length > 0) return legacy;

    return current ?? legacy ?? null;
}

export function selectQuestTask(
    config: Config,
    isEnabled: (taskName: SupportedTask) => boolean = () => true,
): { taskName: SupportedTask; taskData: TaskValue; } | null {
    const taskConfig = selectQuestTaskConfig(config);
    const entries = taskEntries(taskConfig?.tasks);

    for (const taskName of supportedTasks) {
        if (!isEnabled(taskName)) continue;
        const taskData = entries.find(([key]) => key === taskName)?.[1];
        if (taskData) return { taskName, taskData };
    }

    return null;
}

export function getQuestTaskProgress(userStatus: UserStatus | null | undefined, taskName: SupportedTask): number {
    const progress = userStatus?.progress as Progress | Map<string, PLAYONDESKTOP2 | undefined> | undefined;
    const entry = progress instanceof Map ? progress.get(taskName) : progress?.[taskName];
    return entry?.value ?? userStatus?.streamProgressSeconds ?? 0;
}
