import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import webPush from "npm:web-push@3.6.7";

// CORS configuration
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // Verify the user is an admin before sending push
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(JSON.stringify({ error: "Missing Auth Token" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }
        
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace("Bearer ", ""));
        if (authError || !user) {
            return new Response(JSON.stringify({ error: "Invalid Token" }), { status: 401, headers: corsHeaders });
        }

        // Verify Admin Role via app_metadata
        if (user.app_metadata?.role !== 'admin') {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403, headers: corsHeaders });
        }

        const body = await req.json();
        const { content, targetProfileIds } = body;

        if (!content) {
            return new Response(JSON.stringify({ error: "Content is required" }), { status: 400, headers: corsHeaders });
        }

        // Fetch subscriptions
        let query = supabaseClient.from("push_subscriptions").select("subscription, profile_id");
        if (targetProfileIds && Array.isArray(targetProfileIds) && targetProfileIds.length > 0) {
            query = query.in("profile_id", targetProfileIds);
        }
        const { data: subscriptions, error: subError } = await query;

        if (subError) {
            throw subError;
        }

        const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
        const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
        const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@flowwsuite.com";

        if (!vapidPublicKey || !vapidPrivateKey) {
            throw new Error("VAPID keys not configured");
        }

        webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

        const payload = JSON.stringify({
            title: "New Announcement",
            body: content,
        });

        const results = await Promise.allSettled(
            (subscriptions || []).map((sub) => 
                webPush.sendNotification(sub.subscription, payload)
            )
        );

        const successCount = results.filter((r) => r.status === "fulfilled").length;
        const failedCount = results.filter((r) => r.status === "rejected").length;

        // Optionally, remove failed subscriptions (e.g. 410 Gone)
        // This can be done by parsing the rejection reason and deleting from DB.

        return new Response(JSON.stringify({ success: true, delivered: successCount, failed: failedCount }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error: unknown) {
        console.error("Error sending push", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return new Response(JSON.stringify({ error: errorMessage }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
