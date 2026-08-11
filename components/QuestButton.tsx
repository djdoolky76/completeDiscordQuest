/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./QuestButton.css";

import { Flex } from "@components/Flex";
import { QuestsStore } from "../stores";
import { completingQuest } from "../index";
import { findByCodeLazy, findByPropsLazy, findComponentByCodeLazy } from "@webpack";
import { Tooltip, useEffect, useState } from "@webpack/common";

const QuestIcon = findByCodeLazy("\"M7.5 21.7a8.95");
const { navigateToQuestHome } = findByPropsLazy("navigateToQuestHome");
const TopBarButton = findComponentByCodeLazy("badgePosition", "icon");
const SettingsBarButton = findComponentByCodeLazy("keyboardShortcut", "positionKey");
const CountBadge = findComponentByCodeLazy("renderBadgeCount", "disableColor");
const supportedTasks = ["WATCH_VIDEO", "PLAY_ON_DESKTOP", "STREAM_ON_DESKTOP", "PLAY_ACTIVITY", "WATCH_VIDEO_ON_MOBILE", "ACHIEVEMENT_IN_ACTIVITY"] as const;

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
                            const target = taskData.target;
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

function CountBadge({ count, text, color, bg }: { count: number | string, text: string, color: string, bg: string }) {
    return (
        <Tooltip text={text}>
            {({ onMouseEnter, onMouseLeave }) => (
                <div
                    onMouseEnter={onMouseEnter}
                    onMouseLeave={onMouseLeave}
                    style={{
                        backgroundColor: bg,
                        color: color,
                        fontSize: "12px",
                        fontWeight: "bold",
                        padding: "2px 6px",
                        borderRadius: "16px",
                        display: "flex",
                        alignItems: "center",
                        border: `1px solid ${color}40`,
                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                        backdropFilter: "blur(4px)"
                    }}
                >
                    {count}
                </div>
            )}
        </Tooltip>
    );
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
        if (timeLeft <= 0) return;
        const interval = setInterval(() => {
            setTimeLeft(prev => Math.max(0, prev - 1));
        }, 1000);
        return () => clearInterval(interval);
    }, [timeLeft]);

    return (
        <Flex flexDirection={"row"} justifyContent={"flex-end"} className={"quest-button-badges"} gap={"4px"} style={{ padding: "0 4px" }}>
            {timeLeft > 0 && (
                <CountBadge
                    count={`${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, "0")}`}
                    text="Time Remaining"
                    color="#00e676"
                    bg="rgba(0, 230, 118, 0.15)"
                />
            )}
            {status.enrollable > 0 && (
                <CountBadge count={status.enrollable} text="Enrollable" color="#ff5252" bg="rgba(255, 82, 82, 0.15)" />
            )}
            {status.enrolled > 0 && (
                <CountBadge count={status.enrolled} text="Enrolled" color="#ffd740" bg="rgba(255, 215, 64, 0.15)" />
            )}
            {status.claimable > 0 && (
                <CountBadge count={status.claimable} text="Claimable" color="#69f0ae" bg="rgba(105, 240, 174, 0.15)" />
            )}
            {status.claimed > 0 && (
                <CountBadge count={status.claimed} text="Claimed" color="#536dfe" bg="rgba(83, 109, 254, 0.15)" />
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
        if (timeLeft <= 0) return;
        const interval = setInterval(() => {
            setTimeLeft(prev => Math.max(0, prev - 1));
        }, 1000);
        return () => clearInterval(interval);
    }, [timeLeft]);

    const className = state.enrollable ? "quest-button-enrollable" : state.enrolled ? "quest-button-enrolled" : state.claimable ? "quest-button-claimable" : "";
    let tooltip = state.enrollable ? `${state.enrollable} Enrollable Quests` : state.enrolled ? `${state.enrolled} Enrolled Quests` : state.claimable ? `${state.claimable} Claimable Quests` : "Quests";
    if (timeLeft > 0) {
        tooltip += ` (${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, "0")} left)`;
    }
    if (type === "top-bar") {
        return (
            <TopBarButton
                className={className}
                iconClassName={undefined}
                disabled={navigateToQuestHome === undefined}
                showBadge={state.enrollable > 0 || state.enrolled > 0 || state.claimable > 0}
                badgePosition={"bottom"}
                icon={QuestIcon}
                iconSize={20}
                onClick={navigateToQuestHome}
                onContextMenu={undefined}
                tooltip={tooltip}
                tooltipPosition={"bottom"}
                hideOnClick={false}
            />
        );
    } else if (type === "settings-bar") {
        return (
            <SettingsBarButton
                tooltipText={tooltip}
                onContextMenu={undefined}
                onClick={navigateToQuestHome}
                disabled={navigateToQuestHome === undefined}
                icon={undefined}
                className={"quest-button"}
            ><TopBarButton
                className={className}
                iconClassName={undefined}
                disabled={navigateToQuestHome === undefined}
                showBadge={state.enrollable > 0 || state.enrolled > 0 || state.claimable > 0}
                badgePosition={"bottom"}
                icon={QuestIcon}
                iconSize={20}
                onClick={navigateToQuestHome}
                onContextMenu={undefined}
                hideOnClick={false}
            /></SettingsBarButton>
        );
    }
}
