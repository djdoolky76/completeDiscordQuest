/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./QuestButton.css";

import { Flex } from "@components/Flex";
import { QuestsStore } from "../stores";
import { completingQuest } from "../index";
import { findComponentByCodeLazy } from "@webpack";
import { NavigationRouter, Tooltip, useEffect, useState } from "@webpack/common";
import { SVGProps } from "react";

const CountBadge = findComponentByCodeLazy("renderBadgeCount", "disableColor");
const supportedTasks = ["WATCH_VIDEO", "PLAY_ON_DESKTOP", "STREAM_ON_DESKTOP", "PLAY_ACTIVITY", "WATCH_VIDEO_ON_MOBILE", "ACHIEVEMENT_IN_ACTIVITY"] as const;

function QuestIcon({ width = 20, height = 20, ...props }: SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            aria-hidden="true"
            width={width}
            height={height}
            viewBox="0 0 24 24"
            fill="none"
        >
            <path d="M8.75 4.25A8.15 8.15 0 0 0 4 11.65c0 3.35 2.02 6.23 4.9 7.48" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
            <path d="M15.25 4.25A8.15 8.15 0 0 1 20 11.65c0 3.35-2.02 6.23-4.9 7.48" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
            <path d="m6.3 6.2-2.05-.35.2 2.08M5 10.15l-1.9.85 1.38 1.56M5.25 14.35l-1.2 1.7 1.9.83M17.7 6.2l2.05-.35-.2 2.08M19 10.15l1.9.85-1.38 1.56M18.75 14.35l1.2 1.7-1.9.83" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" />
            <path d="m12 6.25 1.58 3.2 3.53.51-2.55 2.49.6 3.51L12 14.3l-3.16 1.66.6-3.51-2.55-2.49 3.53-.51L12 6.25Z" fill="currentColor" />
        </svg>
    );
}

function openQuestHome() {
    NavigationRouter.transitionTo("/quest-home");
}

function formatTime(seconds: number) {
    return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`;
}

function questsStatus() {
    const availableQuests = [...QuestsStore.quests.values()];
    let maxRemaining = 0;
    const stats = availableQuests.reduce((acc, x) => {
        if (new Date(x.config.expiresAt).getTime() < Date.now()) {
            acc.expired++;
        } else if (x.userStatus?.claimedAt) {
            acc.claimed++;
        } else if (x.userStatus?.completedAt) {
            acc.claimable++;
        } else if (x.userStatus?.enrolledAt) {
            acc.enrolled++;

            if (completingQuest.get(x.id)) {
                const taskConfig = x.config.taskConfig ?? x.config.taskConfigV2;
                if (taskConfig?.tasks) {
                    const taskName = supportedTasks.find(t => taskConfig.tasks[t] != null);
                    if (taskName) {
                        const taskData = taskConfig.tasks[taskName as keyof typeof taskConfig.tasks];
                        if (taskData) {
                            const { target } = taskData;
                            const progress = x.userStatus?.progress?.[taskName]?.value ?? 0;
                            const remaining = Math.max(0, Math.floor(target - progress));
                            if (remaining > maxRemaining) {
                                maxRemaining = remaining;
                            }
                        }
                    }
                }
            }
        } else {
            acc.enrollable++;
        }
        return acc;
    }, { enrollable: 0, enrolled: 0, claimable: 0, claimed: 0, expired: 0 });
    return { ...stats, maxRemaining };
}

export function QuestsCount() {
    const [status, setStatus] = useState(questsStatus());
    const [timeLeft, setTimeLeft] = useState(status.maxRemaining);

    const checkForNewQuests = () => {
        const newStatus = questsStatus();
        setStatus(newStatus);
        setTimeLeft(newStatus.maxRemaining);
    };

    useEffect(() => {
        QuestsStore.addChangeListener(checkForNewQuests);
        return () => {
            QuestsStore.removeChangeListener(checkForNewQuests);
        };
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setTimeLeft(prev => Math.max(0, prev - 1));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <Flex flexDirection={"row"} justifyContent={"flex-end"} className={"quest-button-badges"} gap={"5px"}>
            {timeLeft > 0 && (
                <Tooltip text={"Time Remaining"}>
                    {({ onMouseEnter, onMouseLeave }) => (
                        <CountBadge
                            onMouseEnter={onMouseEnter}
                            onMouseLeave={onMouseLeave}
                            count={formatTime(timeLeft)}
                            color={"var(--status-positive)"}
                        />
                    )}
                </Tooltip>
            )}
            {status.enrollable > 0 && (
                <Tooltip text={"Enrollable"}>
                    {({ onMouseEnter, onMouseLeave }) => (
                        <CountBadge
                            onMouseEnter={onMouseEnter}
                            onMouseLeave={onMouseLeave}
                            count={status.enrollable}
                            color={"var(--status-danger)"}
                        />
                    )}
                </Tooltip>
            )}
            {status.enrolled > 0 && (
                <Tooltip text={"Enrolled"}>
                    {({ onMouseEnter, onMouseLeave }) => (
                        <CountBadge
                            onMouseEnter={onMouseEnter}
                            onMouseLeave={onMouseLeave}
                            count={status.enrolled}
                            color={"var(--status-warning)"}
                        />
                    )}
                </Tooltip>
            )}
            {status.claimable > 0 && (
                <Tooltip text={"Claimable"}>
                    {({ onMouseEnter, onMouseLeave }) => (
                        <CountBadge
                            onMouseEnter={onMouseEnter}
                            onMouseLeave={onMouseLeave}
                            count={status.claimable}
                            color={"var(--status-positive)"}
                        />
                    )}
                </Tooltip>
            )}
            {status.claimed > 0 && (
                <Tooltip text={"Claimed"}>
                    {({ onMouseEnter, onMouseLeave }) => (
                        <CountBadge
                            onMouseEnter={onMouseEnter}
                            onMouseLeave={onMouseLeave}
                            count={status.claimed}
                            color={"var(--blurple-50)"}
                        />
                    )}
                </Tooltip>
            )}
        </Flex>
    );
}

export function QuestButton({ type }: { type: "top-bar" | "settings-bar"; }) {
    const [state, setState] = useState(questsStatus());
    const [timeLeft, setTimeLeft] = useState(state.maxRemaining);

    const checkForNewQuests = () => {
        const newStatus = questsStatus();
        setState(newStatus);
        setTimeLeft(newStatus.maxRemaining);
    };

    useEffect(() => {
        QuestsStore.addChangeListener(checkForNewQuests);
        return () => {
            QuestsStore.removeChangeListener(checkForNewQuests);
        };
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setTimeLeft(prev => Math.max(0, prev - 1));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const className = state.enrollable ? "quest-button-enrollable" : state.enrolled ? "quest-button-enrolled" : state.claimable ? "quest-button-claimable" : "";
    let tooltip = state.enrollable ? `${state.enrollable} Enrollable Quests` : state.enrolled ? `${state.enrolled} Enrolled Quests` : state.claimable ? `${state.claimable} Claimable Quests` : "Quests";
    if (timeLeft > 0) {
        tooltip += ` (${formatTime(timeLeft)} left)`;
    }
    const showBadge = state.enrollable > 0 || state.enrolled > 0 || state.claimable > 0;

    return (
        <Tooltip text={tooltip} position={type === "top-bar" ? "bottom" : "top"}>
            {({ onMouseEnter, onMouseLeave }) => (
                <button
                    type="button"
                    aria-label="Quests"
                    className={`quest-button quest-button-${type} ${className}`}
                    onMouseEnter={onMouseEnter}
                    onMouseLeave={onMouseLeave}
                    onClick={openQuestHome}
                >
                    <QuestIcon />
                    {showBadge && <span className="quest-button-status-indicator" />}
                </button>
            )}
        </Tooltip>
    );
}
