import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";
import webPush from "npm:web-push@3.6.7";

// Standard CORS and JSON headers
const getCorsHeaders = (origin: string | null) => {
    const allowedOrigin = Deno.env.get("ALLOWED_ORIGIN") || "*";
    return {
        "Access-Control-Allow-Origin": allowedOrigin === "*" ? (origin || "*") : allowedOrigin,
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Content-Type": "application/json",
    };
};

const MAX_PAYLOAD_BYTES = 4000;
const MAX_TARGET_IDS = 500;

serve(async (req: Request) => {
    const origin = req.headers.get("Origin");
    const headers = getCorsHeaders(origin);

    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers });
    }

    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers,
        });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        if (!supabaseUrl || !supabaseServiceKey) {
            return new Response(JSON.stringify({ error: "Server configuration missing" }), {
                status: 500,
                headers,
            });
        }

        const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

        // Verify authorization token
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(JSON.stringify({ error: "Missing Auth Token" }), {
                status: 401,
                headers,
            });
        }

        const token = authHeader.replace(/^Bearer\s+/i, "");
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
        if (authError || !user) {
            return new Response(JSON.stringify({ error: "Invalid Token" }), {
                status: 401,
                headers,
            });
        }

        // Verify Admin Role via app_metadata
        if (user.app_metadata?.role !== 'admin') {
            return new Response(JSON.stringify({ error: "Unauthorized: Admin privileges required" }), {
                status: 403,
                headers,
            });
        }

        // Parse and validate payload
        let body: any;
        try {
            body = await req.json();
        } catch {
            return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
                status: 400,
                headers,
            });
        }

        const { content, targetProfileIds } = body || {};

        if (!content || typeof content !== "string" || content.trim().length === 0) {
            return new Response(JSON.stringify({ error: "Content is required" }), {
                status: 400,
                headers,
            });
        }

        // Enforce push payload limit (RFC 8030 max payload size 4096 bytes)
        const payloadString = JSON.stringify({
            title: "New Announcement",
            body: content.trim(),
        });

        if (new TextEncoder().encode(payloadString).length > MAX_PAYLOAD_BYTES) {
            return new Response(JSON.stringify({
                error: `Payload exceeds maximum limit of ${MAX_PAYLOAD_BYTES} bytes`,
            }), {
                status: 413,
                headers,
            });
        }

        // Validate targetProfileIds length
        if (targetProfileIds && Array.isArray(targetProfileIds)) {
            if (targetProfileIds.length > MAX_TARGET_IDS) {
                return new Response(JSON.stringify({
                    error: `Target profiles exceed limit of ${MAX_TARGET_IDS}`,
                }), {
                    status: 400,
                    headers,
                });
            }
        }

        // Fetch subscriptions
        let query = supabaseClient.from("push_subscriptions").select("id, subscription, profile_id");
        if (targetProfileIds && Array.isArray(targetProfileIds) && targetProfileIds.length > 0) {
            query = query.in("profile_id", targetProfileIds);
        }
        const { data: subscriptions, error: subError } = await query;

        if (subError) {
            throw subError;
        }

        if (!subscriptions || subscriptions.length === 0) {
            return new Response(JSON.stringify({
                success: true,
                delivered: 0,
                failed: 0,
                pruned: 0,
                message: "No active subscriptions found",
            }), {
                status: 200,
                headers,
            });
        }

        const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
        const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
        const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@flowwsuite.com";

        if (!vapidPublicKey || !vapidPrivateKey) {
            throw new Error("VAPID keys not configured");
        }

        webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

        const expiredSubIds: string[] = [];

        const results = await Promise.allSettled(
            subscriptions.map(async (sub: { id: string; subscription: any }) => {
                try {
                    await webPush.sendNotification(sub.subscription, payloadString);
                } catch (err: any) {
                    // Check for 410 Gone (unsubscribed) or 404 Not Found (expired)
                    if (err?.statusCode === 410 || err?.statusCode === 404) {
                        expiredSubIds.push(sub.id);
                    }
                    throw err;
                }
            })
        );

        // Prune expired / dead subscriptions to keep DB healthy and avoid wasting push quotas
        let prunedCount = 0;
        if (expiredSubIds.length > 0) {
            const { error: pruneError } = await supabaseClient
                .from("push_subscriptions")
                .delete()
                .in("id", expiredSubIds);

            if (!pruneError) {
                prunedCount = expiredSubIds.length;
            } else {
                console.error("Failed to prune expired subscriptions:", pruneError);
            }
        }

        const successCount = results.filter((r) => r.status === "fulfilled").length;
        const failedCount = results.filter((r) => r.status === "rejected").length;

        return new Response(JSON.stringify({
            success: true,
            delivered: successCount,
            failed: failedCount,
            pruned: prunedCount,
        }), {
            status: 200,
            headers,
        });

    } catch (error: unknown) {
        console.error("Error sending push", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return new Response(JSON.stringify({ error: errorMessage }), {
            status: 500,
            headers,
        });
    }
});
