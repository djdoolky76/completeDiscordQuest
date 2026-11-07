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

interface AriseMetadata {
    universeId: string;
    appVersion: string;
}

// Keep the already-working Engage profile available if its frontend is unreachable.
const ENGAGE_METADATA: AriseMetadata = {
    universeId: "2b3d4f19-0c05-4d3a-ad97-8ad1f705499a",
    appVersion: "engage-prod-main-259d80d"
};
const metadataCache = new Map<string, Promise<AriseMetadata | null>>();

async function discoverAriseMetadata(appId: string): Promise<AriseMetadata | null> {
    if (appId === ENGAGE_APP_ID) return ENGAGE_METADATA;
    if (!NUMERIC_ID.test(appId)) return null;

    const cached = metadataCache.get(appId);
    if (cached) return cached;

    const discovery = (async () => {
        const origin = `https://${appId}.discordsays.com`;
        try {
            const htmlResponse = await fetch(`${origin}/`, {
                redirect: "error",
                signal: AbortSignal.timeout(8000)
            });
            if (!htmlResponse.ok) return null;

            const html = await htmlResponse.text();
            const scriptPath = html.match(/src=["']?(\/arise-frontend\.[\w-]+\.js)(?=["'\s>])/i)?.[1];
            if (!scriptPath) return null;

            const scriptResponse = await fetch(`${origin}${scriptPath}`, {
                redirect: "error",
                signal: AbortSignal.timeout(10000)
            });
            if (!scriptResponse.ok) return null;

            const script = await scriptResponse.text();
            const universeId = script.match(/["']X-Universe-ID["']\s*:\s*["']([0-9a-f-]{36})["']/i)?.[1]
                ?? script.match(/ARISE_UNIVERSEID["']\)\s*\|\|\s*["']([0-9a-f-]{36})["']/i)?.[1];
            const version = script.match(/let\s+\w+=["']([0-9a-f]{6,12})["'],\s*\w+=["']([a-z0-9-]+)["']/i);
            if (!universeId || !version) return null;

            return { universeId, appVersion: `${version[2]}-${version[1]}` };
        } catch {
            return null;
        }
    })().then(metadata => {
        // A temporary network failure must not permanently select the legacy format.
        if (!metadata) metadataCache.delete(appId);
        return metadata;
    });
    metadataCache.set(appId, discovery);
    return discovery;
}

function activityHeaders(appId: string, metadata: AriseMetadata | null): Record<string, string> {
    if (!metadata) return {};

    return {
        "X-Universe-ID": metadata.universeId,
        "X-Discord-Activity-Id": appId,
        "X-Discord-Hostname": `${appId}.discordsays.com`,
        "X-Arise-Client": metadata.appVersion,
        ...(appId === ENGAGE_APP_ID ? {} : { Origin: `https://${appId}.discordsays.com` })
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
    const metadata = await discoverAriseMetadata(opts.appId);
    return discordsaysFetch(
        `https://${opts.appId}.discordsays.com/.proxy/acf/authorize`,
        {
            "Content-Type": "application/json",
            "X-Auth-Token": "",
            "X-Discord-Quest-ID": opts.questId,
            ...activityHeaders(opts.appId, metadata),
            Referer: opts.referrer
        },
        JSON.stringify(metadata
            ? { code: opts.authCode, activityId: opts.appId }
            : { code: opts.authCode })
    );
}

export async function discordsaysProgress(
    _: IpcMainInvokeEvent,
    opts: { appId: string; questId: string; token: string; target: number; referrer: string; }
): Promise<DiscordSaysResponse> {
    if (!validParams(opts.appId, opts.questId, opts.referrer)) return rejected();
    const metadata = await discoverAriseMetadata(opts.appId);
    return discordsaysFetch(
        `https://${opts.appId}.discordsays.com/.proxy/acf/quest/progress`,
        {
            "Content-Type": "application/json",
            "X-Auth-Token": opts.token,
            "X-Discord-Quest-ID": opts.questId,
            ...activityHeaders(opts.appId, metadata),
            Referer: opts.referrer
        },
        JSON.stringify(metadata
            ? { progress: opts.target, quest_id: opts.questId }
            : { progress: opts.target })
    );
}
