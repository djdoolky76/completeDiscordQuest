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

import { getQuestTaskProgress, selectQuestTask } from "../questConfig";

const CountBadge = findComponentByCodeLazy("renderBadgeCount", "disableColor");

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
            <path fill="currentColor" d="M7.5 21.7a8.95 8.95 0 0 1 9 0 1 1 0 0 0 1-1.73c-.6-.35-1.24-.64-1.9-.87.54-.3 1.05-.65 1.52-1.07a3.98 3.98 0 0 0 5.49-1.8.77.77 0 0 0-.24-.95 3.98 3.98 0 0 0-2.02-.76A4 4 0 0 0 23 10.47a.76.76 0 0 0-.71-.71 4.06 4.06 0 0 0-1.6.22 3.99 3.99 0 0 0 .54-5.35.77.77 0 0 0-.95-.24c-.75.36-1.37.95-1.77 1.67V6a4 4 0 0 0-4.9-3.9.77.77 0 0 0-.6.72 4 4 0 0 0 3.7 4.17c.89 1.3 1.3 2.95 1.3 4.51 0 3.66-2.75 6.5-6 6.5s-6-2.84-6-6.5c0-1.56.41-3.21 1.3-4.51A4 4 0 0 0 11 2.82a.77.77 0 0 0-.6-.72 4.01 4.01 0 0 0-4.9 3.96A4.02 4.02 0 0 0 3.73 4.4a.77.77 0 0 0-.95.24 3.98 3.98 0 0 0 .55 5.35 4 4 0 0 0-1.6-.22.76.76 0 0 0-.72.71l-.01.28a4 4 0 0 0 2.65 3.77c-.75.06-1.45.33-2.02.76-.3.22-.4.62-.24.95a4 4 0 0 0 5.49 1.8c.47.42.98.78 1.53 1.07-.67.23-1.3.52-1.91.87a1 1 0 1 0 1 1.73Z" />
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

            const activeTask = completingQuest.get(x.id);
            if (activeTask) {
                const selectedTask = selectQuestTask(x.config, taskName => taskName === activeTask);
                if (selectedTask) {
                    const { taskData, taskName } = selectedTask;
                    const progress = getQuestTaskProgress(x.userStatus, taskName);
                    const remaining = Math.max(0, Math.floor(taskData.target - progress));
                    if (remaining > maxRemaining) {
                        maxRemaining = remaining;
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
                    <QuestIcon className="quest-button-icon" />
                    {showBadge && <span className="quest-button-status-indicator" />}
                </button>
            )}
        </Tooltip>
    );
}
