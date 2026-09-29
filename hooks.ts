/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

let refreshQuests: (() => void) | undefined;

export function setRefreshQuestsHandler(handler?: () => void) {
    refreshQuests = handler;
}

export function requestQuestRefresh() {
    refreshQuests?.();
}
