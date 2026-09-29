/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

interface OAuthGrant {
    id: string;
    application?: { id?: string; };
}

export type OAuthCleanupStatus = "cleaned" | "account-changed" | "account-unavailable";

/** Revoke only grants created by this flow, and never touch a different account's grants. */
export async function cleanupCreatedOAuthGrants(options: {
    accountId: string;
    appId: string;
    preGrantIds: Set<string>;
    getCurrentAccountId: () => string | null;
    listGrants: () => Promise<OAuthGrant[]>;
    deleteGrant: (id: string) => Promise<void>;
}): Promise<{ status: OAuthCleanupStatus; deleted: number; }> {
    const { accountId, appId, deleteGrant, getCurrentAccountId, listGrants, preGrantIds } = options;
    let deleted = 0;

    const ownershipStatus = (): OAuthCleanupStatus | null => {
        const currentAccountId = getCurrentAccountId();
        if (currentAccountId === accountId) return null;
        return currentAccountId == null ? "account-unavailable" : "account-changed";
    };

    let status = ownershipStatus();
    if (status) return { status, deleted };

    const grants = await listGrants();
    status = ownershipStatus();
    if (status) return { status, deleted };

    const createdGrants = grants.filter(grant =>
        grant.application?.id === appId && !preGrantIds.has(grant.id)
    );

    for (const grant of createdGrants) {
        status = ownershipStatus();
        if (status) return { status, deleted };

        await deleteGrant(grant.id);
        deleted++;
    }

    return { status: "cleaned", deleted };
}
