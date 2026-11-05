/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { IpcMainInvokeEvent } from "electron";

/**
 * Native (main-process) IPC handlers for the Achievement bypass.
 * Discord's renderer CSP blocks connect-src to *.discordsays.com,
 * so these POSTs are routed through the main process where Node
 * fetch runs without CSP restrictions.
 */

const NUMERIC_ID = /^\d+$/;
const ENGAGE_APP_ID = "1549339406907740270";

function activityHeaders(appId: string): Record<string, string> {
    if (appId !== ENGAGE_APP_ID) return {};

    return {
        "X-Universe-ID": "2b3d4f19-0c05-4d3a-ad97-8ad1f705499a",
        "X-Discord-Activity-Id": appId,
        "X-Discord-Hostname": `${appId}.discordsays.com`,
        "X-Arise-Client": "engage-prod-main-259d80d"
    };
}

function validParams(appId: string, questId: string, referrer: string): boolean {
    if (!NUMERIC_ID.test(String(appId)) || !NUMERIC_ID.test(String(questId))) return false;
    try {
        const u = new URL(referrer);
        return u.protocol === "https:" && u.hostname === `${appId}.discordsays.com`;
    } catch {
        return false;
    }
}

export interface DiscordSaysResponse {
    ok: boolean;
    status: number;
    body: string;
}

const rejected = (): DiscordSaysResponse => ({
    ok: false,
    status: 0,
    body: JSON.stringify({ error: "invalid request params" })
});

async function discordsaysFetch(
    url: string,
    headers: Record<string, string>,
    body: string
): Promise<DiscordSaysResponse> {
    try {
        const res = await fetch(url, {
            method: "POST",
            headers,
            body,
            redirect: "error"
        });
        return { ok: res.ok, status: res.status, body: await res.text() };
    } catch (e: any) {
        return { ok: false, status: 0, body: JSON.stringify({ error: e?.message ?? String(e) }) };
    }
}

export async function discordsaysAuthorize(
    _: IpcMainInvokeEvent,
    opts: { appId: string; questId: string; authCode: string; referrer: string; }
): Promise<DiscordSaysResponse> {
    if (!validParams(opts.appId, opts.questId, opts.referrer)) return rejected();
    return discordsaysFetch(
        `https://${opts.appId}.discordsays.com/.proxy/acf/authorize`,
        {
            "Content-Type": "application/json",
            "X-Auth-Token": "",
            "X-Discord-Quest-ID": opts.questId,
            ...activityHeaders(opts.appId),
            Referer: opts.referrer
        },
        JSON.stringify(opts.appId === ENGAGE_APP_ID
            ? { code: opts.authCode, activityId: opts.appId }
            : { code: opts.authCode })
    );
}

export async function discordsaysProgress(
    _: IpcMainInvokeEvent,
    opts: { appId: string; questId: string; token: string; target: number; referrer: string; }
): Promise<DiscordSaysResponse> {
    if (!validParams(opts.appId, opts.questId, opts.referrer)) return rejected();
    return discordsaysFetch(
        `https://${opts.appId}.discordsays.com/.proxy/acf/quest/progress`,
        {
            "Content-Type": "application/json",
            "X-Auth-Token": opts.token,
            "X-Discord-Quest-ID": opts.questId,
            ...activityHeaders(opts.appId),
            Referer: opts.referrer
        },
        JSON.stringify(opts.appId === ENGAGE_APP_ID
            ? { progress: opts.target, quest_id: opts.questId }
            : { progress: opts.target })
    );
}
